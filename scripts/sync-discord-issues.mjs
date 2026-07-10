// scripts/sync-discord-issues.mjs
// Reads recent messages from the #metagor-bug-reports Discord channel,
// parses the formatted reports from the site's issue reporter, and creates
// GitHub Issues for any that haven't been synced yet.
//
// Required env vars:
//   DISCORD_BOT_TOKEN  — bot token with Read Messages permission in the channel
//   DISCORD_CHANNEL_ID — numeric channel ID of #metagor-bug-reports
//
// Optional env vars:
//   GH_TOKEN — GitHub token (auto-set in Actions; for local runs use `gh auth`)
//   SYNC_STATE_PATH — where to store synced IDs (default: data/synced-issues.json)
//
// Usage:
//   node scripts/sync-discord-issues.mjs
//
// In GitHub Actions, this runs on a schedule (every 30 min) via
// .github/workflows/sync-issues.yml

import { renameSync, writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_STATE_PATH = join(ROOT, "data", "synced-issues.json");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const STATE_PATH = process.env.SYNC_STATE_PATH || DEFAULT_STATE_PATH;

if (!TOKEN || !CHANNEL_ID) {
  console.error("sync: missing DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID");
  process.exit(1);
}

// --- State management ---

function loadState() {
  try {
    if (existsSync(STATE_PATH)) {
      return JSON.parse(readFileSync(STATE_PATH, "utf8"));
    }
  } catch (e) {
    console.warn(`sync: could not read state file, starting fresh: ${e.message}`);
  }
  return { synced: [] };
}

function saveState(state) {
  const dir = dirname(STATE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = STATE_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, STATE_PATH);
}

// --- Discord API ---

async function fetchMessages(limit = 50) {
  // Fetch recent messages from the channel. We use the bot token in the
  // Authorization header (Bearer). The endpoint returns messages in
  // reverse chronological order (newest first).
  const url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bot ${TOKEN}` }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function addReaction(messageId, emoji) {
  // Add a checkmark reaction to indicate the message was synced to GitHub.
  // emoji must be URL-encoded (e.g. "%E2%9C%85" for ✅).
  const url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages/${messageId}/reactions/${emoji}/@me`;
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bot ${TOKEN}` }
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`sync: could not add reaction (${res.status}): ${body.slice(0, 100)}`);
    }
  } catch (e) {
    console.warn(`sync: reaction failed: ${e.message}`);
  }
}

// --- Parse the formatted Discord message ---
//
// The issue reporter sends messages in this format:
//   🐛 [Issue] SoulReaper888 — 2026-07-10 22:30 UTC
//   Spec: demon-hunter - havoc
//   URL: https://gitgipie.github.io/metagor/?class=demon-hunter&spec=havoc
//
//   Description:
//   <user's text>
//
// For recommendations, the emoji is 💡 instead of 🐛.

function parseMessage(content) {
  const lines = content.split("\n");
  const result = {
    type: null,
    reporter: null,
    timestamp: null,
    spec: null,
    url: null,
    description: null
  };

  // Line 0: emoji **[Type]** Name — timestamp
  // The ** are Discord markdown bold around the [Type] bracket.
  const headerMatch = lines[0]?.match(/^\S+\s*\*{0,2}\[(Issue|Recommendation)\]\*{0,2}\s*(.+?)\s+—\s+(.+)$/);
  if (headerMatch) {
    result.type = headerMatch[1];
    result.reporter = headerMatch[2].trim();
    result.timestamp = headerMatch[3].trim();
  }

  // Find Spec, URL, and Description lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("Spec:")) {
      result.spec = line.slice(5).trim();
    } else if (line.startsWith("URL:")) {
      result.url = line.slice(4).trim();
    } else if (line.match(/^\*{0,2}Description:?\*{0,2}/)) {
      // Description is everything after this line, joined and trimmed
      result.description = lines.slice(i + 1).join("\n").trim();
      break;
    }
  }

  return result;
}

function buildIssueBody(parsed, attachments) {
  const parts = [];

  parts.push(`**Reporter:** ${parsed.reporter || "Unknown"}`);
  parts.push(`**Type:** ${parsed.type || "Issue"}`);
  if (parsed.timestamp) parts.push(`**Reported at:** ${parsed.timestamp}`);
  if (parsed.spec && parsed.spec !== "N/A") parts.push(`**Spec:** ${parsed.spec}`);
  if (parsed.url) parts.push(`**Page URL:** ${parsed.url}`);
  parts.push("");
  parts.push("### Description");
  parts.push("");
  parts.push(parsed.description || "(no description provided)");

  if (attachments.length > 0) {
    parts.push("");
    parts.push("### Screenshots");
    for (const att of attachments) {
      parts.push(`![${att.filename}](${att.url})`);
    }
  }

  parts.push("");
  parts.push("---");
  parts.push("*This issue was automatically synced from Discord by `sync-discord-issues.mjs`*");

  return parts.join("\n");
}

function buildIssueLabels(parsed) {
  const labels = [];
  if (parsed.type === "Recommendation") {
    labels.push("enhancement");
  } else {
    labels.push("bug");
  }
  if (parsed.spec && parsed.spec !== "N/A") {
    // Try to extract a class label from the spec context
    // e.g. "demon-hunter - havoc" -> "class:demon-hunter"
    const classMatch = parsed.spec.match(/^([\w-]+)\s*-/);
    if (classMatch) {
      labels.push(`class:${classMatch[1]}`);
    }
  }
  return labels;
}

function createIssue(title, body, labels) {
  // Use `gh issue create` — this respects the auth context (GH_TOKEN env or
  // gh auth login). In GitHub Actions, GH_TOKEN is set by the workflow.
  const args = [
    "issue", "create",
    "--title", title,
    "--body", body
  ];
  for (const label of labels) {
    args.push("--label", label);
  }

  // Use a temp file for the body to avoid shell escaping issues
  const tmpFile = join(ROOT, ".tmp-issue-body.md");
  writeFileSync(tmpFile, body);
  const argsWithFile = [
    "issue", "create",
    "--title", title,
    "--body-file", tmpFile
  ];
  for (const label of labels) {
    argsWithFile.push("--label", label);
  }

  try {
    const result = execSync(`gh ${argsWithFile.map(a => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`, {
      encoding: "utf8",
      cwd: ROOT
    }).trim();
    try { unlinkSync(tmpFile); } catch {}
    return result;
  } catch (e) {
    try { unlinkSync(tmpFile); } catch {}
    throw new Error(`gh issue create failed: ${e.message}`);
  }
}

// --- Main ---

async function main() {
  console.log("sync: fetching recent Discord messages...");
  const messages = await fetchMessages(50);
  console.log(`sync: got ${messages.length} messages`);

  const state = loadState();
  const syncedIds = new Set(state.synced.map(s => s.messageId));

  // Process messages in chronological order (oldest first)
  const sorted = [...messages].reverse();

  let newCount = 0;
  let skipCount = 0;

  for (const msg of sorted) {
    // Skip messages that are already synced
    if (syncedIds.has(msg.id)) {
      skipCount++;
      continue;
    }

    // Skip bot's own messages that aren't from the webhook (safety)
    if (msg.author?.bot && !msg.webhook_id) {
      skipCount++;
      continue;
    }

    // Skip empty messages
    if (!msg.content || msg.content.trim().length === 0) {
      skipCount++;
      continue;
    }

    const parsed = parseMessage(msg.content);

    // Skip messages that don't match our reporter format
    if (!parsed.type && !parsed.reporter) {
      console.log(`sync: skipping non-report message ${msg.id}: "${msg.content.slice(0, 60)}..."`);
      skipCount++;
      continue;
    }

    const attachments = (msg.attachments || []).map(a => ({
      filename: a.filename,
      url: a.url
    }));

    const emoji = parsed.type === "Recommendation" ? "\u{1F4A1}" : "\u{1F41B}";
    const title = `[${parsed.type || "Issue"}] ${parsed.reporter || "Unknown"}: ${(parsed.description || "No description").slice(0, 80)}`;
    const body = buildIssueBody(parsed, attachments);
    const labels = buildIssueLabels(parsed);

    console.log(`sync: creating GitHub issue for message ${msg.id}...`);
    console.log(`  title: ${title}`);
    console.log(`  labels: ${labels.join(", ")}`);
    console.log(`  attachments: ${attachments.length}`);

    try {
      const issueUrl = createIssue(title, body, labels);
      console.log(`  created: ${issueUrl}`);

      // Add ✅ reaction to the Discord message
      await addReaction(msg.id, "%E2%9C%85");

      // Record in state
      state.synced.push({
        messageId: msg.id,
        issueUrl,
        syncedAt: new Date().toISOString(),
        reporter: parsed.reporter,
        type: parsed.type
      });
      newCount++;
    } catch (e) {
      console.error(`sync: FAILED to create issue for message ${msg.id}: ${e.message}`);
    }
  }

  if (newCount > 0) {
    saveState(state);
    console.log(`sync: saved state (${newCount} new, ${skipCount} skipped)`);
  } else {
    console.log(`sync: nothing new (${skipCount} skipped)`);
  }
}

main().catch(e => {
  console.error(`sync: fatal error: ${e.message}`);
  process.exit(1);
});