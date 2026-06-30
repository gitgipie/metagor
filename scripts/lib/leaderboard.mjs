// scripts/lib/leaderboard.mjs
// Top-character source: Blizzard's connected-realm mythic-leaderboard endpoint.
// Region-aware: fetches from both eu and us, combines party members across regions.
// From each (connectedRealm, dungeon, period) we fetch the leading_groups and
// extract party members. Members carry their spec.id directly, so we can
// tally "best performers by spec" across all connected realms and regions.

import { RATE, REGIONS, nsDynamic } from "./config.mjs";
import { blzFetch } from "./blizzard.mjs";
import { memo, readCache, writeCache, isStale } from "./cache.mjs";

// Connected realm IDs for a given region.
export async function getConnectedRealms(region = "eu") {
  return memo(`blizzard:connected-realms:${region}`, 7 * 24 * 60 * 60 * 1000, async () => {
    const data = await blzFetch("/data/wow/connected-realm/index", { region, namespace: nsDynamic(region) });
    const ids = [];
    for (const cr of data?.connected_realms || []) {
      const m = cr.href?.match(/connected-realm\/(\d+)/);
      if (m) ids.push(Number(m[1]));
    }
    return ids.sort((a, b) => a - b);
  });
}

// All M+ dungeons for a given region.
export async function getDungeonIndex(region = "eu") {
  return memo(`blizzard:keystone-dungeon-index:${region}`, 30 * 24 * 60 * 60 * 1000, async () => {
    const data = await blzFetch("/data/wow/mythic-keystone/dungeon/index", { region, namespace: nsDynamic(region) });
    return (data?.dungeons || []).map(d => ({ id: d.id, name: d.name }));
  });
}

// Highest period id = current week for a given region.
export async function getCurrentPeriodId(region = "eu") {
  return memo(`blizzard:current-period:${region}`, 60 * 60 * 1000, async () => {
    const data = await blzFetch("/data/wow/mythic-keystone/period/index", { region, namespace: nsDynamic(region) });
    const periods = data?.periods || [];
    if (!periods.length) throw new Error(`leaderboard: no periods returned for ${region}`);
    return Number(periods[periods.length - 1].id);
  });
}

// Active dungeon ids for the current period in a given region.
export async function getActiveDungeonIds({ region = "eu", periodId } = {}) {
  const pid = periodId ?? (await getCurrentPeriodId(region));
  const cacheKey = `blizzard:active-dungeons:${region}:${pid}`;
  const hit = await readCache(cacheKey);
  if (hit && Date.now() - new Date(hit.cached_at).getTime() < 60 * 60 * 1000) return hit.data;

  const dungeons = await getDungeonIndex(region);
  const realms = await getConnectedRealms(region);
  const probeRealm = realms[0];
  const active = [];
  for (const d of dungeons) {
    try {
      const data = await blzFetch(
        `/data/wow/connected-realm/${probeRealm}/mythic-leaderboard/${d.id}/period/${pid}`,
        { region, namespace: nsDynamic(region) }
      );
      if (data?.leading_groups?.length) active.push({ id: d.id, name: d.name });
    } catch (e) {
      if (e.status && e.status !== 404) {
        console.warn(`[leaderboard] probe dungeon ${d.id} (${d.name}) ${region}: ${e.message}`);
      }
    }
  }
  await writeCache(cacheKey, active, 60 * 60 * 1000);
  return active;
}

// Fetch one leaderboard for a specific region. Returns null if 404.
export async function fetchMythicLeaderboard(connectedRealmId, dungeonId, periodId, region = "eu") {
  const key = `blizzard:leaderboard:${region}:${connectedRealmId}:${dungeonId}:${periodId}`;
  const hit = await readCache(key);
  if (hit && !isStale(hit, 12 * 60 * 60 * 1000)) return hit.data;
  try {
    const data = await blzFetch(
      `/data/wow/connected-realm/${connectedRealmId}/mythic-leaderboard/${dungeonId}/period/${periodId}`,
      { region, namespace: nsDynamic(region) }
    );
    await writeCache(key, data, 12 * 60 * 60 * 1000);
    return data;
  } catch (e) {
    if (e.status === 404) {
      await writeCache(key, { leading_groups: [] }, 12 * 60 * 60 * 1000);
      return null;
    }
    throw e;
  }
}

// Spec catalog indexed by Blizzard's playable-specialization id.
import { SPECS } from "./config.mjs";
export const SPEC_BY_BLIZZARD_ID = (() => {
  const m = new Map();
  for (const s of SPECS) m.set(s.blizzardSpecId, s);
  return m;
})();

// Pull every party member out of a leaderboard payload.
// Each member carries its region so we can fetch profiles from the right API host.
export function extractPartyMembers(leaderboard, dungeonId, region = "eu") {
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
        faction: m?.faction?.type ?? null,
        region  // tag each member with its region for profile fetching
      });
    }
  }
  return out;
}

// Tally appearances across (connectedRealm, dungeon, region) combinations.
export function tallyTopPerformersBySpec(partyMembers, { limit = 50 } = {}) {
  const bySpec = new Map();

  for (const m of partyMembers) {
    if (m.specId == null) continue;
    if (!bySpec.has(m.specId)) bySpec.set(m.specId, new Map());
    // Key includes region to avoid name collisions across EU/US
    const charKey = `${m.region}:${(m.realmSlug || "").toLowerCase()}:${m.name.toLowerCase()}`;
    const slot = bySpec.get(m.specId);
    const cur = slot.get(charKey) ?? {
      name: m.name,
      realmSlug: m.realmSlug,
      region: m.region,
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

// End-to-end: pull every active leaderboard for ALL configured regions.
// Returns combined member appearances across all regions.
export async function gatherAllLeaderboards({ periodId, regions = REGIONS, concurrency = 8 } = {}) {
  const allMembers = [];
  const regionInfo = {};

  for (const region of regions) {
    console.log(`[leaderboard] processing region=${region}...`);
    const pid = periodId?.[region] || (await getCurrentPeriodId(region));
    const dungeons = await getActiveDungeonIds({ region, periodId: pid });
    const realms = await getConnectedRealms(region);
    regionInfo[region] = { periodId: pid, dungeons: dungeons.length, realms: realms.length };

    console.log(`[leaderboard] ${region}: ${dungeons.length} dungeons x ${realms.length} connected realms for period ${pid}...`);

    let done = 0;
    const total = dungeons.length * realms.length;

    const queue = [];
    for (const cr of realms) {
      for (const dungeonId of dungeons.map(d => d.id)) {
        queue.push({ cr, dungeonId });
      }
    }

    async function worker() {
      while (queue.length) {
        const job = queue.shift();
        if (!job) return;
        try {
          const lb = await fetchMythicLeaderboard(job.cr, job.dungeonId, pid, region);
          if (lb) {
            const members = extractPartyMembers(lb, job.dungeonId, region);
            for (const m of members) allMembers.push(m);
          }
        } catch (e) {
          console.warn(`[leaderboard] ${region}/${job.cr}/${job.dungeonId} failed: ${e.message}`);
        }
        done++;
        if (done % 100 === 0 || done === total) {
          console.log(`[leaderboard] ${region}: ${done}/${total} leaderboards fetched (${allMembers.length} total members)`);
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  console.log(`[leaderboard] done: ${allMembers.length} total member appearances across ${regions.length} regions`);
  return { members: allMembers, regionInfo };
}