// One-off: correct the Catalyst mislabels in data/aggregated_bis.json.
//
// The old logic appended "(Catalyst)" to EVERY item with a set bonus —
// including genuine raid drops — and stamped "Mythic+ (Catalyst)" on any
// M+ item missing from the dungeon map. Truthful rules:
//   - Raid/Crafted sources: the "(Catalyst)" suffix was always false → strip it.
//   - M+ set pieces: Vault award or Catalyst conversion, indistinguishable in
//     Blizzard's API → "Mythic+ · Tier (Vault/Catalyst)".
//   - M+ non-set pieces outside the dungeon map: data gap, not Catalyst → "Mythic+".
// The scraper (aggregate.mjs + run-once.mjs) now classifies correctly, so this
// script only brings the existing data file in line until the next full scrape.
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "data", "aggregated_bis.json");

const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));

const stats = { raidStripped: 0, mpTierRelabeled: 0, mpPlainRelabeled: 0, craftedStripped: 0, otherStripped: 0 };

function fixSource(e) {
  if (!e || typeof e.source !== "string") return;
  const src = e.source;
  if (!src.includes("(Catalyst)")) return;

  if (src.startsWith("Raid") || src.startsWith("Crafted")) {
    const base = src.replace(/\s*\(Catalyst\)\s*$/, "").trim();
    e.source = base;
    if (src.startsWith("Raid")) stats.raidStripped++;
    else stats.craftedStripped++;
    return;
  }

  if (src === "Mythic+ (Catalyst)" || src.startsWith("Mythic+")) {
    if (e.set_name) {
      e.source = "Mythic+ · Tier (Vault/Catalyst)";
      stats.mpTierRelabeled++;
    } else {
      e.source = "Mythic+";
      stats.mpPlainRelabeled++;
    }
    return;
  }

  // Any other "(Catalyst)" suffix (Great Vault etc.) — strip; the prefix is already truthful.
  e.source = src.replace(/\s*\(Catalyst\)\s*$/, "").trim();
  stats.otherStripped++;
}

for (const id of Object.keys(payload.specializations || {})) {
  const gear = payload.specializations[id].gear || {};
  for (const slot of Object.keys(gear)) {
    fixSource(gear[slot]);
    for (const alt of gear[slot]?.alternatives || []) fixSource(alt);
  }
}

const { ok, errors } = await validateAggregatedBis(payload);
if (!ok) {
  console.error("schema validation FAILED after re-label — aborting, file NOT updated:");
  for (const e of errors) console.error(" -", e.instancePath || "/", e.message);
  process.exit(3);
}

const tmp = `${OUT_PATH}.tmp`;
await writeFile(tmp, JSON.stringify(payload, null, 2));
await rename(tmp, OUT_PATH);
console.log("re-labeled:", JSON.stringify(stats, null, 2));