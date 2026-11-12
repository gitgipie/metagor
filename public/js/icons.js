// public/js/icons.js
// Shared icon URL helper. Every icon is served from Blizzard's render CDN
// (render.worldofwarcraft.com), which accepts either a numeric file_data_id
// (Blizzard media API) or a texture name (Icy-Veins consumables, spec/class
// icons, older cache entries). We deliberately do NOT hotlink Wowhead's image
// CDN (wow.zamimg.com). Every renderer funnels through here.

const CDN = "https://render.worldofwarcraft.com/eu/icons";

// Blizzard render CDN sizes: 18, 36, 56. size: "large" | "medium" | "small"
const PX = { large: 56, medium: 36, small: 18 };

const QUESTIONMARK_LARGE = `${CDN}/56/inv_misc_questionmark.jpg`;
const QUESTIONMARK_MEDIUM = `${CDN}/36/inv_misc_questionmark.jpg`;

// A file_data_id icon arrives as a number or a digit-only string ("7679655").
function isFileDataId(icon) {
  if (icon == null) return false;
  const s = String(icon);
  return s !== "" && /^[0-9]+$/.test(s);
}

// Texture names are [a-z0-9_-]; anything else is rejected so a bad value in
// the data can never alter the URL path.
function isTextureName(icon) {
  return /^[A-Za-z0-9_-]+$/.test(String(icon));
}

export function iconUrl(icon, size = "large") {
  const px = PX[size] || PX.large;
  if (!icon || !(isFileDataId(icon) || isTextureName(icon))) {
    return size === "medium" ? QUESTIONMARK_MEDIUM : `${CDN}/${px}/inv_misc_questionmark.jpg`;
  }
  return `${CDN}/${px}/${String(icon).toLowerCase()}.jpg`;
}

// Numeric CDN icon?
export function isBlizzardCdnIcon(icon) {
  return isFileDataId(icon);
}

export { QUESTIONMARK_LARGE, QUESTIONMARK_MEDIUM };
