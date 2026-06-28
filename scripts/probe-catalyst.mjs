// scripts/probe-catalyst.mjs
// Check context + name_description for tier set items across multiple characters
// to understand how Catalyst items are flagged.

import { getCharacterEquipment } from "./lib/blizzard.mjs";

const equip = await getCharacterEquipment('kazzak', 'shrox');
console.log("=== shrox/kazzak: items with set_name ===");
for (const it of equip.equipped_items || []) {
  if (it?.set?.item_set?.name) {
    console.log(`  slot=${(it.slot?.type || "").padEnd(12)} ctx=${String(it.context).padEnd(3)} desc="${it.name_description?.display_string || "—"}"  set=${it.set.item_set.name}  name=${it.name}`);
  }
}

// Also check a second character for comparison
console.log("\n=== Checking another character ===");
const equip2 = await getCharacterEquipment('tarren-mill', 'eledrill');
if (equip2?.equipped_items) {
  for (const it of equip2.equipped_items || []) {
    if (it?.set?.item_set?.name) {
      console.log(`  slot=${(it.slot?.type || "").padEnd(12)} ctx=${String(it.context).padEnd(3)} desc="${it.name_description?.display_string || "—"}"  set=${it.set.item_set.name}  name=${it.name}`);
    }
  }
} else {
  console.log("  (profile private or not found)");
}