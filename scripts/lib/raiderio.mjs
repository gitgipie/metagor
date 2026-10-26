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

// Raider.IO expansion ids to search for seasons, newest first. Ids that don't
// exist yet are skipped, so listing the next one keeps discovery working
// across an expansion turnover without a code change.
const RIO_EXPANSION_IDS = [12, 11, 10];

const RIO_TIMEOUT_MS = 30_000;
const RIO_MAX_ATTEMPTS = 4;
const RIO_BACKOFF_MS = [2000, 4000, 8000];

// GET a Raider.IO URL as JSON. Retries network errors, timeouts, 429 and 5xx
// with backoff (2s, 4s, 8s); one dropped connection used to kill a whole
// scrape. Returns { ok, status, data }; throws only when every attempt failed
// on a network error. `fetchImpl` is injectable for offline tests.
export async function rioGetJson(url, { fetchImpl = fetch, backoffMs = RIO_BACKOFF_MS } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= RIO_MAX_ATTEMPTS; attempt++) {
    await rateShape();
    try {
      const res = await fetchImpl(url, {
        headers: { "User-Agent": "Meta'gor/0.1" },
        signal: AbortSignal.timeout(RIO_TIMEOUT_MS)
      });
      const retryable = res.status === 429 || res.status >= 500;
      if (res.ok) return { ok: true, status: res.status, data: await res.json() };
      if (!retryable || attempt === RIO_MAX_ATTEMPTS) return { ok: false, status: res.status, data: null };
      console.warn(`[raiderio] ${url} returned ${res.status} (attempt ${attempt}/${RIO_MAX_ATTEMPTS}), retrying`);
    } catch (e) {
      lastErr = e;
      if (attempt === RIO_MAX_ATTEMPTS) break;
      console.warn(`[raiderio] ${url} failed: ${e.message} (attempt ${attempt}/${RIO_MAX_ATTEMPTS}), retrying`);
    }
    const delay = backoffMs[Math.min(attempt - 1, backoffMs.length - 1)];
    if (delay) await new Promise(r => setTimeout(r, delay));
  }
  throw new Error(`raiderio: ${url} failed after ${RIO_MAX_ATTEMPTS} attempts: ${lastErr?.message}`);
}

// All main seasons Raider.IO lists, across RIO_EXPANSION_IDS.
// Returns [{ slug, name, blizzard_season_id }], newest blizzard_season_id first.
export async function fetchMainSeasons({ fetchImpl } = {}) {
  const out = [];
  for (const expId of RIO_EXPANSION_IDS) {
    const url = `${RIO_BASE}/v1/mythic-plus/static-data?expansion_id=${expId}`;
    try {
      const { ok, data } = await rioGetJson(url, { fetchImpl });
      if (!ok) continue;
      for (const s of data?.seasons || []) {
        if (s.is_main_season) out.push({ slug: s.slug, name: s.name, blizzard_season_id: s.blizzard_season_id });
      }
    } catch (e) {
      console.warn(`[raiderio] static-data expansion ${expId} failed: ${e.message}`);
    }
  }
  return out.sort((a, b) => (b.blizzard_season_id || 0) - (a.blizzard_season_id || 0));
}

// Discover the current season slug from Raider.IO's static-data endpoint.
// Returns { slug, name, blizzard_season_id }.
export async function discoverCurrentSeason() {
  return memo("raiderio:current-season", 6 * 60 * 60 * 1000, async () => {
    // The main season with the highest blizzard_season_id is the current one.
    const [current] = await fetchMainSeasons();
    if (current) return current;
    throw new Error("raiderio: could not discover current season from static-data");
  });
}

// Find the Raider.IO season matching a Blizzard season id, for when Raider.IO's
// newest season and Blizzard's current season disagree (e.g. at a season
// turnover). Returns { slug, name, blizzard_season_id } or null.
export async function findSeasonByBlizzardId(blizzardSeasonId, { fetchImpl } = {}) {
  const seasons = await fetchMainSeasons({ fetchImpl });
  return seasons.find(s => s.blizzard_season_id === blizzardSeasonId) || null;
}

// Fetch top-N characters per spec from Raider.IO's per-spec rankings.
// Returns array of { rank, score, name, realmSlug, region, classSlug, specSlug, specId, talentLoadoutText, runs }
export async function fetchSpecRankings({ seasonSlug, classSlug, specSlug, regions = REGIONS, count = 50, fetchImpl }) {
  const results = [];
  const failedRegions = [];
  for (const region of regions) {
    const cacheKey = `raiderio:spec-rankings:${seasonSlug}:${classSlug}:${specSlug}:${region}`;
    const hit = await readCache(cacheKey);
    if (hit && !isStale(hit, RATE.cacheTtl.leaderboard)) {
      results.push(...hit.data);
      continue;
    }

    const chars = [];
    const pagesNeeded = Math.ceil(count / 100);
    try {
      for (let page = 0; page < pagesNeeded; page++) {
        const url = `${RIO_BASE}/mythic-plus/rankings/specs?season=${seasonSlug}&class=${classSlug}&spec=${specSlug}&region=${region}&page=${page}`;
        console.log(`[raiderio] fetching ${classSlug}/${specSlug} ${region} page ${page}...`);
        // Throw (caught below) rather than break: a failed fetch must not be
        // cached as an empty ranking for the next 12h.
        const { ok, status, data } = await rioGetJson(url, { fetchImpl });
        if (!ok) throw new Error(`raiderio: ${url} returned ${status}`);
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
    } catch (e) {
      // One region down shouldn't cost the spec; skip it uncached and let
      // the other regions fill the top N.
      console.warn(`[raiderio] ${classSlug}/${specSlug} ${region} skipped: ${e.message}`);
      failedRegions.push(region);
      continue;
    }
    await writeCache(cacheKey, chars, RATE.cacheTtl.leaderboard);
    results.push(...chars);
  }

  if (failedRegions.length === regions.length) {
    throw new Error(`raiderio: rankings failed for every region (${failedRegions.join(", ")})`);
  }

  // Sort by score descending across all regions and take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, count);
}
