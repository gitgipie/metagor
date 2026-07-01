// scripts/lib/aggregate.mjs
// Pure functions: turn a list of character profiles into the aggregated_bis.json
// payload for a single spec. No I/O. No network. Easy to unit-test.

import { SAMPLE_SIZE, MIN_PERCENT } from "./config.mjs";

export const SLOTS = [
  "head", "neck", "shoulders", "back", "chest", "wrists",
  "hands", "waist", "legs", "feet",
  "finger1", "finger2", "trinket1", "trinket2",
  "mainhand", "offhand"
];

// Map Blizzard equipment "slot" type to our 16-slot keys.
const SLOT_MAP = {
  HEAD: "head", NECK: "neck", SHOULDER: "shoulders", BACK: "back",
  CHEST: "chest", WRIST: "wrists", HANDS: "hands", WAIST: "waist",
  LEGS: "legs", FEET: "feet",
  FINGER_1: "finger1", FINGER_2: "finger2",
  TRINKET_1: "trinket1", TRINKET_2: "trinket2",
  MAIN_HAND: "mainhand", OFF_HAND: "offhand"
};

// Each input profile = result of getCharacterEquipment for one character.
// Shape we expect (normalized): { items: { head: { id, slot, name, level, slot_type, ... }, ... } }
export function normalizeEquipment(blizzardEquipment) {
  const items = {};
  for (const it of blizzardEquipment?.equipped_items || []) {
    const key = SLOT_MAP[it?.slot?.type];
    if (!key) continue;
    const stats = (it?.stats || []).map(s => ({
      type: s?.type?.type,
      name: s?.type?.name,
      value: s?.value,
      display: s?.display?.display_string,
      is_equip_bonus: s?.is_equip_bonus || false
    }));
    const nameDesc = it?.name_description?.display_string ?? null;
    const context = it?.context ?? null;
    items[key] = {
      id: it.item?.id ?? null,
      name: it.name ?? null,
      icon: null, // resolved later via resolveItemIcon
      media_id: it.media?.id ?? null,
      ilvl: it.level?.value ?? null,
      quality: it.quality?.type ?? null,
      slot_type: it.slot?.type ?? null,
      item_subclass: it.item_subclass?.name ?? null,
      stats,
      set_name: it?.set?.item_set?.name ?? null,
      set_effects: (it?.set?.effects || []).map(e => e.display_string),
      enchantments: (it?.enchantments || []).map(en => ({
        id: en?.enchantment_id ?? null,
        display: en?.display_string ?? null
      })),
      gems: (it?.sockets || []).filter(s => s?.item).map(s => ({
        id: s.item.id,
        name: s.item.name,
        display: s.display_string
      })),
      name_description: nameDesc,
      context,
      source: classifyItemSource(nameDesc, context)
    };
  }
  return items;
}

// Classify an item's source from Blizzard's name_description and context fields.
// Returns a short label like "Mythic+", "Crafted", "Raid (Mythic)", "Catalyst", "Unknown".
export function classifyItemSource(nameDescription, context) {
  const desc = (nameDescription || "").toLowerCase();
  // Crafted items have "crafted" in the name_description, context=13
  if (desc.includes("crafted")) return "Crafted";
  // Catalyst items typically mention "catalyst" in the description
  if (desc.includes("catalyst")) return "Catalyst";
  // Raid items have context=6 (or 5 for heroic, 3 for normal) and mention raid tier names
  // Common raid name_description patterns: "Mythic Ascendant Voidforged: Myth", "Heroic Ascendant Voidforged"
  if (context === 6 || context === 5 || context === 3) {
    if (desc.includes("mythic")) return "Raid (Mythic)";
    if (desc.includes("heroic")) return "Raid (Heroic)";
    if (desc.includes("normal")) return "Raid (Normal)";
    return "Raid";
  }
  // Mythic+ items have context=35 and "Mythic+" in the description
  if (desc.includes("mythic+") || context === 35) return "Mythic+";
  // Vault/great vault items
  if (desc.includes("vault")) return "Great Vault";
  // Fallback: use the raw name_description if we have one
  if (nameDescription) return nameDescription;
  return "Unknown";
}

