// scripts/lib/schema-validate.mjs
// Validates data/aggregated_bis.json against data/schema/aggregated_bis.schema.json
// using Ajv. The schema-validate script deliberately does not require the schema
// to be bundled - we read both at runtime so the JSON Schema is the source of truth.

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

export async function loadValidator() {
  const schema = JSON.parse(
    await readFile(join(ROOT, "data", "schema", "aggregated_bis.schema.json"), "utf8")
  );
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

export async function validateAggregatedBis(payload) {
  const validate = await loadValidator();
  const ok = validate(payload);
  return { ok, errors: validate.errors ?? [] };
}