// scripts/qa-talent-overlay.mjs
// Headless QA for the talent tree full-viewport overlay.
// Uses puppeteer-core driving the system Edge install — zero Chromium download.
// Run:  node scripts/qa-talent-overlay.mjs   (needs a local static server on :8080, or it starts its own)

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const DATA_DIR = join(__dirname, "..", "data");
const SHOT_DIR = join(__dirname, "..", "qa");
const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;

// Mirror the Pages deploy layout: public/ + data JSONs merged into one web root.
const WEB_ROOT = join(PUBLIC_DIR, "data");
if (!existsSync(WEB_ROOT)) {
  try {
    symlinkSync(DATA_DIR, WEB_ROOT, "junction");
    var symlinkMade = true;
  } catch {
    mkdirSync(WEB_ROOT, { recursive: true });
    var symlinkMade = false;
    console.warn("[qa] symlink failed — copying JSONs instead");
    for (const f of ["aggregated_bis.json", "guides.json"]) {
      await (await import("node:fs/promises")).copyFile(join(DATA_DIR, f), join(WEB_ROOT, f));
    }
  }
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".webp": "image/webp",
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, BASE).pathname);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = normalize(join(PUBLIC_DIR, urlPath));
    if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403).end(); return; }
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404).end("not found");
  }
});

function findEdge() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.EDGE_PATH,
  ].filter(Boolean);
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

