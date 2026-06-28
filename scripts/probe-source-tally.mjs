// scripts/probe-source-tally.mjs
import { getCharacterEquipment } from "./lib/blizzard.mjs";
import { normalizeEquipment } from "./lib/aggregate.mjs";

// Fetch 10 characters that are likely in the top 50 and check their head sources
const chars = [
  ['kazzak', 'shrox'], ['kazzak', 'reloss'], ['kazzak', 'oradusa'],
  ['kazzak', 'mageeij'], ['hyjal', 'crazzylock'], ['kazzak', 'meshroot'],
  ['tarren-mill', 'eledrill'], ['kazzak', 'hinoiki'], ['silvermoon', 'sarjokhe'],
  ['kazzak', 'grallidan']
];

const sourceTally = new Map();
for (const [realm, name] of chars) {
  try {
    const equip = await getCharacterEquipment(realm, name);
    const items = normalizeEquipment(equip);
    const head = items.head;
    if (head?.id === 250033) {
      const src = head.source || "Unknown";
      sourceTally.set(src, (sourceTally.get(src) || 0) + 1);
      console.log(`  ${name}/${realm}: source=${src}  desc=${head.name_description}`);
    } else if (head?.id) {
      console.log(`  ${name}/${realm}: DIFFERENT item: ${head.name} (id=${head.id})`);
    }
  } catch (e) {
    console.log(`  ${name}/${realm}: ${e.status || "ERR"}`);
  }
}

console.log("\nSource tally for head item (id=250033):");
for (const [src, cnt] of [...sourceTally.entries()].sort((a,b) => b[1] - a[1])) {
  console.log(`  ${cnt}x  ${src}`);
}