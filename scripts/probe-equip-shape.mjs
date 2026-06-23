import { getCharacterEquipment } from "./lib/blizzard.mjs";
const r = await getCharacterEquipment('kazzak', 'shrox');
console.log(JSON.stringify(r.equipped_items[0], null, 2));