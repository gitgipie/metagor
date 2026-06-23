// Minimal zero-dependency static file server.
// - Serves public/* at the document root (so index.html and ./styles/... resolve naturally).
// - Serves data/* from /data/* (the frontend fetches ./data/aggregated_bis.json).
// Run: node scripts/serve.mjs [port]

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(__dirname, "..");
const PUBLIC_DIR = join(PROJECT, "public");
const DATA_DIR   = join(PROJECT, "data");
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon",
  ".woff2": "font/woff2"
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const target = normalize(join(root, decoded));
  // Ensure target stays inside root (no .. escape).
  if (!target.startsWith(root + sep) && target !== root) return null;
  return target;
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url || "/";

    // Two roots: /data/* maps to data/, everything else maps to public/.
    let filePath;
    if (url === "/" || url === "") {
      filePath = join(PUBLIC_DIR, "index.html");
    } else if (url.startsWith("/data/")) {
      filePath = safeJoin(DATA_DIR, url.slice("/data".length));
    } else {
      filePath = safeJoin(PUBLIC_DIR, url);
    }

    if (!filePath) {
      res.writeHead(403, { "content-type": "text/plain" });
      res.end("forbidden");
      return;
    }

    const st = await stat(filePath).catch(() => null);
    if (!st || !st.isFile()) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found: " + url);
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store, must-revalidate",
      "pragma": "no-cache",
      "expires": "0"
    });
    res.end(body);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("error: " + e.message);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[serve] Meta'gor on http://localhost:${PORT}/`);
  console.log(`[serve] public root: ${PUBLIC_DIR}`);
  console.log(`[serve] data   root: ${DATA_DIR}  (served at /data/...)`);
});