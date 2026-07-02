// scripts/lib/talent-tree.mjs
// Fetches the full talent tree structure (class + spec + hero nodes) from Blizzard's API.
// Each node has display_row, display_col, node_type, unlocks (connections), and talent/spell info.
// Cached 7 days (tree structure rarely changes between patches).

import { RATE, nsStatic, REGION } from "./config.mjs";
import { memo } from "./cache.mjs";
import { blzFetch } from "./blizzard.mjs";

// Fetch the spec talent tree (includes class_talent_nodes, spec_talent_nodes, hero_talent_trees).
// The treeId and specId come from the Blizzard talent-tree index endpoint.
export async function fetchTalentTree(blizzardClassId, blizzardSpecId, region = REGION) {
  const cacheKey = `blizzard:talent-tree:${blizzardClassId}:${blizzardSpecId}:${region}`;

  return memo(cacheKey, 7 * 24 * 60 * 60 * 1000, async () => {
    // Step 1: Find the talent tree ID for this class from the talent-tree index.
    // The index has class names ("Demon Hunter"), not IDs, so we need a class name lookup.
    const index = await blzFetch("/data/wow/talent-tree/", { region, namespace: nsStatic(region) });

    // Map Blizzard class IDs to the names used in the talent tree index
    const CLASS_NAMES = {
      1: "Warrior", 2: "Paladin", 3: "Hunter", 4: "Rogue", 5: "Priest",
      6: "Death Knight", 7: "Shaman", 8: "Mage", 9: "Warlock", 10: "Monk",
      11: "Druid", 12: "Demon Hunter", 13: "Evoker"
    };
    const className = CLASS_NAMES[blizzardClassId];
    if (!className) throw new Error(`talent-tree: unknown classId ${blizzardClassId}`);

    // Find the class tree entry by name
    const classTree = (index?.class_talent_trees || []).find(t => t.name === className);
    if (!classTree) throw new Error(`talent-tree: could not find class tree for ${className}`);

    // Extract tree ID from the key href
    const treeId = classTree.key?.href?.match(/talent-tree\/(\d+)/)?.[1];
    if (!treeId) throw new Error(`talent-tree: could not extract treeId from href`);

    // Step 2: Fetch the spec talent tree
    const specTree = await blzFetch(`/data/wow/talent-tree/${treeId}/playable-specialization/${blizzardSpecId}`, {
      region, namespace: nsStatic(region)
    });

    // Step 3: Collect all unique spell IDs from all nodes (for icon resolution)
    const allNodes = [
      ...(specTree.class_talent_nodes || []),
      ...(specTree.spec_talent_nodes || []),
      ...(specTree.hero_talent_trees || []).flatMap(ht => ht.hero_talent_nodes || [])
    ];
    const spellIds = new Set();
    for (const n of allNodes) {
      // Main spell
      const spellId = n?.ranks?.[0]?.tooltip?.spell_tooltip?.spell?.id;
      if (spellId) spellIds.add(spellId);
      // Choice option spells (for CHOICE nodes with choice_of_tooltips)
      const choiceSpells = n?.ranks?.[0]?.choice_of_tooltips || [];
      for (const c of choiceSpells) {
        const cs = c?.spell_tooltip?.spell?.id;
        if (cs) spellIds.add(cs);
      }
    }

    // Step 4: Resolve spell icons in bulk via the spell media API
    const iconMap = {};
    for (const spellId of spellIds) {
      try {
        const media = await blzFetch(`/data/wow/media/spell/${spellId}`, { region, namespace: nsStatic(region) });
        const iconAsset = media?.assets?.find(a => a.key === "icon");
        if (iconAsset?.value) {
          const m = iconAsset.value.match(/\/icons\/\d+\/(.+?)\.jpg/i);
          if (m) iconMap[spellId] = m[1];
        }
      } catch (e) { /* skip failed spell media */ }
    }

    // Step 5: Extract class nodes, spec nodes, and hero trees with icons.
    // Collect all hero talent names for filtering in the spec/class tree merge.
    const allHeroTalentNames = new Set();
    for (const ht of (specTree.hero_talent_trees || [])) {
      for (const n of (ht.hero_talent_nodes || [])) {
        const name = n?.ranks?.[0]?.tooltip?.talent?.name;
        if (name) allHeroTalentNames.add(name);
      }
    }

    // For positions with multiple nodes (CHOICE slots), merge into one node with options.
    // The heroTalentNames set is passed so mergeChoiceNodes prefers spec talents
    // over hero talent variants as the display name.
    const classNodes = mergeChoiceNodes(
      (specTree.class_talent_nodes || []).map(n => extractNode(n, iconMap)),
      allHeroTalentNames
    );

    // Spec nodes: only rows <= 6 (rows 7+ are hero talent trees)
    const rawSpecNodes = (specTree.spec_talent_nodes || [])
      .filter(n => n.display_row <= 6)
      .map(n => extractNode(n, iconMap));
    const specNodes = mergeChoiceNodes(rawSpecNodes, allHeroTalentNames);

    // Hero talent trees — each has embedded hero_talent_nodes (already filtered per tree)
    const heroTrees = (specTree.hero_talent_trees || []).map(ht => ({
      id: ht.id,
      name: ht.name,
      nodes: mergeChoiceNodes((ht.hero_talent_nodes || []).map(n => extractNode(n, iconMap)))
    }));

    return { classNodes, specNodes, heroTrees, treeId };
  });
}

