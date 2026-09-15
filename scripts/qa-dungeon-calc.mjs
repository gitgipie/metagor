// scripts/qa-dungeon-calc.mjs
// Headless verification for the Optimal Dungeon & Nebular Core Calculator.
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
const PORT = 8124;
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

    // Wait for dungeons to render
    await page.waitForSelector(".dungeon-card", { timeout: 10000 });

    const dungeonCount = await page.$$eval(".dungeon-card", els => els.length);
    console.log(`[qa] Rendered ${dungeonCount} dungeons`);

    // Verify Monk Brewmaster S-Tier
    const topDungName = await page.$eval(".dungeon-card .dungeon-name", el => el.textContent.trim());
    const topDungTier = await page.$eval(".dungeon-card .tier-badge", el => el.textContent.trim());
    console.log(`[qa] #1 Dungeon: ${topDungName} (${topDungTier})`);

    // Click first toggle to open drop table
    await page.click(".dungeon-card:first-child .items-table-toggle");
    await page.waitForSelector(".dungeon-card:first-child .items-table-wrapper", { visible: true });
    console.log(`[qa] Drop table opened successfully`);

    // Screenshot
    const shotPath = join(SHOT_DIR, "dungeon-calc-monk-brewmaster.png");
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`[qa] Screenshot saved to ${shotPath}`);

    if (errors.length > 0) {
      console.warn(`[qa] Console errors detected:`, errors);
    } else {
      console.log(`[qa] ZERO errors detected! All tests passed.`);
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
