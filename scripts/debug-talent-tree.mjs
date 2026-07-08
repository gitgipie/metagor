// scripts/debug-talent-tree.mjs
import { blzFetch } from "./lib/blizzard.mjs";

// Fetch the full Havoc talent tree
const url = "/data/wow/talent-tree/854/playable-specialization/577";
const tree = await blzFetch(url, { namespace: "static-eu" });

// Check spec tree nodes at row 2, col 11 and row 4, col 9
const checkPositions = [[2, 11], [4, 9], [6, 11], [5, 9]];

for (const [row, col] of checkPositions) {
  const nodes = tree.spec_talent_nodes.filter(n => n.display_row === row && n.display_col === col);
  console.log(`\n=== Spec tree row=${row} col=${col} (${nodes.length} nodes) ===`);
  for (const n of nodes) {
    const name = n.ranks?.[0]?.tooltip?.talent?.name || "(unnamed)";
    const type = n.node_type?.type;
    const cot = n.ranks?.[0]?.choice_of_tooltips || [];
    console.log(`  id=${n.id} type=${type} name=${name} choice_of_tooltips=${cot.length}`);
    for (const c of cot) {
      console.log(`    → ${c.talent?.name}`);
    }
  }
}

// Also check hero tree Fel-Scarred nodes with blank names
console.log("\n=== Fel-Scarred hero nodes with blank names ===");
const felScarred = tree.hero_talent_trees.find(ht => ht.name === "Fel-Scarred");
for (const n of felScarred.hero_talent_nodes) {
  const name = n.ranks?.[0]?.tooltip?.talent?.name;
  if (!name) {
    const cot = n.ranks?.[0]?.choice_of_tooltips || [];
    console.log(`  id=${n.id} row=${n.display_row} col=${n.display_col} type=${n.node_type?.type} choice_of_tooltips=${cot.length}`);
    for (const c of cot) {
      console.log(`    → ${c.talent?.name}`);
    }
  }
}