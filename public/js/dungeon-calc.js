// public/js/dungeon-calc.js
// Engine and interactive controller for the Optimal Dungeon & Nebular Core Calculator.

import { wowClasses, findClass, armorTypeFor, specId } from "./registry.js";
import { iconUrl } from "./icons.js";

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

export class DungeonCalculator {
  constructor(aggregatedData) {
    this.data = aggregatedData;
    this.masterDungeonItems = this.buildMasterDungeonPool();
  }

  // Extract all unique dungeon items observed across all specs in aggregated_bis.json
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
                quality: it.quality || "EPIC",
                dungeon: it.dungeon,
                encounter: it.encounter,
                inventory_type: it.inventory_type,
                item_subclass: it.item_subclass,
                stats: it.stats || [],
                slotHint: slot
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
    const pri = specData.stats?.primary || {};
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
    const classId = specData.class;
    const armorType = armorTypeFor(classId);
    const primaryStat = this.getPrimaryStat(specData); // e.g. "agility"
    const inv = item.inventory_type;
    const sub = item.item_subclass;

    const statsList = (item.stats || []).map(s => (s.name || s.type || "").toLowerCase());
    const hasAgi = statsList.some(s => s.includes("agility"));
    const hasStr = statsList.some(s => s.includes("strength"));
    const hasInt = statsList.some(s => s.includes("intellect"));

    // Jewelry and Cloak are universal (they carry Stamina + secondary stats)
    if (["FINGER", "NECK", "CLOAK"].includes(inv)) return true;

    // Armor slots: must match class armor type
    const armorSlots = ["HEAD", "SHOULDER", "CHEST", "WRIST", "HANDS", "WAIST", "LEGS", "FEET"];
    if (armorSlots.includes(inv)) {
      return sub === armorType;
    }

    // Trinkets: must not be strictly conflicting primary stat
    if (inv === "TRINKET") {
      if (primaryStat === "agility" && (hasInt || hasStr) && !hasAgi) return false;
      if (primaryStat === "strength" && (hasInt || hasAgi) && !hasStr) return false;
      if (primaryStat === "intellect" && (hasAgi || hasStr) && !hasInt) return false;
      return true;
    }

    // Weapons / Off-hands: must match class weapon proficiencies and primary stat
    const weaponSlots = ["WEAPON", "TWOHWEAPON", "MAINHAND", "ONE_HAND", "OFF_HAND", "RANGED", "RANGEDRIGHT", "SHIELD"];
    if (weaponSlots.includes(inv) || ["One-Hand", "Two-Hand", "Off Hand"].includes(sub)) {
      const allowed = WEAPON_PROFICIENCIES[classId] || [];
      if (!allowed.includes(sub)) return false;

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
      return { score: 1.0, label: "Neutral", topStatsFound: [] };
    }

    // Secondary stat names to check
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

  // Main evaluation for a specialization
  evaluateDungeons(specSlug) {
    const specData = this.data.specializations?.[specSlug];
    if (!specData) return null;

    const statPriority = specData.stats?.priority || ["crit", "versatility", "mastery", "haste"];

    // Map spec's gear to quickly look up meta usage
    const metaUsage = new Map(); // itemId -> { isBis, percent, slot, count }
    for (const [slot, slotItem] of Object.entries(specData.gear || {})) {
      if (!slotItem || !slotItem.item_id) continue;
      // Top item is #1 BiS
      metaUsage.set(slotItem.item_id, {
        isBis: true,
        percent: slotItem.percent || 0,
        slot,
        count: slotItem.count || 0
      });
      // Alternatives
      for (const alt of slotItem.alternatives || []) {
        if (!alt || !alt.item_id) continue;
        if (!metaUsage.has(alt.item_id)) {
          metaUsage.set(alt.item_id, {
            isBis: false,
            percent: alt.percent || 0,
            slot,
            count: alt.count || 0
          });
        }
      }
    }

    // Group eligible items by dungeon
    const dungeonsMap = {};

    for (const item of this.masterDungeonItems) {
      if (!this.isItemEligible(item, specSlug, specData)) continue;

      if (!dungeonsMap[item.dungeon]) {
        dungeonsMap[item.dungeon] = {
          name: item.dungeon,
          eligibleItems: []
        };
      }

      const meta = metaUsage.get(item.item_id);
      const isBis = !!meta?.isBis;
      const metaPercent = meta?.percent || 0;
      const isMeta = !!meta && metaPercent >= 0.05; // 5%+ adoption
      const statSynergy = this.getStatSynergy(item, statPriority);

      // Slot multiplier: Trinkets are unique, Weapons/Jewelry cannot be catalyzed
      let slotMultiplier = 1.0;
      if (item.inventory_type === "TRINKET") slotMultiplier = 2.2;
      else if (["FINGER", "NECK", "WEAPON", "TWOHWEAPON", "MAINHAND", "ONE_HAND"].includes(item.inventory_type)) {
        slotMultiplier = 1.6;
      }

      dungeonsMap[item.dungeon].eligibleItems.push({
        ...item,
        isBis,
        isMeta,
        metaPercent,
        slotName: meta?.slot || item.slotHint || "Gear",
        slotMultiplier,
        statSynergy,
        // Individual item value score
        valueScore: isBis
          ? Math.round((metaPercent * 100 * slotMultiplier * statSynergy.score) + 40)
          : isMeta
            ? Math.round((metaPercent * 100 * slotMultiplier * statSynergy.score) + 15)
            : statSynergy.score >= 1.15 ? 10 : 2
      });
    }

    // Rank and calculate expected value per dungeon
    const results = Object.values(dungeonsMap).map(dung => {
      const eligibleCount = dung.eligibleItems.length;
      const bisItems = dung.eligibleItems.filter(it => it.isBis);
      const metaItems = dung.eligibleItems.filter(it => it.isMeta || it.isBis);
      const topTrinkets = dung.eligibleItems.filter(it => it.inventory_type === "TRINKET" && (it.isBis || it.isMeta));

      // Hit rate: proportion of eligible drops that are recognized meta or high-stat
      const hitCount = dung.eligibleItems.filter(it => it.isBis || it.isMeta || it.statSynergy.score >= 1.15).length;
      const hitRate = eligibleCount > 0 ? (hitCount / eligibleCount) : 0;

      // Cumulative Expected Value Score
      const totalItemScore = dung.eligibleItems.reduce((acc, it) => acc + it.valueScore, 0);
      // Pool density factor rewards dungeons where a high % of drops are hits
      const densityBonus = 1.0 + (hitRate * 0.5);
      const compositeScore = Math.round(totalItemScore * densityBonus);

      // Sort items inside dungeon: BiS first, then highest adoption / value
      dung.eligibleItems.sort((a, b) => b.valueScore - a.valueScore);

      return {
        name: dung.name,
        eligibleCount,
        hitCount,
        hitRate,
        compositeScore,
        bisItems,
        metaItems,
        topTrinkets,
        items: dung.eligibleItems
      };
    });

    // Sort dungeons descending by composite score
    results.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign tier
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

    return {
      specSlug,
      specData,
      statPriority,
      primaryStat: this.getPrimaryStat(specData),
      dungeons: results
    };
  }
}
