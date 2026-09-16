// scripts/qa-dungeon-calc.mjs
// Headless verification for the Optimal Dungeon, Raid & Target Calculator.
// Uses puppeteer-core with system Edge, saves QA screenshots to qa/.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync, symlinkSync, rmdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const DATA_DIR = join(__dirname, "..", "data");
const SHOT_DIR = join(__dirname, "..", "qa");
const PORT = 8125;
const BASE = `http://127.0.0.1:${PORT}`;

// Web root setup
const WEB_ROOT = join(PUBLIC_DIR, "data");
let symlinkMade = false;
if (!existsSync(WEB_ROOT)) {
  try {
    symlinkSync(DATA_DIR, WEB_ROOT, "junction");
    symlinkMade = true;
  } catch {
    console.warn("[qa] symlink failed — data fetched via ../data fallback");
  }
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".svg": "image/svg+xml"
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, BASE).pathname);
    if (urlPath === "/") urlPath = "/dungeon-calculator.html";
    let filePath;
    if (urlPath.startsWith("/data/")) {
      filePath = join(DATA_DIR, urlPath.slice(6));
    } else {
      filePath = join(PUBLIC_DIR, urlPath);
    }

    if (!existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found: " + urlPath);
      return;
    }

    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server Error: " + err.message);
  }
});

function findEdge() {
  const candidates = [
    process.env.EDGE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome"
  ].filter(Boolean);
  return candidates.find(p => existsSync(p));
}

async function main() {
  const edge = findEdge();
  if (!edge) throw new Error("No browser executable found");

  await new Promise(r => server.listen(PORT, r));
  console.log(`[qa] Server running on ${BASE}`);

  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: edge,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1100"]
  });

  mkdirSync(SHOT_DIR, { recursive: true });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100 });

    const errors = [];
    page.on("pageerror", err => errors.push(String(err)));
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    console.log(`[qa] Navigating to ${BASE}/dungeon-calculator.html`);
    await page.goto(`${BASE}/dungeon-calculator.html`, { waitUntil: "networkidle2" });

    // 1. Wait for dungeons to render
    await page.waitForSelector(".dungeon-card", { timeout: 10000 });
    const dungeonCount = await page.$$eval(".dungeon-card", els => els.length);
    console.log(`[qa] Dungeons Mode: Rendered ${dungeonCount} dungeons`);

    const adviceCount = await page.$$eval(".loot-spec-advice", els => els.length);
    const sampleAdvice = await page.$eval(".loot-spec-advice", el => el.textContent.trim());
    console.log(`[qa] Loot spec advice rendered on ${adviceCount} cards. Sample: "${sampleAdvice}"`);

    // 2. Click Raid Bosses filter button
    console.log(`[qa] Switching to Raid Bosses mode...`);
    await page.click('[data-mode="raids"]');
    await page.waitForSelector(".target-type-badge.raid", { timeout: 5000 });
    const raidBossCount = await page.$$eval(".dungeon-card", els => els.length);
    const topRaidBoss = await page.$eval(".dungeon-card .dungeon-name", el => el.textContent.trim());
    const topRaidTier = await page.$eval(".dungeon-card .tier-badge", el => el.textContent.trim());
    console.log(`[qa] Raid Mode: Rendered ${raidBossCount} bosses. #1 Boss: ${topRaidBoss} (${topRaidTier})`);

    // 3. Open drop table of top raid boss
    await page.click(".dungeon-card:first-child .items-table-toggle");
    await page.waitForSelector(".dungeon-card:first-child .items-table-wrapper", { visible: true });

    // Verify Spec Drop Badges in table
    const specBadgesCount = await page.$$eval(".dungeon-card:first-child .spec-icon-badge", els => els.length);
    const eligibleBadgesCount = await page.$$eval(".dungeon-card:first-child .spec-icon-badge.eligible", els => els.length);
    const ineligibleBadgesCount = await page.$$eval(".dungeon-card:first-child .spec-icon-badge.ineligible", els => els.length);
    console.log(`[qa] Top Boss Drop Table: ${specBadgesCount} spec icons rendered (${eligibleBadgesCount} eligible, ${ineligibleBadgesCount} grayed out)`);
    if (specBadgesCount === 0 || eligibleBadgesCount === 0) {
      throw new Error("No spec drop badges rendered in table!");
    }

    // 4. Hover over an item to trigger tooltip
    console.log(`[qa] Testing item hover tooltip...`);
    await page.hover(".dungeon-card:first-child .item-row:first-child");
    await page.waitForSelector("#metagor-item-tooltip", { visible: true });
    const ttHtml = await page.$eval("#metagor-item-tooltip", el => el.innerHTML);
    const ttHasTitle = ttHtml.includes("tooltip-title");
    const ttHasStats = ttHtml.includes("tooltip-stats");
    console.log(`[qa] Tooltip displayed: hasTitle=${ttHasTitle}, hasStats=${ttHasStats}`);

    // Screenshot of Raid view with open drop table showing spec icons
    const raidShotPath = join(SHOT_DIR, "dungeon-calc-raids-brewmaster.png");
    await page.screenshot({ path: raidShotPath, fullPage: true });
    console.log(`[qa] Saved screenshot to ${raidShotPath}`);

    // 5. Click Combined Targets filter button
    console.log(`[qa] Switching to Combined Targets mode...`);
    await page.click('[data-mode="both"]');
    await page.waitForFunction(() => {
      const badges = document.querySelectorAll(".target-type-badge");
      const types = Array.from(badges).map(b => b.textContent);
      return types.includes("Raid Boss") && types.includes("Mythic+ Dungeon");
    }, { timeout: 5000 });

    const combinedCount = await page.$$eval(".dungeon-card", els => els.length);
    const topCombinedName = await page.$eval(".dungeon-card:first-child .dungeon-name", el => el.textContent.trim());
    const topCombinedType = await page.$eval(".dungeon-card:first-child .target-type-badge", el => el.textContent.trim());
    console.log(`[qa] Combined Mode: Rendered ${combinedCount} targets. #1 Target: ${topCombinedName} [${topCombinedType}]`);

    const combinedShotPath = join(SHOT_DIR, "dungeon-calc-combined-brewmaster.png");
    await page.screenshot({ path: combinedShotPath, fullPage: true });
    console.log(`[qa] Saved screenshot to ${combinedShotPath}`);

    if (errors.length > 0) {
      console.warn(`[qa] Console errors detected:`, errors);
      process.exitCode = 1;
    } else {
      console.log(`[qa] ZERO errors detected! All tests passed.`);
      process.exitCode = 0;
    }

  } finally {
    await browser.close();
    server.close();
    if (symlinkMade && existsSync(WEB_ROOT)) {
      try { rmdirSync(WEB_ROOT); } catch {}
    }
  }
}

main().catch(err => {
  console.error("[qa] Crash:", err);
  server.close();
  process.exit(1);
});
