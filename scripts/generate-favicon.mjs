// Render the Meta'gor master emblem (public/images/logo-emblem.png) to favicon raster sizes.
// Usage: node scripts/generate-favicon.mjs
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico"; // ESM: default import is callable

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MASTER_PATH = join(ROOT, "public", "images", "logo-emblem.png");
const OUT_DIR = join(ROOT, "public", "images");
const PUBLIC_DIR = join(ROOT, "public");

const masterBuffer = await readFile(MASTER_PATH);

// Rasterize the master emblem at each favicon size
const sizes = [16, 32, 48, 180];
for (const size of sizes) {
  let pipeline = sharp(masterBuffer)
    .resize(size, size, { kernel: "lanczos3" });

  // Subtle unsharp mask on small sizes to maximize shield & rune legibility
  if (size <= 48) {
    pipeline = pipeline.sharpen({ sigma: 0.5, m1: 1.0, m2: 2.0 });
  }

  const png = await pipeline.png().toBuffer();
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
console.log("wrote public/images/favicon.ico (16/32/48)");

await copyFile(join(OUT_DIR, "favicon.ico"), join(PUBLIC_DIR, "favicon.ico"));
console.log("copied to root public/favicon.ico");