// public/js/dungeon-calc.js
// Engine and interactive controller for the Optimal Dungeon, Raid & Target Loot Calculator.

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

const QUALITY_CLASS = {
  EPIC: "quality-epic",
  RARE: "quality-rare",
  UNCOMMON: "quality-uncommon",
  LEGENDARY: "quality-legendary"
};

export class DungeonCalculator {
  constructor(aggregatedData) {
    this.data = aggregatedData;
    this.masterDungeonItems = this.buildMasterDungeonPool();
    this.masterRaidItems = this.buildMasterRaidPool();
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
    const statPriority = specData.stats?.priority || ["crit", "versatility", "mastery", "haste"];
    const metaUsage = this.buildMetaUsage(specData);
    const groupsMap = {};

    for (const item of items) {
      if (!this.isItemEligible(item, specSlug, specData)) continue;

      const groupKey = groupKeyFn(item);
      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          key: groupKey,
          type,
          ...groupMetaFn(item),
          eligibleItems: []
        };
      }

      const meta = metaUsage.get(item.item_id);
      const isBis = !!meta?.isBis;
      const metaPercent = meta?.percent || 0;
      const isMeta = !!meta && metaPercent >= 0.05;
      const statSynergy = this.getStatSynergy(item, statPriority);

      let slotMultiplier = 1.0;
      if (item.inventory_type === "TRINKET") slotMultiplier = 2.2;
      else if (["FINGER", "NECK", "WEAPON", "TWOHWEAPON", "MAINHAND", "ONE_HAND"].includes(item.inventory_type)) {
        slotMultiplier = 1.6;
      }

      groupsMap[groupKey].eligibleItems.push({
        ...item,
        isBis,
        isMeta,
        metaPercent,
        slotName: meta?.slot || item.slotHint || "Gear",
        slotMultiplier,
        statSynergy,
        valueScore: isBis
          ? Math.round((metaPercent * 100 * slotMultiplier * statSynergy.score) + 40)
          : isMeta
            ? Math.round((metaPercent * 100 * slotMultiplier * statSynergy.score) + 15)
            : statSynergy.score >= 1.15 ? 10 : 2
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
      const uniqueItems = Array.from(uniqueItemsMap.values());
      const eligibleCount = uniqueItems.length;
      const bisItems = uniqueItems.filter(it => it.isBis);
      const metaItems = uniqueItems.filter(it => it.isMeta || it.isBis);
      const topTrinkets = uniqueItems.filter(it => it.inventory_type === "TRINKET" && (it.isBis || it.isMeta));

      const hitCount = uniqueItems.filter(it => it.isBis || it.isMeta || it.statSynergy.score >= 1.15).length;
      const hitRate = eligibleCount > 0 ? (hitCount / eligibleCount) : 0;

      const totalItemScore = uniqueItems.reduce((acc, it) => acc + it.valueScore, 0);
      const densityBonus = 1.0 + (hitRate * 0.5);
      const compositeScore = Math.round(totalItemScore * densityBonus);

      uniqueItems.sort((a, b) => b.valueScore - a.valueScore);

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
        items: uniqueItems
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

  // Master evaluation package for a spec
  evaluate(specSlug, mode = "dungeons") {
    const specData = this.data.specializations?.[specSlug];
    if (!specData) return null;

    let targets = [];
    if (mode === "dungeons") targets = this.evaluateDungeons(specSlug);
    else if (mode === "raids") targets = this.evaluateRaidBosses(specSlug);
    else targets = this.evaluateCombined(specSlug);

    // Build map of all items currently displayed for quick tooltip lookup
    const allItemsMap = new Map();
    for (const t of targets) {
      for (const it of t.items) {
        allItemsMap.set(it.item_id, it);
      }
    }

    return {
      specSlug,
      specData,
      mode,
      statPriority: specData.stats?.priority || ["crit", "versatility", "mastery", "haste"],
      primaryStat: this.getPrimaryStat(specData),
      targets,
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
