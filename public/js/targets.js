// public/js/targets.js
// Engine and interactive controller for Meta'gor Loot Targets (Mythic+ Dungeons, Raid Bosses & Season 2 Catalyst Bases).

import { wowClasses, findClass, armorTypeFor, specId } from "./registry.js";
import { iconUrl } from "./icons.js";

// Official Wowhead spec icon texture names for all 40 specs
export const SPEC_ICONS = {
  // Death Knight
  "death-knight-blood": "spell_deathknight_bloodpresence",
  "death-knight-frost": "spell_deathknight_frostpresence",
  "death-knight-unholy": "spell_deathknight_unholypresence",

  // Demon Hunter
  "demon-hunter-havoc": "ability_demonhunter_specdps",
  "demon-hunter-vengeance": "ability_demonhunter_spectank",
  "demon-hunter-devourer": "ability_demonhunter_specdps",

  // Druid
  "druid-balance": "spell_nature_starfall",
  "druid-feral": "ability_druid_catform",
  "druid-guardian": "ability_racial_bearform",
  "druid-restoration": "spell_nature_healingtouch",

  // Evoker
  "evoker-devastation": "classicon_evoker_devastation",
  "evoker-preservation": "classicon_evoker_preservation",
  "evoker-augmentation": "classicon_evoker_augmentation",

  // Hunter
  "hunter-beast-mastery": "ability_hunter_bestialdiscipline",
  "hunter-marksmanship": "ability_hunter_focusedaim",
  "hunter-survival": "ability_hunter_camouflage",

  // Mage
  "mage-arcane": "spell_holy_magicalsentry",
  "mage-fire": "spell_fire_firebolt02",
  "mage-frost": "spell_frost_frostbolt02",

  // Monk
  "monk-brewmaster": "spell_monk_brewmaster_spec",
  "monk-mistweaver": "spell_monk_mistweaver_spec",
  "monk-windwalker": "spell_monk_windwalker_spec",

  // Paladin
  "paladin-holy": "spell_holy_holybolt",
  "paladin-protection": "ability_paladin_shieldofthetemplar",
  "paladin-retribution": "spell_holy_auraoflight",

  // Priest
  "priest-discipline": "spell_holy_powerwordshield",
  "priest-holy": "spell_holy_guardianspirit",
  "priest-shadow": "spell_shadow_shadowwordpain",

  // Rogue
  "rogue-assassination": "ability_rogue_eviscerate",
  "rogue-outlaw": "ability_rogue_waylay",
  "rogue-subtlety": "ability_stealth",

  // Shaman
  "shaman-elemental": "spell_nature_lightning",
  "shaman-enhancement": "spell_shaman_improvedstormstrike",
  "shaman-restoration": "spell_nature_magicimmunity",

  // Warlock
  "warlock-affliction": "spell_shadow_deathcoil",
  "warlock-demonology": "spell_shadow_metamorphosis",
  "warlock-destruction": "spell_shadow_rainoffire",

  // Warrior
  "warrior-arms": "ability_warrior_savageblow",
  "warrior-fury": "ability_warrior_innerrage",
  "warrior-protection": "ability_warrior_defensivestance"
};

// Weapon proficiencies by class
const WEAPON_PROFICIENCIES = {
  "death-knight": ["One-Handed Axe", "One-Handed Mace", "One-Handed Sword", "Two-Handed Axe", "Two-Handed Mace", "Two-Handed Sword", "Polearm"],
  "demon-hunter": ["Warglaive", "One-Handed Axe", "One-Handed Sword", "Fist Weapon"],
  "druid":        ["Dagger", "Fist Weapon", "One-Handed Mace", "Two-Handed Mace", "Polearm", "Staff", "Held In Off-hand"],
  "evoker":       ["Dagger", "Fist Weapon", "One-Handed Axe", "One-Handed Mace", "One-Handed Sword", "Two-Handed Axe", "Two-Handed Mace", "Two-Handed Sword", "Staff", "Held In Off-hand"],
  "hunter":       ["Bow", "Crossbow", "Gun", "Polearm", "Staff", "One-Handed Axe", "One-Handed Sword", "Dagger", "Fist Weapon", "Two-Handed Axe", "Two-Handed Sword"],
  "mage":         ["Dagger", "One-Handed Sword", "Wand", "Staff", "Held In Off-hand"],
  "monk":         ["Fist Weapon", "One-Handed Axe", "One-Handed Mace", "One-Handed Sword", "Polearm", "Staff", "Held In Off-hand"],
  "paladin":      ["One-Handed Axe", "One-Handed Mace", "One-Handed Sword", "Two-Handed Axe", "Two-Handed Mace", "Two-Handed Sword", "Polearm", "Shield"],
  "priest":       ["Dagger", "One-Handed Mace", "Wand", "Staff", "Held In Off-hand"],
  "rogue":        ["Dagger", "Fist Weapon", "One-Handed Axe", "One-Handed Mace", "One-Handed Sword", "Bow", "Crossbow", "Gun"],
  "shaman":       ["Dagger", "Fist Weapon", "One-Handed Axe", "One-Handed Mace", "Two-Handed Axe", "Two-Handed Mace", "Staff", "Shield"],
  "warlock":      ["Dagger", "One-Handed Sword", "Wand", "Staff", "Held In Off-hand"],
  "warrior":      ["One-Handed Axe", "One-Handed Mace", "One-Handed Sword", "Two-Handed Axe", "Two-Handed Mace", "Two-Handed Sword", "Polearm", "Dagger", "Fist Weapon", "Shield"]
};

