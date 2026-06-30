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
      expansion: null,
      expansion_id: null,
      patch: null,
      regions: perRegion,
      region: REGIONS.join("+"),  // "eu+us" for the meta field
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