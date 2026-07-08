// scripts/debug-class-choice.mjs
import { blzFetch } from "./lib/blizzard.mjs";

const tree = await blzFetch("/data/wow/talent-tree/854/playable-specialization/577", { namespace: "static-eu" });

// Find the CHOICE node at row 1 col 9 in the class tree
const choiceNodes = tree.class_talent_nodes.filter(n => n.node_type?.type === "CHOICE");
console.log(`Class tree CHOICE nodes: ${choiceNodes.length}`);
for (const n of choiceNodes) {
  console.log(`\n  id=${n.id} row=${n.display_row} col=${n.display_col}`);
  const cot = n.ranks?.[0]?.choice_of_tooltips || [];
  console.log(`  choice_of_tooltips: ${cot.length}`);
  for (const c of cot) {
    console.log(`    → ${c.talent?.name} (spell ${c.spell_tooltip?.spell?.id})`);
  }
}

// Also check what the spec tree looks like at cols 15-21 to understand the layout
console.log("\n\n=== SPEC TREE LAYOUT (cols 15-21) ===");
const specNodes = tree.spec_talent_nodes.filter(n => n.display_col >= 15);
const byRow = {};
for (const n of specNodes) {
  if (!byRow[n.display_row]) byRow[n.display_row] = [];
  byRow[n.display_row].push({ col: n.display_col, name: n.ranks?.[0]?.tooltip?.talent?.name || "(CHOICE)", type: n.node_type?.type });
}
for (const row of Object.keys(byRow).sort((a,b) => a-b)) {
  const nodes = byRow[row].sort((a,b) => a.col - b.col);
  console.log(`  Row ${row}: ${nodes.map(n => `col${n.col}:${n.name}`).join("  ")}`);
}

// Hero tree layout
console.log("\n=== HERO TREE LAYOUT (Fel-Scarred) ===");
const felScarred = tree.hero_talent_trees.find(ht => ht.name === "Fel-Scarred");
const heroByRow = {};
for (const n of felScarred.hero_talent_nodes) {
  if (!heroByRow[n.display_row]) heroByRow[n.display_row] = [];
  const name = n.ranks?.[0]?.tooltip?.talent?.name;
  const cot = n.ranks?.[0]?.choice_of_tooltips || [];
  const displayName = name || (cot.length > 0 ? `[${cot.map(c => c.talent?.name).join("|")}]` : "(blank)");
  heroByRow[n.display_row].push({ col: n.display_col, name: displayName, type: n.node_type?.type });
}
for (const row of Object.keys(heroByRow).sort((a,b) => a-b)) {
  const nodes = heroByRow[row].sort((a,b) => a.col - b.col);
  console.log(`  Row ${row}: ${nodes.map(n => `col${n.col}:${n.name}`).join("  ")}`);
}

// Class tree layout
console.log("\n=== CLASS TREE LAYOUT ===");
const classByRow = {};
for (const n of tree.class_talent_nodes) {
  if (!classByRow[n.display_row]) classByRow[n.display_row] = [];
  const name = n.ranks?.[0]?.tooltip?.talent?.name;
  const cot = n.ranks?.[0]?.choice_of_tooltips || [];
  const displayName = name || (cot.length > 0 ? `[${cot.map(c => c.talent?.name).join("|")}]` : "(blank)");
  classByRow[n.display_row].push({ col: n.display_col, name: displayName, type: n.node_type?.type });
}
for (const row of Object.keys(classByRow).sort((a,b) => a-b)) {
  const nodes = classByRow[row].sort((a,b) => a.col - b.col);
  console.log(`  Row ${row}: ${nodes.map(n => `col${n.col}:${n.name}`).join("  ")}`);
}