// scripts/smoke-aggregate.mjs
// Local dry-run: feeds synthetic profiles through aggregateSpec and validates
// the resulting payload against the schema. No network calls.

import { aggregateSpec, normalizeEquipment, sortKeysDeep } from "./lib/aggregate.mjs";
import { validateAggregatedBis } from "./lib/schema-validate.mjs";
import { firstSpec, SPECS, SAMPLE_SIZE } from "./lib/config.mjs";

function fakeProfile(slotItems, { heroTalent = "Aldrachi Reaver", loadoutString = "MIDNIGHT-HAVOC-FIXTURE" } = {}) {
  return {
    items: slotItems,
    gems:   [{ id: 333333, name: "Indecipherable Eversong Diamond", icon: "inv_misc_gem_variety_02" }],
    enchants: [
      { slot: "weapon", id: 70001, name: "Enchant Weapon - Acuity", icon: "inv_scroll_03" },
      { slot: "head",   id: 70002, name: "Enchant Helm - Avoidance",  icon: "inv_scroll_04" },
      { slot: "feet",   id: 70003, name: "Enchant Boots - Dexterity", icon: "inv_scroll_08" }
    ],
    embellishments: [],
    talents: { loadout_string: loadoutString, hero_talent: heroTalent }
  };
}

function buildSyntheticProfiles(specEntry, count = SAMPLE_SIZE) {
  const items = {
    head:      { id: 234567, name: "Devouring Reaver's Intake",       icon: "inv_helm_leather_raiddemonhuntermidnight_d_01", ilvl: 684 },
    neck:      { id: 234568, name: "Voidstorm Warden's Pendant",      icon: "inv_misc_necklace_dragonflight_s1_03",         ilvl: 684 },
    shoulders: { id: 234569, name: "Mantle of the Sundered Sunwell",   icon: "inv_shoulder_leather_raidrogue_d_01",         ilvl: 684 },
    back:      { id: 234570, name: "Shawl of the Shared Dawn",         icon: "inv_misc_cape_shadowflame_d_01",              ilvl: 684 },
    chest:     { id: 234571, name: "Vest of the Midnight Hunt",        icon: "inv_chest_leather_raidrogue_d_01",            ilvl: 684 },
    wrists:    { id: 234572, name: "Bindings of the Haranir Path",     icon: "inv_bracer_leather_raidrogue_d_01",           ilvl: 684 },
    hands:     { id: 234573, name: "Grips of the Midnight Hunt",       icon: "inv_glove_leather_raidrogue_d_01",            ilvl: 684 },
    waist:     { id: 234574, name: "Voidscar Girdle",                  icon: "inv_belt_leather_raidrogue_d_01",             ilvl: 684 },
    legs:      { id: 234575, name: "Breeches of the Midnight Hunt",    icon: "inv_pant_leather_raidrogue_d_01",             ilvl: 684 },
    feet:      { id: 234576, name: "Shadowstep Treads",                icon: "inv_boot_leather_dragonflight_s1_01",         ilvl: 684 },
    finger1:   { id: 234577, name: "Band of the Triumvirate",          icon: "inv_misc_ring_dragonflight_s1_02",            ilvl: 684 },
    finger2:   { id: 234578, name: "Occlusion of Void",                icon: "inv_misc_ring_dragonflight_s1_05",            ilvl: 684 },
    trinket1:  { id: 234579, name: "Gaze of the Alnseer",              icon: "inv_misc_trinket_dragonflight_s3_05",         ilvl: 684 },
    trinket2:  { id: 234580, name: "Solarflare Prism",                 icon: "inv_misc_trinket_dragonflight_s2_03",         ilvl: 684 },
    mainhand:  { id: 234581, name: "Spellbreaker's Warglaive",         icon: "inv_warglaive_2h_dragonflight_d_01",          ilvl: 684 },
    offhand:   { id: 234582, name: "Spellbreaker's Warglaive (Off)",   icon: "inv_warglaive_2h_dragonflight_d_01",          ilvl: 684 }
  };
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push(fakeProfile(items));
  }
  return profiles;
}

async function main() {
  const spec = firstSpec();
  const profiles = buildSyntheticProfiles(spec);
  const aggregated = aggregateSpec({
    specId: spec.id,
    classId: spec.class,
    specName: spec.spec,
    role: spec.role,
    profiles,
    sampleSize: SAMPLE_SIZE
  });

  const payload = sortKeysDeep({
    meta: {
      generated_at: new Date().toISOString(),
      expansion: "midnight",
      expansion_id: 506,
      patch: "12.0.7",
      season_id: 15,
      region: "eu",
      sample_size: SAMPLE_SIZE,
      source: "smoke-test (synthetic profiles)",
      schema_version: 1
    },
    specializations: { [spec.id]: aggregated }
  });

  const { ok, errors } = await validateAggregatedBis(payload);
  if (!ok) {
    console.error("[smoke] schema validation FAILED:");
    for (const e of errors) console.error("  -", e.instancePath || "/", e.message);
    process.exit(2);
  }

  const head = aggregated.gear.head;
  console.log("[smoke] OK - aggregateSpec + schema validation both pass.");
  console.log(`[smoke] head: ${head.name} (item_id ${head.item_id}) — ${head.count}/${SAMPLE_SIZE} = ${(head.percent*100).toFixed(0)}%`);
  console.log(`[smoke] gems: ${aggregated.gems.length}, enchants: ${Object.keys(aggregated.enchants).length}, embellishments: ${aggregated.embellishments.length}`);
  console.log(`[smoke] loadout: ${aggregated.talents.loadout_string}`);
  console.log(`[smoke] failures skipped: ${aggregated.failures?.profiles_skipped ?? 0}`);
}

main().catch(e => { console.error("[smoke] FATAL:", e); process.exit(1); });