// Check if a weapon / off-hand is on the loot table for a specific specialization
function isWeaponEligibleForSpec(sub, inv, specSlug, classId) {
  const allowed = WEAPON_PROFICIENCIES[classId] || [];
  if (!allowed.includes(sub)) return false;

  const is2H = inv === "TWOHWEAPON" || ["Two-Handed Axe", "Two-Handed Mace", "Two-Handed Sword", "Polearm"].includes(sub);
  const isShield = inv === "SHIELD" || sub === "Shield";
  const isRanged = ["Bow", "Crossbow", "Gun"].includes(sub) || ["RANGED", "RANGEDRIGHT"].includes(inv);
  const isDagger = sub === "Dagger";

  // Paladin
  if (specSlug === "paladin-protection") {
    if (is2H) return false;
  }
  if (specSlug === "paladin-retribution") {
    if (!is2H || isShield) return false;
  }
  if (specSlug === "paladin-holy") {
    if (is2H && sub !== "Two-Handed Mace") return false;
    if (sub === "One-Handed Axe") return false;
  }

  // Warrior
  if (specSlug === "warrior-protection") {
    if (is2H) return false;
  }
  if (specSlug === "warrior-arms") {
    if (!is2H || isShield) return false;
  }
  if (specSlug === "warrior-fury") {
    if (isShield) return false;
  }

  // Death Knight
  if (specSlug === "death-knight-blood" || specSlug === "death-knight-unholy") {
    if (!is2H) return false;
  }

  // Hunter
  if (specSlug === "hunter-survival") {
    if (isRanged) return false;
    if (!is2H) return false;
  }
  if (specSlug === "hunter-beast-mastery" || specSlug === "hunter-marksmanship") {
    if (!isRanged) return false;
  }

  // Rogue
  if (specSlug === "rogue-assassination" || specSlug === "rogue-subtlety") {
    if (!isDagger) return false;
  }

  // Shaman
  if (specSlug === "shaman-enhancement") {
    if (isShield || is2H || isDagger || sub === "Staff") return false;
  }

  // Druid
  if (specSlug === "druid-feral" || specSlug === "druid-guardian") {
    if (inv === "HOLDABLE" || sub === "Held In Off-hand" || isDagger) return false;
  }

  return true;
}

const QUALITY_CLASS = {
  EPIC: "quality-epic",
  RARE: "quality-rare",
  UNCOMMON: "quality-uncommon",
  LEGENDARY: "quality-legendary"
};

export const TIER_SLOTS = new Set(["HEAD", "SHOULDER", "CHEST", "ROBE", "HAND", "HANDS", "LEGS"]);

export const TIER_SLOT_NAMES = {
  HEAD: "head",
  SHOULDER: "shoulders",
  CHEST: "chest",
  ROBE: "chest",
  HAND: "hands",
  HANDS: "hands",
  LEGS: "legs"
};

export class DungeonCalculator {
  constructor(aggregatedData) {
    this.data = aggregatedData;
    this.trinketRoles = this.buildTrinketRoles();
    this.masterDungeonItems = this.buildMasterDungeonPool();
    this.masterRaidItems = this.buildMasterRaidPool();
  }

  // Build map of trinket_id -> Set of observed roles (tank, dps, healer, support)
  buildTrinketRoles() {
    const map = new Map();
    for (const [sId, s] of Object.entries(this.data.specializations || {})) {
      const role = s.role || "dps";
      const items = [
        s.gear?.trinket1,
        s.gear?.trinket2,
        ...(s.gear?.trinket1?.alternatives || []),
        ...(s.gear?.trinket2?.alternatives || [])
      ];
      for (const it of items) {
        if (!it || !it.item_id) continue;
        if (!map.has(it.item_id)) map.set(it.item_id, new Set());
        map.get(it.item_id).add(role);
      }
    }
    return map;
  }

