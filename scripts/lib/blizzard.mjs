// scripts/lib/blizzard.mjs
// Blizzard Game Data API client. Three responsibilities:
//   1. OAuth token (cached 23h).
//   2. Character profile (equipment + specializations) for the top-50 list.
//   3. Static item lookup (name resolution for consumables).
// Uses scripts/lib/cache.mjs for memoization.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OAUTH_URL, BLZ_API, NS_PROFILE, NS_DYNAMIC, NS_STATIC, LOCALE, RATE
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
export async function blzFetch(path, { namespace = NS_DYNAMIC } = {}) {
  await ensureEnv();
  const token = await getToken();
  // rate shaping
  const wait = Math.max(0, RATE.blizzardMinDelayMs - (Date.now() - lastBlzCall));
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastBlzCall = Date.now();

  const url = `${BLZ_API}${path}${path.includes("?") ? "&" : "?"}namespace=${namespace}&locale=${LOCALE}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.access_token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new BlizzardError(`Blizzard 401 Unauthorized: ${text}`, { status: 401, body: text });
    }
    if (res.status === 403) {
      // 403 here is typically Blizzard's anti-abuse throttle, not a real permission
      // denial. Surface a distinct error so callers can back off and retry.
      const err = new BlizzardError(`Blizzard 403 (likely rate-limit): ${text}`, { status: 403, body: text });
      err.transient = true;
      throw err;
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "1");
      await new Promise(r => setTimeout(r, Math.min(retryAfter, 30) * 1000));
      return blzFetch(path, { namespace });
    }
    throw new BlizzardError(`Blizzard ${res.status} on ${path}`, { status: res.status, body: text });
  }
  return res.json();
}

// Retry wrapper: one quick retry for transient errors, then give up.
// (Most 403s in practice are real privacy blocks, not transient throttles.)
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

// Realm slug normalization. Blizzard expects lowercase ASCII slugs with
// apostrophes stripped and spaces collapsed. We index real realms via
// /data/wow/realm/index?namespace=dynamic-eu once.
export async function realmIndex() {
  return memo("blizzard:realm-index:eu", 7 * 24 * 60 * 60 * 1000, async () => {
    const data = await blzFetch("/data/wow/realm/index", { namespace: NS_DYNAMIC });
    const map = new Map();
    for (const r of data?.realms || []) {
      map.set(r.slug, r);
    }
    return Object.fromEntries(map);
  });
}

export function normalizeRealmSlug(nameOrSlug) {
  if (!nameOrSlug) return "";
  return nameOrSlug.toLowerCase()
    .replace(/['\u2018\u2019]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// Character equipment. realm must already be a Blizzard slug.
export async function getCharacterEquipment(realmSlug, characterName) {
  const key = `blizzard:equip:${realmSlug}:${characterName.toLowerCase()}`;
  return memo(key, RATE.cacheTtl.profile, async () => {
    const path = `/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterName.toLowerCase())}/equipment`;
    return blzFetchWithRetry(path, { namespace: NS_PROFILE });
  });
}

// Character specializations (for talent loadout string).
export async function getCharacterSpecializations(realmSlug, characterName) {
  const key = `blizzard:specs:${realmSlug}:${characterName.toLowerCase()}`;
  return memo(key, RATE.cacheTtl.profile, async () => {
    const path = `/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterName.toLowerCase())}/specializations`;
    return blzFetchWithRetry(path, { namespace: NS_PROFILE });
  });
}

// Static item lookup. Used by resolve-consumables.mjs.
export async function getStaticItem(itemId) {
  const key = `blizzard:item:${itemId}`;
  return memo(key, RATE.cacheTtl.staticItem, async () => {
    const path = `/data/wow/item/${itemId}`;
    return blzFetch(path, { namespace: NS_STATIC });
  });
}

// Resolve item icon texture name via Blizzard media endpoint.
// Returns the Wowhead-compatible texture name (e.g. "inv_helm_leather_raiddemonhuntermidnight_d_01")
// extracted from the render.worldofwarcraft.com URL. Cached 30d per item_id.
export async function resolveItemIcon(itemId) {
  if (!itemId) return null;
  const key = `blizzard:item-media:${itemId}`;
  return memo(key, RATE.cacheTtl.staticItem, async () => {
    try {
      const data = await blzFetch(`/data/wow/media/item/${itemId}`, { namespace: NS_STATIC });
      const iconAsset = data?.assets?.find(a => a.key === "icon");
      if (!iconAsset?.value) return null;
      // Extract the texture name from the URL: .../icons/56/inv_helm_leather_d_01.jpg -> inv_helm_leather_d_01
      const m = iconAsset.value.match(/\/icons\/\d+\/(.+?)\.jpg/i);
      return m ? m[1] : null;
    } catch (e) {
      if (e.status === 404) return null;
      console.warn(`[blizzard] media/item/${itemId} failed: ${e.message}`);
      return null;
    }
  });
}

// Realm list helper used by discover.mjs to normalize names without needing the full index.
export async function getRealmIndex() {
  return realmIndex();
}