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

    // For positions with multiple nodes (CHOICE slots), merge into one node with options.
    // The heroTalentNames set is passed so mergeChoiceNodes prefers spec talents
    // over hero talent variants as the display name.
    const classNodes = mergeChoiceNodes(
      (specTree.class_talent_nodes || []).map(n => extractNode(n, iconMap)),
      allHeroTalentNames
    );

    // Spec nodes: exclude hero talent variants.
    // Blizzard's spec_talent_nodes includes hero talent nodes that duplicate
    // the hero tree. We exclude:
    // 1. Nodes whose own talent name is a hero talent name
    // 2. CHOICE nodes whose choice_of_tooltips names are ALL hero talents
    //    (these are hero-tree CHOICE slots with no spec-tree variant)
    // 3. Nodes in the hero tree column overlap zone (cols 9-12 OR any col
    //    range used by a hero tree — some hero trees like San'layn use 21-24)
    const heroTreeColRanges = (specTree.hero_talent_trees || []).map(ht => {
      const cols = (ht.hero_talent_nodes || []).map(n => n.display_col);
      if (cols.length === 0) return null;
      return [Math.min(...cols), Math.max(...cols)];
    }).filter(Boolean);

    function isInHeroColZone(col) {
      // Standard 9-12 zone
      if (col >= 9 && col <= 12) return true;
      // Dynamic hero tree zones (e.g. San'layn uses 21-24)
      for (const [min, max] of heroTreeColRanges) {
        if (col >= min && col <= max) return true;
      }
      return false;
    }

    const rawSpecNodes = (specTree.spec_talent_nodes || [])
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
        // Exclude the hero tree column overlap zone
        if (isInHeroColZone(n.display_col)) return false;
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
// match the actual CDN file (known typo on Midnight apex talents: missing dash
// between class and talent name). E.g. Blizzard returns
// "inv12_apextalent_demonhunter_untetheredrage" but the real file is
// "inv12_apextalent_demonhunter-_untetheredrage".
// We probe wow.zamimg.com (region-agnostic) and try known corrections.
async function correctIconName(icon) {
  if (!icon) return icon;

  // 1. If the icon already exists on the CDN, use it as-is.
  if (await probeIcon(icon)) return icon;

  // 2. Known typo pattern for Midnight apex talents:
  //    inv12_apextalent_{class}_{talent} -> inv12_apextalent_{class}-_{talent}
  //    Example: inv12_apextalent_demonhunter_untetheredrage -> ...demonhunter-_untetheredrage
  const apexMatch = icon.match(/^(inv12_apextalent_[a-z]+)_([a-z].*)$/);
  if (apexMatch) {
    const corrected = `${apexMatch[1]}-_${apexMatch[2]}`;
    if (await probeIcon(corrected)) {
      console.log(`  icon fix: ${icon} -> ${corrected}`);
      return corrected;
    }
  }

  // 3. Return original; frontend onerror will show question mark
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