  // Extract all unique dungeon items observed across all specs
  buildMasterDungeonPool() {
    const map = new Map();
    for (const spec of Object.values(this.data.specializations || {})) {
      for (const [slot, slotItem] of Object.entries(spec.gear || {})) {
        const list = [slotItem, ...(slotItem.alternatives || [])];
        for (const it of list) {
          if (it && it.dungeon && it.item_id) {
            if (!map.has(it.item_id)) {
              map.set(it.item_id, {
                item_id: it.item_id,
                name: it.name,
                icon: it.icon,
                ilvl: it.ilvl,
                quality: it.quality || "EPIC",
                dungeon: it.dungeon,
                encounter: it.encounter,
                inventory_type: it.inventory_type,
                item_subclass: it.item_subclass,
                stats: it.stats || [],
                slotHint: slot,
                source: it.source || `Mythic+ · ${it.dungeon}`
              });
            }
          }
        }
      }
    }
    return Array.from(map.values());
  }

  // Extract all unique raid items observed across all specs
  buildMasterRaidPool() {
    const map = new Map();
    for (const spec of Object.values(this.data.specializations || {})) {
      for (const [slot, slotItem] of Object.entries(spec.gear || {})) {
        const list = [slotItem, ...(slotItem.alternatives || [])];
        for (const it of list) {
          if (it && it.raid && it.item_id) {
            const boss = it.boss || it.encounter || "Raid Encounter";
            if (!map.has(it.item_id)) {
              map.set(it.item_id, {
                item_id: it.item_id,
                name: it.name,
                icon: it.icon,
                ilvl: it.ilvl,
                quality: it.quality || "EPIC",
                raid: it.raid,
                boss: boss,
                encounter: boss,
                inventory_type: it.inventory_type,
                item_subclass: it.item_subclass,
                stats: it.stats || [],
                slotHint: slot,
                source: it.source || `Raid · ${it.raid}`
              });
            }
          }
        }
      }
    }
    return Array.from(map.values());
  }

  // Determine primary stat for a spec
  getPrimaryStat(specData) {
    const pri = specData?.stats?.primary || {};
    let topStat = "agility";
    let topVal = -1;
    for (const [stat, val] of Object.entries(pri)) {
      if (stat === "stamina") continue;
      if (val > topVal) {
        topVal = val;
        topStat = stat;
      }
    }
    return topStat; // "agility" | "strength" | "intellect"
  }

  // Check if an item is on the spec's eligible loot table
  isItemEligible(item, specSlug, specData) {
    const classId = specData?.class || (specSlug ? specSlug.split("-").slice(0, -1).join("-") : "monk");
    const armorType = armorTypeFor(classId);
    const primaryStat = this.getPrimaryStat(specData);
    const inv = item.inventory_type;
    const sub = item.item_subclass;

    const statsList = (item.stats || []).map(s => (s.name || s.type || "").toLowerCase());
    const hasAgi = statsList.some(s => s.includes("agility"));
    const hasStr = statsList.some(s => s.includes("strength"));
    const hasInt = statsList.some(s => s.includes("intellect"));

    // Jewelry and Cloak are universal
    if (["FINGER", "NECK", "CLOAK"].includes(inv)) return true;

    // Armor slots: must match class armor type
    const armorSlots = ["HEAD", "SHOULDER", "CHEST", "ROBE", "WRIST", "HAND", "HANDS", "WAIST", "LEGS", "FEET"];
    if (armorSlots.includes(inv)) {
      return sub === armorType;
    }

    // Trinkets: must not be strictly conflicting primary stat or role
    if (inv === "TRINKET") {
      if (primaryStat === "agility" && (hasInt || hasStr) && !hasAgi) return false;
      if (primaryStat === "strength" && (hasInt || hasAgi) && !hasStr) return false;
      if (primaryStat === "intellect" && (hasAgi || hasStr) && !hasInt) return false;

      // Role check if trinket has strict empirical role restriction
      const roles = this.trinketRoles?.get(item.item_id);
      if (roles && roles.size === 1) {
        const specRole = specData.role || (specSlug?.includes("brewmaster") || specSlug?.includes("blood") || specSlug?.includes("vengeance") || specSlug?.includes("guardian") || specSlug?.includes("protection") ? "tank" : specSlug?.includes("mistweaver") || specSlug?.includes("holy") || specSlug?.includes("restoration") || specSlug?.includes("preservation") || specSlug?.includes("discipline") ? "healer" : "dps");
        const onlyRole = Array.from(roles)[0];
        if (onlyRole === "tank" && specRole !== "tank") return false;
        if (onlyRole === "healer" && specRole !== "healer") return false;
      }
      return true;
    }

    // Weapons / Off-hands: must match class weapon proficiencies and spec-specific rules
    const weaponSlots = ["WEAPON", "TWOHWEAPON", "MAINHAND", "ONE_HAND", "OFF_HAND", "HOLDABLE", "RANGED", "RANGEDRIGHT", "SHIELD", "WEAPONMAINHAND"];
    if (weaponSlots.includes(inv) || ["One-Hand", "Two-Hand", "Off Hand", "Shield", "Polearm"].includes(sub)) {
      if (!isWeaponEligibleForSpec(sub, inv, specSlug, classId)) return false;

      // Check weapon primary stat match if present
      if (primaryStat === "agility" && (hasInt || hasStr) && !hasAgi) return false;
      if (primaryStat === "strength" && (hasInt || hasAgi) && !hasStr) return false;
      if (primaryStat === "intellect" && (hasAgi || hasStr) && !hasInt) return false;
      return true;
    }

    return true;
  }