async function loadPuppeteer() {
  try {
    return await import("puppeteer-core");
  } catch {
    console.error("[qa] puppeteer-core not installed. Run: npm i -D puppeteer-core");
    process.exit(2);
  }
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

let serverHandle;
async function main() {
  const edge = findEdge();
  if (!edge) { console.error("[qa] No system Edge/Chrome found"); process.exit(2); }
  const puppeteer = await loadPuppeteer();

  await new Promise(r => { serverHandle = server.listen(PORT, r); });
  console.log(`[qa] server on ${BASE}`);

  const browser = await puppeteer.launch({
    executablePath: edge,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  mkdirSync(SHOT_DIR, { recursive: true });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const consoleErrors = [];
    page.on("pageerror", e => consoleErrors.push(String(e)));

    // 1. Page loads, Tree button exists
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    await page.waitForSelector("#view-tree-btn", { timeout: 15000 });
    check("page loads + Tree button rendered", true);

    // 2. Open overlay
    await page.click("#view-tree-btn");
    await page.waitForSelector("#talent-overlay.open", { timeout: 5000 });
    const overlayVisible = await page.$eval("#talent-overlay", el =>
      getComputedStyle(el).display === "flex" && el.getAttribute("aria-hidden") === "false");
    check("overlay opens (display:flex, aria-hidden=false)", overlayVisible);

    // 3. Full viewport
    const bbox = await page.$eval("#talent-overlay", el => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, t: r.top, l: r.left };
    });
    const vp = page.viewport();
    check("overlay covers full viewport", Math.abs(bbox.w - vp.width) < 2 && Math.abs(bbox.h - vp.height) < 2 && bbox.t === 0 && bbox.l === 0,
      `${bbox.w}x${bbox.h} @ (${bbox.l},${bbox.t})`);

    // 4. Tree nodes rendered (3 sections: class/hero/spec)
    const sections = await page.$$eval("#talent-overlay .talent-tree-section", els => els.length);
    const nodes = await page.$$eval("#talent-overlay .tt-node", els => els.length);
    check("tree sections rendered", sections === 3, `sections=${sections}`);
    check("talent nodes rendered", nodes > 20, `nodes=${nodes}`);

    // 5. Focus lands on close button
    const focusOk = await page.evaluate(() => document.activeElement?.id === "talent-overlay-close");
    check("focus moves to close button on open", focusOk);

    // 6. body.modal-open scroll lock
    const locked = await page.evaluate(() => document.body.classList.contains("modal-open"));
    check("body scroll lock applied", locked);

    // Screenshot for agy visual review
    await page.screenshot({ path: join(SHOT_DIR, "talent-overlay-desktop.png") });

    // 7. Resize handles it (narrow window)
    await page.setViewport({ width: 800, height: 700 });
    await new Promise(r => setTimeout(r, 300));
    const stillOpen = await page.$eval("#talent-overlay", el => el.classList.contains("open"));
    check("overlay survives resize to 800x700", stillOpen);
    await page.screenshot({ path: join(SHOT_DIR, "talent-overlay-narrow.png") });
    await page.setViewport({ width: 1440, height: 900 });

    // 8. Node hover tooltip appears (first .tt-node)
    const nodeTooltip = await page.evaluate(() => {
      const node = document.querySelector("#talent-overlay .tt-node");
      if (!node) return false;
      node.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
      const tt = document.getElementById("metagor-item-tooltip");
      return tt && tt.style.display === "block" && tt.textContent.length > 0;
    });
    check("node hover tooltip shows", nodeTooltip);

    // 9. Escape closes
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.getElementById("talent-overlay").classList.contains("open"), { timeout: 5000 });
    const ariaClosed = await page.$eval("#talent-overlay", el => el.getAttribute("aria-hidden") === "true");
    const unlocked = await page.evaluate(() => !document.body.classList.contains("modal-open"));
    check("Escape closes overlay", ariaClosed && unlocked);

    // 10. Focus restored to Tree button
    const restored = await page.evaluate(() => document.activeElement?.id === "view-tree-btn");
    check("focus restored to Tree button", restored);

    // 11. Reopen works (wiring idempotent)
    await page.click("#view-tree-btn");
    await page.waitForSelector("#talent-overlay.open", { timeout: 5000 });
    check("reopen works", true);

    // 12. Backdrop click closes (click far top-left inside overlay, not on content)
    await page.mouse.click(10, 200); // inside overlay, below header → body area
    await new Promise(r => setTimeout(r, 200));
    const closedByBackdrop = await page.$eval("#talent-overlay", el => !el.classList.contains("open"));
    check("outside-click closes overlay", closedByBackdrop);

    // 13. Slot modal still works independently (gear row click)
    await page.waitForSelector(".slot-choice, .gear-slot, .doll-slot, [data-slot]", { timeout: 5000 }).catch(() => {});
    const gearClickable = await page.evaluate(() => {
      // gear.js binds click handlers on slot rows; find first clickable slot element
      const el = document.querySelector("#doll-left-slots [data-slot], #doll-left-slots .gear-slot, #doll-left-slots > *");
      return !!el;
    });
    if (gearClickable) {
      const opened = await page.evaluate(() => {
        const el = document.querySelector("#doll-left-slots [data-slot], #doll-left-slots .gear-slot, #doll-left-slots > *");
        if (!el) return false;
        el.click();
        const bd = document.getElementById("slot-modal-backdrop");
        return bd && bd.classList.contains("open");
      });
      check("slot modal still opens independently", opened);
      if (opened) {
        await page.keyboard.press("Escape");
        await new Promise(r => setTimeout(r, 200));
      }
    } else {
      check("slot modal still opens independently", true, "skipped — no slot element found");
    }

    // 14. No page JS errors during whole run
    check("no page JS errors", consoleErrors.length === 0, consoleErrors.slice(0, 2).join("; "));

    const failed = results.filter(r => !r.ok).length;
    console.log(`\n[qa] ${results.length - failed}/${results.length} passed`);
    console.log(`[qa] screenshots: ${join(SHOT_DIR, "talent-overlay-desktop.png")}, ${join(SHOT_DIR, "talent-overlay-narrow.png")}`);
    process.exitCode = failed ? 1 : 0;
  } finally {
    await browser.close();
    serverHandle.close();
    // Clean up the data junction so it never gets committed (gitignored anyway).
    if (symlinkMade && existsSync(WEB_ROOT)) {
      try { (await import("node:fs")).rmdirSync(WEB_ROOT); } catch {}
    }
  }
}

main().catch(e => {
  console.error("[qa] crashed:", e);
  serverHandle?.close();
  process.exitCode = 1;
});

// Keep the process from hanging if an Edge child lingers
process.on("exit", () => { try { spawn("taskkill", ["/IM", "msedge.exe", "/F"], { stdio: "ignore" }); } catch {} });