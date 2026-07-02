// scripts/test-talent-tree.mjs
import { findSpec } from "./lib/config.mjs";
import { fetchTalentTree } from "./lib/talent-tree.mjs";

const spec = findSpec("demon-hunter-havoc");
console.log(`Testing talent tree fetch for ${spec.id}...`);
const tree = await fetchTalentTree(spec.blizzardClassId, spec.blizzardSpecId);
console.log(`Class nodes: ${tree.classNodes.length}`);
console.log(`Spec nodes: ${tree.specNodes.length}`);
console.log(`Hero trees: ${tree.heroTrees.length}`);
console.log("");
console.log("Class nodes with icons:", tree.classNodes.filter(n => n.icon).length);
console.log("Class nodes without icons:", tree.classNodes.filter(n => !n.icon).length);
console.log("");
// Show a few with and without icons
const withIcon = tree.classNodes.find(n => n.icon);
const withoutIcon = tree.classNodes.find(n => n.name && !n.icon);
if (withIcon) console.log("With icon:", withIcon.name, withIcon.icon);
if (withoutIcon) console.log("Without icon:", withoutIcon.name, withoutIcon.spell_id, withoutIcon.icon);