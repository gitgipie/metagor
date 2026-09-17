import { copyFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BRAIN_SRC = "C:/Users/Gideon/.gemini/antigravity/brain/f88f3272-eab2-4b3c-ab4a-7f12c5a7c494/.user_uploaded/media_1789649744100.png";
const DESIGN_SRC = join(ROOT, "design", "manaflux-source.png");
const OUT_PATH = join(ROOT, "public", "images", "venomblight-manaflux.png");

// Ensure source is saved to design/
try {
  await copyFile(BRAIN_SRC, DESIGN_SRC);
  console.log("Saved master reference to design/manaflux-source.png");
} catch (e) {
  // If running in CI or without brain path, design/manaflux-source.png is already present
}

const CROP_LEFT = 5;
const CROP_TOP = 5;
const CROP_WIDTH = 302;
const CROP_HEIGHT = 301;

const cropped = await sharp(DESIGN_SRC)
  .extract({ left: CROP_LEFT, top: CROP_TOP, width: CROP_WIDTH, height: CROP_HEIGHT })
  .raw()
  .toBuffer({ resolveWithObject: true });

const { data, info } = cropped;

// Clear background on 4 beveled corners outside the icon border
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const idx = (y * info.width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const inCornerZone = (x < 25 || x > info.width - 25) && (y < 25 || y > info.height - 25);
    if (inCornerZone) {
      const isBg = (b > 150 && g > 150 && (b - r > 10 || r > 210));
      if (isBg) {
        data[idx + 3] = 0; // Transparent
      }
    }
  }
}

// Generate crisp 128x128 PNG icon
await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4
  }
})
  .resize(128, 128)
  .png({ compressionLevel: 9 })
  .toFile(OUT_PATH);

console.log("Generated public/images/venomblight-manaflux.png (128x128)");
