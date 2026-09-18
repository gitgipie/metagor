// scripts/qa-gearing-matrix.mjs
// Headless verification for the Seasonal Gearing & Upgrade Matrix.
// Uses puppeteer-core with system Edge, saves QA screenshots to qa/.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const DATA_DIR = join(__dirname, "..", "data");
const SHOT_DIR = join(__dirname, "..", "qa");
const PORT = 8127;
const BASE = `http://127.0.0.1:${PORT}`;

// Web root setup
const WEB_ROOT = join(PUBLIC_DIR, "data");
if (!existsSync(WEB_ROOT)) {
  try {
    symlinkSync(DATA_DIR, WEB_ROOT, "junction");
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
    if (urlPath === "/") urlPath = "/gearing-matrix.html";
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
    page.on("pageerror", err => {
      console.error("[browser error]", err);
      errors.push(String(err));
    });
    page.on("console", msg => {
      if (msg.type() === "error") {
        console.error(`[browser error] ${msg.text()}`);
        errors.push(msg.text());
      }
    });

    console.log(`[qa] Navigating to ${BASE}/gearing-matrix.html`);
    await page.goto(`${BASE}/gearing-matrix.html`, { waitUntil: "networkidle2" });

    // 1. Wait for Visual Progression Graph to render
    await page.waitForSelector(".graph-matrix-view", { timeout: 10000 });
    const bracketCount = await page.$$eval(".tier-bracket", els => els.length);
    console.log(`[qa] Visual Progression Graph: Rendered ${bracketCount} tier brackets.`);

    if (bracketCount !== 7) {
      throw new Error(`Expected 7 rarity tier brackets, found ${bracketCount}`);
    }

    // Verify Peak Mythic bracket exists
    const hasPeakBracket = await page.$(".tier-bracket.bracket-peak");
    if (!hasPeakBracket) throw new Error("Peak Mythic bracket not found in DOM");
    console.log(`[qa] ✓ Verified Peak Mythic bracket present with flame highlights.`);

    // Capture desktop visual graph screenshot
    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-graph-desktop.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-graph-desktop.png`);

    // 2. Test Path Tracing (Mythic+ Dungeons)
    console.log(`[qa] Testing Path Tracing for Mythic+ Dungeons...`);
    await page.click('.path-btn[data-path="mplus"]');
    await new Promise(r => setTimeout(r, 300));
    const highlightedNodes = await page.$$eval(".flow-node.highlighted", els => els.length);
    const dimmedNodes = await page.$$eval(".flow-node.dimmed", els => els.length);
    console.log(`[qa] Path Traced: ${highlightedNodes} highlighted nodes, ${dimmedNodes} dimmed nodes.`);

    if (highlightedNodes === 0) throw new Error("No nodes were highlighted for mplus path");

    // Reset path trace to all
    await page.click('.path-btn[data-path="all"]');
    await new Promise(r => setTimeout(r, 200));

    // 3. Test Mode Switcher: Milestones View
    console.log(`[qa] Testing Milestones mode switch...`);
    await page.click('.matrix-mode-btn[data-mode="milestones"]');
    await page.waitForSelector(".milestone-card", { timeout: 5000 });
    const cardCount = await page.$$eval(".milestone-card", els => els.length);
    console.log(`[qa] Milestones Mode: Rendered ${cardCount} cards.`);

    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-milestones-desktop.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-milestones-desktop.png`);

    // 4. Test Mode Switcher: Raw Data Table View
    console.log(`[qa] Testing Raw Data Table mode switch...`);
    await page.click('.matrix-mode-btn[data-mode="table"]');
    await page.waitForSelector(".matrix-table", { timeout: 5000 });
    const rowCount = await page.$$eval(".matrix-table tbody tr", els => els.length);
    console.log(`[qa] Table Mode: Rendered ${rowCount} rows.`);

    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-table-desktop.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-table-desktop.png`);

    // Switch back to Graph view
    await page.click('.matrix-mode-btn[data-mode="graph"]');
    await page.waitForSelector(".graph-matrix-view", { timeout: 5000 });

    // 5. Mobile Viewport Verification
    console.log(`[qa] Testing Mobile Viewport (390x844)...`);
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-mobile.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-mobile.png`);

    if (errors.length > 0) {
      console.error(`[qa] FAIL: ${errors.length} console/page errors detected:`);
      errors.forEach(e => console.error("  ", e));
      process.exit(1);
    }

    console.log("[qa] SUCCESS: All Visual Gearing Matrix checks passed with 0 errors!");
  } finally {
    await browser.close();
    server.close();
    if (existsSync(WEB_ROOT)) {
      try { (await import("node:fs")).rmdirSync(WEB_ROOT); } catch {}
    }
  }
}

main().catch(err => {
  console.error("[qa] Error:", err);
  server.close();
  process.exit(1);
});
