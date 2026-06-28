// scripts/probe-dungeon-items.mjs
// Probe journal-encounter for item drop lists.

import { blzFetch } from "./lib/blizzard.mjs";
import { getActiveDungeonIds } from "./lib/leaderboard.mjs";

const active = await getActiveDungeonIds();
const firstDung = active[0]; // Skyreach
const dung = await blzFetch(`/data/wow/mythic-keystone/dungeon/${firstDung.id}`, { namespace: "dynamic-eu" });
const journalInstanceId = dung?.dungeon?.id;

const inst = await blzFetch(`/data/wow/journal-instance/${journalInstanceId}`, { namespace: "static-eu" });
console.log(`Journal instance: ${inst.name} (${inst.encounters.length} encounters)`);

// Probe the first encounter
const firstEncId = inst.encounters[0].id;
console.log(`\n=== /data/wow/journal-encounter/${firstEncId} ===`);
const enc = await blzFetch(`/data/wow/journal-encounter/${firstEncId}`, { namespace: "static-eu" });
console.log("keys:", Object.keys(enc));
console.log("name:", enc?.name);
console.log("creatures:", enc?.creatures?.length || 0);
console.log("items count:", enc?.items?.length);

if (enc?.items?.length) {
  console.log("\nFirst 5 items dropped by this encounter:");
  for (const item of enc.items.slice(0, 5)) {
    console.log(`  ${item.item?.id}: ${item.item?.name}  slot=${item.slot?.name || "?"}  cls=${item.item_class?.name}`);
  }
}

// Now build the full reverse map for this dungeon
console.log(`\n=== Full item map for ${inst.name} ===`);
const itemToDungeon = new Map();
for (const e of inst.encounters) {
  const encData = await blzFetch(`/data/wow/journal-encounter/${e.id}`, { namespace: "static-eu" });
  console.log(`  Encounter: ${e.name} (${encData.items?.length || 0} items)`);
  for (const item of encData?.items || []) {
    if (item?.item?.id) {
      itemToDungeon.set(item.item.id, { dungeon: inst.name, encounter: e.name });
    }
  }
}
console.log(`\nTotal items mapped for ${inst.name}: ${itemToDungeon.size}`);
console.log("Sample:", [...itemToDungeon.entries()].slice(0, 3).map(([k,v]) => `${k} -> ${v.dungeon} / ${v.encounter}`).join("\n  "));