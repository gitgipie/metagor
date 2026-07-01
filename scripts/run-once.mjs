// scripts/run-once.mjs
// One-shot scraper. Entry point: node scripts/run-once.mjs [specId|--dry-run]
//   - no arg = run all specs that have >= 50 representative top performers
//   - with specId = run only that spec
//   - --dry-run = discover only, no fetches, no writes
// Behavior:
//   0. Boot-time discovery (discover.mjs) - abort on failure.
//   1. Fetch every active connected-realm leaderboard for the current period.
//   2. Tally top performers by spec.
//   3. For each spec: fetch equipment for its top 50 characters.
//   4. Aggregate (aggregate.mjs).
//   5. Resolve consumable names (resolve-consumables.mjs).
//   6. Validate output against schema (schema-validate.mjs).
//   7. Atomic write data/aggregated_bis.json.

import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SPECS, findSpec, SAMPLE_SIZE, REGIONS
} from "./lib/config.mjs";
import { discoverCurrent, primeRealmIndexes, normalizeRealmSlug } from "./lib/discover.mjs";
import { discoverCurrentSeason, fetchSpecRankings } from "./lib/raiderio.mjs";
import {
  getCharacterEquipment, getCharacterSpecializations, getCharacterStatistics, resolveItemIcon
} from "./lib/blizzard.mjs";
import { buildItemDungeonMap } from "./lib/dungeon-items.mjs";
import { buildItemRaidMap } from "./lib/raid-items.mjs";
import { fetchConsumables as fetchIcyVeinsConsumables } from "./lib/icy-veins.mjs";
import {
  normalizeEquipment, aggregateSpec, sortKeysDeep
} from "./lib/aggregate.mjs";
import { resolveConsumables } from "./lib/resolve-consumables.mjs";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "data", "aggregated_bis.json");
const GUIDES_PATH = join(ROOT, "data", "guides.json");

function log(...a) { console.log("[run-once]", ...a); }
function warn(...a) { console.warn("[run-once]", ...a); }

// Resolve a Blizzard playable-specialization id to one of our spec catalog entries.
// A character's specId in leaderboards is the Blizzard spec id, not our slug.
function blizzardSpecIdToSpecEntry(blizzardSpecId) {
  return SPEC_BY_BLIZZARD_ID.get(blizzardSpecId);
}

async function fetchOneProfile(realmSlug, name, region = "eu") {
  try {
    const slug = (realmSlug || normalizeRealmSlug(name)).toLowerCase();
    // Fetch sequentially so a 403 on specializations doesn't kill equipment.
    let equip = null, specs = null, stats = null, equipErr = null, specsErr = null, statsErr = null;
    try { equip = await getCharacterEquipment(slug, name, region); }
    catch (e) { equipErr = e; }
    try { specs = await getCharacterSpecializations(slug, name, region); }
    catch (e) { specsErr = e; }
    try { stats = await getCharacterStatistics(slug, name, region); }
    catch (e) { statsErr = e; }

    // Skip if neither endpoint worked (real privacy block or persistent throttle).
    if (!equip && !specs && !stats) {
      warn(`profile ${name}/${slug} (${region}): all endpoints failed`);
      return null;
    }
    return {
      items: equip ? normalizeEquipment(equip) : {},
      gems: equip ? extractGems(equip) : [],
      enchants: equip ? extractEnchants(equip) : [],
      embellishments: equip ? extractEmbellishments(equip) : [],
      talents: specs ? extractTalents(specs) : { loadout_string: null, hero_talent: null },
      statistics: stats ? extractStatistics(stats) : null
    };
  } catch (e) {
    warn(`profile ${name}/${realmSlug} (${region}) failed: ${e.message}`);
    return null;
  }
}

function extractGems(equip) {
  const out = [];
  for (const it of equip?.equipped_items || []) {
    for (const s of it?.sockets || []) {
      const g = s?.item;
      if (g?.id) out.push({ id: g.id, name: g.name, display: s.display_string, stat_display: s.display_string || null });
    }
  }
  return out;
}

function extractEnchants(equip) {
  const out = [];
  for (const it of equip?.equipped_items || []) {
    for (const en of it?.enchantments || []) {
      const slot = mapItemSlotToEnchantKey(it?.slot?.type);
      if (!slot) continue;
      const rawName = en?.display_string ?? null;
      // Clean the display string: strip "Enchanted: " prefix and |A:...|a artifacts
      const cleanName = rawName
        ? rawName.replace(/^Enchanted:\s*/i, "").replace(/\|A:[^|]*\|a/g, "").trim()
        : null;
      out.push({
        slot,
        id: en?.enchantment_id ?? null,
        name: cleanName,
        raw_name: rawName
      });
    }
  }
  return out;
}

