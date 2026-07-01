// scripts/test-icyveins.mjs
// Quick test: fetch and parse Icy Veins consumables for Havoc DH.

import { findSpec } from "./lib/config.mjs";
import { fetchConsumables } from "./lib/icy-veins.mjs";

const spec = findSpec("demon-hunter-havoc");
console.log(`Testing Icy Veins scraper for ${spec.id}...`);
console.log(`URL: https://www.icy-veins.com/wow/${spec.spec}-${spec.class}-pve-${spec.icyveins.role}-gems-enchants-consumables`);

const result = await fetchConsumables(spec);
console.log("\n=== Results ===");
console.log("Flask:", result.flask.map(f => f.name));
console.log("Potions:", result.potions.map(p => p.name));
console.log("Food:", result.food.map(f => f.name));
console.log("Weapon Buff:", result.weapon_buff.map(w => w.name));
console.log("Error:", result.error || "none");