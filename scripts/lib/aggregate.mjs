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
      } else {
        tally.set(entry.id, { entry, count: 1 });
      }
    }
    for (const g of p.gems || []) {
      if (g?.id == null) continue;
      const c = gemCounts.get(g.id) ?? { item_id: g.id, name: g.name, icon: null, count: 0 };
      c.count++;
      if (!c.name && g.name) c.name = g.name;
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
      if (!em?.id) continue;
      const c = embellishmentCounts.get(em.id) ?? { spell_id: em.id, name: em.name, icon: null, count: 0 };
      c.count++;
      if (!c.name && em.name) c.name = em.name;
      embellishmentCounts.set(em.id, c);
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

  // Pick the most common item per slot.
  const gear = {};
  for (const slot of SLOTS) {
    const tally = slotTallies[slot];
    if (tally.size === 0) {
      gear[slot] = { item_id: null, name: null, icon: null, ilvl: null, count: 0, percent: 0 };
      continue;
    }
    // Sort by count desc, pick the top one.
    const sorted = [...tally.values()].sort((a, b) => b.count - a.count);
    const winner = sorted[0];
    const e = winner.entry;
    gear[slot] = {
      item_id: e.id,
      name: e.name,
      icon: e.icon, // still null - resolved in run-once.mjs after aggregation
      media_id: e.media_id,
      ilvl: e.ilvl,
      quality: e.quality,
      item_subclass: e.item_subclass,
      stats: e.stats,
      set_name: e.set_name,
      set_effects: e.set_effects,
      enchantments: e.enchantments,
      source: e.source,
      name_description: e.name_description,
      count: winner.count,
      percent: +(winner.count / denom).toFixed(4)
    };
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
    .map(c => ({ ...c, percent: +(c.count / denom).toFixed(4) }))
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
  const counts = { crit: 0, haste: 0, mastery: 0, versatility: 0 };
  let totalArmor = 0;
  for (const p of profiles) {
    if (!p?.items) continue;
    for (const slot of Object.keys(p.items)) {
      const stats = p.items[slot]?.stats || [];
      // Find highest non-primary stat rating on this item
      let best = null;
      let bestVal = 0;
      for (const s of stats) {
        const t = s?.type;
        if (!t) continue;
        const map = { CRIT_RATING: "crit", HASTE_RATING: "haste", MASTERY_RATING: "mastery", VERSATILITY: "versatility" };
        const key = map[t];
        if (!key) continue;
        if ((s.value || 0) > bestVal) { bestVal = s.value; best = key; }
      }
      if (best) { counts[best]++; totalArmor++; }
    }
  }
  if (totalArmor === 0) {
    return {
      primary: {},
      secondary_weights: { crit: 0.25, haste: 0.25, mastery: 0.25, versatility: 0.25 },
      secondary_gear_breakdown: { crit: 0, haste: 0, mastery: 0, versatility: 0 }
    };
  }
  const weights = {};
  for (const k of Object.keys(counts)) weights[k] = +(counts[k] / totalArmor).toFixed(4);
  return {
    primary: {},
    secondary_weights: weights,
    secondary_gear_breakdown: counts
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