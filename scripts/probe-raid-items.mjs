// scripts/probe-raid-items.mjs
// Check a raid encounter for item drops.

import { blzFetch } from "./lib/blizzard.mjs";

// The Voidspire - id=1307, first encounter: Imperator Averzhan - id=2733
const raidInstanceId = 1307;
const encounterId = 2733;

console.log(`=== The Voidspire / Imperator Averzhan (encounter ${encounterId}) ===`);
try {
  const enc = await blzFetch(`/data/wow/journal-encounter/${encounterId}`, { region: "eu", namespace: "static-eu" });
  console.log(`name: ${enc.name}`);
  console.log(`instance: ${enc.instance?.name}`);
  console.log(`items count: ${enc.items?.length}`);
  if (enc.items?.length) {
    console.log("\nFirst 10 items:");
    for (const item of enc.items.slice(0, 10)) {
      console.log(`  id=${item.item?.id} name="${item.item?.name}"  slot=${item.slot?.name || "?"}  class=${item.item_class?.name || "?"}`);
    }
  }
} catch (e) {
  console.log(`ERR: ${e.status} ${e.message}`);
}

// Also check the item IDs we know are raid items from the Havoc data
// neck: Rotmire's Sporeheart (from the aggregated data)
// waist: Sash of the Putrid Giant
console.log("\n=== Searching for known raid item IDs ===");
const knownRaidItems = [
  { id: 249343, name: "Gaze of the Alnseer" },  // trinket, might be raid
  { id: 251082, name: "Snapvine Cinch" },       // waist
];

// Fetch all encounters from all Midnight raids and build the reverse map
const midnightRaids = [
  { id: 1307, name: "The Voidspire" },
  { id: 1308, name: "March on Quel'Danas" },
  { id: 1314, name: "The Dreamrift" },
  { id: 1305, name: "Sporefall" },
  { id: 1312, name: "Midnight" },
];

const itemToRaid = {};
for (const raid of midnightRaids) {
  try {
    const inst = await blzFetch(`/data/wow/journal-instance/${raid.id}`, { region: "eu", namespace: "static-eu" });
    for (const enc of (inst?.encounters || [])) {
      try {
        const encData = await blzFetch(`/data/wow/journal-encounter/${enc.id}`, { region: "eu", namespace: "static-eu" });
        for (const item of (encData?.items || [])) {
          if (item?.item?.id) {
            itemToRaid[item.item.id] = { raid: raid.name, boss: encData.name };
          }
        }
      } catch (e) {
        console.warn(`  encounter ${enc.id} failed: ${e.status}`);
      }
    }
    console.log(`  ${raid.name}: ${Object.keys(itemToRaid).length} total items mapped`);
  } catch (e) {
    console.warn(`  raid ${raid.id} (${raid.name}) failed: ${e.status}`);
  }
}

console.log(`\nTotal raid items mapped: ${Object.keys(itemToRaid).length}`);
// Check if our known raid items are in the map
for (const { id, name } of knownRaidItems) {
  const found = itemToRaid[id];
  console.log(`  ${name} (id=${id}): ${found ? `${found.raid} / ${found.boss}` : "NOT FOUND"}`);
}