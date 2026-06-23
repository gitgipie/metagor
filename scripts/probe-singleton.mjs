import { getCharacterEquipment } from "./lib/blizzard.mjs";
const t0 = Date.now();
const r = await getCharacterEquipment('kazzak', 'shrox');
console.log('shrox/kazzak:', r ? 'OK ' + (r.equipped_items?.length || 0) + ' items' : 'FAIL', Date.now()-t0, 'ms');