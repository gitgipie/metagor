// scripts/lib/blizzard.mjs
// Blizzard Game Data API client. Region-aware (eu + us).
//   1. OAuth token (cached 23h, shared across regions).
//   2. Character profile (equipment + specializations) for the top-50 list.
//   3. Static item lookup (name resolution for consumables + icons).

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OAUTH_URL, LOCALE, RATE,
  apiHost, nsProfile, nsDynamic, nsStatic,
  REGION as DEFAULT_REGION
} from "./config.mjs";
import { memo, isStale, readCache, writeCache } from "./cache.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

export class BlizzardError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "BlizzardError";
    this.status = status;
    this.body = body;
  }
}

async function loadEnv() {
  try {
    const text = await readFile(join(ROOT, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (k && !(k in process.env)) process.env[k] = v;
    }
  } catch {
    throw new BlizzardError(
      "Could not read .env at project root. Create one with BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET."
    );
  }
}

let envLoaded = false;
async function ensureEnv() {
  if (envLoaded) return;
  await loadEnv();
  if (!process.env.BLIZZARD_CLIENT_ID) throw new BlizzardError("BLIZZARD_CLIENT_ID missing in .env");
  if (!process.env.BLIZZARD_CLIENT_SECRET) throw new BlizzardError("BLIZZARD_CLIENT_SECRET missing in .env");
  envLoaded = true;
}

const TOKEN_KEY = "blizzard:oauth";
export async function getToken() {
  await ensureEnv();
  const hit = await readCache(TOKEN_KEY);
  if (hit && !isStale(hit, RATE.cacheTtl.oauth)) return hit.data;
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const auth = Buffer.from(
    `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!res.ok) {
    const text = await res.text();
    throw new BlizzardError(`OAuth failed: HTTP ${res.status}`, { status: res.status, body: text });
  }
  const json = await res.json();
  const payload = {
    access_token: json.access_token,
    token_type: json.token_type,
    sub: json.sub,
    expires_at: new Date(Date.now() + (json.expires_in ?? 86399) * 1000).toISOString()
  };
  await writeCache(TOKEN_KEY, payload, RATE.cacheTtl.oauth);
  return payload;
}

// Simple concurrency limiter with min-delay between calls.
let lastBlzCall = 0;

// Region-aware fetch. `opts.region` defaults to "eu".
// `opts.namespace` can be a full namespace string or omitted (auto-derived from region).
export async function blzFetch(path, opts = {}) {
  const region = opts.region || DEFAULT_REGION;
  let namespace = opts.namespace;
  if (!namespace) {
    // Auto-derive namespace from path
    if (path.startsWith("/profile/")) namespace = nsProfile(region);
    else if (path.startsWith("/data/wow/media/")) namespace = nsStatic(region);
    else namespace = nsDynamic(region);
  }

  await ensureEnv();
  const token = await getToken();
  const wait = Math.max(0, RATE.blizzardMinDelayMs - (Date.now() - lastBlzCall));
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastBlzCall = Date.now();

  const host = apiHost(region);
  const url = `${host}${path}${path.includes("?") ? "&" : "?"}namespace=${namespace}&locale=${LOCALE}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new BlizzardError(`Blizzard 401 Unauthorized: ${text}`, { status: 401, body: text });
    }
    if (res.status === 403) {
      const err = new BlizzardError(`Blizzard 403 (likely rate-limit): ${text}`, { status: 403, body: text });
      err.transient = true;
      throw err;
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "1");
      await new Promise(r => setTimeout(r, Math.min(retryAfter, 30) * 1000));
      return blzFetch(path, opts);
    }
    throw new BlizzardError(`Blizzard ${res.status} on ${path}`, { status: res.status, body: text });
  }
  return res.json();
}

