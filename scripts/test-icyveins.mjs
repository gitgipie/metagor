// scripts/test-icyveins.mjs
import { findSpec } from "./lib/config.mjs";
import { fetchConsumables } from "./lib/icy-veins.mjs";

const spec = findSpec("demon-hunter-havoc");
const result = await fetchConsumables(spec);

for (const [cat, items] of Object.entries(result)) {
  if (!Array.isArray(items)) continue;
  console.log(`\n=== ${cat} ===`);
  for (const item of items) {
    console.log(`  ${item.name} (id=${item.item_id})`);
    console.log(`    icon: ${item.icon}`);
    console.log(`    desc: ${item.description}`);
  }
}