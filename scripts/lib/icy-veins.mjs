// scripts/lib/icy-veins.mjs
// Scrapes consumables (flask, potions, food, weapon buff) from Icy Veins guide pages.
// URL pattern: https://www.icy-veins.com/wow/{spec}-{class}-pve-{role}-gems-enchants-consumables
// No auth required. Parses raw HTML for data-wowhead="item=NNN" and descriptions.

import { RATE } from "./config.mjs";
import { memo } from "./cache.mjs";

const IV_BASE = "https://www.icy-veins.com/wow";

let lastCall = 0;
async function rateShape() {
  const wait = Math.max(0, 500 - (Date.now() - lastCall));
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
}

// Build the Icy Veins URL for a spec entry
export function icyVeinsUrl(specEntry) {
  const role = specEntry.icyveins?.role || "dps";
  return `${IV_BASE}/${specEntry.spec}-${specEntry.class}-pve-${role}-gems-enchants-consumables`;
}

// Fetch and parse the Icy Veins consumables page for a spec.
// Returns { flask: [items], potions: [items], food: [items], weapon_buff: [items], source: "icy-veins" }
// Each item: { name, item_id, description, icon }
export async function fetchConsumables(specEntry) {
  const url = icyVeinsUrl(specEntry);
  const cacheKey = `icyveins:consumables:${specEntry.id}`;

  return memo(cacheKey, RATE.cacheTtl.icyveins, async () => {
    await rateShape();
    console.log(`[icy-veins] fetching ${specEntry.id} consumables...`);
    const res = await fetch(url, {
      headers: { "User-Agent": "Meta'gor/0.1 (+https://gitgipie.github.io/metagor)" }
    });
    if (!res.ok) {
      console.warn(`[icy-veins] ${url} returned ${res.status}`);
      return { flask: [], potions: [], food: [], augment_rune: [], source: "icy-veins", error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    return parseConsumables(html);
  });
}

// Extract the icon texture name from an icy-veins image URL.
// e.g. "//static.icy-veins.com/images/wow/large_icons/inv_12_profession_alchemy_flask_sindoreipotion_red--.jpg"
// → "inv_12_profession_alchemy_flask_sindoreipotion_red--"
function extractIconFromSrc(src) {
  if (!src) return null;
  const m = src.match(/\/large_icons\/(.+?)\.jpg/i);
  return m ? m[1] : null;
}

// Parse all consumable items from the raw HTML.
// Items are in <span data-wowhead="item=NNN">Name</span> with an icon img and
// a description following after &mdash; (em dash) or in the surrounding text.
function parseConsumables(html) {
  const result = { flask: [], potions: [], food: [], augment_rune: [], source: "icy-veins" };

  // Extract the "Optimal Consumables" section (section 3)
  const ocStart = html.indexOf('id="optimal-consumables"');
  if (ocStart === -1) return result;
  const ocEnd = html.indexOf('id="changelog"', ocStart);
  const ocSection = ocEnd > 0 ? html.slice(ocStart, ocEnd) : html.slice(ocStart);

  // Find sub-sections: Flask (3.1), Potions (3.2), Food Buff (3.3), Augment Rune (3.4)
  const flaskSection = extractSubSection(ocSection, "Flask", "Potions");
  const potionSection = extractSubSection(ocSection, "Potions", "Food");
  const foodSection = extractSubSection(ocSection, "Food Buff", "Augment") || extractSubSection(ocSection, "Food", "Augment");
  const runeSection = extractSubSection(ocSection, "Augment Rune", "Other") || extractSubSection(ocSection, "Augment", "Other");

  result.flask = extractItemsFromSection(flaskSection);
  result.potions = extractItemsFromSection(potionSection);
  result.food = extractItemsFromSection(foodSection);
  result.augment_rune = extractItemsFromSection(runeSection);

  // Filter potions: only keep combat potions (exclude health potions, healthstones, cauldrons, bloodlust)
  result.potions = result.potions.filter(p => {
    const n = p.name.toLowerCase();
    return !n.includes("health potion") && !n.includes("healthstone") &&
           !n.includes("cauldron") && !n.includes("bloodlust") && !n.includes("heroism") &&
           !n.includes("drums") && !n.includes("soul link") && !n.includes("gateway") &&
           !n.includes("tincture") && !n.includes("emergency");
  });

  // Deduplicate within each category
  for (const key of Object.keys(result)) {
    if (Array.isArray(result[key])) {
      const seen = new Set();
      result[key] = result[key].filter(item => {
        if (seen.has(item.name)) return false;
        seen.add(item.name);
        return true;
      });
    }
  }

  return result;
}

// Extract a sub-section between two h3 headers.
// Looks for the header text in an <h3> tag, then takes content until the next <h3>.
function extractSubSection(html, startMarker, endMarker) {
  // Find the h3 containing the start marker
  const h3Regex = /<h3[^>]*>([^<]*)<\/h3>/gi;
  const positions = [];
  let match;
  while ((match = h3Regex.exec(html)) !== null) {
    if (match[1].toLowerCase().includes(startMarker.toLowerCase())) {
      positions.push({ type: "start", idx: match.index + match[0].length });
    }
    if (endMarker && match[1].toLowerCase().includes(endMarker.toLowerCase())) {
      positions.push({ type: "end", idx: match.index });
    }
  }
  if (positions.length === 0 || !positions.some(p => p.type === "start")) return null;
  const start = positions.find(p => p.type === "start").idx;
  const end = positions.find(p => p.type === "end")?.idx ?? html.length;
  return html.slice(start, end);
}

// Extract all items from a section's HTML.
// Pattern: <span data-wowhead="item=NNN">Name</span> &mdash; description...
// Also captures the icon from the preceding <img alt="...Icon" src="..."> tag.
function extractItemsFromSection(sectionHtml) {
  if (!sectionHtml) return [];
  const items = [];

  // Match: <img ... alt="Item Name Icon" ...> ... <span data-wowhead="item=NNN">Item Name</span> ... description
  // The data-wowhead span has the item ID and name
  // The img alt has the icon texture name embedded in the src URL
  const itemRegex = /<span[^>]*data-wowhead="item=(\d+)"[^>]*>([^<]+)<\/span>/gi;
  let match;
  while ((match = itemRegex.exec(sectionHtml)) !== null) {
    const itemId = parseInt(match[1], 10);
    const name = match[2].trim();

    // Find the description: text after the span until the next </li> or <span or end
    // Descriptions typically follow after &mdash; (em dash entity)
    let afterSpan = sectionHtml.slice(match.index + match[0].length);
    // Clean HTML: strip tags, decode entities, take first ~200 chars
    afterSpan = afterSpan.replace(/<[^>]+>/g, " ").replace(/&mdash;|&ndash;/g, "—").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    // Take text up to the next sentence boundary or 200 chars
    let desc = afterSpan.split(/(?<=[.!?])\s/)[0] || "";
    desc = desc.slice(0, 200).trim();
    // Remove leading em dash if present
    desc = desc.replace(/^—\s*/, "").trim();

    // Find the icon: look backwards from the match for the nearest <img> tag
    const beforeSpan = sectionHtml.slice(0, match.index);
    // Find the last <img> tag before this span
    const allImgs = [...beforeSpan.matchAll(/<img[^>]*src="([^"]+)"/gi)];
    let icon = null;
    if (allImgs.length > 0) {
      const lastSrc = allImgs[allImgs.length - 1][1];
      icon = extractIconFromSrc(lastSrc);
    }

    // Clean description: collapse whitespace, remove stray fragments
    desc = desc.replace(/\s+/g, " ").trim();
    // Remove descriptions that are just fragments (start with "s " or "from")
    if (desc && /^(s\s|from\s)/i.test(desc)) desc = null;

    items.push({ name, item_id: itemId, description: desc || null, icon });
  }

  return items;
}