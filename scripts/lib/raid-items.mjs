// scripts/lib/raid-items.mjs
// Builds a reverse map: item_id -> { raid, boss }
// by traversing journal-instance (RAID category) → journal-encounter → items[].
// Dynamically discovers all raids from the journal-instance index — no hardcoded IDs.
// When a new expansion launches, this automatically picks up the new raids.

import { blzFetch } from "./blizzard.mjs";
import { memo, readCache, writeCache, isStale } from "./cache.mjs";

const CACHE_KEY = "blizzard:item-to-raid-map";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Discover all raid journal-instance IDs for the current expansion.
// We filter by expansion name — raids from older expansions won't drop current BiS items.
async function discoverRaidInstanceIds() {
  const idx = await blzFetch("/data/wow/journal-instance/index", { region: "eu", namespace: "static-eu" });
  const raidIds = [];
  // First, find the newest expansion name by checking the last few instances
  let newestExpansion = null;
  for (const inst of (idx?.instances || []).slice(-20)) {
    try {
      const detail = await blzFetch(`/data/wow/journal-instance/${inst.id}`, { region: "eu", namespace: "static-eu" });
      const expName = detail?.expansion?.name;
      const catType = detail?.category?.type;
      if (catType === "RAID" && expName) {
        newestExpansion = expName;
      }
    } catch (e) {}
  }
  if (!newestExpansion) {
    console.warn("[raid-items] could not determine newest expansion, falling back to all raids");
  } else {
    console.log(`[raid-items] newest expansion with raids: ${newestExpansion}`);
  }

  for (const inst of (idx?.instances || [])) {
    try {
      const detail = await blzFetch(`/data/wow/journal-instance/${inst.id}`, { region: "eu", namespace: "static-eu" });
      const categoryType = detail?.category?.type;
      const modes = (detail?.modes || []).map(m => m?.mode?.name || "").join(",");
      const expansion = detail?.expansion?.name;
      // A raid has category.type=RAID and/or raid modes (Raid Finder)
      const isRaid = categoryType === "RAID" || modes.includes("Raid Finder");
      if (!isRaid) continue;
      // Only include raids from the current expansion
      if (newestExpansion && expansion !== newestExpansion) continue;
      if ((detail?.encounters || []).length > 0) {
        raidIds.push({ id: inst.id, name: inst.name });
      }
    } catch (e) {
      // skip failed instances
    }
  }
  console.log(`[raid-items] discovered ${raidIds.length} raid instances for ${newestExpansion || "all expansions"}: ${raidIds.map(r => r.name).join(", ")}`);
  return raidIds;
}

export async function buildItemRaidMap() {
  const hit = await readCache(CACHE_KEY);
  if (hit && !isStale(hit, CACHE_TTL)) return hit.data;

  const raids = await discoverRaidInstanceIds();
  const map = {};

  for (const raid of raids) {
    try {
      const inst = await blzFetch(`/data/wow/journal-instance/${raid.id}`, { region: "eu", namespace: "static-eu" });
      const raidName = inst?.name || raid.name;

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
      console.warn(`[raid-items] raid ${raid.id} (${raid.name}) failed: ${e.message}`);
    }
  }

  await writeCache(CACHE_KEY, map, CACHE_TTL);
  console.log(`[raid-items] total unique raid items mapped: ${Object.keys(map).length}`);
  return map;
}