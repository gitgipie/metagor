// scripts/verify-credentials.mjs
// Token-only sanity check: confirms Blizzard Developer Portal credentials work.
// Does NOT scrape, does NOT write aggregated_bis.json.
// Run: node scripts/verify-credentials.mjs

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function die(msg, code = 2) {
  console.error(`\n[verify-credentials] ${msg}\n`);
  process.exit(code);
}

async function loadEnv() {
  try {
    const text = await readFile(join(ROOT, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (k && !(k in process.env)) process.env[k] = v;
    }
  } catch (e) {
    die(
      "Could not read .env at project root. " +
        "Create one with BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET. " +
        "See README §Provision for setup details."
    );
  }
}

function mask(value) {
  if (!value) return "(empty)";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function fetchToken(id, secret) {
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

await loadEnv();

const id = process.env.BLIZZARD_CLIENT_ID;
const secret = process.env.BLIZZARD_CLIENT_SECRET;

if (!id) die("BLIZZARD_CLIENT_ID is missing or empty in .env");
if (!secret) die("BLIZZARD_CLIENT_SECRET is missing or empty in .env");

console.log("[verify-credentials] Blizzard credentials found in .env");
console.log(`[verify-credentials]   BLIZZARD_CLIENT_ID     = ${mask(id)}`);
console.log(`[verify-credentials]   BLIZZARD_CLIENT_SECRET = ${mask(secret)}`);
console.log("[verify-credentials] Requesting OAuth token from oauth.battle.net...");

let result;
try {
  result = await fetchToken(id, secret);
} catch (e) {
  die(`Network error contacting oauth.battle.net: ${e.message}`);
}

if (result.status === 200 && result.json?.access_token) {
  const expiresIn = result.json.expires_in ?? "unknown";
  console.log("\n[verify-credentials] OK - Blizzard accepted the credentials.");
  console.log(`[verify-credentials]   token_type    = ${result.json.token_type}`);
  console.log(`[verify-credentials]   expires_in    = ${expiresIn}s`);
  console.log(`[verify-credentials]   account       = ${result.json.sub || "(not returned)"}`);
  console.log("\n[verify-credentials] Next: drop a tiny test scrape (e.g. Havoc DH top 50) to confirm end-to-end.");
  process.exit(0);
}

console.error("\n[verify-credentials] FAILED - Blizzard rejected the credentials.");
console.error(`[verify-credentials]   HTTP status   = ${result.status}`);
if (result.json?.error) console.error(`[verify-credentials]   error         = ${result.json.error}`);
if (result.json?.error_description) console.error(`[verify-credentials]   description   = ${result.json.error_description}`);
if (!result.json && result.text) console.error(`[verify-credentials]   body          = ${result.text.slice(0, 200)}`);

console.error("\n[verify-credentials] Common causes:");
console.error("  - copy/paste a trailing space or newline into .env");
console.error("  - Client ID and Secret are swapped");
console.error("  - Client registered but not yet active (can take ~30s)");
console.error("  - Client registered against a region we don't query (this project uses EU)");

process.exit(1);
