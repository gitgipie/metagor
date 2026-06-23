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
  SPECS, findSpec, SAMPLE_SIZE, REGION
} from "./lib/config.mjs";
import { discoverCurrent, primeRealmIndex, normalizeRealmSlug } from "./lib/discover.mjs";
import {
  gatherAllLeaderboards, tallyTopPerformersBySpec,
  extractPartyMembers, SPEC_BY_BLIZZARD_ID,
  getConnectedRealms, getActiveDungeonIds, getCurrentPeriodId
} from "./lib/leaderboard.mjs";
import {
  getCharacterEquipment, getCharacterSpecializations, resolveItemIcon
} from "./lib/blizzard.mjs";
import {
  normalizeEquipment, aggregateSpec, sortKeysDeep
} from "./lib/aggregate.mjs";
import { resolveConsumables } from "./lib/resolve-consumables.mjs";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "data", "aggregated_bis.json");

function log(...a) { console.log("[run-once]", ...a); }
function warn(...a) { console.warn("[run-once]", ...a); }

// Resolve a Blizzard playable-specialization id to one of our spec catalog entries.
// A character's specId in leaderboards is the Blizzard spec id, not our slug.
function blizzardSpecIdToSpecEntry(blizzardSpecId) {
  return SPEC_BY_BLIZZARD_ID.get(blizzardSpecId);
}

async function fetchOneProfile(realmSlug, name) {
  try {
    const slug = (realmSlug || normalizeRealmSlug(name)).toLowerCase();
    // Fetch sequentially so a 403 on specializations doesn't kill equipment.
    let equip = null, specs = null, equipErr = null, specsErr = null;
    try { equip = await getCharacterEquipment(slug, name); }
    catch (e) { equipErr = e; }
    try { specs = await getCharacterSpecializations(slug, name); }
    catch (e) { specsErr = e; }

    // Skip if neither endpoint worked (real privacy block or persistent throttle).
    if (!equip && !specs) {
      warn(`profile ${name}/${slug}: both endpoints failed (equip: ${equipErr?.status}, specs: ${specsErr?.status})`);
      return null;
    }
    return {
      items: equip ? normalizeEquipment(equip) : {},
      gems: equip ? extractGems(equip) : [],
      enchants: equip ? extractEnchants(equip) : [],
      embellishments: equip ? extractEmbellishments(equip) : [],
      talents: specs ? extractTalents(specs) : { loadout_string: null, hero_talent: null }
    };
  } catch (e) {
    warn(`profile ${name}/${realmSlug} failed: ${e.message}`);
    return null;
  }
}

function extractGems(equip) {
  const out = [];
  for (const it of equip?.equipped_items || []) {
    for (const s of it?.sockets || []) {
      const g = s?.item;
      if (g?.id) out.push({ id: g.id, name: g.name, display: s.display_string });
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
      out.push({
        slot,
        id: en?.enchantment_id ?? null,
        name: en?.display_string ?? null
      });
    }
  }
  return out;
}

function mapItemSlotToEnchantKey(slotType) {
  return {
    HEAD: "head",
    CHEST: "chest",
    LEGS: "legs",
    FEET: "feet",
    WRIST: "wrists",
    MAIN_HAND: "weapon",
    OFF_HAND: "weapon",
    FINGER_1: "ring",
    FINGER_2: "ring"
  }[slotType] || null;
}

