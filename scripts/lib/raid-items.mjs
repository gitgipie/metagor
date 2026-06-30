// scripts/lib/raid-items.mjs
// Builds a reverse map: item_id -> { raid, boss }
// by traversing journal-instance (RAID category) → journal-encounter → items[].
// Covers all Midnight expansion raids.

import { blzFetch } from "./blizzard.mjs";
import { memo, readCache, writeCache, isStale } from "./cache.mjs";

const CACHE_KEY = "blizzard:item-to-raid-map";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Midnight expansion raid instance IDs (discovered via journal-instance/index).
// These are the instances with category.type = "RAID" and expansion = "Midnight".
const MIDNIGHT_RAID_IDS = [
  1307,  // The Voidspire (6 encounters)
  1308,  // March on Quel'Danas (2 encounters)
  1314,  // The Dreamrift (1 encounter)
  1305,  // Sporefall (1 encounter)
  1312,  // Midnight (4 encounters)
];

export async function buildItemRaidMap() {
  const hit = await readCache(CACHE_KEY);
  if (hit && !isStale(hit, CACHE_TTL)) return hit.data;

  const map = {};

  for (const raidId of MIDNIGHT_RAID_IDS) {
    try {
      const inst = await blzFetch(`/data/wow/journal-instance/${raidId}`, { region: "eu", namespace: "static-eu" });
      const raidName = inst?.name || `Raid ${raidId}`;

      for (const enc of (inst?.encounters || [])) {
        try {
          const encData = await blzFetch(`/data/wow/journal-encounter/${enc.id}`, { region: "eu", namespace: "static-eu" });
          const bossName = encData?.name || enc.name;
          for (const item of (encData?.items || [])) {
            if (item?.item?.id) {
              map[item.item.id] = { raid: raidName, boss: bossName };
            }
          }
        } catch (e) {
          console.warn(`[raid-items] encounter ${enc.id} failed: ${e.message}`);
        }
      }
      console.log(`[raid-items] ${raidName}: ${Object.keys(map).length} total items mapped so far`);
    } catch (e) {
      console.warn(`[raid-items] raid ${raidId} failed: ${e.message}`);
    }
  }

  await writeCache(CACHE_KEY, map, CACHE_TTL);
  console.log(`[raid-items] total unique raid items mapped: ${Object.keys(map).length}`);
  return map;
}