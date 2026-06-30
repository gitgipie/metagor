// scripts/lib/config.mjs
// Non-volatile configuration. NEVER hardcode expansion/patch/season here —
// those come from scripts/lib/discover.mjs at boot.

// Regions to aggregate. Characters from both regions are combined into a single
// top-50 per spec, matching how murlok.io presents data.
export const REGIONS = ["eu", "us"];

// Back-compat: single-region helpers still work
export const REGION = "eu";
export const LOCALE = "en_GB";

export const OAUTH_URL  = "https://oauth.battle.net/token";

// Per-region API host
export function apiHost(region) { return `https://${region}.api.blizzard.com`; }
export function nsProfile(region) { return `profile-${region}`; }
export function nsDynamic(region) { return `dynamic-${region}`; }
export function nsStatic(region)  { return `static-${region}`; }

// Back-compat single-region constants (default to eu)
export const BLZ_API    = apiHost(REGION);
export const NS_PROFILE = nsProfile(REGION);
export const NS_DYNAMIC = nsDynamic(REGION);
export const NS_STATIC  = nsStatic(REGION);

export const SAMPLE_SIZE  = 50;
export const MIN_PERCENT  = 0.10;        // drop slots with < 10% representation

// Rate limit knobs
export const RATE = {
  blizzardConcurrency: 8,
  blizzardMinDelayMs:   60,
  raiderioMinDelayMs:   200,
  cacheTtl: {
    oauth:      23 * 60 * 60 * 1000,  // 23h (Blizzard tokens are 24h)
    leaderboard: 12 * 60 * 60 * 1000, // 12h per spec
    profile:     24 * 60 * 60 * 1000, // 24h per character
    staticItem:  30 * 24 * 60 * 60 * 1000, // 30d per item_id
    discovery:   6 * 60 * 60 * 1000   // 6h expansion/season discovery
  }
};

