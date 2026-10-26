// scripts/validate-data.mjs
// Validates the committed data/aggregated_bis.json against its JSON Schema.
// Offline and read-only; used by the PR checks workflow.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(join(ROOT, "data", "aggregated_bis.json"), "utf8"));
const { ok, errors } = await validateAggregatedBis(data);
if (!ok) {
  console.error("[validate-data] data/aggregated_bis.json FAILED schema validation:");
  for (const e of errors.slice(0, 50)) console.error("  -", e.instancePath || "/", e.message);
  process.exit(1);
}
console.log(`[validate-data] OK: ${Object.keys(data.specializations || {}).length} specs, generated ${data.meta?.generated_at}`);
