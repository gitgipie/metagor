// scripts/probe-hands.mjs
// Check what the equipment response has for the hands slot.
import { getCharacterEquipment } from "./lib/blizzard.mjs";

const equip = await getCharacterEquipment('kazzak', 'shrox');
const hand = equip.equipped_items.find(i => i.slot?.type === "HAND" || i.slot?.name?.includes("Hand") || i.inventory_type?.type === "HAND");
if (hand) {
  console.log("HAND item found:");
  console.log("  slot.type:", hand.slot?.type);
  console.log("  slot.name:", hand.slot?.name);
  console.log("  inventory_type:", JSON.stringify(hand.inventory_type));
  console.log("  name:", hand.name);
  console.log("  item.id:", hand.item?.id);
} else {
  console.log("No HAND slot found. All slots:");
  for (const it of equip.equipped_items || []) {
    console.log(`  ${it.slot?.type} = ${it.name}`);
  }
}