function extractEmbellishments(_equip) {
  // Hook left for v1.1 once Blizzard exposes embellishments reliably per-item.
  return [];
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

async function runSpec(specEntry, topPerformers) {
  // Hard cap on attempts so we don't burn an hour retrying private profiles.
  const MAX_ATTEMPTS = 75;
  log(`spec ${specEntry.id}: fetching profiles (need ${SAMPLE_SIZE}, candidates=${topPerformers.length}, max-attempts=${MAX_ATTEMPTS})...`);
  // Settle: the leaderboard batch flooded Blizzard; give the throttle a moment to reset.
  await new Promise(r => setTimeout(r, 3000));
  const profiles = [];
  let i = 0;
  for (const p of topPerformers) {
    if (profiles.length >= SAMPLE_SIZE) break;
    if (i >= MAX_ATTEMPTS) {
      warn(`spec ${specEntry.id}: hit MAX_ATTEMPTS=${MAX_ATTEMPTS} with only ${profiles.length} profiles`);
      break;
    }
    i++;
    const profile = await fetchOneProfile(p.realmSlug, p.name);
    if (profile) profiles.push(profile);
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

  // Resolve icons for all unique item_ids in the aggregated gear.
  const uniqueItemIds = new Set();
  for (const slot of Object.keys(aggregated.gear)) {
    const g = aggregated.gear[slot];
    if (g?.item_id) uniqueItemIds.add(g.item_id);
  }
  // Also resolve gems.
  for (const gem of aggregated.gems || []) {
    if (gem?.item_id) uniqueItemIds.add(gem.item_id);
  }
  log(`spec ${specEntry.id}: resolving ${uniqueItemIds.size} unique item icons...`);
  const iconMap = new Map();
  for (const itemId of uniqueItemIds) {
    const icon = await resolveItemIcon(itemId);
    iconMap.set(itemId, icon);
  }
  // Apply resolved icons.
  for (const slot of Object.keys(aggregated.gear)) {
    const g = aggregated.gear[slot];
    if (g?.item_id && iconMap.has(g.item_id)) g.icon = iconMap.get(g.item_id);
  }
  for (const gem of aggregated.gems || []) {
    if (gem?.item_id && iconMap.has(gem.item_id)) gem.icon = iconMap.get(gem.item_id);
  }
  log(`spec ${specEntry.id}: icons resolved`);

  return aggregated;
}

async function main() {
  const target = process.argv[2];
  if (target === "--dry-run") {
    log("dry-run: discovering current expansion/season/period...");
    const current = await discoverCurrent();
    log(`season=${current.season_id}, period=${current.period_id}, region=${current.region}`);
    log("dry-run: OK - discovery works, exiting without writes.");
    process.exit(0);
  }

  const onlySpec = target ? findSpec(target) : null;
  if (target && !onlySpec) {
    console.error(`[run-once] unknown spec id: ${target}`);
    process.exit(2);
  }

  log("discovering current season/period...");
  const current = await discoverCurrent();
  log(`season=${current.season_id}, period=${current.period_id}, region=${current.region}`);

  log("priming realm index...");
  await primeRealmIndex();

  log("fetching all leaderboards...");
  const { members } = await gatherAllLeaderboards({
    periodId: current.period_id
  });
  log(`leaderboards: ${members.length} member appearances collected`);

  log("tallying top performers by spec...");
  // Pull 200 candidates per spec; many will 403 (private profiles). We'll filter
  // to the first 50 that respond successfully at fetch time.
  const topBySpec = tallyTopPerformersBySpec(members, { limit: 200 });

  // Build the spec list to run.
  const specsToRun = onlySpec ? [onlySpec] : SPECS;

  const out = {};
  for (const spec of specsToRun) {
    const topPerformers = topBySpec.get(spec.blizzardSpecId) || [];
    log(`spec ${spec.id}: ${topPerformers.length} top performers identified from leaderboards`);
    if (topPerformers.length === 0) {
      warn(`spec ${spec.id}: no top performers from leaderboards - skipping`);
      continue;
    }
    out[spec.id] = await runSpec(spec, topPerformers);
  }

  const payload = sortKeysDeep({
    meta: {
      generated_at: new Date().toISOString(),
      expansion: current.expansion,
      expansion_id: current.expansion_id,
      patch: current.patch,
      season_id: current.season_id,
      period_id: current.period_id,
      region: REGION,
      sample_size: SAMPLE_SIZE,
      source: "blizzard-mythic-leaderboard+profile-api",
      schema_version: 1
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
}

main().catch(e => {
  console.error("[run-once] FATAL:", e.stack || e.message);
  process.exit(1);
});