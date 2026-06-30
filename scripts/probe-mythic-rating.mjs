// scripts/probe-mythic-rating.mjs
// Get the full season profile and look for a rating/score field.

import { blzFetch } from "./lib/blizzard.mjs";

const realm = "kazzak";
const name = "shrox";
const seasonId = 17;

// Season profile — should have the seasonal rating
console.log(`=== /profile/wow/character/${realm}/${name}/mythic-keystone-profile/season/${seasonId} ===`);
try {
  const data = await blzFetch(`/profile/wow/character/${realm}/${name}/mythic-keystone-profile/season/${seasonId}`, { region: "eu" });
  // Print all top-level keys
  console.log("top-level keys:", Object.keys(data));
  // Look for rating/score fields
  for (const k of Object.keys(data)) {
    if (k.toLowerCase().includes("rating") || k.toLowerCase().includes("score")) {
      console.log(`  ${k}:`, JSON.stringify(data[k]));
    }
  }
  // Print the full response (trimmed)
  const full = JSON.stringify(data, null, 2);
  console.log("\nFull response (first 3000 chars):");
  console.log(full.slice(0, 3000));
  // Also check best_runs for rating
  if (data.best_runs) {
    console.log(`\nbest_runs count: ${data.best_runs.length}`);
    const first = data.best_runs[0];
    console.log("first run keys:", Object.keys(first));
    if (first.mythic_rating) console.log("  mythic_rating:", JSON.stringify(first.mythic_rating));
    if (first.score) console.log("  score:", first.score);
    if (first.rating) console.log("  rating:", first.rating);
  }
} catch (e) {
  console.log(`ERR: ${e.status} ${e.message}`);
}

// Also check the current period profile for rating
console.log(`\n=== /profile/wow/character/${realm}/${name}/mythic-keystone-profile ===`);
try {
  const data = await blzFetch(`/profile/wow/character/${realm}/${name}/mythic-keystone-profile`, { region: "eu" });
  console.log("top-level keys:", Object.keys(data));
  if (data.current_period) {
    console.log("current_period keys:", Object.keys(data.current_period));
    if (data.current_period.best_runs) {
      console.log(`best_runs count: ${data.current_period.best_runs.length}`);
      const first = data.current_period.best_runs[0];
      console.log("first run keys:", Object.keys(first));
      console.log("first run rating:", JSON.stringify(first.mythic_rating));
    }
  }
} catch (e) {
  console.log(`ERR: ${e.status} ${e.message}`);
}