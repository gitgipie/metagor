// scripts/lib/dungeon-items.mjs
// Builds a reverse map: item_id -> { dungeon, encounter }
// by traversing journal-instance → journal-encounter → items[].
// Item drops are the same across regions (static data), so we build once using eu.

import { blzFetch } from "./blizzard.mjs";
import { getActiveDungeonIds } from "./leaderboard.mjs";
import { memo, readCache, writeCache, isStale } from "./cache.mjs";

const CACHE_KEY = "blizzard:item-to-dungeon-map";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export async function buildItemDungeonMap() {
  const hit = await readCache(CACHE_KEY);
  if (hit && !isStale(hit, CACHE_TTL)) return hit.data;

  const activeDungeons = await getActiveDungeonIds({ region: "eu" });
  const map = {};

  for (const dung of activeDungeons) {
    try {
      const dungData = await blzFetch(`/data/wow/mythic-keystone/dungeon/${dung.id}`, { region: "eu" });
      const journalInstanceId = dungData?.dungeon?.id;
      if (!journalInstanceId) continue;

      const inst = await blzFetch(`/data/wow/journal-instance/${journalInstanceId}`, { region: "eu" });
      const dungeonName = inst?.name || dung.name;

      for (const enc of inst?.encounters || []) {
        try {
          const encData = await blzFetch(`/data/wow/journal-encounter/${enc.id}`, { region: "eu" });
          const encounterName = encData?.name || enc.name;
          for (const item of encData?.items || []) {
            if (item?.item?.id) {
              map[item.item.id] = { dungeon: dungeonName, encounter: encounterName };
            }
          }
        } catch (e) {
          console.warn(`[dungeon-items] encounter ${enc.id} failed: ${e.message}`);
        }
      }
      console.log(`[dungeon-items] ${dungeonName}: ${Object.keys(map).length} total items mapped so far`);
    } catch (e) {
      console.warn(`[dungeon-items] dungeon ${dung.id} (${dung.name}) failed: ${e.message}`);
    }
  }

  await writeCache(CACHE_KEY, map, CACHE_TTL);
  console.log(`[dungeon-items] total unique items mapped: ${Object.keys(map).length}`);
  return map;
}

export async function getItemDungeon(itemId) {
  const map = await buildItemDungeonMap();
  return map[itemId] || null;
}