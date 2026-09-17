// public/js/registry.js
// Static class/spec catalog. Mirrors the plan: keys are <class-slug>-<spec-slug>.
// Sourced from public/loktar/data.js wowClasses. The live scraper will produce
// data/aggregated_bis.json using these slugs; the renderer always uses them too.

export const wowClasses = [
  { id: "death-knight", name: "Death Knight", color: "#C41E3A", icon: 135771,  specs: ["Blood", "Frost", "Unholy"], specIcons: { "Blood": 135770, "Frost": 135773, "Unholy": 135775 } },
  { id: "demon-hunter", name: "Demon Hunter", color: "#A330C9", icon: 1260827, specs: ["Havoc", "Vengeance", "Devourer"], specIcons: { "Havoc": 1247264, "Vengeance": 1247265, "Devourer": 7455385 } },
  { id: "druid",       name: "Druid",        color: "#FF7D0A", icon: 625999,  specs: ["Balance", "Feral", "Guardian", "Restoration"], specIcons: { "Balance": 136096, "Feral": 132115, "Guardian": 132276, "Restoration": 136041 } },
  { id: "evoker",      name: "Evoker",       color: "#33937F", icon: 4574311, specs: ["Devastation", "Preservation", "Augmentation"], specIcons: { "Devastation": 4511811, "Preservation": 4511812, "Augmentation": 5198700 } },
  { id: "hunter",      name: "Hunter",       color: "#AAD372", icon: 626000,  specs: ["Beast Mastery", "Marksmanship", "Survival"], specIcons: { "Beast Mastery": 461112, "Marksmanship": 236179, "Survival": 461113 } },
  { id: "mage",        name: "Mage",         color: "#3FC7EB", icon: 626001,  specs: ["Arcane", "Fire", "Frost"], specIcons: { "Arcane": 135932, "Fire": 135810, "Frost": 135846 } },
  { id: "monk",        name: "Monk",         color: "#00FF98", icon: 626002,  specs: ["Brewmaster", "Mistweaver", "Windwalker"], specIcons: { "Brewmaster": 608951, "Mistweaver": 608952, "Windwalker": 608953 } },
  { id: "paladin",     name: "Paladin",      color: "#F48CBA", icon: 626003,  specs: ["Holy", "Protection", "Retribution"], specIcons: { "Holy": 135920, "Protection": 236264, "Retribution": 135873 } },
  { id: "priest",      name: "Priest",       color: "#FFFFFF", icon: 626004,  specs: ["Discipline", "Holy", "Shadow"], specIcons: { "Discipline": 135940, "Holy": 237542, "Shadow": 136207 } },
  { id: "rogue",       name: "Rogue",        color: "#FFF468", icon: 626005,  specs: ["Assassination", "Outlaw", "Subtlety"], specIcons: { "Assassination": 236270, "Outlaw": 236286, "Subtlety": 132320 } },
  { id: "shaman",      name: "Shaman",       color: "#0070DD", icon: 626006,  specs: ["Elemental", "Enhancement", "Restoration"], specIcons: { "Elemental": 136048, "Enhancement": 237581, "Restoration": 136052 } },
  { id: "warlock",     name: "Warlock",      color: "#8788EE", icon: 626007,  specs: ["Affliction", "Demonology", "Destruction"], specIcons: { "Affliction": 136145, "Demonology": 136172, "Destruction": 136186 } },
  { id: "warrior",     name: "Warrior",      color: "#C69B6D", icon: 626008,  specs: ["Arms", "Fury", "Protection"], specIcons: { "Arms": 132355, "Fury": 132347, "Protection": 132341 } }
];

export function getSpecIcon(classId, specName) {
  const cls = findClass(classId);
  return cls?.specIcons?.[specName] || null;
}

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
