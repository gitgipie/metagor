// scripts/probe-char-stats.mjs
// Verify: use rating_normalized for all 4 secondaries, average across characters.

import { blzFetch } from "./lib/blizzard.mjs";

const chars = [
  ["kazzak", "shrox"],
  ["kazzak", "reloss"],
  ["kazzak", "oradusa"],
  ["kazzak", "mageeij"],
  ["kazzak", "grallidan"],
];

const sums = { crit: 0, haste: 0, mastery: 0, versatility: 0 };
let count = 0;

for (const [realm, name] of chars) {
  try {
    const data = await blzFetch(`/profile/wow/character/${realm}/${name}/statistics`, { region: "eu" });
    count++;
    const crit = data?.melee_crit?.rating_normalized ?? 0;
    const haste = data?.melee_haste?.rating_normalized ?? 0;
    const mastery = data?.mastery?.rating_normalized ?? 0;
    const vers = data?.versatility ?? 0;
    sums.crit += crit; sums.haste += haste; sums.mastery += mastery; sums.versatility += vers;
    console.log(`${name}/${realm}: crit=${crit} haste=${haste} mastery=${mastery} vers=${vers}`);
  } catch (e) {
    console.log(`${name}/${realm}: ${e.status || "ERR"}`);
  }
}

const total = sums.crit + sums.haste + sums.mastery + sums.versatility;
console.log(`\n=== AVERAGES (raw rating) across ${count} characters ===`);
for (const [k, v] of Object.entries(sums)) {
  console.log(`  ${k}: avg=${Math.round(v/count)}  (${Math.round(v/total*1000)/10}% of total)`);
}
console.log(`Priority: ${Object.entries(sums).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).join(" > ")}`);