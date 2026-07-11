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
          if (m) iconMap[spellId] = await correctIconName(m[1]);
        }
      } catch (e) { /* skip failed spell media */ }
    }

    // Step 5: Extract class nodes, spec nodes, and hero trees with icons.
    // Collect all hero talent names for filtering in the spec/class tree merge.
    // Include both direct talent names AND choice_of_tooltips names (for CHOICE nodes).
    const allHeroTalentNames = new Set();
    for (const ht of (specTree.hero_talent_trees || [])) {
      for (const n of (ht.hero_talent_nodes || [])) {
        const name = n?.ranks?.[0]?.tooltip?.talent?.name;
        if (name) allHeroTalentNames.add(name);
        // Also collect choice_of_tooltips names (for CHOICE nodes)
        const choices = n?.ranks?.[0]?.choice_of_tooltips || [];
        for (const c of choices) {
          if (c?.talent?.name) allHeroTalentNames.add(c.talent.name);
        }
      }
    }

    // Class nodes: exclude hero talent variants (same logic as spec nodes).
    // Blizzard's class_talent_nodes can also include hero talent nodes.
    const rawClassNodes = (specTree.class_talent_nodes || [])
      .filter(n => {
        const rank = n?.ranks?.[0];
        const name = rank?.tooltip?.talent?.name;
        if (name && allHeroTalentNames.has(name)) return false;
        const choices = rank?.choice_of_tooltips || [];
        if (choices.length > 0) {
          const allHero = choices.every(c => {
            const cn = c?.talent?.name;
            return cn && allHeroTalentNames.has(cn);
          });
          if (allHero) return false;
        }
        return true;
      })
      .map(n => extractNode(n, iconMap));
    const classNodes = mergeChoiceNodes(rawClassNodes, allHeroTalentNames);

    // Spec nodes: exclude hero talent variants.
    // Blizzard's spec_talent_nodes includes hero talent nodes that duplicate
    // the hero tree. We exclude:
    // 1. Nodes whose own talent name is a hero talent name
    // 2. CHOICE nodes whose choice_of_tooltips names are ALL hero talents
    //    (these are hero-tree CHOICE slots with no spec-tree variant)
    // 3. Nodes at columns where ALL spec_talent_nodes are hero talents
    //    (pure hero-tree columns — no legit spec nodes there)
    // We do NOT blanket-exclude hero tree column ranges, because some hero
    // trees (like San'layn at cols 21-24) share columns with legit spec nodes
    // (e.g. Bloodworms at col 21 is a real Blood DK spec talent).

    // First pass: identify columns where ALL spec_talent_nodes are hero talents
    const allSpecNodes = specTree.spec_talent_nodes || [];
    const colsWithSpecNodes = new Map(); // col -> [{node, isHero}]
    for (const n of allSpecNodes) {
      const col = n.display_col;
      if (!colsWithSpecNodes.has(col)) colsWithSpecNodes.set(col, []);
      const rank = n?.ranks?.[0];
      const name = rank?.tooltip?.talent?.name;
      const choices = rank?.choice_of_tooltips || [];
      const isHero = (name && allHeroTalentNames.has(name)) ||
        (choices.length > 0 && choices.every(c => {
          const cn = c?.talent?.name;
          return cn && allHeroTalentNames.has(cn);
        }));
      colsWithSpecNodes.get(col).push(isHero);
    }
    // A column is "hero-only" if every node at that column is a hero talent
    const heroOnlyCols = new Set();
    for (const [col, flags] of colsWithSpecNodes) {
      if (flags.every(f => f)) heroOnlyCols.add(col);
    }

    const rawSpecNodes = allSpecNodes
      .filter(n => {
        const rank = n?.ranks?.[0];
        const name = rank?.tooltip?.talent?.name;
        // Exclude nodes whose own talent name is a hero talent
        if (name && allHeroTalentNames.has(name)) return false;
        // Exclude CHOICE nodes whose choice options are ALL hero talents
        const choices = rank?.choice_of_tooltips || [];
        if (choices.length > 0) {
          const allHero = choices.every(c => {
            const cn = c?.talent?.name;
            return cn && allHeroTalentNames.has(cn);
          });
          if (allHero) return false;
        }
        // Exclude columns that are hero-only (no legit spec nodes at this column)
        if (heroOnlyCols.has(n.display_col)) return false;
        return true;
      })
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
      const n = group[0];
      // For standalone CHOICE nodes with choice_options, copy the first option's
      // name/icon as the display name, and set choices = choice_options
      if (n.type === "CHOICE" && n.choice_options && n.choice_options.length > 0 && !n.name) {
        n.name = n.choice_options[0].name;
        n.icon = n.choice_options[0].icon;
        n.spell_id = n.choice_options[0].spell_id;
        n.description = n.choice_options[0].description;
        n.choices = n.choice_options.map(c => ({ ...c, selected: false }));
      }
      result.push(n);
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

// Blizzard's spell media API occasionally returns icon filenames that don't
// match the actual CDN file — typically a missing hyphen in the name.
// Examples:
//   "inv12_apextalent_demonhunter_untetheredrage" -> "...demonhunter-_untetheredrage"
//   "spell_frost_iceshards" -> "spell_frost_ice-shards"
//   "inv_10_specialreagentfoozles_tuskclawice" -> "...tuskclaw-ice"
// We probe wow.zamimg.com and try inserting a hyphen at each underscore boundary
// and within each part between word segments.
async function correctIconName(icon) {
  if (!icon) return icon;

  // 1. If the icon already exists on the CDN, use it as-is.
  if (await probeIcon(icon)) return icon;

  // 2. Try inserting a hyphen at each underscore boundary.
  const parts = icon.split("_");
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const candidate = parts.slice(0, i).join("_") + "-_" + parts.slice(i).join("_");
      if (await probeIcon(candidate)) {
        console.log(`  icon fix: ${icon} -> ${candidate}`);
        return candidate;
      }
    }
  }

  // 3. Try inserting a hyphen within each part (between word segments).
  //    e.g. "iceshards" -> "ice-shards", "tuskclawice" -> "tuskclaw-ice"
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length < 4) continue;
    for (let j = 2; j < part.length - 1; j++) {
      const candidate = [...parts.slice(0, i), part.slice(0, j) + "-" + part.slice(j), ...parts.slice(i + 1)].join("_");
      if (await probeIcon(candidate)) {
        console.log(`  icon fix: ${icon} -> ${candidate}`);
        return candidate;
      }
    }
  }

  // 4. Return original; frontend onerror will show question mark
  return icon;
}

// HEAD probe of the wow.zamimg.com CDN. Returns true if the icon exists.
async function probeIcon(icon) {
  try {
    const url = `https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg`;
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}