function mapItemSlotToEnchantKey(slotType) {
  return {
    HEAD: "head",
    SHOULDER: "shoulders",
    CHEST: "chest",
    LEGS: "legs",
    FEET: "feet",
    WRIST: "wrists",
    HANDS: "hands",
    MAIN_HAND: "mainhand",
    OFF_HAND: "offhand",
    FINGER_1: "ring",
    FINGER_2: "ring"
  }[slotType] || null;
}

function extractEmbellishments(equip) {
  // Detect embellished items via limit_category containing "Embellished".
  // Each embellished item has a spells[] array; the embellishment effect is the
  // spell whose description starts with "Equip:" (passive), not "Use:" (activated).
  const out = [];
  for (const it of equip?.equipped_items || []) {
    const lc = it?.limit_category;
    if (typeof lc !== "string" || !/embellished/i.test(lc)) continue;
    const spells = it?.spells || [];
    // Find the embellishment spell (Equip: prefix), fall back to first spell
    let embSpell = spells.find(s => /^\s*Equip:/i.test(s?.description || "")) || spells[0];
    if (!embSpell) continue;
    out.push({
      spell_id: embSpell.spell?.id ?? null,
      spell_name: embSpell.spell?.name ?? null,
      spell_desc: embSpell.description ?? null,
      item_id: it?.item?.id ?? null,
      item_name: it?.name ?? null
    });
  }
  return out;
}

function extractTalents(specs) {
  const active = specs?.active_specialization;
  const loadoutString = active?.talent_loadout_code ?? null;
  const heroTalent =
    active?.hero_talent_tree?.name ||
    (specs?.specializations || []).find(s => s?.specialization?.id === active?.id)?.hero_talent_tree?.name ||
    null;
  return { loadout_string: loadoutString, hero_talent: heroTalent };
}

function extractStatistics(stats) {
  // Extract in-game stat values from Blizzard's /statistics endpoint.
  // crit/haste/mastery are objects: { rating_bonus, value, rating_normalized }
  //   - rating_normalized = raw rating (e.g. 1192) — used for PRIORITY (matches murlok.io)
  //   - value             = in-game % (e.g. 35.91)  — used for DISPLAY (matches murlok.io)
  // versatility is a flat number (raw rating); the in-game % is versatility_damage_done_bonus.
  // We store BOTH rating and pct so aggregate.mjs can sort by rating and display by pct.
  const getRating = (field) => {
    const v = stats?.[field];
    if (v == null) return 0;
    if (typeof v === "object") return v?.rating_normalized ?? v?.value ?? 0;
    return v; // flat number (versatility)
  };
  const getPct = (field) => {
    const v = stats?.[field];
    if (v == null) return 0;
    if (typeof v === "object") return v?.value ?? 0;
    return 0; // versatility has no .value (it's a flat rating)
  };
  const getPrimary = (field) => {
    const v = stats?.[field];
    if (v == null) return 0;
    if (typeof v === "object") return v?.effective ?? v?.base ?? 0;
    return v;
  };
  return {
    agility: getPrimary("agility"),
    strength: getPrimary("strength"),
    intellect: getPrimary("intellect"),
    stamina: getPrimary("stamina"),
    // Dual rating + pct for each secondary
    crit_rating: getRating("melee_crit"),
    crit_pct: getPct("melee_crit"),
    haste_rating: getRating("melee_haste"),
    haste_pct: getPct("melee_haste"),
    mastery_rating: getRating("mastery"),
    mastery_pct: getPct("mastery"),
    vers_rating: getRating("versatility"),
    vers_pct: stats?.versatility_damage_done_bonus ?? 0,
    health: stats?.health ?? 0,
    attack_power: getPrimary("attack_power")
  };
}

