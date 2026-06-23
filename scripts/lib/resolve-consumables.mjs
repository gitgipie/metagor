// scripts/lib/resolve-consumables.mjs
// For each consumable item_id in data/guides.json that has no resolved name,
// fetch its Blizzard static-eu item once and write the canonical name back.
// TTL handled by the underlying cache in blizzard.mjs (30d per item_id).

import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getStaticItem } from "./blizzard.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const GUIDES_PATH = join(ROOT, "data", "guides.json");

function flattenConsumables(guides) {
  const refs = [];
  for (const [specId, set] of Object.entries(guides.consumables || {})) {
    if (!set) continue;
    const push = (slot, item) => {
      if (!item?.item_id) return;
      refs.push({ specId, slot, item_id: item.item_id });
    };
    push("flask", set.flask);
    push("food", set.food);
    push("weapon_buff", set.weapon_buff);
    for (const p of set.potions || []) push("potion", p);
  }
  return refs;
}

export async function resolveConsumables() {
  let guidesRaw;
  try {
    guidesRaw = await readFile(GUIDES_PATH, "utf8");
  } catch {
    console.warn("[resolve-consumables] no guides.json found, skipping");
    return { updated: 0, total: 0 };
  }
  const guides = JSON.parse(guidesRaw);
  const refs = flattenConsumables(guides);
  let updated = 0;

  for (const ref of refs) {
    const set = guides.consumables[ref.specId];
    const target =
      ref.slot === "flask" ? set.flask :
      ref.slot === "food"  ? set.food  :
      ref.slot === "weapon_buff" ? set.weapon_buff :
      (set.potions || []).find(p => p.item_id === ref.item_id);

    if (!target) continue;
    const needsName = !target.name || target.name.startsWith("(resolved");
    if (!needsName) continue;

    try {
      const data = await getStaticItem(ref.item_id);
      const name = data?.name || null;
      if (name) {
        target.name = name;
        updated++;
      }
    } catch (e) {
      console.warn(`[resolve-consumables] could not resolve ${ref.item_id} for ${ref.specId}: ${e.message}`);
    }
  }

  if (updated > 0) {
    const tmp = `${GUIDES_PATH}.tmp`;
    await writeFile(tmp, JSON.stringify(guides, null, 2));
    await rename(tmp, GUIDES_PATH);
    console.log(`[resolve-consumables] wrote ${updated} resolved names back to guides.json`);
  } else {
    console.log("[resolve-consumables] nothing to update");
  }
  return { updated, total: refs.length };
}