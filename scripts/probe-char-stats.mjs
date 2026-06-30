// scripts/probe-char-stats.mjs
// Get the actual stat values from Blizzard's character statistics endpoint.
import { blzFetch } from "./lib/blizzard.mjs";

const chars = [
  ["kazzak", "shrox"],
  ["kazzak", "reloss"],
  ["kazzak", "oradusa"],
  ["kazzak", "mageeij"],
  ["kazzak", "grallidan"],
];

const STAT_FIELDS = ["melee_crit", "melee_haste", "mastery", "versatility", "agility", "stamina"];
const sums = {};
for (const f of STAT_FIELDS) sums[f] = 0;

let count = 0;
for (const [realm, name] of chars) {
  try {
    const data = await blzFetch(`/profile/wow/character/${realm}/${name}/statistics`, { region: "eu" });
    count++;
    const vals = {};
    for (const f of STAT_FIELDS) {
      const v = data?.[f];
      vals[f] = typeof v === "object" ? v?.effective || v?.rating || v?.value || 0 : (v || 0);
      sums[f] += vals[f];
    }
    console.log(`${name}/${realm}: agi=${vals.agility} sta=${vals.stamina} crit=${vals.melee_crit} haste=${vals.melee_haste} mastery=${vals.mastery} vers=${vals.versatility}`);
  } catch (e) {
    console.log(`${name}/${realm}: ${e.status || "ERR"}`);
  }
}

console.log(`\n=== AVERAGES across ${count} characters ===`);
for (const f of STAT_FIELDS) {
  const avg = Math.round(sums[f] / count);
  console.log(`  ${f}: avg=${avg}`);
}

// Calculate the secondary stat distribution as percentages
const secondaryTotal = sums.melee_crit + sums.melee_haste + sums.mastery + sums.versatility;
console.log(`\nSecondary distribution (percentages):`);
const pct = {
  crit: Math.round((sums.melee_crit / secondaryTotal) * 1000) / 10,
  haste: Math.round((sums.melee_haste / secondaryTotal) * 1000) / 10,
  mastery: Math.round((sums.mastery / secondaryTotal) * 1000) / 10,
  versatility: Math.round((sums.versatility / secondaryTotal) * 1000) / 10,
};
console.log(`  crit: ${pct.crit}%  haste: ${pct.haste}%  mastery: ${pct.mastery}%  vers: ${pct.versatility}%`);
console.log(`  Priority: ${Object.entries(pct).sort((a,b) => b[1] - a[1]).map(e => e[0]).join(" > ")}`);