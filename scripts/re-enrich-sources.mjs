// One-off: re-enrich raid + M+ source info in aggregated_bis.json from the
// freshly rebuilt journal loot maps. The old map cache (built 3 days ago)
// was missing current-tier raid drops that Blizzard's journal has since
// listed — that's why "Hexing Spiritrender"/"Tomb-Creeper's Claw" @334 showed
// bare "Raid (Heroic)" with no raid name and no BOSS line.
//
// Same enrichment rules as run-once enrichEntry():
//   M+  : dungeon map hit → "Mythic+ · <Dungeon>" (+ encounter), else
//         set piece → "Mythic+ · Tier", else plain "Mythic+"
//   Raid: raid map hit → "Raid · <Raid>" + raid/boss fields (difficulty
//         brackets are display-stripped in the UI now, not stored)
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildItemDungeonMap } from "./lib/dungeon-items.mjs";
import { buildItemRaidMap } from "./lib/raid-items.mjs";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "data", "aggregated_bis.json");

console.log("building dungeon map...");
const dungeonMap = await buildItemDungeonMap();
console.log("dungeon map:", Object.keys(dungeonMap).length, "items");
console.log("building raid map...");
const raidMap = await buildItemRaidMap();
console.log("raid map:", Object.keys(raidMap).length, "items");

const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
const stats = { raidEnriched: 0, mpDungeon: 0, mpTier: 0 };

function enrich(e) {
  if (!e || e.item_id == null) return;
  const raidInfo = raidMap[e.item_id];
  if (raidInfo) {
    // Preserve the current (bracket-free) source prefix: "Raid · X" or "Raid"
    const base = e.source?.startsWith("Raid") ? "Raid" : e.source;
    e.source = raidInfo.raid ? `Raid · ${raidInfo.raid}` : "Raid";
    e.raid = raidInfo.raid;
    e.boss = raidInfo.boss;
    stats.raidEnriched++;
    return;
  }
  if (e.source?.startsWith("Mythic+") && !e.source.includes("·")) {
    const dungInfo = dungeonMap[e.item_id];
    if (dungInfo) {
      e.source = `Mythic+ · ${dungInfo.dungeon}`;
      e.dungeon = dungInfo.dungeon;
      e.encounter = dungInfo.encounter;
      stats.mpDungeon++;
    } else if (e.set_name) {
      e.source = "Mythic+ · Tier";
      stats.mpTier++;
    }
  }
}

for (const id of Object.keys(payload.specializations || {})) {
  const gear = payload.specializations[id].gear || {};
  for (const slot of Object.keys(gear)) {
    enrich(gear[slot]);
    for (const alt of gear[slot]?.alternatives || []) enrich(alt);
  }
}
console.log("re-enrichment:", JSON.stringify(stats));

const { ok, errors } = await validateAggregatedBis(payload);
if (!ok) {
  console.error("schema validation FAILED — aborting:");
  for (const e of errors) console.error(" -", e.instancePath || "/", e.message);
  process.exit(3);
}
const tmp = `${OUT_PATH}.tmp`;
await writeFile(tmp, JSON.stringify(payload, null, 2));
await rename(tmp, OUT_PATH);
console.log("wrote", OUT_PATH);