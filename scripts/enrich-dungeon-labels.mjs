// One-off: enrich plain "Mythic+" source labels with dungeon names using the
// now-working journal loot map (the map was empty since Season 2 started
// because blzFetch auto-derived a dynamic namespace for journal-* paths).
// Same truthful rules as run-once enrichEntry():
//   - M+ item in the dungeon loot table  → "Mythic+ · <Dungeon>"
//   - M+ set piece (Vault/Catalyst tier) → "Mythic+ · Tier (Vault/Catalyst)"
//   - M+ item in neither (data gap)      → keep plain "Mythic+"
// "Unknown" items stay "Unknown" — no evidence, no guessing.
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildItemDungeonMap } from "./lib/dungeon-items.mjs";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "data", "aggregated_bis.json");

console.log("building dungeon map...");
const dungeonMap = await buildItemDungeonMap();
console.log("dungeon map:", Object.keys(dungeonMap).length, "items");

const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
const stats = { dungeonNamed: 0, tierLabeled: 0, leftPlain: 0 };

function enrich(e) {
  if (!e || typeof e.source !== "string") return;
  if (!e.source.startsWith("Mythic+")) return;
  // Skip entries that already carry a "·" enrichment.
  if (e.source.includes("·")) return;
  const info = dungeonMap[e.item_id];
  if (info) {
    e.source = `Mythic+ · ${info.dungeon}`;
    e.dungeon = info.dungeon;
    e.encounter = info.encounter;
    stats.dungeonNamed++;
  } else if (e.set_name) {
    e.source = "Mythic+ · Tier (Vault/Catalyst)";
    stats.tierLabeled++;
  } else {
    stats.leftPlain++;
  }
}

for (const id of Object.keys(payload.specializations || {})) {
  const gear = payload.specializations[id].gear || {};
  for (const slot of Object.keys(gear)) {
    const entry = gear[slot];
    enrich(entry);
    for (const alt of entry?.alternatives || []) enrich(alt);
  }
}
console.log("enrichment:", JSON.stringify(stats));

const { ok, errors } = await validateAggregatedBis(payload);
if (!ok) {
  console.error("schema validation FAILED — aborting, file NOT updated:");
  for (const e of errors) console.error(" -", e.instancePath || "/", e.message);
  process.exit(3);
}
const tmp = `${OUT_PATH}.tmp`;
await writeFile(tmp, JSON.stringify(payload, null, 2));
await rename(tmp, OUT_PATH);
console.log("wrote", OUT_PATH);