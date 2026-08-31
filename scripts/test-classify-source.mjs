// Verify classifyItemSource against the live probe inventory.
import { classifyItemSource } from "./lib/aggregate.mjs";

const cases = [
  // [desc, ctx, expected] — from the live top-character probe
  ["Mythic+", 16, "Mythic+"],
  ["Mythic+", 33, "Mythic+"],
  ["Mythic+", 35, "Mythic+"],
  ["Mythic+ Ascendant Voidforged: Myth", 35, "Mythic+"],
  ["Tidal Crafted", 13, "Crafted"],
  ["Radiance Crafted", 13, "Crafted"],
  ["Heroic", 5, "Raid (Heroic)"],
  ["Heroic", 95, "Raid (Heroic)"],
  ["Heroic Venomcursed", 5, "Raid (Heroic)"],
  ["Mythic", 6, "Raid (Mythic)"],
  ["Mythic Sporefused: Myth", 6, "Raid (Mythic)"],
  ["Mythic Ascendant Voidforged: Myth", 6, "Raid (Mythic)"],
  ["Venomcursed", 3, "Raid (Normal)"],
  [null, 3, "Raid (Normal)"],
  [null, 11, "Unknown"],           // ctx 11 with no desc — uncommon, don't guess
  ["Raid Finder", 4, "Raid (LFR)"],
  ["Raid Finder", 150, "Raid (LFR)"],
  ["Heroic", null, "Raid (Heroic)"], // desc fallback when ctx missing
];

let fails = 0;
for (const [desc, ctx, expected] of cases) {
  const got = classifyItemSource(desc, ctx);
  const ok = got === expected;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  desc=${JSON.stringify(desc)} ctx=${ctx}  → ${got}${ok ? "" : ` (expected ${expected})`}`);
}
process.exit(fails ? 1 : 0);