// Merge nodes at the same row,col position. Blizzard's talent tree has CHOICE
// nodes (with choice_of_tooltips containing the actual spec talent options)
// plus hero talent variants at the same position.
// We prefer the CHOICE node's own choice_options (these are the real spec tree
// options) over hero talent PASSIVE nodes that share the same position.
function mergeChoiceNodes(nodes, heroTalentNames = null) {
  const byPos = new Map();
  for (const n of nodes) {
    const key = `${n.row},${n.col}`;
    if (!byPos.has(key)) byPos.set(key, []);
    byPos.get(key).push(n);
  }
  const result = [];
  for (const [, group] of byPos) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    // Find the CHOICE node — it has the real spec/class tree options
    const choiceNode = group.find(n => n.type === "CHOICE" && n.choice_options && n.choice_options.length > 0);
    // Find named non-hero-talent nodes (for the display name/icon)
    let named;
    if (heroTalentNames) {
      named = group.find(n => n.name && !heroTalentNames.has(n.name) && n.type !== "CHOICE");
    }
    if (!named) named = group.find(n => n.name && n.type !== "CHOICE");
    // If choice_node has options, use them as the choices
    const merged = choiceNode || named || group[0];
    if (choiceNode) {
      // Use the CHOICE node's own choice_options as the choices
      merged.choices = choiceNode.choice_options.map(c => ({ ...c, selected: false }));
    } else {
      // Fallback: collect named nodes as choices
      merged.choices = group.filter(n => n.name).map(n => ({
        name: n.name, icon: n.icon, spell_id: n.spell_id, selected: n.selected,
        description: n.description, cast_time: n.cast_time
      }));
    }
    // If no name on the merged node, get the first choice's name
    if (!merged.name && merged.choices && merged.choices[0]) {
      merged.name = merged.choices[0].name;
      merged.icon = merged.choices[0].icon;
      merged.spell_id = merged.choices[0].spell_id;
      merged.description = merged.choices[0].description;
    }
    result.push(merged);
  }
  return result;
}

// Extract a talent node into a compact format for the frontend.
function extractNode(n, iconMap = {}) {
  const rank = n.ranks?.[0];
  const tooltip = rank?.tooltip;
  const talent = tooltip?.talent;
  const spellTooltip = tooltip?.spell_tooltip;
  const spellId = spellTooltip?.spell?.id || null;

  // For CHOICE nodes, extract the choice options from choice_of_tooltips
  const choiceOptions = (rank?.choice_of_tooltips || []).map(c => ({
    name: c?.talent?.name || null,
    spell_id: c?.spell_tooltip?.spell?.id || null,
    icon: iconMap[c?.spell_tooltip?.spell?.id] || null,
    description: c?.spell_tooltip?.description || null,
    cast_time: c?.spell_tooltip?.cast_time || null
  }));

  return {
    id: n.id,
    row: n.display_row,
    col: n.display_col,
    type: n.node_type?.type || "PASSIVE",
    unlocks: n.unlocks || [],
    name: talent?.name || null,
    spell_id: spellId,
    icon: iconMap[spellId] || null,
    description: spellTooltip?.description || null,
    cast_time: spellTooltip?.cast_time || null,
    rank: rank?.rank || 1,
    choice_options: choiceOptions.length > 0 ? choiceOptions : null
  };
}