// Reduce N normalized profiles into one spec payload.
// Tally by item_id per slot, pick the mode (most common item), capture counts.
export function aggregateSpec({ specId, classId, specName, role, profiles, sampleSize = SAMPLE_SIZE }) {
  const slotTallies = {};
  for (const slot of SLOTS) slotTallies[slot] = new Map(); // item_id -> { entry, count }

  // Per-slot gem tallies: slot -> gem_id -> { gem, count }
  const slotGemTallies = {};
  for (const slot of SLOTS) slotGemTallies[slot] = new Map();

  const gemCounts = new Map();
  const enchantCounts = new Map();
  const embellishmentCounts = new Map();
  const loadoutCounts = new Map();
  let heroTalent = null;
  let profilesSkipped = 0;

  for (const p of profiles) {
    if (!p || !p.items) { profilesSkipped++; continue; }
    for (const slot of SLOTS) {
      const entry = p.items[slot];
      if (!entry || entry.id == null) continue;
      const tally = slotTallies[slot];
      const cur = tally.get(entry.id);
      if (cur) {
        cur.count++;
        // Tally sources for this item_id per-occurrence (each player may have a different source)
        const srcKey = entry.source || "Unknown";
        cur.sourceCounts.set(srcKey, (cur.sourceCounts.get(srcKey) || 0) + 1);
      } else {
        const sourceCounts = new Map();
        sourceCounts.set(entry.source || "Unknown", 1);
        tally.set(entry.id, { entry, count: 1, sourceCounts });
      }
      // Tally gems socketed in this slot
      if (entry.gems && entry.gems.length) {
        for (const g of entry.gems) {
          if (g?.id == null) continue;
          const gemTally = slotGemTallies[slot];
          const gc = gemTally.get(g.id) ?? { gem: { id: g.id, name: g.name, display: g.display, stat_display: g.display }, count: 0 };
          gc.count++;
          if (!gc.gem.name && g.name) gc.gem.name = g.name;
          if (!gc.gem.stat_display && g.display) gc.gem.stat_display = g.display;
          gemTally.set(g.id, gc);
        }
      }
    }
    for (const g of p.gems || []) {
      if (g?.id == null) continue;
      const c = gemCounts.get(g.id) ?? { item_id: g.id, name: g.name, icon: null, count: 0, stat_display: null };
      c.count++;
      if (!c.name && g.name) c.name = g.name;
      if (!c.stat_display && g.stat_display) c.stat_display = g.stat_display;
      gemCounts.set(g.id, c);
    }
    for (const e of p.enchants || []) {
      if (!e?.slot || !e?.id) continue;
      const key = `${e.slot}:${e.id}`;
      const c = enchantCounts.get(key) ?? {
        slot: e.slot, spell_id: e.id, name: null, icon: null, count: 0
      };
      c.count++;
      if (!c.name && e.name) c.name = e.name;
      enchantCounts.set(key, c);
    }
    for (const em of p.embellishments || []) {
      if (!em?.spell_id) continue;
      // Key by spell_id so the same embellishment effect on different items is counted together
      const c = embellishmentCounts.get(em.spell_id) ?? {
        spell_id: em.spell_id, name: em.spell_name || em.item_name, icon: null, count: 0,
        stat_display: em.spell_desc || null, item_ids: new Set(),
        item_counts: new Map()
      };
      c.count++;
      if (!c.name && em.spell_name) c.name = em.spell_name;
      if (!c.stat_display && em.spell_desc) c.stat_display = em.spell_desc;
      if (em.item_id) {
        c.item_ids.add(em.item_id);
        c.item_counts.set(em.item_id, (c.item_counts.get(em.item_id) || 0) + 1);
        if (!c.item_names) c.item_names = new Map();
        if (!c.item_names.has(em.item_id) && em.item_name) c.item_names.set(em.item_id, em.item_name);
        if (!c.item_name && em.item_name) c.item_name = em.item_name;
      }
      embellishmentCounts.set(em.spell_id, c);
    }
    if (p.talents?.loadout_string) {
      const cur = loadoutCounts.get(p.talents.loadout_string) ?? { loadout_string: p.talents.loadout_string, count: 0 };
      cur.count++;
      loadoutCounts.set(p.talents.loadout_string, cur);
    }
    if (!heroTalent && p.talents?.hero_talent) heroTalent = p.talents.hero_talent;
  }

  const effective = sampleSize - profilesSkipped;
  const denom = Math.max(effective, 1);

  // Helper: build a gear entry from a tally winner
  function buildGearEntry(winner, denom, slot) {
    const e = winner.entry;
    let bestSource = e.source;
    let bestSourceCount = 0;
    for (const [src, cnt] of winner.sourceCounts) {
      if (cnt > bestSourceCount) { bestSourceCount = cnt; bestSource = src; }
    }
    let finalSource = bestSource;
    if (e.set_name && bestSource && !bestSource.includes("Catalyst")) {
      finalSource = `${bestSource} (Catalyst)`;
    }
    // Find the most popular gem for this slot
    let socket_gem = null;
    const gemTally = slot ? slotGemTallies[slot] : null;
    if (gemTally && gemTally.size > 0) {
      const sortedGems = [...gemTally.values()].sort((a, b) => b.count - a.count);
      const top = sortedGems[0];
      socket_gem = {
        item_id: top.gem.id,
        name: top.gem.name,
        stat_display: top.gem.stat_display || null,
        count: top.count,
        icon: null
      };
    }
    return {
      item_id: e.id,
      name: e.name,
      icon: e.icon,
      media_id: e.media_id,
      ilvl: e.ilvl,
      quality: e.quality,
      item_subclass: e.item_subclass,
      stats: e.stats,
      set_name: e.set_name,
      set_effects: e.set_effects,
      enchantments: e.enchantments,
      socket_gem,
      source: finalSource,
      name_description: e.name_description,
      count: winner.count,
      percent: +(winner.count / denom).toFixed(4)
    };
  }

  // Helper: empty gear entry
  function emptyGearEntry() {
    return { item_id: null, name: null, icon: null, ilvl: null, count: 0, percent: 0 };
  }

  // Slots that are "unique-equipped" pairs — you can't have the same item in both.
  // We merge the pair's tallies, pick the top 2 DISTINCT items, and assign #1 → slotA, #2 → slotB.
  const UNIQUE_PAIRS = [
    ["finger1", "finger2"],
    ["trinket1", "trinket2"]
  ];
  const pairedSlots = new Set(UNIQUE_PAIRS.flat());

  // Pick the most common item per slot (for non-paired slots).
  const gear = {};
  for (const slot of SLOTS) {
    if (pairedSlots.has(slot)) continue; // handle paired slots below
    const tally = slotTallies[slot];
    if (tally.size === 0) {
      gear[slot] = emptyGearEntry();
      continue;
    }
    const sorted = [...tally.values()].sort((a, b) => b.count - a.count);
    const entry = buildGearEntry(sorted[0], denom, slot);
    // Store ALL alternatives (including the winner as #1), sorted by popularity.
    // No cap — the modal scrolls and shows every item that appears at least once.
    entry.alternatives = sorted.map(w => buildGearEntry(w, denom, slot));
    gear[slot] = entry;
  }

  // Handle unique-equipped pairs: merge tallies, pick top 2 distinct items.
  for (const [slotA, slotB] of UNIQUE_PAIRS) {
    // Merge both slots' tallies into one map, summing counts for the same item_id
    const merged = new Map();
    for (const slot of [slotA, slotB]) {
      for (const [itemId, { entry, count, sourceCounts }] of slotTallies[slot]) {
        if (merged.has(itemId)) {
          merged.get(itemId).count += count;
          // Merge source counts
          for (const [src, cnt] of sourceCounts) {
            merged.get(itemId).sourceCounts.set(src, (merged.get(itemId).sourceCounts.get(src) || 0) + cnt);
          }
        } else {
          merged.set(itemId, {
            entry,
            count,
            sourceCounts: new Map(sourceCounts)
          });
        }
      }
    }
    const sorted = [...merged.values()].sort((a, b) => b.count - a.count);
    if (sorted.length === 0) {
      gear[slotA] = emptyGearEntry();
      gear[slotB] = emptyGearEntry();
    } else if (sorted.length === 1) {
      gear[slotA] = buildGearEntry(sorted[0], denom, slotA);
      gear[slotB] = emptyGearEntry();
    } else {
      gear[slotA] = buildGearEntry(sorted[0], denom, slotA);
      gear[slotB] = buildGearEntry(sorted[1], denom, slotB);
    }
    // Store all merged alternatives for both paired slots
    const pairAlts = sorted.map(w => buildGearEntry(w, denom, slotA));
    if (gear[slotA].item_id) gear[slotA].alternatives = pairAlts;
    if (gear[slotB].item_id) gear[slotB].alternatives = pairAlts;
  }

  const gems = [...gemCounts.values()]
    .filter(c => c.count >= Math.ceil(MIN_PERCENT * sampleSize))
    .map(c => ({ ...c, percent: +(c.count / denom).toFixed(4) }))
    .sort((a, b) => b.count - a.count);

  const enchantsBySlot = {};
  for (const e of enchantCounts.values()) {
    if (e.count < Math.ceil(MIN_PERCENT * sampleSize)) continue;
    // Keep the highest-count enchant per slot
    if (!enchantsBySlot[e.slot] || e.count > enchantsBySlot[e.slot].count) {
      enchantsBySlot[e.slot] = {
        spell_id: e.spell_id, name: e.name, icon: e.icon,
        count: e.count, percent: +(e.count / denom).toFixed(4)
      };
    }
  }

  const embellishments = [...embellishmentCounts.values()]
    .filter(c => c.count >= Math.ceil(MIN_PERCENT * sampleSize))
    .map(c => {
      // Build per-item breakdown sorted by count descending
      const items = [...(c.item_counts || [])].map(([itemId, cnt]) => ({
        item_id: itemId,
        name: c.item_names?.get(itemId) || null,
        count: cnt
      })).sort((a, b) => b.count - a.count);
      return {
        spell_id: c.spell_id,
        name: c.name,
        item_name: c.item_name || null,
        item_ids: [...(c.item_ids || [])],
        items,
        stat_display: c.stat_display || null,
        count: c.count,
        percent: +(c.count / denom).toFixed(4)
      };
    })
    .sort((a, b) => b.count - a.count);

  const loadouts = [...loadoutCounts.values()].sort((a, b) => b.count - a.count);
  const modalLoadout = loadouts[0]?.loadout_string ?? null;

  return {
    class: classId,
    spec: specName,
    role,
    sample_size: sampleSize,
    stats: computeSecondaryBreakdown(profiles),
    gear,
    gems,
    enchants: enchantsBySlot,
    embellishments,
    talents: {
      loadout_string: modalLoadout,
      hero_talent: heroTalent
    },
    failures: { profiles_skipped: profilesSkipped }
  };
}

