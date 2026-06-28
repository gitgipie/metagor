// scripts/probe-item-source.mjs
// Collect name_description + context values across multiple characters and slots
// to build a source classifier.

import { getCharacterEquipment } from "./lib/blizzard.mjs";

const equip = await getCharacterEquipment('kazzak', 'shrox');
console.log("=== shrox/kazzak: all slots ===");
for (const it of equip.equipped_items || []) {
  console.log(`${(it.slot?.type || "").padEnd(12)} ctx=${String(it.context).padEnd(3)} desc="${it.name_description?.display_string || "—"}"  name=${it.name}`);
}