  // Calculate secondary stat synergy score for an item given spec priority
  getStatSynergy(item, statPriority = []) {
    if (!item.stats || item.stats.length === 0) {
      return { score: 1.0, label: "Proc / Special", topStatsFound: [] };
    }

    const itemStats = (item.stats || [])
      .map(s => (s.name || s.type || "").toLowerCase())
      .filter(s => /crit|haste|mastery|versatility/.test(s));

    if (itemStats.length === 0) {
      return { score: 1.0, label: "Proc / Special", topStatsFound: [] };
    }

    const rank1 = statPriority[0];
    const rank2 = statPriority[1];
    const rankLast = statPriority[statPriority.length - 1];

    let hits = 0;
    const topStatsFound = [];

    for (const stat of itemStats) {
      if (rank1 && stat.includes(rank1)) { hits += 2; topStatsFound.push(rank1); }
      else if (rank2 && stat.includes(rank2)) { hits += 1.5; topStatsFound.push(rank2); }
      else if (rankLast && stat.includes(rankLast)) { hits -= 0.5; }
    }

    if (hits >= 3) return { score: 1.3, label: "Optimal (Top Stats)", topStatsFound };
    if (hits >= 1.5) return { score: 1.15, label: "Good Stats", topStatsFound };
    if (hits <= 0) return { score: 0.85, label: "Off-Stat", topStatsFound };
    return { score: 1.0, label: "Balanced", topStatsFound };
  }

  // Build spec meta usage map (deduplicating across slots, picking max percent/isBis)
  buildMetaUsage(specData) {
    const metaUsage = new Map(); // itemId -> { isBis, percent, slot, count }
    for (const [slot, slotItem] of Object.entries(specData.gear || {})) {
      if (!slotItem || !slotItem.item_id) continue;
      const existing = metaUsage.get(slotItem.item_id);
      const isBis = true;
      const percent = Math.max(existing?.percent || 0, slotItem.percent || 0);
      const count = Math.max(existing?.count || 0, slotItem.count || 0);
      metaUsage.set(slotItem.item_id, {
        isBis,
        percent,
        slot: existing?.isBis ? existing.slot : slot,
        count
      });

      for (const alt of slotItem.alternatives || []) {
        if (!alt || !alt.item_id) continue;
        const cur = metaUsage.get(alt.item_id);
        const altPercent = Math.max(cur?.percent || 0, alt.percent || 0);
        const altCount = Math.max(cur?.count || 0, alt.count || 0);
        metaUsage.set(alt.item_id, {
          isBis: cur?.isBis || false,
          percent: altPercent,
          slot: cur?.slot || slot,
          count: altCount
        });
      }
    }
    return metaUsage;
  }

  // Core evaluation logic for a set of items grouped by key
  evaluateItemCollection(items, specSlug, specData, type, groupKeyFn, groupMetaFn) {
    const classId = specData.class;
    const cls = findClass(classId);
    const classSpecs = (cls?.specs || []).map(name => ({
      name,
      slug: specId(classId, name),
      icon: SPEC_ICONS[specId(classId, name)]
    }));

    const statPriority = specData.stats?.priority || ["crit", "versatility", "mastery", "haste"];
    const metaUsage = this.buildMetaUsage(specData);
    const groupsMap = {};

    for (const item of items) {
      // Check if eligible for any spec of this class
      const isClassEligible = classSpecs.some(s => {
        const sibData = this.data.specializations[s.slug] || { class: classId };
        return this.isItemEligible(item, s.slug, sibData);
      });
      if (!isClassEligible) continue;

      const groupKey = groupKeyFn(item);
      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          key: groupKey,
          type,
          ...groupMetaFn(item),
          eligibleItems: []
        };
      }