export function computeSecondaryBreakdown(profiles) {
  // Use the ACTUAL in-game stat values from Blizzard's /statistics endpoint.
  // Each profile's statistics object has dual fields per secondary:
  //   crit_rating / crit_pct, haste_rating / haste_pct, mastery_rating / mastery_pct,
  //   vers_rating / vers_pct
  //
  // Priority is determined by RATING AVERAGE (matches murlok.io: e.g. Crit 1192 > Mastery 1143).
  // Display uses PERCENT AVERAGE (the in-game character-sheet %, e.g. 77% Mastery).
  const ratingSums = { crit: 0, haste: 0, mastery: 0, versatility: 0 };
  const pctSums = { crit: 0, haste: 0, mastery: 0, versatility: 0 };
  const primarySums = {};
  let count = 0;

  for (const p of profiles) {
    if (!p?.statistics) continue;
    count++;
    ratingSums.crit += p.statistics.crit_rating || 0;
    ratingSums.haste += p.statistics.haste_rating || 0;
    ratingSums.mastery += p.statistics.mastery_rating || 0;
    ratingSums.versatility += p.statistics.vers_rating || 0;
    pctSums.crit += p.statistics.crit_pct || 0;
    pctSums.haste += p.statistics.haste_pct || 0;
    pctSums.mastery += p.statistics.mastery_pct || 0;
    pctSums.versatility += p.statistics.vers_pct || 0;
    for (const k of ["agility", "strength", "intellect", "stamina"]) {
      const v = p.statistics[k];
      if (v) primarySums[k] = (primarySums[k] || 0) + v;
    }
  }

  if (count === 0) {
    return {
      primary: {},
      secondary_rating_averages: { crit: 0, haste: 0, mastery: 0, versatility: 0 },
      secondary_percent_averages: { crit: 0, haste: 0, mastery: 0, versatility: 0 },
      secondary_rating_sums: ratingSums,
      secondary_averages: { crit: 0, haste: 0, mastery: 0, versatility: 0 },
      secondary_gear_breakdown: { crit: 0, haste: 0, mastery: 0, versatility: 0 },
      priority: ["crit", "haste", "mastery", "versatility"]
    };
  }

  // Averages per character
  const ratingAvgs = {};
  const pctAvgs = {};
  for (const k of Object.keys(ratingSums)) {
    ratingAvgs[k] = +(ratingSums[k] / count).toFixed(2);
    pctAvgs[k] = +(pctSums[k] / count).toFixed(2);
  }

  // Priority: sort by RATING AVERAGE descending (matches murlok.io's logic)
  const priority = Object.entries(ratingAvgs)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  // Primary stat averages
  const primary = {};
  for (const k of Object.keys(primarySums)) primary[k] = Math.round(primarySums[k] / count);

  return {
    primary,
    secondary_rating_averages: ratingAvgs,
    secondary_percent_averages: pctAvgs,
    secondary_rating_sums: ratingSums,
    // Back-compat aliases
    secondary_averages: ratingAvgs,
    secondary_gear_breakdown: ratingAvgs,
    priority
  };
}

// Sort keys deterministically so the output JSON is byte-stable across runs.
export function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeysDeep(value[k]);
    return out;
  }
  return value;
}