// scripts/probe-feet.mjs
// Check if item 250035 appears in ANY journal encounter across all active dungeons
import { buildItemDungeonMap } from "./lib/dungeon-items.mjs";
import { blzFetch } from "./lib/blizzard.mjs";
import { getActiveDungeonIds } from "./lib/leaderboard.mjs";

const targetItemId = 250035;
const active = await getActiveDungeonIds();
console.log(`Searching for item ${targetItemId} across all active dungeons...\n`);

for (const dung of active) {
  try {
    const dungData = await blzFetch(`/data/wow/mythic-keystone/dungeon/${dung.id}`, { namespace: "dynamic-eu" });
    const journalInstanceId = dungData?.dungeon?.id;
    if (!journalInstanceId) continue;
    const inst = await blzFetch(`/data/wow/journal-instance/${journalInstanceId}`, { namespace: "static-eu" });
    const dungeonName = inst?.name || dung.name;
    
    for (const enc of inst?.encounters || []) {
      const encData = await blzFetch(`/data/wow/journal-encounter/${enc.id}`, { namespace: "static-eu" });
      const found = (encData?.items || []).find(i => i?.item?.id === targetItemId);
      if (found) {
        console.log(`  FOUND in ${dungeonName} - ${enc.name}: ${found.item.name}`);
      }
      // Also check for similar item IDs (maybe the M+ version has a different ID)
      const similar = (encData?.items || []).filter(i => i?.item?.name?.includes("Devouring Reaver") || i?.item?.name?.includes("Soul Flatten"));
      if (similar.length) {
        console.log(`  Similar in ${dungeonName} - ${enc.name}:`);
        for (const s of similar) console.log(`    id=${s.item.id} name=${s.item.name}`);
      }
    }
  } catch (e) {}
}
console.log("\nDone.");