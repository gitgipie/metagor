#!/usr/bin/env node
// scripts/build.mjs
// Cross-platform production site staging script for Meta'gor.
// Copies public/ and required runtime data/ JSONs into _site/ (for GitHub Pages and Cloudflare Pages).
//
// Usage: node scripts/build.mjs [output_directory] (defaults to "_site")

import { existsSync, rmSync, mkdirSync, cpSync, statSync, readdirSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const DATA_DIR = join(ROOT, "data");

const OUT_DIR_NAME = process.argv[2] || process.env.BUILD_OUT_DIR || "_site";
const OUT_DIR = resolve(ROOT, OUT_DIR_NAME);

const REQUIRED_DATA_FILES = [
  "aggregated_bis.json",
  "guides.json",
  "season_matrix.json"
];

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function countFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(join(dir, entry.name));
    } else if (entry.isFile()) {
      count++;
    }
  }
  return count;
}

console.log(`[build] Starting Meta'gor production build -> ${OUT_DIR_NAME}/`);
const startTime = performance.now();

// 1. Validate source prerequisites
if (!existsSync(PUBLIC_DIR)) {
  console.error(`[build] ERROR: public/ directory not found at ${PUBLIC_DIR}`);
  process.exit(1);
}

for (const file of REQUIRED_DATA_FILES) {
  const filePath = join(DATA_DIR, file);
  if (!existsSync(filePath)) {
    console.error(`[build] ERROR: Required data file not found: ${filePath}`);
    process.exit(1);
  }
}

// 2. Clean and create output directory
if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true, force: true });
}
mkdirSync(OUT_DIR, { recursive: true });

// 3. Copy public/ directory contents to output root, ignoring any temp public/data junction
cpSync(PUBLIC_DIR, OUT_DIR, {
  recursive: true,
  dereference: false,
  filter: (src) => {
    const rel = relative(PUBLIC_DIR, src);
    if (!rel) return true;
    const topSegment = rel.split(sep)[0];
    if (topSegment === "data") {
      return false; // ignore temporary public/data junction used in headless tests
    }
    return true;
  }
});
console.log(`[build] Copied public/ assets to ${OUT_DIR_NAME}/`);

// 4. Copy required data JSON files into _site/data/
const outDataDir = join(OUT_DIR, "data");
mkdirSync(outDataDir, { recursive: true });

for (const file of REQUIRED_DATA_FILES) {
  const src = join(DATA_DIR, file);
  const dest = join(outDataDir, file);
  cpSync(src, dest);
  const size = statSync(dest).size;
  console.log(`[build] Staged data/${file} (${formatBytes(size)})`);
}

const totalFiles = countFiles(OUT_DIR);
const elapsed = (performance.now() - startTime).toFixed(1);

console.log(`[build] Build complete! Staged ${totalFiles} files in ${elapsed}ms -> ${OUT_DIR}`);
