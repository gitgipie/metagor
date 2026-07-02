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
      const spellId = n?.ranks?.[0]?.tooltip?.spell_tooltip?.spell?.id;
      if (spellId) spellIds.add(spellId);
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

    // Step 5: Extract class nodes, spec nodes, and hero trees with icons
    const classNodes = (specTree.class_talent_nodes || []).map(n => extractNode(n, iconMap));
    const specNodes = (specTree.spec_talent_nodes || []).map(n => extractNode(n, iconMap));

    // Hero talent trees — each has embedded hero_talent_nodes
    const heroTrees = (specTree.hero_talent_trees || []).map(ht => ({
      id: ht.id,
      name: ht.name,
      nodes: (ht.hero_talent_nodes || []).map(n => extractNode(n, iconMap))
    }));

    return { classNodes, specNodes, heroTrees, treeId };
  });
}

// Extract a talent node into a compact format for the frontend.
function extractNode(n, iconMap = {}) {
  const rank = n.ranks?.[0];
  const tooltip = rank?.tooltip;
  const talent = tooltip?.talent;
  const spellTooltip = tooltip?.spell_tooltip;
  const spellId = spellTooltip?.spell?.id || null;
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
    rank: rank?.rank || 1
  };
}