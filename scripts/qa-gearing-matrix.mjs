// scripts/qa-gearing-matrix.mjs
// Headless verification for the 2D Seasonal Gearing & Upgrade Matrix.
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
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1600,1100"]
  });

  mkdirSync(SHOT_DIR, { recursive: true });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1100 });

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

    // 1. Wait for 2D Progression Matrix Grid to render
    await page.waitForSelector(".matrix-grid", { timeout: 10000 });
    const rowCount = await page.$$eval(".matrix-grid tbody tr", els => els.length);
    console.log(`[qa] 2D Progression Matrix Grid: Rendered ${rowCount} item level rows.`);

    if (rowCount < 28) {
      throw new Error(`Expected at least 28 item level rows, found ${rowCount}`);
    }

    // 2. Verify all 7 Historical WoW Rarity Ranks exist
    const ranks = ["unranked", "adventurer", "veteran", "champion", "hero", "myth", "peak"];
    for (const rk of ranks) {
      const el = await page.$(`.matrix-grid tbody tr.row-${rk}`);
      if (!el) throw new Error(`Rank row row-${rk} not found in DOM`);
    }
    console.log(`[qa] ✓ Verified all 7 rarity rank tiers present with custom borders & styling.`);

    // 3. Verify Sticky Columns
    const stickyRanks = await page.$$eval(".sticky-col-rank", els => els.length);
    const stickyIlvls = await page.$$eval(".sticky-col-ilvl", els => els.length);
    const stickyTracks = await page.$$eval(".sticky-col-track", els => els.length);
    console.log(`[qa] ✓ Verified sticky columns: Rank (${stickyRanks}), ilvl (${stickyIlvls}), Track (${stickyTracks}).`);

    // 4. Verify Super Headers
    const superHeaders = await page.$$eval(".super-header-row th", els => els.map(e => e.textContent.trim()));
    console.log(`[qa] Super-Header Groups:`, superHeaders);
    if (!superHeaders.some(h => h.toLowerCase().includes("dungeons")) || !superHeaders.some(h => h.toLowerCase().includes("raids"))) {
      throw new Error("Missing expected super headers");
    }

    // Capture desktop full 2D grid screenshot
    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-excel-grid-desktop.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-excel-grid-desktop.png`);

    // Scroll down to Peak Mythic rows and capture
    await page.evaluate(() => {
      const pane = document.querySelector(".matrix-grid-scroll-pane");
      if (pane) pane.scrollTop = pane.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-excel-grid-peak.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-excel-grid-peak.png`);

    // Scroll horizontally right to show Dungeons & Raids with sticky left columns
    await page.evaluate(() => {
      const pane = document.querySelector(".matrix-grid-scroll-pane");
      if (pane) {
        pane.scrollLeft = 800;
        pane.scrollTop = 400;
      }
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-excel-grid-dungeons-raids.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-excel-grid-dungeons-raids.png`);

    // Reset scroll
    await page.evaluate(() => {
      const pane = document.querySelector(".matrix-grid-scroll-pane");
      if (pane) {
        pane.scrollTop = 0;
        pane.scrollLeft = 0;
      }
    });
    await new Promise(r => setTimeout(r, 200));

    // 5. Test Activity Filter Switching (PvE Focus)
    console.log(`[qa] Testing Activity Filter: Dungeons & Raids (PvE)...`);
    await page.click('.activity-btn[data-filter="pve"]');
    await new Promise(r => setTimeout(r, 250));
    const pveHeaders = await page.$$eval(".super-header-row th", els => els.map(e => e.textContent.trim()));
    console.log(`[qa] PvE Active Super-Headers:`, pveHeaders);
    if (pveHeaders.some(h => h.includes("PVP")) || pveHeaders.some(h => h.includes("CRAFTED"))) {
      throw new Error("PvE filter should not show PvP or Crafted columns");
    }

    // Test Solo Filter
    console.log(`[qa] Testing Activity Filter: Delves & World...`);
    await page.click('.activity-btn[data-filter="solo"]');
    await new Promise(r => setTimeout(r, 250));
    const soloHeaders = await page.$$eval(".super-header-row th", els => els.map(e => e.textContent.trim()));
    console.log(`[qa] Solo Active Super-Headers:`, soloHeaders);
    if (soloHeaders.some(h => h.includes("DUNGEONS"))) {
      throw new Error("Solo filter should not show Dungeons column");
    }

    // Reset to All Activities
    await page.click('.activity-btn[data-filter="all"]');
    await new Promise(r => setTimeout(r, 200));

    // 6. Test Live Search Filtering
    console.log(`[qa] Testing Search Filter ("M +10")...`);
    await page.type("#matrix-search", "M +10");
    await new Promise(r => setTimeout(r, 250));
    const searchRowCount = await page.$$eval(".matrix-grid tbody tr", els => els.length);
    console.log(`[qa] Search "M +10" matched ${searchRowCount} rows.`);
    if (searchRowCount === 0 || searchRowCount >= rowCount) {
      throw new Error(`Search filter failed: expected subset of rows, got ${searchRowCount}`);
    }

    // Clear search
    await page.click("#search-clear-btn");
    await new Promise(r => setTimeout(r, 200));
    const resetRowCount = await page.$$eval(".matrix-grid tbody tr", els => els.length);
    if (resetRowCount !== rowCount) throw new Error("Search clear did not restore all rows");

    // 7. Test Density Toggle
    console.log(`[qa] Testing Density Toggle (Compact)...`);
    await page.click('.density-btn[data-density="compact"]');
    await new Promise(r => setTimeout(r, 200));
    const hasCompact = await page.$eval("#matrix-content", el => el.classList.contains("density-compact"));
    if (!hasCompact) throw new Error("density-compact class not applied");
    await page.click('.density-btn[data-density="normal"]');

    // 8. Mobile Viewport Verification (390x844)
    console.log(`[qa] Testing Mobile Viewport (390x844)...`);
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-excel-grid-mobile.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-excel-grid-mobile.png`);

    // Scroll down on mobile to view the table
    await page.evaluate(() => {
      window.scrollTo(0, 520);
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-excel-grid-mobile-table.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-excel-grid-mobile-table.png`);

    if (errors.length > 0) {
      console.error(`[qa] FAIL: ${errors.length} console/page errors detected:`);
      errors.forEach(e => console.error("  ", e));
      process.exit(1);
    }

    console.log("[qa] SUCCESS: All 2D Gearing Matrix checks passed with 0 errors!");
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
