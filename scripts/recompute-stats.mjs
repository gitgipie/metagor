// scripts/recompute-stats.mjs
// One-off data-repair script: recomputes secondary stat percentages in
// data/aggregated_bis.json using the cached profile statistics and the updated
// extractStatistics logic (resolving weapon swing speed inflation on Ret Paladin / Windwalker).
//
// Validates against schema before writing atomically. Safe to re-run.

import { readFile, writeFile, rename, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SPECS, SAMPLE_SIZE } from "./lib/config.mjs";
import { extractStatistics, computeSecondaryBreakdown } from "./lib/aggregate.mjs";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "data", "aggregated_bis.json");
const CACHE_DIR = join(ROOT, "data", "cache");

console.log("[recompute-stats] Loading data/aggregated_bis.json...");
const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
if (!payload?.specializations) {
  console.error("[recompute-stats] ERROR: Invalid aggregated_bis.json payload (no specializations).");
  process.exit(1);
}

// 1. Group cached profiles by blizzardSpecId
console.log("[recompute-stats] Scanning cached spec profiles in data/cache/...");
const files = (await readdir(CACHE_DIR)).filter(f => f.startsWith("blizzard_specs_"));
const specProfiles = new Map(); // blizzardSpecId -> Array of extracted statistics objects

for (const sf of files) {
  try {
    const s = JSON.parse(await readFile(join(CACHE_DIR, sf), "utf8"));
    const blizzardSpecId = s.data?.active_specialization?.id;
    if (!blizzardSpecId) continue;

    const statFile = sf.replace("blizzard_specs_", "blizzard_stats_");
    const st = JSON.parse(await readFile(join(CACHE_DIR, statFile), "utf8"));
    if (!st?.data) continue;

    if (!specProfiles.has(blizzardSpecId)) specProfiles.set(blizzardSpecId, []);
    specProfiles.get(blizzardSpecId).push({
      statistics: extractStatistics(st.data)
    });
  } catch {
    // skip corrupted or missing cache files
  }
}

console.log(`[recompute-stats] Found cached profiles for ${specProfiles.size} specializations.`);

// 2. Recompute secondary stat percentages for each spec
let updatedCount = 0;
for (const spec of SPECS) {
  const specData = payload.specializations[spec.id];
  if (!specData || !specData.stats) continue;

  const cachedList = specProfiles.get(spec.blizzardSpecId) || [];
  if (cachedList.length === 0) {
    console.warn(`[recompute-stats] No cached profiles for ${spec.id} — skipping.`);
    continue;
  }

  // Use up to SAMPLE_SIZE profiles to match scraper sample size
  const sample = cachedList.slice(0, SAMPLE_SIZE);
  const newBreakdown = computeSecondaryBreakdown(sample);

  const oldPct = specData.stats.secondary_percent_averages || {};
  const newPct = newBreakdown.secondary_percent_averages || {};

  const oldHaste = oldPct.haste ?? 0;
  const newHaste = newPct.haste ?? 0;

  // Update secondary_percent_averages with clean calculation
  specData.stats.secondary_percent_averages = {
    crit: newPct.crit ?? oldPct.crit,
    haste: newPct.haste ?? oldPct.haste,
    mastery: newPct.mastery ?? oldPct.mastery,
    versatility: newPct.versatility ?? oldPct.versatility
  };

  updatedCount++;
  if (Math.abs(oldHaste - newHaste) > 3) {
    console.log(`[recompute-stats] FIXED ${spec.id.padEnd(23)} Haste: ${oldHaste}% -> ${newHaste}% (sample=${sample.length})`);
  }
}

console.log(`[recompute-stats] Updated secondary stat percentages for ${updatedCount} specs.`);

// 3. Schema validation
console.log("[recompute-stats] Validating against schema...");
const { ok, errors } = await validateAggregatedBis(payload);
if (!ok) {
  console.error("[recompute-stats] ERROR: Schema validation failed:");
  for (const e of errors) {
    console.error(" -", e.instancePath || "/", e.message);
  }
  process.exit(3);
}

// 4. Atomic write
const tmp = `${OUT_PATH}.tmp`;
await writeFile(tmp, JSON.stringify(payload, null, 2), "utf8");
await rename(tmp, OUT_PATH);
console.log(`[recompute-stats] SUCCESS: Wrote updated data to ${OUT_PATH}`);
