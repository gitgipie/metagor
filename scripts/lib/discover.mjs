// scripts/lib/discover.mjs
// Boot-time discovery of the current M+ season + period from Blizzard.
// If any call fails, the orchestrator must abort (do not write aggregated_bis.json).
//
// Cache TTL: RATE.cacheTtl.discovery (6h).

import { RATE, REGION } from "./config.mjs";
import { blzFetch, getRealmIndex } from "./blizzard.mjs";
import { memo } from "./cache.mjs";
import { getCurrentPeriodId } from "./leaderboard.mjs";

export async function discoverCurrent() {
  return memo("blizzard:discovery:eu", RATE.cacheTtl.discovery, async () => {
    // 1. Current M+ season via dynamic-eu mythic-keystone/season/index.
    const idx = await blzFetch("/data/wow/mythic-keystone/season/index", {
      namespace: `dynamic-${REGION}`
    });
    const seasons = idx?.seasons || [];
    if (seasons.length === 0) {
      throw new Error("discover: season index returned no seasons");
    }
    const last = seasons[seasons.length - 1];
    const seasonId = last?.id ?? null;
    if (!seasonId) {
      throw new Error("discover: could not determine current season id from index");
    }

    // 2. Season details: start_date / end_date are useful for the meta banner.
    let seasonDetail = null;
    try {
      seasonDetail = await blzFetch(`/data/wow/mythic-keystone/season/${seasonId}`, {
        namespace: `dynamic-${REGION}`
      });
    } catch {
      seasonDetail = null;
    }

    // 3. Current M+ period (the weekly rotation index).
    const periodId = await getCurrentPeriodId();

    return {
      expansion: null,            // not exposed in current API
      expansion_id: null,
      patch: null,                // not exposed in current API
      season_id: seasonId,
      period_id: periodId,
      season_start: seasonDetail?.start_timestamp || null,
      season_end: seasonDetail?.end_timestamp || null,
      region: REGION,
      discovered_at: new Date().toISOString()
    };
  });
}

// Convenience: fetch and cache the realm index up-front so profile lookups
// can normalize name vs slug.
export async function primeRealmIndex() {
  return getRealmIndex();
}

// Realm slug normalization lives in blizzard.mjs.
export { normalizeRealmSlug } from "./blizzard.mjs";