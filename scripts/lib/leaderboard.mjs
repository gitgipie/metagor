// scripts/lib/leaderboard.mjs
// Top-character source: Blizzard's connected-realm mythic-leaderboard endpoint.
// For each (connectedRealm, dungeon, period) we fetch the leading_groups and
// extract party members. Members carry their spec.id directly, so we can
// tally "best performers by spec" across all connected realms without needing
// Raider.IO's now-removed top-N endpoint.

import { RATE, REGION, NS_DYNAMIC, BLZ_API, SPECS } from "./config.mjs";
import { blzFetch } from "./blizzard.mjs";
import { memo, readCache, writeCache, isStale } from "./cache.mjs";

// Blizzard realm connection ids. 92 in EU.
export async function getConnectedRealms() {
  return memo("blizzard:connected-realms:eu", 7 * 24 * 60 * 60 * 1000, async () => {
    const data = await blzFetch("/data/wow/connected-realm/index", { namespace: NS_DYNAMIC });
    const ids = [];
    for (const cr of data?.connected_realms || []) {
      const m = cr.href?.match(/connected-realm\/(\d+)/);
      if (m) ids.push(Number(m[1]));
    }
    return ids.sort((a, b) => a - b);
  });
}

// All M+ dungeons (historical). 82 entries in EU.
export async function getDungeonIndex() {
  return memo("blizzard:keystone-dungeon-index:eu", 30 * 24 * 60 * 60 * 1000, async () => {
    const data = await blzFetch("/data/wow/mythic-keystone/dungeon/index", { namespace: NS_DYNAMIC });
    const dungeons = [];
    for (const d of data?.dungeons || []) {
      dungeons.push({ id: d.id, name: d.name });
    }
    return dungeons;
  });
}

// Highest period id = current week. The season endpoints also list periods,
// but this is the canonical "now" pointer.
export async function getCurrentPeriodId() {
  return memo("blizzard:current-period:eu", 60 * 60 * 1000, async () => {
    const data = await blzFetch("/data/wow/mythic-keystone/period/index", { namespace: NS_DYNAMIC });
    const periods = data?.periods || [];
    if (!periods.length) throw new Error("leaderboard: no periods returned");
    return Number(periods[periods.length - 1].id);
  });
}

// Active dungeon ids for the current period.
// Probing one connected realm is enough: a dungeon either returns 200 or 404
// for the period across the whole EU region (we verified this empirically).
export async function getActiveDungeonIds({ periodId } = {}) {
  const pid = periodId ?? (await getCurrentPeriodId());
  const cacheKey = `blizzard:active-dungeons:${pid}`;
  const hit = await readCache(cacheKey);
  if (hit && Date.now() - new Date(hit.cached_at).getTime() < 60 * 60 * 1000) return hit.data;

  const dungeons = await getDungeonIndex();
  const realms = await getConnectedRealms();
  const probeRealm = realms[0];
  const active = [];
  for (const d of dungeons) {
    try {
      const data = await blzFetch(
        `/data/wow/connected-realm/${probeRealm}/mythic-leaderboard/${d.id}/period/${pid}`,
        { namespace: NS_DYNAMIC }
      );
      if (data?.leading_groups?.length) active.push({ id: d.id, name: d.name });
    } catch (e) {
      // 404 = not in this week's rotation. Skip silently.
      if (e.status && e.status !== 404) {
        console.warn(`[leaderboard] probe dungeon ${d.id} (${d.name}): ${e.message}`);
      }
    }
  }
  await writeCache(cacheKey, active, 60 * 60 * 1000);
  return active;
}

// Fetch one leaderboard. Returns [] if no data (404) instead of throwing.
// Caches the full payload to disk (12h TTL) so subsequent runs are cheap.
export async function fetchMythicLeaderboard(connectedRealmId, dungeonId, periodId) {
  const key = `blizzard:leaderboard:${connectedRealmId}:${dungeonId}:${periodId}`;
  const hit = await readCache(key);
  if (hit && !isStale(hit, 12 * 60 * 60 * 1000)) return hit.data;
  try {
    const data = await blzFetch(
      `/data/wow/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${periodId}`,
      { namespace: NS_DYNAMIC }
    );
    await writeCache(key, data, 12 * 60 * 60 * 1000);
    return data;
  } catch (e) {
    if (e.status === 404) {
      // Cache the "empty" so we don't re-probe 404s every 12h.
      await writeCache(key, { leading_groups: [] }, 12 * 60 * 60 * 1000);
      return null;
    }
    throw e;
  }
}

