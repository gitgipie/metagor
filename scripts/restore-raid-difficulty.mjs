// One-off: recover raid difficulty for "Raid · <Name>" entries with no
// name_description, using the original Blizzard `context` recorded in the
// fresh profile equipment caches (evidence-based, same method as
// reclassify-sources.mjs). ctx 6/23→Mythic, 5/95→Heroic, 3→Normal, 4/150→LFR.
import { readFile, writeFile, rename, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "data", "aggregated_bis.json");
const CACHE_DIR = join(ROOT, "data", "cache");

const FRESH_MS = Date.now() - 48 * 60 * 60 * 1000;
const files = (await readdir(CACHE_DIR)).filter(f => f.startsWith("blizzard_equip_"));

const ctxById = new Map(); // item_id -> Map(context -> count)
let cachesRead = 0;
for (const f of files) {
  try {
    const obj = JSON.parse(await readFile(join(CACHE_DIR, f), "utf8"));
    if (!obj?.cached_at || new Date(obj.cached_at).getTime() < FRESH_MS) continue;
    cachesRead++;
    for (const it of obj.data?.equipped_items || []) {
      const id = it?.item?.id;
      const ctx = it.context;
      if (id == null || ctx == null) continue;
      if (!ctxById.has(id)) ctxById.set(id, new Map());
      const m = ctxById.get(id);
      m.set(ctx, (m.get(ctx) || 0) + 1);
    }
  } catch { /* skip */ }
}
console.log(`evidence: ${cachesRead} fresh caches, ${ctxById.size} items with context`);

const CTX_TO_DIFF = {
  6: "Mythic", 23: "Mythic",
  5: "Heroic", 95: "Heroic",
  3: "Normal",
  4: "LFR", 150: "LFR"
};

const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
const stats = { restored: 0, keptPlain: 0 };

function fix(e) {
  if (!e || typeof e.source !== "string") return;
  const m = e.source.match(/^Raid · (.+)$/);
  if (!m) return;
  const ctxMap = ctxById.get(e.item_id);
  if (!ctxMap) { stats.keptPlain++; return; }
  // Only raid contexts count as evidence.
  let bestCtx = null, bestN = 0;
  for (const [ctx, n] of ctxMap) {
    if (CTX_TO_DIFF[ctx] && n > bestN) { bestN = n; bestCtx = ctx; }
  }
  const diff = bestCtx != null ? CTX_TO_DIFF[bestCtx] : null;
  if (diff) {
    e.source = `Raid (${diff}) · ${m[1]}`;
    stats.restored++;
  } else {
    stats.keptPlain++;
  }
}

for (const id of Object.keys(payload.specializations || {})) {
  const gear = payload.specializations[id].gear || {};
  for (const slot of Object.keys(gear)) {
    fix(gear[slot]);
    for (const alt of gear[slot]?.alternatives || []) fix(alt);
  }
}

const { ok, errors } = await validateAggregatedBis(payload);
if (!ok) {
  console.error("schema validation FAILED — aborting:");
  for (const e of errors) console.error(" -", e.instancePath || "/", e.message);
  process.exit(3);
}
const tmp = `${OUT_PATH}.tmp`;
await writeFile(tmp, JSON.stringify(payload, null, 2));
await rename(tmp, OUT_PATH);
console.log("difficulty restored from context evidence:", JSON.stringify(stats));