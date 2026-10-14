// scripts/enrich-item-effects.mjs
// One-off data-repair script: enriches gear pieces and trinkets in
// data/aggregated_bis.json with their in-game spell/proc effects ("Equip: ...", "Use: ...")
// extracted from Blizzard equipment and static item caches.
//
// Validates against schema before writing atomically. Safe to re-run.

import { readFile, writeFile, rename, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateAggregatedBis } from "./lib/schema-validate.mjs";
import { getStaticItem } from "./lib/blizzard.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "data", "aggregated_bis.json");
const CACHE_DIR = join(ROOT, "data", "cache");

console.log("[enrich-item-effects] Loading data/aggregated_bis.json...");
const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
if (!payload?.specializations) {
  console.error("[enrich-item-effects] ERROR: Invalid aggregated_bis.json payload (no specializations).");
  process.exit(1);
}

// 1. Build dictionary of item_id -> spells from disk cache
console.log("[enrich-item-effects] Scanning disk cache for item spells...");
const cacheFiles = await readdir(CACHE_DIR);
const itemSpellsMap = new Map(); // itemId -> Array of { spell_id, name, description }

// A. From blizzard_equip_*.json
const equipFiles = cacheFiles.filter(f => f.startsWith("blizzard_equip_"));
for (const f of equipFiles) {
  try {
    const wrapped = JSON.parse(await readFile(join(CACHE_DIR, f), "utf8"));
    const data = wrapped.data || wrapped;
    for (const it of (data.equipped_items || [])) {
      if (!it.item?.id || !it.spells || it.spells.length === 0) continue;
      if (!itemSpellsMap.has(it.item.id)) {
        const spells = it.spells
          .map(s => ({
            spell_id: s.spell?.id ?? null,
            name: s.spell?.name ?? null,
            description: s.description ?? null
          }))
          .filter(s => s.description || s.name);
        if (spells.length > 0) itemSpellsMap.set(it.item.id, spells);
      }
    }
  } catch {
    // skip corrupted cache entries
  }
}

// B. From blizzard_item_*.json
const staticItemFiles = cacheFiles.filter(f => f.startsWith("blizzard_item_"));
for (const f of staticItemFiles) {
  try {
    const wrapped = JSON.parse(await readFile(join(CACHE_DIR, f), "utf8"));
    const data = wrapped.data || wrapped;
    const rawSpells = data.preview_item?.spells || data.spells;
    if (!data.id || !rawSpells || rawSpells.length === 0) continue;
    if (!itemSpellsMap.has(data.id)) {
      const spells = rawSpells
        .map(s => ({
          spell_id: s.spell?.id ?? null,
          name: s.spell?.name ?? null,
          description: s.description ?? null
        }))
        .filter(s => s.description || s.name);
      if (spells.length > 0) itemSpellsMap.set(data.id, spells);
    }
  } catch {
    // skip corrupted cache entries
  }
}

console.log(`[enrich-item-effects] Found ${itemSpellsMap.size} unique items with spells in cache.`);

// 2. Identify any primary slot items or high-popularity alternatives that are missing spells
const missingCandidateIds = new Set();
for (const spec of Object.values(payload.specializations)) {
  for (const [slot, entry] of Object.entries(spec.gear || {})) {
    if (!entry?.item_id) continue;
    if (["trinket1", "trinket2", "mainhand", "offhand"].includes(slot) && !itemSpellsMap.has(entry.item_id)) {
      missingCandidateIds.add(entry.item_id);
    }
  }
}

if (missingCandidateIds.size > 0) {
  console.log(`[enrich-item-effects] Attempting static lookup for ${missingCandidateIds.size} prominent items without cached spells...`);
  for (const itemId of missingCandidateIds) {
    try {
      const item = await getStaticItem(itemId);
      const rawSpells = item?.preview_item?.spells || item?.spells;
      if (rawSpells && rawSpells.length > 0) {
        const spells = rawSpells
          .map(s => ({
            spell_id: s.spell?.id ?? null,
            name: s.spell?.name ?? null,
            description: s.description ?? null
          }))
          .filter(s => s.description || s.name);
        if (spells.length > 0) itemSpellsMap.set(itemId, spells);
      }
    } catch {
      // 404s or network issues on specific items are fine to ignore
    }
  }
}

// 3. Enrich payload
let primaryCount = 0;
let altsCount = 0;
let specsTouched = 0;

for (const [specKey, spec] of Object.entries(payload.specializations)) {
  let specModified = false;
  for (const [slot, entry] of Object.entries(spec.gear || {})) {
    if (!entry) continue;
    if (entry.item_id && itemSpellsMap.has(entry.item_id)) {
      entry.spells = itemSpellsMap.get(entry.item_id);
      primaryCount++;
      specModified = true;
    } else {
      entry.spells = entry.spells || null;
    }

    if (entry.alternatives && entry.alternatives.length > 0) {
      for (const alt of entry.alternatives) {
        if (alt.item_id && itemSpellsMap.has(alt.item_id)) {
          alt.spells = itemSpellsMap.get(alt.item_id);
          altsCount++;
          specModified = true;
        } else {
          alt.spells = alt.spells || null;
        }
      }
    }
  }
  if (specModified) specsTouched++;
}

console.log(`[enrich-item-effects] Enriched ${primaryCount} primary items and ${altsCount} alternatives across ${specsTouched} specs.`);

// 4. Validate schema
console.log("[enrich-item-effects] Validating enriched payload against schema...");
const { ok, errors } = await validateAggregatedBis(payload);
if (!ok) {
  console.error("[enrich-item-effects] Schema validation FAILED:");
  for (const e of errors) console.error("  -", e.instancePath || "/", e.message);
  process.exit(2);
}

// 5. Atomic write
console.log("[enrich-item-effects] Writing atomically to data/aggregated_bis.json...");
const tempPath = OUT_PATH + ".tmp";
await writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
await rename(tempPath, OUT_PATH);

console.log("[enrich-item-effects] Done! All item effects successfully restored.");
