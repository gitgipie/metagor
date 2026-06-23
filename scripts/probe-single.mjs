import { getCharacterEquipment } from "./lib/blizzard.mjs";
const t0 = Date.now();
try {
  const r = await getCharacterEquipment('kazzak', 'shrox');
  console.log(`OK: ${r.equipped_items?.length || 0} items in ${Date.now()-t0}ms`);
} catch (e) {
  console.log(`FAIL: ${e.status} ${e.message} (${Date.now()-t0}ms)`);
}