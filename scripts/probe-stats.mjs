// scripts/probe-stats.mjs
// Check what stat data we get from Blizzard's equipment API across a few characters.
// Sum all secondary stat ratings to see if that gives a better stat priority.

import { getCharacterEquipment } from "./lib/blizzard.mjs";
import { normalizeEquipment } from "./lib/aggregate.mjs";

const chars = [
  ["kazzak", "shrox"],
  ["kazzak", "reloss"],
  ["kazzak", "oradusa"],
  ["kazzak", "mageeij"],
  ["kazzak", "grallidan"],
];

const totals = { crit: 0, haste: 0, mastery: 0, versatility: 0 };
const STAT_MAP = {
  CRIT_RATING: "crit",
  HASTE_RATING: "haste",
  MASTERY_RATING: "mastery",
  VERSATILITY: "versatility"
};

let charCount = 0;
for (const [realm, name] of chars) {
  try {
    const equip = await getCharacterEquipment(realm, name);
    const items = normalizeEquipment(equip);
    const charStats = { crit: 0, haste: 0, mastery: 0, versatility: 0 };
    for (const slot of Object.keys(items)) {
      const stats = items[slot]?.stats || [];
      for (const s of stats) {
        const key = STAT_MAP[s.type];
        if (key) charStats[key] += s.value || 0;
      }
    }
    charCount++;
    console.log(`${name}/${realm}: crit=${charStats.crit} haste=${charStats.haste} mastery=${charStats.mastery} vers=${charStats.versatility}`);
    for (const k of Object.keys(totals)) totals[k] += charStats[k];
  } catch (e) {
    console.log(`${name}/${realm}: ${e.status || "ERR"}`);
  }
}

console.log(`\n=== SUMS across ${charCount} characters ===`);
const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
for (const [stat, val] of sorted) {
  const avg = Math.round(val / charCount);
  console.log(`  ${stat}: total=${val}  avg=${avg}/char`);
}
console.log(`\nPriority: ${sorted.map(s => s[0]).join(" > ")}`);