async function runSpec(specEntry, topPerformers) {
  // Fetch from a pool of 100 candidates so private/failed profiles get replaced
  // by the next runner-up. We stop once we have SAMPLE_SIZE (50) valid profiles.
  const MAX_ATTEMPTS = Math.min(topPerformers.length, SAMPLE_SIZE + 50);
  log(`spec ${specEntry.id}: fetching profiles (need ${SAMPLE_SIZE}, candidates=${topPerformers.length}, max-attempts=${MAX_ATTEMPTS})...`);
  // Brief settle in case Blizzard's profile API is still throttling.
  await new Promise(r => setTimeout(r, 2000));
  const profiles = [];
  let i = 0;
  for (const p of topPerformers) {
    if (profiles.length >= SAMPLE_SIZE) break;
    if (i >= MAX_ATTEMPTS) {
      warn(`spec ${specEntry.id}: hit MAX_ATTEMPTS=${MAX_ATTEMPTS} with only ${profiles.length} profiles`);
      break;
    }
    i++;
    const profile = await fetchOneProfile(p.realmSlug, p.name, p.region || "eu");
    if (profile) {
      // If Raider.IO provided a talent loadout, use it as fallback when Blizzard doesn't
      if (p.talentLoadoutText && (!profile.talents || !profile.talents.loadout_string)) {
        if (!profile.talents) profile.talents = {};
        profile.talents.loadout_string = p.talentLoadoutText;
      }
      profiles.push(profile);
    }
    if (i % 10 === 0) log(`spec ${specEntry.id}: tried ${i}/${Math.min(topPerformers.length, MAX_ATTEMPTS)} (${profiles.length} OK)`);
    await new Promise(r => setTimeout(r, 400));
  }
  log(`spec ${specEntry.id}: ${profiles.length}/${SAMPLE_SIZE} target profiles OK (tried ${i}/${topPerformers.length})`);
  const aggregated = aggregateSpec({
    specId: specEntry.id,
    classId: specEntry.class,
    specName: specEntry.spec,
    role: specEntry.role,
    profiles,
    sampleSize: SAMPLE_SIZE
  });

  // Resolve icons for all unique item_ids in the aggregated gear (including alternatives).
  const uniqueItemIds = new Set();
  for (const slot of Object.keys(aggregated.gear)) {
    const g = aggregated.gear[slot];
    if (g?.item_id) uniqueItemIds.add(g.item_id);
    if (g?.alternatives) {
      for (const alt of g.alternatives) {
        if (alt?.item_id) uniqueItemIds.add(alt.item_id);
      }
    }
  }
  // Also resolve gems.
  for (const gem of aggregated.gems || []) {
    if (gem?.item_id) uniqueItemIds.add(gem.item_id);
  }
  // Also resolve embellishment item icons (resolve ALL items, not just the most common).
  for (const emb of aggregated.embellishments || []) {
    for (const itemId of emb?.item_ids || []) uniqueItemIds.add(itemId);
  }
  log(`spec ${specEntry.id}: resolving ${uniqueItemIds.size} unique item icons...`);
  const iconMap = new Map();
  for (const itemId of uniqueItemIds) {
    const icon = await resolveItemIcon(itemId);
    iconMap.set(itemId, icon);
  }
  // Apply resolved icons to main gear entries AND alternatives.
  for (const slot of Object.keys(aggregated.gear)) {
    const g = aggregated.gear[slot];
    if (g?.item_id && iconMap.has(g.item_id)) g.icon = iconMap.get(g.item_id);
    if (g?.alternatives) {
      for (const alt of g.alternatives) {
        if (alt?.item_id && iconMap.has(alt.item_id)) alt.icon = iconMap.get(alt.item_id);
      }
    }
  }
  for (const gem of aggregated.gems || []) {
    if (gem?.item_id && iconMap.has(gem.item_id)) gem.icon = iconMap.get(gem.item_id);
  }
  // Apply gem icons to socket_gem fields on gear entries
  for (const slot of Object.keys(aggregated.gear)) {
    const g = aggregated.gear[slot];
    if (g?.socket_gem?.item_id && iconMap.has(g.socket_gem.item_id)) {
      g.socket_gem.icon = iconMap.get(g.socket_gem.item_id);
    }
  }
  for (const emb of aggregated.embellishments || []) {
    // Set the icon to the most common item's icon
    if (emb?.item_ids?.length && iconMap.has(emb.item_ids[0])) emb.icon = iconMap.get(emb.item_ids[0]);
    // Also apply icons to the per-item breakdown
    if (emb?.items) {
      for (const it of emb.items) {
        if (it.item_id && iconMap.has(it.item_id)) it.icon = iconMap.get(it.item_id);
      }
    }
  }
  log(`spec ${specEntry.id}: icons resolved`);

  // Helper: enrich a single gear entry with dungeon/raid source info.
  function enrichEntry(g, dungeonMap, raidMap) {
    if (!g?.item_id || !g.source) return;
    // M+ enrichment
    if (g.source === "Mythic+" || (g.source.startsWith && g.source.startsWith("Mythic+"))) {
      const dungInfo = dungeonMap[g.item_id];
      if (dungInfo) {
        g.source = `Mythic+ · ${dungInfo.dungeon}`;
        g.dungeon = dungInfo.dungeon;
        g.encounter = dungInfo.encounter;
      } else {
        g.source = `Mythic+ (Catalyst)`;
      }
    }
    // Raid enrichment
    if (g.source && g.source.includes("Raid")) {
      const raidInfo = raidMap[g.item_id];
      if (raidInfo) {
        const difficultyPart = g.source.includes("(") ? g.source.match(/\(([^)]+)\)/)?.[1] : null;
        const baseLabel = difficultyPart ? `Raid (${difficultyPart})` : "Raid";
        g.source = `${baseLabel} · ${raidInfo.raid}`;
        g.raid = raidInfo.raid;
        g.boss = raidInfo.boss;
      }
    }
  }

  // Enrich M+ item sources with dungeon names via the journal-encounter item map.
  log(`spec ${specEntry.id}: building item→dungeon map...`);
  const dungeonMap = await buildItemDungeonMap();

  // Enrich Raid item sources with raid + boss names.
  log(`spec ${specEntry.id}: building item→raid map...`);
  const raidMap = await buildItemRaidMap();

  // Apply enrichment to main gear entries AND their alternatives.
  let enriched = 0, catalystTagged = 0, raidEnriched = 0;
  for (const slot of Object.keys(aggregated.gear)) {
    const g = aggregated.gear[slot];
    if (!g?.item_id) continue;
    enrichEntry(g, dungeonMap, raidMap);
    if (g.source?.includes("·")) enriched++;
    if (g.source === "Mythic+ (Catalyst)") catalystTagged++;
    if (g.raid) raidEnriched++;
    // Enrich alternatives too
    if (g.alternatives) {
      for (const alt of g.alternatives) {
        if (!alt?.item_id) continue;
        enrichEntry(alt, dungeonMap, raidMap);
      }
    }
  }
  log(`spec ${specEntry.id}: ${enriched} M+ items with dungeon names, ${catalystTagged} Catalyst-tagged, ${raidEnriched} raid items with raid/boss names`);

  return aggregated;
}

