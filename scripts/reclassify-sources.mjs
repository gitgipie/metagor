// One-off: reclassify gear sources in data/aggregated_bis.json using the
// ORIGINAL Blizzard fields (context, name_description) recorded in the fresh
// profile equipment caches from the last scrape. No inference, no guessing —
// every relabeled item gets its source from what Blizzard actually returned.
//
// Targets:
//   - "Unknown" sources (desc-less items: cloaks, rings, trinkets)
//   - bare "Heroic"/"Mythic" leftovers from the old fallback path
// The scraper (aggregate.mjs) now classifies with the same evidence-based
// rules, so future scrapes won't need this.
import { readFile, writeFile, rename, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyItemSource } from "./lib/aggregate.mjs";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "data", "aggregated_bis.json");
const CACHE_DIR = join(ROOT, "data", "cache");

// Only caches from the last 48h — context numbering is tied to the current
// API version; older caches used a different enum and must be ignored.
const FRESH_MS = Date.now() - 48 * 60 * 60 * 1000;

// 1. Build item_id -> { ctxCounts, descCounts } from fresh equip caches.
const files = (await readdir(CACHE_DIR)).filter(f => f.startsWith("blizzard_equip_"));
const evidence = new Map(); // item_id -> { ctx: Map, desc: Map }
let cachesRead = 0, cachesSkipped = 0;
for (const f of files) {
  try {
    const obj = JSON.parse(await readFile(join(CACHE_DIR, f), "utf8"));
    if (!obj?.cached_at || new Date(obj.cached_at).getTime() < FRESH_MS) { cachesSkipped++; continue; }
    cachesRead++;
    for (const it of obj.data?.equipped_items || []) {
      const id = it?.item?.id;
      if (!id) continue;
      let ev = evidence.get(id);
      if (!ev) { ev = { ctx: new Map(), desc: new Map() }; evidence.set(id, ev); }
      const ctx = it.context ?? null;
      if (ctx != null) ev.ctx.set(ctx, (ev.ctx.get(ctx) || 0) + 1);
      const desc = it?.name_description?.display_string ?? null;
      if (desc) ev.desc.set(desc, (ev.desc.get(desc) || 0) + 1);
    }
  } catch { /* corrupt cache file — skip */ }
}
console.log(`evidence: ${cachesRead} fresh caches read, ${cachesSkipped} stale skipped, ${evidence.size} unique items`);

function dominant(map) {
  let best = null, n = 0;
  for (const [k, v] of map) if (v > n) { n = v; best = k; }
  return best;
}

function reclassify(e) {
  if (!e || e.item_id == null) return false;
  const needsFix = e.source === "Unknown" ||
    e.source === "Heroic" || e.source === "Mythic" ||
    e.source === "Normal" || e.source === "Raid Finder";
  if (!needsFix) return false;
  const ev = evidence.get(e.item_id);
  if (!ev) return false;
  const desc = dominant(ev.desc);
  const ctx = dominant(ev.ctx);
  if (desc == null && ctx == null) return false;
  const newSource = classifyItemSource(desc, ctx);
  if (newSource === "Unknown" || !newSource) return false;
  if (newSource === e.source) return false;
  e.source = newSource;
  return true;
}

// 2. Walk every gear entry + alternatives and reclassify where evidence exists.
const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
let fixed = 0, stillUnknown = 0;
for (const id of Object.keys(payload.specializations || {})) {
  const gear = payload.specializations[id].gear || {};
  for (const slot of Object.keys(gear)) {
    const entry = gear[slot];
    if (!entry) continue;
    if (reclassify(entry)) fixed++;
    else if (entry.source === "Unknown") stillUnknown++;
    for (const alt of entry.alternatives || []) {
      if (reclassify(alt)) fixed++;
      else if (alt.source === "Unknown") stillUnknown++;
    }
  }
}
console.log(`reclassified: ${fixed}, still Unknown (no fresh evidence): ${stillUnknown}`);

// 3. Validate + atomic write.
const { ok, errors } = await validateAggregatedBis(payload);
if (!ok) {
  console.error("schema validation FAILED — aborting, file NOT updated:");
  for (const e of errors) console.error(" -", e.instancePath || "/", e.message);
  process.exit(3);
}
const tmp = `${OUT_PATH}.tmp`;
await writeFile(tmp, JSON.stringify(payload, null, 2));
await rename(tmp, OUT_PATH);
console.log("wrote", OUT_PATH);