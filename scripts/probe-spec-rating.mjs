// scripts/probe-spec-rating.mjs
// Find a character who plays multiple specs and show per-spec rating breakdown.

import { blzFetch } from "./lib/blizzard.mjs";

// Try a few DH characters to find one that plays both Havoc and Vengeance
const candidates = [
  ["kazzak", "shrox"],
  ["kazzak", "reloss"],
  ["kazzak", "oradusa"],
  ["tarren-mill", "eledrill"],
  ["kazzak", "grallidan"],
  ["kazzak", "mageeij"],
  ["hyjal", "crazzylock"],
];

for (const [realm, name] of candidates) {
  try {
    const data = await blzFetch(`/profile/wow/character/${realm}/${name}/mythic-keystone-profile/season/17`, { region: "eu" });
    if (!data?.best_runs) continue;
    
    // Find which specs this character played
    const specs = new Set();
    for (const run of data.best_runs) {
      const me = (run.members || []).find(m => 
        m.character?.name?.toLowerCase() === name.toLowerCase() &&
        m.character?.realm?.slug === realm
      );
      if (me?.specialization?.name) specs.add(me.specialization.name);
    }
    
    console.log(`${name}/${realm}: overall=${data.mythic_rating?.rating?.toFixed(2)}  specs=[${[...specs].join(", ")}]`);
    
    // If multi-spec, break down per-spec
    if (specs.size > 1) {
      console.log("  MULTI-SPEC — calculating per-spec rating:\n");
      
      for (const specName of specs) {
        // Best run per dungeon for this spec only
        const byDungeon = new Map();
        for (const run of data.best_runs) {
          const me = (run.members || []).find(m => 
            m.character?.name?.toLowerCase() === name.toLowerCase() &&
            m.character?.realm?.slug === realm
          );
          if (me?.specialization?.name !== specName) continue;
          const dung = run.dungeon?.name;
          const rating = run.mythic_rating?.rating || 0;
          if (!byDungeon.has(dung) || rating > byDungeon.get(dung)) {
            byDungeon.set(dung, rating);
          }
        }
        const specTotal = [...byDungeon.values()].reduce((a,b) => a+b, 0);
        console.log(`  ${specName}: best-per-dungeon sum = ${specTotal.toFixed(2)} (${byDungeon.size} dungeons)`);
      }
      console.log();
    }
  } catch (e) {
    console.log(`${name}/${realm}: ${e.status || "ERR"}`);
  }
}