async function main() {
  const target = process.argv[2];
  if (target === "--dry-run") {
    log("dry-run: discovering season from Raider.IO...");
    const rioSeason = await discoverCurrentSeason();
    log(`  season: ${rioSeason.name} (slug=${rioSeason.slug}, blizzard_id=${rioSeason.blizzard_season_id})`);
    log("dry-run: discovering season/period from Blizzard for all regions...");
    const current = await discoverCurrent();
    for (const [region, info] of Object.entries(current.regions || {})) {
      log(`  ${region}: season=${info.season_id}, period=${info.period_id}`);
    }
    log("dry-run: OK - discovery works, exiting without writes.");
    process.exit(0);
  }

  const onlySpec = target ? findSpec(target) : null;
  if (target && !onlySpec) {
    console.error(`[run-once] unknown spec id: ${target}`);
    process.exit(2);
  }

  log("discovering current season from Raider.IO...");
  const rioSeason = await discoverCurrentSeason();
  log(`  season: ${rioSeason.name} (slug=${rioSeason.slug}, blizzard_id=${rioSeason.blizzard_season_id})`);

  log("discovering current season/period from Blizzard for all regions...");
  const current = await discoverCurrent();
  for (const [region, info] of Object.entries(current.regions || {})) {
    log(`  ${region}: season=${info.season_id}, period=${info.period_id}`);
  }

  // Cross-reference: if Raider.IO's season doesn't match Blizzard's current season,
  // find the Raider.IO season that matches Blizzard's blizzard_season_id.
  const blizzardSeasonId = current.regions?.eu?.season_id;
  let seasonSlug = rioSeason.slug;
  if (blizzardSeasonId && rioSeason.blizzard_season_id !== blizzardSeasonId) {
    log(`  mismatch: Raider.IO latest=${rioSeason.blizzard_season_id}, Blizzard current=${blizzardSeasonId}`);
    log(`  falling back to Raider.IO season matching blizzard_id=${blizzardSeasonId}`);
    // Re-discover with the matching blizzard_season_id
    const { discoverCurrentSeason } = await import("./lib/raiderio.mjs");
    // Try to find the right season by fetching static-data and filtering
    const allSeasons = await import("./lib/raiderio.mjs").then(m => m.discoverAllSeasons?.() || []);
    // Simpler: just construct the slug from the pattern. For now, use the Blizzard season ID
    // to pick the right Raider.IO season. We know season-mn-1 = blizzard_id 17, season-mn-2 = 18.
    // The pattern is: season-mn-{blizzard_season_id - 16}
    seasonSlug = `season-mn-${blizzardSeasonId - 16}`;
    log(`  using season slug: ${seasonSlug}`);
  }

  log("priming realm indexes for all regions...");
  await primeRealmIndexes();

  // Build the spec list to run.
  const specsToRun = onlySpec ? [onlySpec] : SPECS;

  const out = {};
  for (const spec of specsToRun) {
    log(`spec ${spec.id}: fetching per-spec rankings from Raider.IO...`);
    const rankings = await fetchSpecRankings({
      seasonSlug: seasonSlug,
      classSlug: spec.class,
      specSlug: spec.spec,
      regions: REGIONS,
      count: 100
    });
    log(`spec ${spec.id}: ${rankings.length} ranked characters from Raider.IO (top score: ${rankings[0]?.score || "N/A"})`);
    if (rankings.length === 0) {
      warn(`spec ${spec.id}: no rankings from Raider.IO - skipping`);
      continue;
    }
    // Convert rankings to the performer format expected by runSpec
    const topPerformers = rankings.map(r => ({
      name: r.name,
      realmSlug: r.realmSlug,
      region: r.region,
      score: r.score,
      rank: r.rank,
      talentLoadoutText: r.talentLoadoutText
    }));
    out[spec.id] = await runSpec(spec, topPerformers);
  }

  const payload = sortKeysDeep({
    meta: {
      generated_at: new Date().toISOString(),
      expansion: current.expansion,
      expansion_id: current.expansion_id,
      patch: current.patch,
      season_id: current.regions?.eu?.season_id,
      period_id: current.regions?.eu?.period_id,
      region: current.region,  // "eu+us+kr+tw"
      regions: current.regions,
      sample_size: SAMPLE_SIZE,
      source: "raiderio-spec-rankings+blizzard-profile-api",
      schema_version: 2
    },
    specializations: out
  });

  log("resolving consumable names...");
  await resolveConsumables();

  log("validating against schema...");
  const { ok, errors } = await validateAggregatedBis(payload);
  if (!ok) {
    console.error("[run-once] schema validation FAILED:");
    for (const e of errors) console.error("  -", e.instancePath || "/", e.message);
    console.error("[run-once] aborting - data/aggregated_bis.json NOT updated");
    process.exit(3);
  }

  const tmp = `${OUT_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(payload, null, 2));
  await rename(tmp, OUT_PATH);
  log(`wrote ${OUT_PATH} (${Object.keys(out).length} specs)`);

  // Scrape consumables from Icy Veins and update guides.json
  log("scraping consumables from Icy Veins...");
  let guides;
  try {
    guides = JSON.parse(await readFile(GUIDES_PATH, "utf8"));
  } catch {
    guides = { version: 1, updated_at: new Date().toISOString(), consumables: {}, rotations: {}, creators: {} };
  }
  if (!guides.consumables) guides.consumables = {};
  for (const spec of specsToRun) {
    try {
      const ivConsumables = await fetchIcyVeinsConsumables(spec);
      if (ivConsumables.error) {
        warn(`icy-veins ${spec.id}: ${ivConsumables.error}`);
        continue;
      }
      // Build the consumables entry, taking the first item from each category as the "best" pick
      guides.consumables[spec.id] = {
        flask: ivConsumables.flask[0] ? { name: ivConsumables.flask[0].name, note: ivConsumables.flask.length > 1 ? `Alt: ${ivConsumables.flask.slice(1).map(f => f.name).join(", ")}` : null, source: "icy-veins" } : null,
        potions: ivConsumables.potions.filter(p => !p.name.includes("Health") && !p.name.includes("Healthstone")).slice(0, 2).map(p => ({ name: p.name, source: "icy-veins" })),
        food: ivConsumables.food[0] ? { name: ivConsumables.food[0].name, note: ivConsumables.food.length > 1 ? `Alt: ${ivConsumables.food.slice(1).map(f => f.name).join(", ")}` : null, source: "icy-veins" } : null,
        weapon_buff: ivConsumables.weapon_buff[0] ? { name: ivConsumables.weapon_buff[0].name, source: "icy-veins" } : null,
        source: "icy-veins",
        scraped_at: new Date().toISOString()
      };
      log(`  ${spec.id}: flask=${ivConsumables.flask[0]?.name || "none"}, potions=${ivConsumables.potions.length}, food=${ivConsumables.food[0]?.name || "none"}, weapon=${ivConsumables.weapon_buff[0]?.name || "none"}`);
    } catch (e) {
      warn(`icy-veins ${spec.id}: ${e.message}`);
    }
  }
  guides.updated_at = new Date().toISOString();
  await writeFile(GUIDES_PATH, JSON.stringify(guides, null, 2));
  log(`updated ${GUIDES_PATH} (consumables from Icy Veins)`);
}

main().catch(e => {
  console.error("[run-once] FATAL:", e.stack || e.message);
  process.exit(1);
});