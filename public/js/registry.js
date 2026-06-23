// public/js/registry.js
// Static class/spec catalog. Mirrors the plan: keys are <class-slug>-<spec-slug>.
// Sourced from public/loktar/data.js wowClasses. The live scraper will produce
// data/aggregated_bis.json using these slugs; the renderer always uses them too.

export const wowClasses = [
  { id: "death-knight", name: "Death Knight", color: "#C41E3A", specs: ["Blood", "Frost", "Unholy"] },
  { id: "demon-hunter", name: "Demon Hunter", color: "#A330C9", specs: ["Havoc", "Vengeance", "Devourer"] },
  { id: "druid",       name: "Druid",        color: "#FF7D0A", specs: ["Balance", "Feral", "Guardian", "Restoration"] },
  { id: "evoker",      name: "Evoker",       color: "#33937F", specs: ["Devastation", "Preservation", "Augmentation"] },
  { id: "hunter",      name: "Hunter",       color: "#AAD372", specs: ["Beast Mastery", "Marksmanship", "Survival"] },
  { id: "mage",        name: "Mage",         color: "#3FC7EB", specs: ["Arcane", "Fire", "Frost"] },
  { id: "monk",        name: "Monk",         color: "#00FF98", specs: ["Brewmaster", "Mistweaver", "Windwalker"] },
  { id: "paladin",     name: "Paladin",      color: "#F48CBA", specs: ["Holy", "Protection", "Retribution"] },
  { id: "priest",      name: "Priest",       color: "#FFFFFF", specs: ["Discipline", "Holy", "Shadow"] },
  { id: "rogue",       name: "Rogue",        color: "#FFF468", specs: ["Assassination", "Outlaw", "Subtlety"] },
  { id: "shaman",      name: "Shaman",       color: "#0070DD", specs: ["Elemental", "Enhancement", "Restoration"] },
  { id: "warlock",     name: "Warlock",      color: "#8788EE", specs: ["Affliction", "Demonology", "Destruction"] },
  { id: "warrior",     name: "Warrior",      color: "#C69B6D", specs: ["Arms", "Fury", "Protection"] }
];

export function specId(classId, specName) {
  return `${classId}-${specName.toLowerCase().replace(/\s+/g, "-")}`;
}

export function findClass(classId) {
  return wowClasses.find(c => c.id === classId);
}

export function listSpecIds() {
  const out = [];
  for (const cls of wowClasses) {
    for (const spec of cls.specs) {
      out.push({ id: specId(cls.id, spec), classId: cls.id, className: cls.name, specName: spec, color: cls.color });
    }
  }
  return out;
}

const PLATE = new Set(["death-knight", "paladin", "warrior"]);
const LEATHER = new Set(["demon-hunter", "rogue", "druid", "monk"]);
const MAIL = new Set(["shaman", "hunter", "evoker"]);

export function armorTypeFor(classId) {
  if (PLATE.has(classId)) return "Plate";
  if (LEATHER.has(classId)) return "Leather";
  if (MAIL.has(classId)) return "Mail";
  return "Cloth";
}

const ARMOR_SLOTS = new Set(["head", "shoulders", "chest", "legs", "hands", "waist", "feet"]);

export function inferSlotType(slot, classId) {
  if (ARMOR_SLOTS.has(slot)) return armorTypeFor(classId);
  if (slot === "ring1" || slot === "ring2") return "Finger";
  if (slot === "finger1" || slot === "finger2") return "Finger";
  if (slot === "neck") return "Neck";
  if (slot === "back") return "Back";
  if (slot === "trinket1" || slot === "trinket2") return "Trinket";
  if (slot === "mainhand") return "One-Hand";
  if (slot === "offhand") return "Off Hand";
  return "";
}

// Slot display order in the paper doll. Matches loktar/index.html IDs.
export const SLOT_ORDER = [
  "head", "neck", "shoulders", "back", "chest", "wrists",
  "hands", "waist", "legs", "feet",
  "finger1", "finger2", "trinket1", "trinket2",
  "mainhand", "offhand"
];

// left column = first 6, right column = next 8, weapon row = last 2
export const SLOT_LAYOUT = {
  left:   ["head", "neck", "shoulders", "back", "chest", "wrists"],
  right:  ["hands", "waist", "legs", "feet", "finger1", "finger2", "trinket1", "trinket2"],
  weapon: ["mainhand", "offhand"]
};