      const isCurrentEligible = this.isItemEligible(item, specSlug, specData);
      const meta = metaUsage.get(item.item_id);
      const isBis = isCurrentEligible && !!meta?.isBis;
      const metaPercent = isCurrentEligible ? (meta?.percent || 0) : 0;
      const isMeta = isCurrentEligible && !!meta && metaPercent >= 0.05;
      const statSynergy = this.getStatSynergy(item, statPriority);

      // Season 2 Catalyst Base detection:
      // Base items in tier slots (Head, Shoulders, Chest, Hands, Legs) retain their secondary stats when catalyzed!
      const isTierSlot = TIER_SLOTS.has(item.inventory_type);
      const isCatalystBase = isTierSlot && isCurrentEligible && statSynergy.score >= 1.15;
      const isOptimalCatalyst = isTierSlot && isCurrentEligible && statSynergy.score >= 1.3;

      const eligibleSpecs = classSpecs.map(s => {
        const sibData = this.data.specializations[s.slug] || { class: classId };
        const isEligible = this.isItemEligible(item, s.slug, sibData);
        return {
          slug: s.slug,
          name: s.name,
          icon: s.icon,
          isEligible,
          isCurrent: s.slug === specSlug
        };
      });

      let slotMultiplier = 1.0;
      if (item.inventory_type === "TRINKET") slotMultiplier = 2.2;
      else if (["FINGER", "NECK", "WEAPON", "TWOHWEAPON", "MAINHAND", "ONE_HAND"].includes(item.inventory_type)) {
        slotMultiplier = 1.6;
      } else if (isCatalystBase) {
        // Boost value for items with spec-optimal stats that can be converted to Tier
        slotMultiplier = isOptimalCatalyst ? 1.8 : 1.4;
      }

      let valueScore = 0;
      if (isCurrentEligible) {
        valueScore = isBis
          ? Math.round((metaPercent * 100 * slotMultiplier * statSynergy.score) + 40)
          : isMeta
            ? Math.round((metaPercent * 100 * slotMultiplier * statSynergy.score) + 15)
            : isCatalystBase
              ? Math.round((isOptimalCatalyst ? 32 : 18) * statSynergy.score)
              : statSynergy.score >= 1.15 ? 10 : 2;
      }

      const tierSlotKey = isTierSlot ? (TIER_SLOT_NAMES[item.inventory_type] || item.slotName?.toLowerCase() || "gear") : null;
      const displaySlotName = isTierSlot && tierSlotKey ? tierSlotKey : (meta?.slot || item.slotHint || "Gear");

