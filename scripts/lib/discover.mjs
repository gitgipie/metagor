// scripts/lib/discover.mjs
// Boot-time discovery of the current M+ season + period for all configured regions.
// If any call fails, the orchestrator must abort (do not write aggregated_bis.json).

import { RATE, REGIONS } from "./config.mjs";
import { blzFetch, getRealmIndex } from "./blizzard.mjs";
import { getCurrentPeriodId } from "./leaderboard.mjs";
import { memo } from "./cache.mjs";

export async function discoverCurrent() {
  return memo("blizzard:discovery:multi", RATE.cacheTtl.discovery, async () => {
    const perRegion = {};

    // Patch string + expansion from the FIRST region (they are globally identical).
    // Querying /region/{id} gives patch_string (e.g. "12.1.0"); this is dynamic, so
    // a new patch is picked up automatically at scraper boot.
    let patch = null, expansionName = null, expansionId = null;
    try {
      const first = REGIONS[0];
      const regionIdx = await blzFetch("/data/wow/region/index", {
        region: first,
        namespace: `dynamic-${first}`
      });
      const regionId = regionIdx?.regions?.[0]?.href?.match(/region\/(\d+)/)?.[1] ?? null;
      if (regionId) {
        const regionDetail = await blzFetch(`/data/wow/region/${regionId}`, {
          region: first,
          namespace: `dynamic-${first}`
        });
        patch = regionDetail?.patch_string ?? null;
      }
      const expIdx = await blzFetch("/data/wow/journal-expansion/index", {
        region: first,
        namespace: `static-${first}`
      });
      const tiers = (expIdx?.tiers || []).filter(t => t.name !== "Current Season");
      const currentExp = tiers.length
        ? tiers.slice().sort((a, b) => b.id - a.id)[0]
        : null;
      if (currentExp) {
        expansionName = currentExp.name ?? null;
        expansionId = currentExp.id ?? null;
      }
    } catch (e) {
      console.warn(`[discover] patch/expansion lookup failed (${e.message}); leaving as null`);
    }

    for (const region of REGIONS) {
      // 1. Current M+ season
      const idx = await blzFetch("/data/wow/mythic-keystone/season/index", {
        region,
        namespace: `dynamic-${region}`
      });
      const seasons = idx?.seasons || [];
      if (seasons.length === 0) throw new Error(`discover: season index returned no seasons for ${region}`);
      const seasonId = seasons[seasons.length - 1]?.id ?? null;
      if (!seasonId) throw new Error(`discover: could not determine season id for ${region}`);

      // 2. Season details
      let seasonDetail = null;
      try {
        seasonDetail = await blzFetch(`/data/wow/mythic-keystone/season/${seasonId}`, {
          region,
          namespace: `dynamic-${region}`
        });
      } catch { seasonDetail = null; }

      // 3. Current M+ period
      const periodId = await getCurrentPeriodId(region);

      perRegion[region] = {
        season_id: seasonId,
        period_id: periodId,
        season_start: seasonDetail?.start_timestamp || null,
        season_end: seasonDetail?.end_timestamp || null,
      };
    }

    return {
      expansion: expansionName,
      expansion_id: expansionId,
      patch,
      regions: perRegion,
      region: REGIONS.join("+"),  // e.g. "eu+us+kr+tw" for the meta field
      discovered_at: new Date().toISOString()
    };
  });
}

// Prime realm indexes for all regions.
export async function primeRealmIndexes() {
  const out = {};
  for (const region of REGIONS) {
    out[region] = await getRealmIndex(region);
  }
  return out;
}

export { normalizeRealmSlug } from "./blizzard.mjs";