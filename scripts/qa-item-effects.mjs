// scripts/qa-item-effects.mjs
// Headless verification for item effects on tooltips and slot modals.
// Uses puppeteer-core with system Edge.

import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const DATA_DIR = join(__dirname, "..", "data");
const SHOT_DIR = join(__dirname, "..", "qa");
const PORT = 8129;
const BASE = `http://127.0.0.1:${PORT}`;

// System Edge paths
const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Users\\" + (process.env.USERNAME || "Gideon") + "\\AppData\\Local\\Microsoft\\Edge SxS\\Application\\msedge.exe"
];

function findEdge() {
  for (const p of EDGE_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

// Symlink for public/data
const WEB_ROOT = join(PUBLIC_DIR, "data");
let createdSymlink = false;
if (!existsSync(WEB_ROOT)) {
  try {
    symlinkSync(DATA_DIR, WEB_ROOT, "junction");
    createdSymlink = true;
  } catch {
    // fallback via HTTP handler
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
    if (urlPath === "/") urlPath = "/index.html";
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

server.listen(PORT);

async function run() {
  const edgePath = findEdge();
  if (!edgePath) {
    console.error("System Edge not found.");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log("[qa] Navigating to Havoc DH page...");
  await page.goto(`${BASE}/index.html#demon-hunter-havoc`, { waitUntil: "networkidle0", timeout: 15000 });

  // Wait for gear items to render
  await page.waitForSelector(".equip-slot[data-slot='trinket1']", { timeout: 10000 });
  console.log("[qa] Gear slots rendered.");

  // 1. Hover over trinket1 (Zul'jin's Guillotine Technique)
  console.log("[qa] Hovering over trinket1...");
  await page.hover(".equip-slot[data-slot='trinket1']");
  await new Promise(r => setTimeout(r, 400));

  const t1Tooltip = await page.evaluate(() => {
    const tt = document.getElementById("metagor-item-tooltip");
    if (!tt || tt.style.display !== "block") return null;
    const title = tt.querySelector(".tooltip-title")?.textContent;
    const effects = [...tt.querySelectorAll(".tooltip-effect")].map(e => e.textContent);
    const sets = [...tt.querySelectorAll(".tooltip-set-effect")].map(e => e.textContent);
    return { title, effects, sets };
  });

  console.log("[qa] Trinket1 tooltip check:", JSON.stringify(t1Tooltip, null, 2));

  // 2. Hover over trinket2 (Voracious Heart of Ula'tek)
  console.log("[qa] Hovering over trinket2...");
  await page.hover(".equip-slot[data-slot='trinket2']");
  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({ path: join(SHOT_DIR, "item-effects-tooltip.png") });
  const t2Tooltip = await page.evaluate(() => {
    const tt = document.getElementById("metagor-item-tooltip");
    if (!tt || tt.style.display !== "block") return null;
    const title = tt.querySelector(".tooltip-title")?.textContent;
    const effects = [...tt.querySelectorAll(".tooltip-effect")].map(e => e.textContent);
    return { title, effects };
  });

  console.log("[qa] Trinket2 tooltip check:", JSON.stringify(t2Tooltip, null, 2));

  // 3. Click trinket2 to open slot modal
  console.log("[qa] Clicking trinket2 to open alternatives modal...");
  await page.click(".equip-slot[data-slot='trinket2']");
  await page.waitForSelector(".slot-choice-item", { timeout: 5000 });

  const modalChecks = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".slot-choice-item")];
    const results = [];
    for (const item of items.slice(0, 5)) {
      const name = item.querySelector(".slot-choice-name")?.textContent;
      const effect = item.querySelector(".slot-choice-effect")?.textContent;
      results.push({ name, effect: effect ? effect.slice(0, 60) + "..." : null });
    }
    return results;
  });

  console.log("[qa] Modal alternatives effects check:", JSON.stringify(modalChecks, null, 2));

  if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, "item-effects-modal.png"), fullPage: false });

  await browser.close();
  server.close();
  if (createdSymlink && existsSync(WEB_ROOT)) {
    try { await rm(WEB_ROOT, { recursive: true, force: true }); } catch {}
  }

  // Assertions
  if (!t1Tooltip || !t1Tooltip.effects.length) {
    throw new Error("Trinket 1 tooltip missing effects!");
  }
  if (!t2Tooltip || !t2Tooltip.effects.length) {
    throw new Error("Trinket 2 tooltip missing effects!");
  }
  const hasModalEffects = modalChecks.some(m => m.effect);
  if (!hasModalEffects) {
    throw new Error("Modal alternatives missing effects!");
  }

  console.log("[qa] ALL ASSERTIONS PASSED! Item effects verified on tooltips & modals.");
}

run().catch(async (e) => {
  console.error("[qa] FAILED:", e);
  server.close();
  if (createdSymlink && existsSync(WEB_ROOT)) {
    try { await rm(WEB_ROOT, { recursive: true, force: true }); } catch {}
  }
  process.exit(1);
});