      groupsMap[groupKey].eligibleItems.push({
        ...item,
        isCurrentEligible,
        eligibleSpecs,
        isBis,
        isMeta,
        isTierSlot,
        tierSlotKey,
        isCatalystBase,
        isOptimalCatalyst,
        metaPercent,
        slotName: displaySlotName,
        slotMultiplier,
        statSynergy,
        valueScore
      });
    }

    const results = Object.values(groupsMap).map(grp => {
      // Deduplicate items in the same group by item_id
      const uniqueItemsMap = new Map();
      for (const it of grp.eligibleItems) {
        if (!uniqueItemsMap.has(it.item_id)) {
          uniqueItemsMap.set(it.item_id, it);
        } else {
          // Keep the one with higher value
          if (it.valueScore > uniqueItemsMap.get(it.item_id).valueScore) {
            uniqueItemsMap.set(it.item_id, it);
          }
        }
      }
      const allClassItems = Array.from(uniqueItemsMap.values());

      // Only consider current spec items for dungeon scoring, EV, and hit rate
      const currentSpecItems = allClassItems.filter(it => it.isCurrentEligible);
      const eligibleCount = currentSpecItems.length;
      const bisItems = currentSpecItems.filter(it => it.isBis);
      const metaItems = currentSpecItems.filter(it => it.isMeta || it.isBis);
      const topTrinkets = currentSpecItems.filter(it => it.inventory_type === "TRINKET" && (it.isBis || it.isMeta));
      const catalystBases = currentSpecItems.filter(it => it.isCatalystBase);

      const hitCount = currentSpecItems.filter(it => it.isBis || it.isMeta || it.isCatalystBase || it.statSynergy.score >= 1.15).length;
      const hitRate = eligibleCount > 0 ? (hitCount / eligibleCount) : 0;

      const totalItemScore = currentSpecItems.reduce((acc, it) => acc + it.valueScore, 0);
      const densityBonus = 1.0 + (hitRate * 0.5);
      const compositeScore = Math.round(totalItemScore * densityBonus);

      // Sort items: active spec drops first by valueScore descending, then off-spec drops
      allClassItems.sort((a, b) => {
        if (a.isCurrentEligible && !b.isCurrentEligible) return -1;
        if (!a.isCurrentEligible && b.isCurrentEligible) return 1;
        return b.valueScore - a.valueScore;
      });

      return {
        key: grp.key,
        type: grp.type,
        name: grp.name,
        subtitle: grp.subtitle,
        bossName: grp.bossName,
        raidName: grp.raidName,
        eligibleCount,
        hitCount,
        hitRate,
        compositeScore,
        bisItems,
        metaItems,
        topTrinkets,
        catalystBases,
        items: allClassItems
      };
    });

    // Sort descending by composite score
    results.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign tier (S / A / B / C)
    if (results.length > 0) {
      const maxScore = results[0].compositeScore;
      results.forEach((d, idx) => {
        const ratio = maxScore > 0 ? d.compositeScore / maxScore : 0;
        if (ratio >= 0.75 || idx === 0) d.tier = "S";
        else if (ratio >= 0.50) d.tier = "A";
        else if (ratio >= 0.30) d.tier = "B";
        else d.tier = "C";
      });
    }

    return results;
  }

  // Evaluate Mythic+ Dungeons
  evaluateDungeons(specSlug) {
    const specData = this.data.specializations?.[specSlug];
    if (!specData) return [];

    return this.evaluateItemCollection(
      this.masterDungeonItems,
      specSlug,
      specData,
      "dungeon",
      it => it.dungeon,
      it => ({
        name: it.dungeon,
        subtitle: "Mythic+ Dungeon",
        bossName: null,
        raidName: null
      })
    );
  }

  // Evaluate Raid Boss Encounters
  evaluateRaidBosses(specSlug) {
    const specData = this.data.specializations?.[specSlug];
    if (!specData) return [];

    return this.evaluateItemCollection(
      this.masterRaidItems,
      specSlug,
      specData,
      "raid",
      it => `${it.raid} · ${it.boss}`,
      it => ({
        name: it.boss,
        subtitle: `${it.raid} · Raid Encounter`,
        bossName: it.boss,
        raidName: it.raid
      })
    );
  }

  // Combined evaluation: Dungeons + Raid Bosses
  evaluateCombined(specSlug) {
    const dungeons = this.evaluateDungeons(specSlug);
    const raids = this.evaluateRaidBosses(specSlug);
    const combined = [...dungeons, ...raids];
    combined.sort((a, b) => b.compositeScore - a.compositeScore);

    if (combined.length > 0) {
      const maxScore = combined[0].compositeScore;
      combined.forEach((d, idx) => {
        const ratio = maxScore > 0 ? d.compositeScore / maxScore : 0;
        if (ratio >= 0.75 || idx === 0) d.tier = "S";
        else if (ratio >= 0.50) d.tier = "A";
        else if (ratio >= 0.30) d.tier = "B";
        else d.tier = "C";
      });
    }

    return combined;
  }

  // Compute loot spec advice for a target encounter
  getLootSpecAdvice(specSlug, target) {
    const specData = this.data.specializations?.[specSlug];
    if (!specData) return null;
    const classId = specData.class;
    const currentPrimary = this.getPrimaryStat(specData);

    // Sibling specs for this class
    const siblingSpecs = Object.keys(this.data.specializations || {})
      .filter(s => this.data.specializations[s].class === classId);

    // Target items the player cares about (BiS or meta >= 15%)
    const targetChaseItems = target.items.filter(it => it.isBis || it.metaPercent >= 0.15);

    let bestSpec = specSlug;
    let bestPoolSize = target.eligibleCount;
    let improvementReason = null;

    for (const sibSlug of siblingSpecs) {
      if (sibSlug === specSlug) continue;
      const sibData = this.data.specializations[sibSlug];
      const sibPrimary = this.getPrimaryStat(sibData);

      const sibTargets = target.type === "dungeon"
        ? this.evaluateDungeons(sibSlug)
        : this.evaluateRaidBosses(sibSlug);

      const sibTarget = sibTargets.find(t => t.key === target.key);
      if (!sibTarget || sibTarget.eligibleCount === 0) continue;

      // SAFETY CHECK 1: Every chase/BiS item for the player MUST still be eligible in sibling pool
      if (targetChaseItems.length > 0) {
        const allChasePresent = targetChaseItems.every(chase =>
          sibTarget.items.some(sibItem => sibItem.item_id === chase.item_id && sibItem.isCurrentEligible)
        );
        if (!allChasePresent) continue;
      }

      // SAFETY CHECK 2: Primary stat safety
      // If sibling has different primary stat, verify it introduces NO conflicting items
      if (sibPrimary !== currentPrimary) {
        const hasConflictingItems = sibTarget.items.filter(it => it.isCurrentEligible).some(it => {
          const stats = (it.stats || []).map(s => (s.name || s.type || "").toLowerCase());
          const hasCurrentPri = stats.some(s => s.includes(currentPrimary));
          const hasSibPri = stats.some(s => s.includes(sibPrimary));
          return hasSibPri && !hasCurrentPri;
        });
        if (hasConflictingItems) continue;
      }

      // Compare pool size
      if (sibTarget.eligibleCount < bestPoolSize) {
        bestSpec = sibSlug;
        bestPoolSize = sibTarget.eligibleCount;
        const diff = target.eligibleCount - sibTarget.eligibleCount;
        improvementReason = `Eliminates ${diff} unwanted drop${diff > 1 ? "s" : ""} (${sibTarget.eligibleCount} vs ${target.eligibleCount} total), boosting your BiS odds!`;
      }
    }

    const isCurrent = (bestSpec === specSlug);
    const rawSpec = this.data.specializations[bestSpec]?.spec || specData.spec || "";
    const recommendedSpecName = rawSpec.charAt(0).toUpperCase() + rawSpec.slice(1);
    const currentSpecName = (specData.spec || "").charAt(0).toUpperCase() + (specData.spec || "").slice(1);

    return {
      recommendedSpec: bestSpec,
      recommendedSpecName,
      isCurrent,
      reason: isCurrent
        ? `Keep as ${currentSpecName} (optimal pool or required for chase drops)`
        : `Switch to ${recommendedSpecName} — ${improvementReason}`
    };
  }

  // Master evaluation package for a spec
  evaluate(specSlug, mode = "dungeons", options = {}) {
    const { tierOnly = false, slotFilter = "all" } = options;
    const specData = this.data.specializations?.[specSlug];
    if (!specData) return null;

    let targets = [];
    if (mode === "dungeons") targets = this.evaluateDungeons(specSlug);
    else if (mode === "raids") targets = this.evaluateRaidBosses(specSlug);
    else targets = this.evaluateCombined(specSlug);

    // Build comprehensive 5-slot tier base matrix across the entire pool for this spec
    const tierSlotMatrix = {
      head: [],
      shoulders: [],
      chest: [],
      hands: [],
      legs: []
    };

    // Gather all eligible tier items across all targets
    const seenTierItems = new Set();
    for (const t of targets) {
      for (const it of t.items) {
        if (it.isCurrentEligible && it.isTierSlot && it.tierSlotKey && tierSlotMatrix[it.tierSlotKey]) {
          if (!seenTierItems.has(it.item_id)) {
            seenTierItems.add(it.item_id);
            tierSlotMatrix[it.tierSlotKey].push({
              item: it,
              targetName: t.name,
              targetSubtitle: t.subtitle,
              targetType: t.type,
              targetKey: t.key,
              score: it.statSynergy.score,
              synergyLabel: it.statSynergy.label,
              topStatsFound: it.statSynergy.topStatsFound || []
            });
          }
        }
      }
    }

    // Sort each tier slot by statSynergy score descending
    for (const slotKey of Object.keys(tierSlotMatrix)) {
      tierSlotMatrix[slotKey].sort((a, b) => b.score - a.score);
    }

    // If tierOnly is active, filter targets and items
    if (tierOnly) {
      targets = targets.map(t => {
        const filteredItems = t.items.filter(it => {
          if (!it.isCurrentEligible || !it.isTierSlot) return false;
          if (slotFilter !== "all" && it.tierSlotKey !== slotFilter) return false;
          return true;
        });

        if (filteredItems.length === 0) return null;

        const eligibleCount = filteredItems.length;
        const hitCount = filteredItems.filter(it => it.statSynergy.score >= 1.15).length;
        const hitRate = eligibleCount > 0 ? (hitCount / eligibleCount) : 0;
        const totalItemScore = filteredItems.reduce((acc, it) => acc + (it.valueScore || 0), 0);
        const compositeScore = Math.round(totalItemScore * (1.0 + (hitRate * 0.5)));

        return {
          ...t,
          eligibleCount,
          hitCount,
          hitRate,
          compositeScore,
          items: filteredItems
        };
      }).filter(Boolean);

      // Sort targets descending by tier compositeScore
      targets.sort((a, b) => b.compositeScore - a.compositeScore);

      // Reassign tier badges (S, A, B, C)
      if (targets.length > 0) {
        const maxScore = targets[0].compositeScore;
        targets.forEach((d, idx) => {
          const ratio = maxScore > 0 ? d.compositeScore / maxScore : 0;
          if (ratio >= 0.75 || idx === 0) d.tier = "S";
          else if (ratio >= 0.50) d.tier = "A";
          else if (ratio >= 0.30) d.tier = "B";
          else d.tier = "C";
        });
      }
    }

    // Build map of all items currently displayed for quick tooltip lookup
    const allItemsMap = new Map();
    for (const t of targets) {
      t.lootSpecAdvice = this.getLootSpecAdvice(specSlug, t);
      for (const it of t.items) {
        allItemsMap.set(it.item_id, it);
      }
    }

    return {
      specSlug,
      specData,
      mode,
      options: { tierOnly, slotFilter },
      statPriority: specData.stats?.priority || ["crit", "versatility", "mastery", "haste"],
      primaryStat: this.getPrimaryStat(specData),
      targets,
      tierSlotMatrix,
      allItemsMap
    };
  }
}