// Retry wrapper: one quick retry for transient errors, then give up.
export async function blzFetchWithRetry(path, opts = {}, { maxAttempts = 2 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await blzFetch(path, opts);
    } catch (e) {
      lastErr = e;
      const transient = e.transient || e.status === 429 || e.status >= 500;
      if (!transient || attempt === maxAttempts) throw e;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

// Realm slug normalization.
export function normalizeRealmSlug(nameOrSlug) {
  if (!nameOrSlug) return "";
  return nameOrSlug.toLowerCase()
    .replace(/['\u2018\u2019]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// Character equipment. region + realmSlug + characterName.
export async function getCharacterEquipment(realmSlug, characterName, region = DEFAULT_REGION) {
  const key = `blizzard:equip:${region}:${realmSlug}:${characterName.toLowerCase()}`;
  return memo(key, RATE.cacheTtl.profile, async () => {
    const path = `/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterName.toLowerCase())}/equipment`;
    return blzFetchWithRetry(path, { region, namespace: nsProfile(region) });
  });
}

// Character specializations (for talent loadout string).
export async function getCharacterSpecializations(realmSlug, characterName, region = DEFAULT_REGION) {
  const key = `blizzard:specs:${region}:${realmSlug}:${characterName.toLowerCase()}`;
  return memo(key, RATE.cacheTtl.profile, async () => {
    const path = `/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterName.toLowerCase())}/specializations`;
    return blzFetchWithRetry(path, { region, namespace: nsProfile(region) });
  });
}

// Character statistics (the actual in-game stat sheet).
// Returns melee_crit, melee_haste, mastery, versatility, agility, stamina, etc.
export async function getCharacterStatistics(realmSlug, characterName, region = DEFAULT_REGION) {
  const key = `blizzard:stats:${region}:${realmSlug}:${characterName.toLowerCase()}`;
  return memo(key, RATE.cacheTtl.profile, async () => {
    const path = `/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterName.toLowerCase())}/statistics`;
    return blzFetchWithRetry(path, { region, namespace: nsProfile(region) });
  });
}

// Static item lookup. Region doesn't matter for static data, use eu.
export async function getStaticItem(itemId) {
  const key = `blizzard:item:${itemId}`;
  return memo(key, RATE.cacheTtl.staticItem, async () => {
    return blzFetch(`/data/wow/item/${itemId}`, { namespace: nsStatic(DEFAULT_REGION) });
  });
}

// Resolve item icon texture name via Blizzard media endpoint.
export async function resolveItemIcon(itemId) {
  if (!itemId) return null;
  const key = `blizzard:item-media:${itemId}`;
  return memo(key, RATE.cacheTtl.staticItem, async () => {
    try {
      const data = await blzFetch(`/data/wow/media/item/${itemId}`, { namespace: nsStatic(DEFAULT_REGION) });
      const iconAsset = data?.assets?.find(a => a.key === "icon");
      if (!iconAsset?.value) return null;
      const m = iconAsset.value.match(/\/icons\/\d+\/(.+?)\.jpg/i);
      return m ? m[1] : null;
    } catch (e) {
      if (e.status === 404) return null;
      console.warn(`[blizzard] media/item/${itemId} failed: ${e.message}`);
      return null;
    }
  });
}

// Resolve the actual spell description for a consumable item from Blizzard's API.
// Returns the Use: description (e.g. "Increases your Critical Strike by 165 for 1 hour.")
export async function resolveItemDescription(itemId) {
  if (!itemId) return null;
  try {
    const data = await getStaticItem(itemId);
    const spells = data?.preview_item?.spells || [];
    if (spells.length > 0 && spells[0]?.description) {
      return spells[0].description;
    }
  } catch (e) {
    if (e.status === 404) return null;
    console.warn(`[blizzard] description for item ${itemId} failed: ${e.message}`);
  }
  return null;
}

// Resolve the inventory_type for an item from Blizzard's API.
// Returns "WEAPON" (1H), "TWOHWEAPON" (2H), "SHIELD", "HOLDABLE", etc.
export async function resolveInventoryType(itemId) {
  if (!itemId) return null;
  try {
    const data = await getStaticItem(itemId);
    return data?.inventory_type?.type ?? null;
  } catch (e) {
    if (e.status === 404) return null;
  }
  return null;
}

// Realm index for a specific region.
export async function getRealmIndex(region = DEFAULT_REGION) {
  return memo(`blizzard:realm-index:${region}`, 7 * 24 * 60 * 60 * 1000, async () => {
    const data = await blzFetch("/data/wow/realm/index", { region, namespace: nsDynamic(region) });
    const map = new Map();
    for (const r of data?.realms || []) map.set(r.slug, r);
    return Object.fromEntries(map);
  });
}