// One-off: regenerate only the meta block of aggregated_bis.json from the
// cached discovery (no profile re-scrape), then re-validate against schema.
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverCurrent } from "./lib/discover.mjs";
import { discoverCurrentSeason } from "./lib/raiderio.mjs";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";
import { sortKeysDeep } from "./lib/aggregate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "data", "aggregated_bis.json");

const current = await discoverCurrent();           // cached: patch/expansion/regions
const rio = await discoverCurrentSeason();          // cached: user-friendly season name

const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
payload.meta = sortKeysDeep({
  ...payload.meta,
  expansion: current.expansion,
  expansion_id: current.expansion_id,
  patch: current.patch,
  season_name: rio.name ?? null,
});

const { ok, errors } = await validateAggregatedBis(payload);
if (!ok) {
  console.error("schema validation FAILED:");
  for (const e of errors) console.error(" -", e.instancePath || "/", e.message);
  process.exit(3);
}
const tmp = `${OUT_PATH}.tmp`;
await writeFile(tmp, JSON.stringify(payload, null, 2));
await rename(tmp, OUT_PATH);
console.log("meta refreshed:", JSON.stringify({
  patch: payload.meta.patch,
  expansion: payload.meta.expansion,
  season_name: payload.meta.season_name
}, null, 2));