// Tooltip rendering logic (Native Meta'gor tooltip)
export function renderItemTooltip(ttElement, item) {
  if (!ttElement || !item) return;

  const lines = [];
  // Slot + armor/weapon type
  const slotDisplay = item.slotName ? item.slotName.toUpperCase() : (item.inventory_type || "");
  const subDisplay = item.item_subclass || "";
  lines.push(`<div class="tooltip-slot-type"><span>${slotDisplay}</span>${subDisplay ? `<span>${subDisplay}</span>` : ""}</div>`);

  // Item Title with quality color
  const qClass = QUALITY_CLASS[item.quality] || "quality-epic";
  lines.push(`<div class="tooltip-title ${qClass}">${item.name}</div>`);

  if (item.ilvl) lines.push(`<div class="tooltip-ilvl">Item Level ${item.ilvl}</div>`);

  // Secondary Stats
  if (item.stats && item.stats.length) {
    const statsHtml = item.stats.map(s => {
      const cls = s.is_equip_bonus ? "tooltip-stat-bonus" : "tooltip-stat-base";
      return `<div class="${cls}">${s.display || `${s.name} +${s.value}`}</div>`;
    }).join("");
    lines.push(`<div class="tooltip-stats">${statsHtml}</div>`);
  }

  // Source / Raid / Dungeon tag
  if (item.source) {
    lines.push(`<div class="tooltip-source-tag">${item.source}</div>`);
  }
  if (item.boss || item.encounter) {
    lines.push(`<div class="tooltip-dungeon">BOSS: ${item.boss || item.encounter}</div>`);
  }

  // Season 2 Catalyst Base callout
  if (item.isCatalystBase) {
    lines.push(`<div class="tooltip-catalyst-note">✨ Season 2 Catalyst: Converts to Tier Set while keeping these ${item.statSynergy?.label || 'secondary'} stats!</div>`);
  }

  // Adoption percentage
  if (typeof item.metaPercent === "number" && item.metaPercent > 0) {
    lines.push(`<div class="tooltip-usage">Used by ${Math.round(item.metaPercent * 100)}% of top 50 mythic+ ladder</div>`);
  } else if (item.statSynergy) {
    lines.push(`<div class="tooltip-usage" style="color:#00FF98;">Stat Synergy: ${item.statSynergy.label}</div>`);
  }

  ttElement.innerHTML = lines.join("");
}

export function positionTooltip(e, tt) {
  if (!tt || tt.style.display !== "block") return;
  const ttW = tt.offsetWidth, ttH = tt.offsetHeight;
  let x = e.pageX + 15, y = e.pageY + 15;
  if (x + ttW > window.innerWidth) x = e.pageX - ttW - 15;
  if (y + ttH > window.scrollY + window.innerHeight) y = e.pageY - ttH - 15;
  tt.style.left = `${Math.max(10, x)}px`;
  tt.style.top = `${Math.max(10, y)}px`;
}
