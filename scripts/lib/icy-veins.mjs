// scripts/lib/icy-veins.mjs
// Scrapes consumables (flask, potions, food, weapon buff) from Icy Veins guide pages.
// URL pattern: https://www.icy-veins.com/wow/{spec}-{class}-pve-{role}-gems-enchants-consumables
// No auth required. Pages are static HTML with item names in img alt attributes.

import { RATE } from "./config.mjs";
import { memo, readCache, writeCache, isStale } from "./cache.mjs";

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
      return { flask: [], potions: [], food: [], weapon_buff: [], source: "icy-veins", error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    return parseConsumables(html, specEntry.id);
  });
}

// Parse the Icy Veins HTML to extract consumable item names.
// The page has sections: "### Flask", "### Potions", "### Food Buff", "### Augment Rune"
// Items appear as: ![Item Name Icon](url) Item Name — description
function parseConsumables(html, specId) {
  const result = { flask: [], potions: [], food: [], weapon_buff: [], source: "icy-veins" };

  // Extract item names from icon alt attributes within a section.
  // Icy Veins uses: ![Item Name Icon](icon-url) Item Name
  // We look for alt="...Icon" patterns and extract the item name from the alt text.
  const extractItems = (sectionHtml) => {
    const items = [];
    // Match img alt attributes that contain item names (end with " Icon")
    const imgRegex = /alt="([^"]+?)\s+Icon"/g;
    let match;
    while ((match = imgRegex.exec(sectionHtml)) !== null) {
      const name = match[1].trim();
      // Skip non-item icons (class icons, spec icons, ability icons)
      if (isConsumableItem(name)) {
        items.push({ name, item_id: null, note: null });
      }
    }
    return items;
  };

  // Filter out non-consumable items (class icons, ability icons, etc.)
  const CONSUMABLE_KEYWORDS = [
    "flask", "phial", "potion", "oil", "feast", "food", "rune", "augment",
    "roast", "bread", "stew", "soup", "salad", "cake", "pie", "tea",
    "cauldron", "drums", "tincture", "shard", "soul link", "healthstone",
    "health potion", "alchemist"
  ];
  function isConsumableItem(name) {
    const lower = name.toLowerCase();
    return CONSUMABLE_KEYWORDS.some(kw => lower.includes(kw));
  }

  // Split HTML into sections by "###" headers (markdown format from webfetch)
  // The sections we care about: Flask, Potions, Food Buff, Augment Rune
  const sections = splitSections(html);

  for (const { title, body } of sections) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("flask") || lowerTitle === "3.1") {
      result.flask = extractItems(body);
    } else if (lowerTitle.includes("potion")) {
      result.potions = extractItems(body);
    } else if (lowerTitle.includes("food")) {
      result.food = extractItems(body);
    } else if (lowerTitle.includes("augment") || lowerTitle.includes("rune")) {
      result.weapon_buff = extractItems(body);
    }
  }

  // If sections didn't work, try a fallback: search the whole "Optimal Consumables" area
  if (result.flask.length === 0 && result.potions.length === 0 && result.food.length === 0) {
    const consumablesSection = extractSection(html, "Optimal Consumables", "Changelog");
    if (consumablesSection) {
      // Try to find flask/potion/food by proximity to headers
      const flaskArea = extractSection(consumablesSection, "Flask", "Potions") || "";
      const potionArea = extractSection(consumablesSection, "Potions", "Food") || "";
      const foodArea = extractSection(consumablesSection, "Food", "Augment") || extractSection(consumablesSection, "Food Buff", "Augment") || "";
      const runeArea = extractSection(consumablesSection, "Augment Rune", "Other Consumables") || extractSection(consumablesSection, "Augment", "Other") || "";

      if (result.flask.length === 0) result.flask = extractItems(flaskArea);
      if (result.potions.length === 0) result.potions = extractItems(potionArea);
      if (result.food.length === 0) result.food = extractItems(foodArea);
      if (result.weapon_buff.length === 0) result.weapon_buff = extractItems(runeArea);
    }
  }

  // Deduplicate items within each category (keep first occurrence)
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

// Split markdown HTML into sections by ### headers
function splitSections(html) {
  const sections = [];
  // Match ### headers in the markdown
  const headerRegex = /###\s+(.+?)(?:\n|$)/g;
  const positions = [];
  let match;
  while ((match = headerRegex.exec(html)) !== null) {
    positions.push({ title: match[1].trim(), start: match.index + match[0].length });
  }
  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start - positions[i + 1].title.length - 5 : html.length;
    sections.push({ title: positions[i].title, body: html.slice(positions[i].start, end) });
  }
  return sections;
}

// Extract a section between two markers
function extractSection(html, startMarker, endMarker) {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return null;
  const endIdx = html.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) return html.slice(startIdx);
  return html.slice(startIdx, endIdx);
}