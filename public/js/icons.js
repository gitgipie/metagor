// public/js/icons.js
// Shared icon URL helper. Blizzard's media API changed: item icons now come
// back as numeric file_data_ids (rendered via the Blizzard CDN), while older
// cache entries and Icy-Veins-sourced consumables still carry Wowhead texture
// names. Every renderer funnels through here so both formats resolve.

const QUESTIONMARK_LARGE = "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
const QUESTIONMARK_MEDIUM = "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg";

// A file_data_id icon arrives as a number or a digit-only string ("7679655").
function isFileDataId(icon) {
  if (icon == null) return false;
  const s = String(icon);
  return s !== "" && /^[0-9]+$/.test(s);
}

// Blizzard render CDN sizes: 18, 36, 56. zamimg: small/medium/large.
// size: "large" | "medium" | "small"
export function iconUrl(icon, size = "large") {
  if (!icon) return size === "medium" ? QUESTIONMARK_MEDIUM : QUESTIONMARK_LARGE;
  if (isFileDataId(icon)) {
    const px = size === "large" ? 56 : size === "medium" ? 36 : 18;
    return `https://render.worldofwarcraft.com/eu/icons/${px}/${icon}.jpg`;
  }
  return `https://wow.zamimg.com/images/wow/icons/${size}/${icon}.jpg`;
}

// Numeric CDN icon? Used by onerror fallbacks that try zamimg first.
export function isBlizzardCdnIcon(icon) {
  return isFileDataId(icon);
}

export { QUESTIONMARK_LARGE, QUESTIONMARK_MEDIUM };