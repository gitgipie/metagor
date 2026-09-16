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
      console.log(`[browser ${msg.type()}] ${msg.text()}`);
      if (msg.type() === "error") errors.push(msg.text());
    });

    console.log(`[qa] Navigating to ${BASE}/gearing-matrix.html`);
    await page.goto(`${BASE}/gearing-matrix.html`, { waitUntil: "networkidle2" });

    // 1. Wait for Table View to render
    await page.waitForSelector(".matrix-table", { timeout: 10000 });
    const rowCount = await page.$$eval(".matrix-table tbody tr", els => els.length);
    console.log(`[qa] Matrix Table View: Rendered ${rowCount} rows.`);

    if (rowCount < 20) {
      throw new Error(`Expected at least 20 matrix rows, found ${rowCount}`);
    }

    // Capture desktop table screenshot
    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-table-desktop.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-table-desktop.png`);

    // 2. Test Search Filtering
    console.log(`[qa] Testing search filter for "+10"...`);
    await page.type("#matrix-search", "+10");
    await new Promise(r => setTimeout(r, 400));
    const filteredCount = await page.$$eval(".matrix-table tbody tr", els => els.length);
    console.log(`[qa] Search filtered rows down to ${filteredCount}.`);

    // Clear search
    await page.evaluate(() => {
      const input = document.getElementById("matrix-search");
      input.value = "";
      input.dispatchEvent(new Event("input"));
    });
    await new Promise(r => setTimeout(r, 400));

    // 3. Test Activity Filter Pills
    console.log(`[qa] Testing Activity pill click (Mythic+)...`);
    await page.click('.filter-pill[data-activity="mythic_plus"]');
    await new Promise(r => setTimeout(r, 300));
    const mplusRowCount = await page.$$eval(".matrix-table tbody tr", els => els.length);
    console.log(`[qa] Mythic+ filtered rows: ${mplusRowCount}`);

    // Reset activity to all
    await page.click('.filter-pill[data-activity="all"]');

    // 4. Test Mode Switcher: Activity Milestones
    console.log(`[qa] Testing Milestones mode switch...`);
    await page.click('.matrix-mode-btn[data-mode="milestones"]');
    await page.waitForSelector(".milestone-card", { timeout: 5000 });
    const cardCount = await page.$$eval(".milestone-card", els => els.length);
    console.log(`[qa] Milestones Mode: Rendered ${cardCount} cards.`);

    await page.screenshot({ path: join(SHOT_DIR, "gearing-matrix-milestones-desktop.png"), fullPage: false });
    console.log(`[qa] Saved qa/gearing-matrix-milestones-desktop.png`);

    // 5. Test Mode Switcher: Upgrade Calculator
    console.log(`[qa] Testing Upgrade Calculator mode switch...`);
    await page.click('.matrix-mode-btn[data-mode="calculator"]');
    await page.waitForSelector("#upgrade-ladder .ladder-step", { timeout: 5000 });
    const stepCount = await page.$$eval("#upgrade-ladder .ladder-step", els => els.length);
    console.log(`[qa] Calculator Mode: Rendered ${stepCount} ladder steps.`);

    // Switch back to Table view
    await page.click('.matrix-mode-btn[data-mode="table"]');
    await page.waitForSelector(".matrix-table", { timeout: 5000 });

    // 6. Mobile Viewport Verification
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

    console.log("[qa] SUCCESS: All Gearing & Upgrade Matrix checks passed with 0 errors!");
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