// Spec catalog indexed by Blizzard's playable-specialization id.
// Built from SPECS in config.mjs (each entry has blizzardSpecId).
export const SPEC_BY_BLIZZARD_ID = (() => {
  const m = new Map();
  for (const s of SPECS) m.set(s.blizzardSpecId, s);
  return m;
})();

// Pull every party member out of a leaderboard payload.
// Output shape: [{ name, realmSlug, realmId, specId, blizzardSpecId, rating, keystoneLevel, dungeonId, faction }]
export function extractPartyMembers(leaderboard, dungeonId) {
  const out = [];
  if (!leaderboard?.leading_groups) return out;
  for (const group of leaderboard.leading_groups) {
    const rating = group?.mythic_rating?.rating ?? null;
    const keystoneLevel = group?.keystone_level ?? null;
    for (const m of group.members || []) {
      const profile = m?.profile;
      if (!profile?.name) continue;
      out.push({
        name: String(profile.name),
        realmSlug: profile?.realm?.slug ? String(profile.realm.slug) : null,
        realmId: profile?.realm?.id ? Number(profile.realm.id) : null,
        specId: m?.specialization?.id ? Number(m.specialization.id) : null,
        rating,
        keystoneLevel,
        dungeonId,
        faction: m?.faction?.type ?? null
      });
    }
  }
  return out;
}

// Tally appearances across (connectedRealm, dungeon) combinations.
// Returns a Map keyed by spec id: specId -> sorted list of { name, realmSlug, weight, appearances }.
// Weighting: each appearance counts as 1 + (rating normalized).
export function tallyTopPerformersBySpec(partyMembers, { limit = 50 } = {}) {
  const bySpec = new Map(); // specId -> Map<characterKey, { name, realmSlug, appearances, ratingSum, weight }>

  for (const m of partyMembers) {
    if (m.specId == null) continue;
    if (!bySpec.has(m.specId)) bySpec.set(m.specId, new Map());
    const charKey = `${(m.realmSlug || "").toLowerCase()}:${m.name.toLowerCase()}`;
    const slot = bySpec.get(m.specId);
    const cur = slot.get(charKey) ?? {
      name: m.name,
      realmSlug: m.realmSlug,
      appearances: 0,
      ratingSum: 0,
      weight: 0
    };
    cur.appearances += 1;
    cur.ratingSum += m.rating || 0;
    cur.weight = cur.appearances + Math.log10(Math.max(cur.ratingSum, 1));
    slot.set(charKey, cur);
  }

  const out = new Map();
  for (const [specId, slot] of bySpec.entries()) {
    const ranked = [...slot.values()]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);
    out.set(specId, ranked);
  }
  return out;
}

// End-to-end: pull every active leaderboard for the current period, extract
// members, and return per-spec top performers. Used by run-once.mjs.
export async function gatherAllLeaderboards({ periodId, dungeonIds, connectedRealmIds, concurrency = 8 } = {}) {
  const pid = periodId ?? (await getCurrentPeriodId());
  const dungeons = dungeonIds ?? (await getActiveDungeonIds({ periodId: pid })).map(d => d.id);
  const realms = connectedRealmIds ?? (await getConnectedRealms());

  console.log(`[leaderboard] gathering ${dungeons.length} dungeons x ${realms.length} connected realms for period ${pid}...`);

  let done = 0;
  const total = dungeons.length * realms.length;
  const allMembers = [];

  // Simple bounded concurrency queue.
  const queue = [];
  for (const cr of realms) {
    for (const dungeonId of dungeons) {
      queue.push({ cr, dungeonId });
    }
  }

  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      if (!job) return;
      try {
        const lb = await fetchMythicLeaderboard(job.cr, job.dungeonId, pid);
        if (lb) {
          const members = extractPartyMembers(lb, job.dungeonId);
          for (const m of members) allMembers.push(m);
        }
      } catch (e) {
        console.warn(`[leaderboard] ${job.cr}/${job.dungeonId} failed: ${e.message}`);
      }
      done++;
      if (done % 50 === 0 || done === total) {
        console.log(`[leaderboard] ${done}/${total} leaderboards fetched (${allMembers.length} members so far)`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`[leaderboard] done: ${done} leaderboards, ${allMembers.length} member appearances`);
  return { members: allMembers, periodId: pid, dungeons: dungeons.length, realms: realms.length };
}