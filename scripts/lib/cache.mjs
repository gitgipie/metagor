// scripts/lib/cache.mjs
// Disk-backed JSON cache with TTL. Each key lives in data/cache/<key>.json
// with the form: { cached_at: <iso>, ttl_ms: <ms>, data: <any> }.
// Stale-on-read: isStale returns true if (now - cached_at) > ttl_ms.

import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = join(__dirname, "..", "..", "data", "cache");

await mkdir(CACHE_DIR, { recursive: true });

function safeKey(key) {
  return key.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

function pathFor(key) {
  return join(CACHE_DIR, `${safeKey(key)}.json`);
}

export async function readCache(key) {
  try {
    const text = await readFile(pathFor(key), "utf8");
    const obj = JSON.parse(text);
    if (!obj || typeof obj.cached_at !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}

export function isStale(entry, ttlMs) {
  if (!entry) return true;
  const ageMs = Date.now() - new Date(entry.cached_at).getTime();
  return ageMs > ttlMs;
}

export async function writeCache(key, data, ttlMs) {
  const entry = {
    cached_at: new Date().toISOString(),
    ttl_ms: ttlMs,
    data
  };
  const target = pathFor(key);
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(entry));
  await rename(tmp, target);
}

// Memoize an async fetcher with TTL. On stale/miss: fetch, write, return.
// On hit: return cached without calling fetcher.
export async function memo(key, ttlMs, fetcher) {
  const hit = await readCache(key);
  if (hit && !isStale(hit, ttlMs)) return hit.data;
  const data = await fetcher();
  await writeCache(key, data, ttlMs);
  return data;
}