// Spec catalog: keyed by <class-slug>-<spec-slug>.
// role: 'dps' | 'tank' | 'healer' | 'support'
// blizzardClassId / blizzardSpecId are the numeric IDs Blizzard uses in /profile/wow/character.
// raiderio: { class, spec } are the slugs Raider.IO uses in its leaderboard query.
export const SPECS = [
  { id: "death-knight-blood",     class: "death-knight", spec: "blood",     role: "tank",   blizzardClassId: 6,  blizzardSpecId: 250, raiderio: { class: "death-knight", spec: "blood" } },
  { id: "death-knight-frost",     class: "death-knight", spec: "frost",     role: "dps",    blizzardClassId: 6,  blizzardSpecId: 251, raiderio: { class: "death-knight", spec: "frost" } },
  { id: "death-knight-unholy",    class: "death-knight", spec: "unholy",    role: "dps",    blizzardClassId: 6,  blizzardSpecId: 252, raiderio: { class: "death-knight", spec: "unholy" } },

  { id: "demon-hunter-havoc",     class: "demon-hunter", spec: "havoc",     role: "dps",    blizzardClassId: 12, blizzardSpecId: 577, raiderio: { class: "demon-hunter", spec: "havoc" } },
  { id: "demon-hunter-vengeance", class: "demon-hunter", spec: "vengeance", role: "tank",   blizzardClassId: 12, blizzardSpecId: 581, raiderio: { class: "demon-hunter", spec: "vengeance" } },
  { id: "demon-hunter-devourer",  class: "demon-hunter", spec: "devourer",  role: "dps",    blizzardClassId: 12, blizzardSpecId: 1480, raiderio: { class: "demon-hunter", spec: "devourer" } },

  { id: "druid-balance",          class: "druid",        spec: "balance",   role: "dps",    blizzardClassId: 11, blizzardSpecId: 102, raiderio: { class: "druid", spec: "balance" } },
  { id: "druid-feral",            class: "druid",        spec: "feral",     role: "dps",    blizzardClassId: 11, blizzardSpecId: 103, raiderio: { class: "druid", spec: "feral" } },
  { id: "druid-guardian",         class: "druid",        spec: "guardian",  role: "tank",   blizzardClassId: 11, blizzardSpecId: 104, raiderio: { class: "druid", spec: "guardian" } },
  { id: "druid-restoration",      class: "druid",        spec: "restoration", role: "healer", blizzardClassId: 11, blizzardSpecId: 105, raiderio: { class: "druid", spec: "restoration" } },

  { id: "evoker-devastation",     class: "evoker",       spec: "devastation",  role: "dps",    blizzardClassId: 13, blizzardSpecId: 1467, raiderio: { class: "evoker", spec: "devastation" } },
  { id: "evoker-preservation",    class: "evoker",       spec: "preservation", role: "healer", blizzardClassId: 13, blizzardSpecId: 1468, raiderio: { class: "evoker", spec: "preservation" } },
  { id: "evoker-augmentation",    class: "evoker",       spec: "augmentation", role: "support", blizzardClassId: 13, blizzardSpecId: 1473, raiderio: { class: "evoker", spec: "augmentation" } },

  { id: "hunter-beast-mastery",   class: "hunter",       spec: "beast-mastery",   role: "dps", blizzardClassId: 3,  blizzardSpecId: 253, raiderio: { class: "hunter", spec: "beast-mastery" } },
  { id: "hunter-marksmanship",    class: "hunter",       spec: "marksmanship",    role: "dps", blizzardClassId: 3,  blizzardSpecId: 254, raiderio: { class: "hunter", spec: "marksmanship" } },
  { id: "hunter-survival",        class: "hunter",       spec: "survival",        role: "dps", blizzardClassId: 3,  blizzardSpecId: 255, raiderio: { class: "hunter", spec: "survival" } },

  { id: "mage-arcane",            class: "mage",         spec: "arcane",   role: "dps",    blizzardClassId: 8,  blizzardSpecId: 62,  raiderio: { class: "mage", spec: "arcane" } },
  { id: "mage-fire",              class: "mage",         spec: "fire",     role: "dps",    blizzardClassId: 8,  blizzardSpecId: 63,  raiderio: { class: "mage", spec: "fire" } },
  { id: "mage-frost",             class: "mage",         spec: "frost",    role: "dps",    blizzardClassId: 8,  blizzardSpecId: 64,  raiderio: { class: "mage", spec: "frost" } },

  { id: "monk-brewmaster",        class: "monk",         spec: "brewmaster",  role: "tank",   blizzardClassId: 10, blizzardSpecId: 268, raiderio: { class: "monk", spec: "brewmaster" } },
  { id: "monk-mistweaver",        class: "monk",         spec: "mistweaver",  role: "healer", blizzardClassId: 10, blizzardSpecId: 270, raiderio: { class: "monk", spec: "mistweaver" } },
  { id: "monk-windwalker",        class: "monk",         spec: "windwalker",  role: "dps",    blizzardClassId: 10, blizzardSpecId: 269, raiderio: { class: "monk", spec: "windwalker" } },

  { id: "paladin-holy",           class: "paladin",      spec: "holy",      role: "healer", blizzardClassId: 2,  blizzardSpecId: 65,  raiderio: { class: "paladin", spec: "holy" } },
  { id: "paladin-protection",     class: "paladin",      spec: "protection", role: "tank",   blizzardClassId: 2,  blizzardSpecId: 66,  raiderio: { class: "paladin", spec: "protection" } },
  { id: "paladin-retribution",    class: "paladin",      spec: "retribution", role: "dps",    blizzardClassId: 2,  blizzardSpecId: 70,  raiderio: { class: "paladin", spec: "retribution" } },

  { id: "priest-discipline",      class: "priest",       spec: "discipline", role: "healer", blizzardClassId: 5,  blizzardSpecId: 256, raiderio: { class: "priest", spec: "discipline" } },
  { id: "priest-holy",            class: "priest",       spec: "holy",       role: "healer", blizzardClassId: 5,  blizzardSpecId: 257, raiderio: { class: "priest", spec: "holy" } },
  { id: "priest-shadow",          class: "priest",       spec: "shadow",     role: "dps",    blizzardClassId: 5,  blizzardSpecId: 258, raiderio: { class: "priest", spec: "shadow" } },

  { id: "rogue-assassination",    class: "rogue",        spec: "assassination", role: "dps", blizzardClassId: 4,  blizzardSpecId: 259, raiderio: { class: "rogue", spec: "assassination" } },
  { id: "rogue-outlaw",           class: "rogue",        spec: "outlaw",        role: "dps", blizzardClassId: 4,  blizzardSpecId: 260, raiderio: { class: "rogue", spec: "outlaw" } },
  { id: "rogue-subtlety",         class: "rogue",        spec: "subtlety",      role: "dps", blizzardClassId: 4,  blizzardSpecId: 261, raiderio: { class: "rogue", spec: "subtlety" } },

  { id: "shaman-elemental",       class: "shaman",       spec: "elemental",   role: "dps",    blizzardClassId: 7,  blizzardSpecId: 262, raiderio: { class: "shaman", spec: "elemental" } },
  { id: "shaman-enhancement",     class: "shaman",       spec: "enhancement", role: "dps",    blizzardClassId: 7,  blizzardSpecId: 263, raiderio: { class: "shaman", spec: "enhancement" } },
  { id: "shaman-restoration",     class: "shaman",       spec: "restoration", role: "healer", blizzardClassId: 7,  blizzardSpecId: 264, raiderio: { class: "shaman", spec: "restoration" } },

  { id: "warlock-affliction",     class: "warlock",      spec: "affliction",  role: "dps",    blizzardClassId: 9,  blizzardSpecId: 265, raiderio: { class: "warlock", spec: "affliction" } },
  { id: "warlock-demonology",     class: "warlock",      spec: "demonology",  role: "dps",    blizzardClassId: 9,  blizzardSpecId: 266, raiderio: { class: "warlock", spec: "demonology" } },
  { id: "warlock-destruction",    class: "warlock",      spec: "destruction", role: "dps",    blizzardClassId: 9,  blizzardSpecId: 267, raiderio: { class: "warlock", spec: "destruction" } },

  { id: "warrior-arms",           class: "warrior",      spec: "arms",        role: "dps",    blizzardClassId: 1,  blizzardSpecId: 71,  raiderio: { class: "warrior", spec: "arms" } },
  { id: "warrior-fury",           class: "warrior",      spec: "fury",        role: "dps",    blizzardClassId: 1,  blizzardSpecId: 72,  raiderio: { class: "warrior", spec: "fury" } },
  { id: "warrior-protection",     class: "warrior",      spec: "protection",  role: "tank",   blizzardClassId: 1,  blizzardSpecId: 73,  raiderio: { class: "warrior", spec: "protection" } }
];

export function findSpec(id) {
  return SPECS.find(s => s.id === id);
}

export function firstSpec() {
  return SPECS[0];
}