// scripts/lib/raiderio.mjs
// Raider.IO undocumented but functional per-spec rankings endpoint.
// GET /api/mythic-plus/rankings/specs?season=...&class=...&spec=...&region=...&page=...
// Returns 100 characters per page, ranked by official Raider.IO per-spec M+ score.
// Each character includes: rank, score, name, realm, region, class, spec, talentLoadoutText, runs[].
// No authentication required.

import { RATE, REGIONS } from "./config.mjs";
import { memo, readCache, writeCache, isStale } from "./cache.mjs";

const RIO_BASE = "https://raider.io/api";

let lastCall = 0;
async function rateShape() {
  const wait = Math.max(0, RATE.raiderioMinDelayMs - (Date.now() - lastCall));
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
}

// Discover the current season slug from Raider.IO's static-data endpoint.
// Returns { slug, name, blizzard_season_id }.
export async function discoverCurrentSeason() {
  return memo("raiderio:current-season", 6 * 60 * 60 * 1000, async () => {
    await rateShape();
    // Try expansion IDs 10 (TWW) and 11 (Midnight)
    for (const expId of [11, 10]) {
      try {
        const url = `${RIO_BASE}/v1/mythic-plus/static-data?expansion_id=${expId}`;
        const res = await fetch(url, { headers: { "User-Agent": "Meta'gor/0.1" } });
        if (!res.ok) continue;
        const data = await res.json();
        // Find the season that's currently active (has a start date in the past
        // and end date in the future, or is the most recent main season)
        const seasons = (data?.seasons || []).filter(s => s.is_main_season);
        if (seasons.length === 0) continue;
        // Pick the season with the highest blizzard_season_id (most recent)
        const current = seasons.sort((a, b) => (b.blizzard_season_id || 0) - (a.blizzard_season_id || 0))[0];
        if (current) {
          return {
            slug: current.slug,
            name: current.name,
            blizzard_season_id: current.blizzard_season_id
          };
        }
      } catch (e) {
        console.warn(`[raiderio] static-data expansion ${expId} failed: ${e.message}`);
      }
    }
    throw new Error("raiderio: could not discover current season from static-data");
  });
}

// Fetch top-N characters per spec from Raider.IO's per-spec rankings.
// Returns array of { rank, score, name, realmSlug, region, classSlug, specSlug, specId, talentLoadoutText, runs }
export async function fetchSpecRankings({ seasonSlug, classSlug, specSlug, regions = REGIONS, count = 50 }) {
  const results = [];
  for (const region of regions) {
    const cacheKey = `raiderio:spec-rankings:${seasonSlug}:${classSlug}:${specSlug}:${region}`;
    const hit = await readCache(cacheKey);
    if (hit && !isStale(hit, RATE.cacheTtl.leaderboard)) {
      results.push(...hit.data);
      continue;
    }

    const chars = [];
    const pagesNeeded = Math.ceil(count / 100);
    for (let page = 0; page < pagesNeeded; page++) {
      await rateShape();
      const url = `${RIO_BASE}/mythic-plus/rankings/specs?season=${seasonSlug}&class=${classSlug}&spec=${specSlug}&region=${region}&page=${page}`;
      console.log(`[raiderio] fetching ${classSlug}/${specSlug} ${region} page ${page}...`);
      const res = await fetch(url, { headers: { "User-Agent": "Meta'gor/0.1" } });
      if (!res.ok) {
        console.warn(`[raiderio] ${url} returned ${res.status}`);
        break;
      }
      const data = await res.json();
      const ranked = data?.rankings?.rankedCharacters || [];
      if (ranked.length === 0) break;
      for (const c of ranked) {
        chars.push({
          rank: c.rank,
          score: c.score,
          name: c.character?.name,
          realmSlug: c.character?.realm?.slug,
          realmName: c.character?.realm?.name,
          region: c.character?.region?.slug || region,
          classSlug: c.character?.class?.slug,
          specSlug: c.character?.spec?.slug,
          specId: c.character?.spec?.id,
          specName: c.character?.spec?.name,
          role: c.character?.spec?.role,
          faction: c.character?.faction,
          talentLoadoutText: c.character?.talentLoadoutText || null,
          runs: (c.runs || []).map(r => ({
            zoneId: r.zoneId,
            keystoneLevel: r.mythicLevel,
            score: r.score,
            period: r.period,
            clearTimeMs: r.clearTimeMs,
            numChests: r.numChests
          }))
        });
      }
      if (ranked.length < 100) break; // last page
    }
    await writeCache(cacheKey, chars, RATE.cacheTtl.leaderboard);
    results.push(...chars);
  }

  // Sort by score descending across all regions and take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, count);
}