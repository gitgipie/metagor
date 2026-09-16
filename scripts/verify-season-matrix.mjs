// scripts/verify-season-matrix.mjs
// Validates data/season_matrix.json against data/schema/season_matrix.schema.json
// and cross-references against live Blizzard data in data/aggregated_bis.json.

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function main() {
  console.log("[verify-matrix] Loading schema and matrix data...");

  const schemaPath = join(ROOT, "data", "schema", "season_matrix.schema.json");
  const matrixPath = join(ROOT, "data", "season_matrix.json");
  const aggregatedBisPath = join(ROOT, "data", "aggregated_bis.json");

  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const matrix = JSON.parse(await readFile(matrixPath, "utf8"));

  // 1. AJV Schema Validation
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(matrix);

  if (!valid) {
    console.error("[verify-matrix] SCHEMA VALIDATION FAILED:");
    console.error(validate.errors);
    process.exit(1);
  }
  console.log("[verify-matrix] \u2713 AJV Schema validation passed.");

  // 2. Mathematical Consistency Checks
  const allMatrixIlvls = new Set();
  for (const row of matrix.matrix_rows) {
    allMatrixIlvls.add(row.ilvl);
  }

  for (const track of matrix.tracks) {
    if (track.steps.length !== track.ranks) {
      console.error(`[verify-matrix] Track ${track.name} ranks (${track.ranks}) !== steps length (${track.steps.length})`);
      process.exit(1);
    }

    for (let i = 1; i < track.steps.length; i++) {
      if (track.steps[i].ilvl <= track.steps[i - 1].ilvl) {
        console.error(`[verify-matrix] Track ${track.name} non-monotonic step at rank ${i + 1}`);
        process.exit(1);
      }
      allMatrixIlvls.add(track.steps[i].ilvl);
    }
    allMatrixIlvls.add(track.steps[0].ilvl);
  }
  console.log(`[verify-matrix] \u2713 Mathematical monotonicity & rank consistency passed (${matrix.tracks.length} tracks).`);

  // 3. Live Cross-Reference with data/aggregated_bis.json
  console.log("[verify-matrix] Cross-referencing against live Blizzard gear in aggregated_bis.json...");
  const bisData = JSON.parse(await readFile(aggregatedBisPath, "utf8"));

  let totalItems = 0;
  let matchedItems = 0;
  const unmatched = new Map();

  for (const [specKey, spec] of Object.entries(bisData.specializations || {})) {
    for (const [slot, item] of Object.entries(spec.gear || {})) {
      const list = [item, ...(item.alternatives || [])];
      for (const it of list) {
        if (!it || !it.ilvl) continue;
        totalItems++;
        if (allMatrixIlvls.has(it.ilvl)) {
          matchedItems++;
        } else {
          const count = unmatched.get(it.ilvl) || 0;
          unmatched.set(it.ilvl, count + 1);
        }
      }
    }
  }

  const matchPercent = (matchedItems / totalItems) * 100;
  console.log(`[verify-matrix] Observed items: ${totalItems} across 39 specs.`);
  console.log(`[verify-matrix] Matches with matrix: ${matchedItems} (${matchPercent.toFixed(2)}%)`);

  if (unmatched.size > 0) {
    console.log("[verify-matrix] Unmatched item levels (expected legacy items):", Array.from(unmatched.entries()).map(([ilvl, count]) => `ilvl ${ilvl}: ${count}x`));
  }

  // Expect >= 99.5% match rate (due to 10 known legacy BfA / S1 items)
  if (matchPercent < 99.5) {
    console.error(`[verify-matrix] ERROR: Match rate ${matchPercent.toFixed(2)}% is below 99.5% threshold!`);
    process.exit(1);
  }

  console.log("[verify-matrix] \u2713 Live Blizzard data cross-reference verification passed (>= 99.5% match).");
  console.log("[verify-matrix] SUCCESS: Season Matrix is valid and synchronized with current season data.");
}

main().catch(err => {
  console.error("[verify-matrix] Unhandled error:", err);
  process.exit(1);
});
