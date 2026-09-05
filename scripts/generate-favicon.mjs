// One-off: render the approved Meta'gor emblem SVG to favicon raster sizes.
// Usage: node scripts/generate-favicon.mjs
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";  // ESM: default import is the callable

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SVG_PATH = join(ROOT, "public", "images", "logo-mark.svg");
const OUT_DIR = join(ROOT, "public", "images");

const svgBuffer = await readFile(SVG_PATH);

// Rasterize the mark at each size (transparent background — the SVG carries
// its own dark plate so it reads on any tab color).
const sizes = [16, 32, 48, 180];
for (const size of sizes) {
  const png = await sharp(svgBuffer, { density: 96 * (size / 64) })
    .resize(size, size)
    .png()
    .toBuffer();
  const name = size === 180 ? "apple-touch-icon.png" : `favicon-${size}.png`;
  await writeFile(join(OUT_DIR, name), png);
  console.log(`wrote ${name} (${size}x${size})`);
}

// .ico bundles 16/32/48 from the PNGs (legacy browser + tab fallback)
const ico = await pngToIco([
  await readFile(join(OUT_DIR, "favicon-16.png")),
  await readFile(join(OUT_DIR, "favicon-32.png")),
  await readFile(join(OUT_DIR, "favicon-48.png")),
]);
await writeFile(join(OUT_DIR, "favicon.ico"), ico);
console.log("wrote favicon.ico (16/32/48)");