// data.js - World of Warcraft Midnight static Mythic+ data

const siteMeta = {
  expansion: "Midnight",
  season: "Season 1",
  levelCap: 90,
  itemLevelBand: 684,
  sourceNote: "Static sample data refreshed for World of Warcraft: Midnight.",
  officialSummary: "Midnight is the second chapter of the Worldsoul Saga. Xal’atath threatens Quel'Thalas, Silvermoon City serves as a shared hub, player Housing is live, Haranir joins as an allied race, and Demon Hunters gain the Devourer specialization.",
  officialFeatures: [
    "Level cap raised to 90",
    "Silvermoon City shared faction hub",
    "Housing and Neighborhoods",
    "Haranir allied race",
    "Devourer Demon Hunter spec",
    "Four Midnight leveling paths in Quel'Thalas"
  ],
  profileLabels: {
    official: "Official Midnight class notes",
    curated: "Curated Loktar static sample",
    mixed: "Official Midnight notes + curated static sample"
  }
};

const wowClasses = [
  { id: "death-knight", name: "Death Knight", color: "#C41E3A", specs: ["Blood", "Frost", "Unholy"] },
  { id: "demon-hunter", name: "Demon Hunter", color: "#A330C9", specs: ["Havoc", "Vengeance", "Devourer"] },
  { id: "druid", name: "Druid", color: "#FF7D0A", specs: ["Balance", "Feral", "Guardian", "Restoration"] },
  { id: "evoker", name: "Evoker", color: "#33937F", specs: ["Devastation", "Preservation", "Augmentation"] },
  { id: "hunter", name: "Hunter", color: "#AAD372", specs: ["Beast Mastery", "Marksmanship", "Survival"] },
  { id: "mage", name: "Mage", color: "#3FC7EB", specs: ["Arcane", "Fire", "Frost"] },
  { id: "monk", name: "Monk", color: "#00FF98", specs: ["Brewmaster", "Mistweaver", "Windwalker"] },
  { id: "paladin", name: "Paladin", color: "#F48CBA", specs: ["Holy", "Protection", "Retribution"] },
  { id: "priest", name: "Priest", color: "#FFFFFF", specs: ["Discipline", "Holy", "Shadow"] },
  { id: "rogue", name: "Rogue", color: "#FFF468", specs: ["Assassination", "Outlaw", "Subtlety"] },
  { id: "shaman", name: "Shaman", color: "#0070DD", specs: ["Elemental", "Enhancement", "Restoration"] },
  { id: "warlock", name: "Warlock", color: "#8788EE", specs: ["Affliction", "Demonology", "Destruction"] },
  { id: "warrior", name: "Warrior", color: "#C69B6D", specs: ["Arms", "Fury", "Protection"] }
];

// High-quality Wowhead icons
const icons = {
  // Stats
  crit: "spell_fire_firebolt",
  haste: "spell_nature_lightning",
  mastery: "spell_holy_blessingofstrength",
  versatility: "spell_holy_mindvision",
  // Slots
  head: "inv_helmet_74",
  neck: "inv_misc_necklace_12",
  shoulders: "inv_shoulder_74",
  back: "inv_misc_cape_18",
  chest: "inv_chest_leather_08",
  wrists: "inv_bracer_11",
  hands: "inv_glove_leather_04",
  waist: "inv_belt_12",
  legs: "inv_pant_leather_03",
  feet: "inv_boot_leather_01",
  finger: "inv_misc_ring_04",
  trinket: "inv_misc_trinket_02",
  mainhand: "inv_sword_39",
  offhand: "inv_shield_05",
  // Consumables
  flask: "inv_flask_01",
  potion: "inv_potion_163",
  food: "inv_misc_food_vendor_roastpig",
  rune: "inv_scroll_03",
  healthstone: "warlock_healthstone",
  healing_potion: "inv_potion_155"
};

// Hand-crafted detailed profiles for the most popular classes/specs
const handcraftedSpecData = {
  "demon-hunter-havoc": {
    summary: {
      title: "Havoc Demon Hunter",
      role: "Melee DPS",
      focus: "Midnight Havoc stays a melee fel spec, but with rebuilt trees, stronger class identity, and key Fel-Scarred updates in the pre-expansion patch.",
      source: "Murlok Mythic+ top 50 Midnight Season 1 players for stat priority and popularity slices; Loktar curated item details elsewhere unless explicitly noted",
      verification: "mixed",
      statsNote: "Murlok top 50 Mythic+ Havoc: Critical Strike 34%, Mastery 73%, Haste 7%, Versatility 1%. Display order follows Murlok priority: Critical Strike > Mastery > Haste > Versatility.",
      gearNote: "Rings, trinkets, weapons, enchants, gems, and embellishments use Murlok popularity direction first. Havoc head has a top-choice popup prototype. Most armor-slot item details are still Loktar-curated and not yet source-complete."
    },
    stats: [
      { name: "Critical Strike", value: 35, rating: 1117, icon: icons.crit },
      { name: "Mastery", value: 74, rating: 1046, icon: icons.mastery },
      { name: "Haste", value: 7, rating: 293, icon: icons.haste },
      { name: "Versatility", value: 1, rating: 41, icon: icons.versatility }
    ],
    items: {
      head: {
        name: "Devouring Reaver's Intake",
        icon: "inv_helm_leather_raiddemonhuntermidnight_d_01",
        quality: "epic",
        ilvl: 289,
        source: "Raid · Manaforge Omega · Forgeweaver Araz / Catalyst",
        percentage: 64,
        stats: "100 Armor\n+122 Agility\n+1,662 Stamina\n+120 Haste\n+55 Mastery",
        description: "Set: Devouring Reaver's Sheathe\n(2) Set Havoc: Blade Dance damage increased by 15%.\n(4) Set Havoc: Your Haste is increased by an additional 6% during Metamorphosis.",
        type: "Leather",
        dropInfo: {
          locationType: "Raid",
          instance: "Manaforge Omega",
          boss: "Forgeweaver Araz",
          alternative: "Catalyst",
          sourceMethod: "Boss Drop / Great Vault / Catalyst"
        }
      },
      neck: { name: "Voidstorm Warden's Pendant", icon: "inv_misc_necklace_dragonflight_s1_03", quality: "epic", ilvl: 684, source: "Silvermoon City reputation", percentage: 92, stats: "+1,880 Haste\n+1,420 Mastery\nPrismatic Socket" },
      shoulders: { name: "Mantle of the Sundered Sunwell", icon: "inv_shoulder_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 98, stats: "+3,640 Agility\n+1,240 Haste\n+860 Critical Strike" },
      back: { name: "Shawl of the Shared Dawn", icon: "inv_misc_cape_shadowflame_d_01", quality: "epic", ilvl: 684, source: "Silvermoon City weekly cache", percentage: 89, stats: "+2,710 Agility\nEquip: Your attacks have a chance to channel dawn and void, granting 1,350 secondary stats for 12 sec." },
      chest: { name: "Vest of the Midnight Hunt", icon: "inv_chest_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 98, stats: "+4,980 Agility\n+1,760 Critical Strike\n+1,040 Versatility" },
      wrists: { name: "Bindings of the Haranir Path", icon: "inv_bracer_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Crafted (Leatherworking)", percentage: 76, stats: "+2,140 Agility\n+790 Haste\n+560 Versatility" },
      hands: { name: "Grips of the Midnight Hunt", icon: "inv_glove_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 95, stats: "+3,640 Agility\n+1,280 Critical Strike\n+820 Haste" },
      waist: { name: "Voidscar Girdle", icon: "inv_belt_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Zul'Aman Mythic+", percentage: 81, stats: "+3,640 Agility\n+1,330 Haste\n+740 Mastery" },
      legs: { name: "Breeches of the Midnight Hunt", icon: "inv_pant_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 97, stats: "+4,980 Agility\n+1,820 Critical Strike\n+960 Haste" },
      feet: { name: "Shadowstep Treads", icon: "inv_boot_leather_dragonflight_s1_01", quality: "epic", ilvl: 684, source: "Crafted (Leatherworking)", percentage: 94, stats: "+3,640 Agility\n+1,250 Haste\n+780 Versatility\nEmbellished: Your attacks have a chance to deal bonus shadow damage and briefly boost movement speed." },
      ring1: { name: "Band of the Triumvirate", icon: "inv_misc_ring_dragonflight_s1_02", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Havoc · seen on 24/50 sampled profiles", percentage: 48, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      ring2: { name: "Occlusion of Void", icon: "inv_misc_ring_dragonflight_s1_05", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Havoc · seen on 20/50 sampled profiles", percentage: 40, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      trinket1: { name: "Gaze of the Alnseer", icon: "inv_misc_trinket_dragonflight_s3_05", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Havoc · seen on 41/50 sampled profiles", percentage: 82, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      trinket2: { name: "Solarflare Prism", icon: "inv_misc_trinket_dragonflight_s2_03", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Havoc · seen on 30/50 sampled profiles", percentage: 60, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      mainhand: { name: "Spellbreaker's Warglaive", icon: "inv_warglaive_2h_dragonflight_d_01", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Havoc · crafted weapon family seen on 29/50 sampled profiles", percentage: 58, stats: "Weapon-family popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      offhand: { name: "Spellbreaker's Warglaive", icon: "inv_warglaive_2h_dragonflight_d_01", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Havoc · crafted off-hand family seen on 29/50 sampled profiles", percentage: 58, stats: "Weapon-family popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." }
    },
    enchants: [
      { slot: "Weapon", name: "Enchant Weapon - Acuity of the Ren'dorei", percentage: 78, icon: "inv_scroll_03" },
      { slot: "Head", name: "Enchant Helm - Empowered Rune of Avoidance", percentage: 92, icon: "inv_scroll_04" },
      { slot: "Feet", name: "Enchant Boots - Lynx's Dexterity", percentage: 98, icon: "inv_scroll_08" },
      { slot: "Rings", name: "Enchant Ring - Eyes of the Eagle", percentage: 94, icon: "inv_scroll_11" }
    ],
    gems: [
      { name: "Indecipherable Eversong Diamond", percentage: 94, icon: "inv_misc_gem_variety_02" },
      { name: "Flawless Deadly Amethyst", percentage: 82, icon: "inv_misc_gem_variety_01" }
    ],
    embellishments: [
      { name: "Arcanoweave Lining", percentage: 73, icon: "inv_misc_fabric_01" },
      { name: "Hunt", percentage: 23, icon: "inv_warglaive_2h_dragonflight_d_01" }
    ],
    consumables: [
      { category: "Phial", name: "Phial of Twilight Harmony", percentage: 93, icon: "inv_potion_163", description: "Loktar-curated interim consumable entry for Havoc. Still awaiting a stable source-backed Midnight Season 1 consumable pass." },
      { category: "Potion", name: "Potion of Focused Brilliance", percentage: 96, icon: "inv_potion_155", description: "Loktar-curated interim burst potion entry for Metamorphosis windows." },
      { category: "Food", name: "Silvermoon Captain's Feast", percentage: 88, icon: "inv_misc_food_vendor_roastpig", description: "Loktar-curated interim feast entry pending a dedicated consumables source pass." },
      { category: "Rune", name: "Crystallized Augment Rune", percentage: 98, icon: "inv_scroll_03", description: "Loktar-curated interim augment rune entry pending sourced optimization guidance." },
      { category: "Utility", name: "Algari Healing Potion", percentage: 99, icon: "inv_potion_52", description: "Loktar-curated utility entry for self-stabilization until the consumables pass is sourced." }
    ],
    talents: {
      code: "MIDNIGHT-HAVOC-OFFICIAL-PATCH-01",
      list: [
        { name: "The Hunt", icon: "ability_demonhunter_thehunt", desc: "Now sits in the Havoc tree in Midnight pre-expansion notes instead of the shared class tree. Still key to target access and burst routing." },
        { name: "Blind Focus", icon: "ability_demonhunter_eyebeam", desc: "Official Havoc/Fel-Scarred update: Fire damage increased by 5%, doubled while in demon form." },
        { name: "Undying Embers", icon: "inv_felfire_heal", desc: "Official Havoc/Fel-Scarred update: Immolation Aura has a 25% chance to reignite after expiring, reapplying its effect." }
      ]
    },
    slotChoices: {
      head: {
        slot: "Head",
        source: "Murlok top 50 Mythic+ Havoc Demon Hunter · Midnight Season 1",
        items: [
          {
            rank: 1,
            name: "Devouring Reaver's Intake",
            icon: "inv_helm_leather_raiddemonhuntermidnight_d_01",
            quality: "epic",
            tag: "Set",
            count: 32,
            note: "Current most-used Havoc head on Murlok Mythic+ profiles.",
            ilvl: 289,
            type: "Leather",
            stats: "100 Armor\n+110 Agility\n+1,768 Stamina\n+113 Haste\n+52 Mastery",
            description: "Set: Devouring Reaver's Sheathe\n(2) Set Havoc: Blade Dance damage increased by 15%.\n(4) Set Havoc: Your Haste is increased by an additional 6% during Metamorphosis.",
            dropInfo: { locationType: "Raid", instance: "Manaforge Omega", boss: "Forgeweaver Araz", alternative: "Catalyst", sourceMethod: "Boss Drop / Great Vault / Catalyst" }
          },
          {
            rank: 2,
            name: "Devouring Night's Visage",
            icon: "inv_helm_leather_raiddemonhuntermidnight_d_01",
            quality: "epic",
            tag: "Alt",
            count: 9,
            note: "Secondary non-leading head option currently visible on Murlok.",
            ilvl: 289,
            type: "Leather",
            stats: "Leather helm shown by Murlok for Havoc. Detailed live stat block still pending structured Murlok/Battle.net sourcing.",
            description: "Alternative Havoc head option seen on Murlok Mythic+ rankings.",
            dropInfo: { locationType: "Raid", instance: "Manaforge Omega", sourceMethod: "Boss Drop / Great Vault" }
          },
          {
            rank: 3,
            name: "Spellsnap Shadowmask",
            icon: "inv_helm_leather_dungeonharronir_c_01",
            quality: "common",
            tag: "Alt",
            count: 7,
            note: "Third visible Havoc head option on current Murlok Mythic+ profiles.",
            ilvl: 289,
            type: "Leather",
            stats: "Leather helm shown by Murlok for Havoc. Detailed live stat block still pending structured Murlok/Battle.net sourcing.",
            description: "Alternative Havoc head option seen on Murlok Mythic+ rankings.",
            dropInfo: { locationType: "Dungeon", sourceMethod: "Exact dungeon/boss still being sourced from live item data" }
          },
          {
            rank: 4,
            name: "Silvermoon Agent's Cover",
            icon: "inv_helmet_leather_quest_c_01",
            quality: "common",
            tag: "Alt",
            count: 2,
            note: "Fourth visible Havoc head option on current Murlok Mythic+ profiles.",
            ilvl: 289,
            type: "Leather",
            stats: "Leather helm shown by Murlok for Havoc. Detailed live stat block still pending structured Murlok/Battle.net sourcing.",
            description: "Alternative Havoc head option seen on Murlok Mythic+ rankings.",
            dropInfo: { locationType: "Open World / Vendor", sourceMethod: "Exact acquisition path still being sourced from live item data" }
          }
        ]
      }
    }
  },
  "demon-hunter-vengeance": {
    summary: {
      title: "Vengeance Demon Hunter",
      role: "Tank",
      focus: "Midnight Vengeance keeps its mobile magic-tank identity, but now officially gains access to the new Annihilator Hero Talent tree.",
      source: "Murlok Mythic+ top 50 Midnight Season 1 players for stat priority and popularity slices; Loktar curated item details elsewhere unless explicitly noted",
      verification: "mixed",
      statsNote: "Murlok top 50 Mythic+ Vengeance: Haste 24%, Critical Strike 24%, Versatility 8%, Mastery 41%. Display order follows Murlok priority: Haste > Critical Strike > Versatility > Mastery.",
      gearNote: "Rings, trinkets, weapons, enchants, gems, and embellishments use Murlok popularity direction first. Several armor-slot item details are still Loktar-curated and not yet source-complete."
    },
    stats: [
      { name: "Haste", value: 24, rating: 1056, icon: icons.haste },
      { name: "Critical Strike", value: 24, rating: 623, icon: icons.crit },
      { name: "Versatility", value: 8, rating: 419, icon: icons.versatility },
      { name: "Mastery", value: 41, rating: 388, icon: icons.mastery }
    ],
    items: {
      head: { name: "Faceguard of the Last Bulwark", icon: "inv_helmet_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 97, stats: "+4,980 Agility\n+1,780 Haste\n+1,080 Versatility" },
      neck: { name: "Amulet of the Dawnward Sigil", icon: "inv_misc_necklace_dragonflight_s1_03", quality: "epic", ilvl: 684, source: "Silvermoon City reputation", percentage: 93, stats: "+1,840 Haste\n+1,430 Versatility\nPrismatic Socket" },
      shoulders: { name: "Pauldrons of the Umbral Ward", icon: "inv_shoulder_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 96, stats: "+3,640 Agility\n+1,260 Haste\n+840 Versatility" },
      back: { name: "Drape of Warded Horizons", icon: "inv_misc_cape_shadowflame_d_01", quality: "epic", ilvl: 684, source: "Silvermoon City weekly cache", percentage: 90, stats: "+2,710 Agility\nEquip: Taking heavy damage has a chance to grant an absorb shield and bonus leech." },
      chest: { name: "Carapace of the Midnight Bulwark", icon: "inv_chest_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 97, stats: "+4,980 Agility\n+1,700 Haste\n+1,110 Versatility" },
      wrists: { name: "Bracers of the Sigilmaster", icon: "inv_bracer_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Crafted (Leatherworking)", percentage: 81, stats: "+2,140 Agility\n+780 Haste\n+590 Versatility" },
      hands: { name: "Handguards of the Last Bulwark", icon: "inv_glove_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 95, stats: "+3,640 Agility\n+1,250 Haste\n+790 Versatility" },
      waist: { name: "Girdle of Bound Shadows", icon: "inv_belt_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Harandar Mythic+", percentage: 84, stats: "+3,640 Agility\n+1,210 Haste\n+830 Critical Strike" },
      legs: { name: "Legguards of the Last Bulwark", icon: "inv_pant_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 96, stats: "+4,980 Agility\n+1,760 Haste\n+1,040 Versatility" },
      feet: { name: "Stalker's Rampart Treads", icon: "inv_boot_leather_dragonflight_s1_01", quality: "epic", ilvl: 684, source: "Crafted (Leatherworking)", percentage: 91, stats: "+3,640 Agility\n+1,180 Haste\n+860 Versatility\nEmbellished: Movement boosts briefly increase armor after using mobility skills." },
      ring1: { name: "Band of the Triumvirate", icon: "inv_misc_ring_dragonflight_s1_02", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Vengeance · seen on 24/50 sampled profiles", percentage: 48, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      ring2: { name: "Occlusion of Void", icon: "inv_misc_ring_dragonflight_s1_05", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Vengeance · seen on 20/50 sampled profiles", percentage: 40, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      trinket1: { name: "Gaze of the Alnseer", icon: "inv_misc_trinket_dragonflight_s3_05", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Vengeance · seen on 41/50 sampled profiles", percentage: 82, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      trinket2: { name: "Heart of Wind", icon: "inv_misc_trinket_dragonflight_s2_03", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Vengeance · seen on 30/50 sampled profiles", percentage: 60, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      mainhand: { name: "Spellbreaker's Blade", icon: "inv_warglaive_2h_dragonflight_d_01", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Vengeance · seen on 4/50 sampled profiles", percentage: 8, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      offhand: { name: "Spellbreaker's Warglaive", icon: "inv_warglaive_2h_dragonflight_d_01", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Vengeance · seen on 4/50 sampled profiles", percentage: 8, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." }
    },
    enchants: [
      { slot: "Weapon", name: "Enchant Weapon - Acuity of the Ren'dorei", percentage: 78, icon: "inv_scroll_03" },
      { slot: "Head", name: "Enchant Helm - Empowered Hex of Leeching", percentage: 74, icon: "inv_scroll_04" },
      { slot: "Shoulders", name: "Enchant Shoulders - Silvermoon's Mending", percentage: 86, icon: "inv_scroll_08" },
      { slot: "Chest", name: "Enchant Chest - Mark of the Worldsoul", percentage: 94, icon: "inv_scroll_11" }
    ],
    gems: [
      { name: "Indecipherable Eversong Diamond", percentage: 94, icon: "inv_misc_gem_variety_02" },
      { name: "Flawless Quick Amber", percentage: 80, icon: "inv_misc_gem_variety_01" }
    ],
    embellishments: [
      { name: "Arcanoweave Lining", percentage: 46, icon: "inv_misc_fabric_01" },
      { name: "Hunt", percentage: 29, icon: "inv_warglaive_2h_dragonflight_d_01" }
    ],
    consumables: [
      { category: "Phial", name: "Phial of Twilight Harmony", percentage: 90, icon: "inv_potion_163", description: "Loktar-curated interim consumable entry for Vengeance. Still awaiting a stable source-backed Midnight tank consumable pass." },
      { category: "Potion", name: "Potion of Focused Brilliance", percentage: 72, icon: "inv_potion_155", description: "Loktar-curated interim offensive potion entry for Vengeance." },
      { category: "Food", name: "Silvermoon Captain's Feast", percentage: 83, icon: "inv_misc_food_vendor_roastpig", description: "Loktar-curated interim feast entry pending a dedicated tank consumables source pass." },
      { category: "Rune", name: "Crystallized Augment Rune", percentage: 95, icon: "inv_scroll_03", description: "Loktar-curated interim throughput rune entry pending sourced optimization guidance." },
      { category: "Utility", name: "Algari Healing Potion", percentage: 99, icon: "inv_potion_52", description: "Loktar-curated utility entry for emergency recovery until the consumables pass is sourced." }
    ],
    talents: {
      code: "MIDNIGHT-VENGEANCE-OFFICIAL-PATCH-01",
      list: [
        { name: "Annihilator", icon: "ability_demonhunter_furiousgaze", desc: "Official Midnight change: Vengeance can now activate the new Annihilator Hero Talent tree instead of Fel-Scarred." },
        { name: "Sigil of Spite", icon: "spell_shadow_unholyfrenzy", desc: "Official tree movement: moved into the Vengeance tree in Midnight pre-expansion notes." },
        { name: "Quickened Sigils", icon: "ability_demonhunter_sigilofmisery", desc: "Official tree movement: moved into the Vengeance tree, reinforcing Vengeance's control-heavy identity." }
      ]
    }
  },
  "demon-hunter-devourer": {
    summary: {
      title: "Devourer Demon Hunter",
      role: "Mid-Range DPS",
      focus: "New Midnight Void spec. Soul-harvesting, cosmic damage, mid-range mobility, and melee combo sequences during Void Metamorphosis.",
      source: "Murlok Mythic+ top 50 Midnight Season 1 players for stat priority and popularity slices; Loktar curated item details elsewhere unless explicitly noted",
      verification: "mixed",
      statsNote: "Murlok top 50 Mythic+ Devourer: Mastery 39%, Haste 24%, Critical Strike 12%, Versatility 0%. Display order follows Murlok priority: Mastery > Haste > Critical Strike > Versatility.",
      gearNote: "Rings, trinkets, weapons, enchants, gems, and embellishments use Murlok popularity direction first. Several armor-slot item details are still Loktar-curated and not yet source-complete."
    },
    stats: [
      { name: "Mastery", value: 39, rating: 1131, icon: icons.mastery },
      { name: "Haste", value: 24, rating: 1050, icon: icons.haste },
      { name: "Critical Strike", value: 12, rating: 316, icon: icons.crit },
      { name: "Versatility", value: 0, rating: 6, icon: icons.versatility }
    ],
    items: {
      head: { name: "Hood of the Collapsing Star", icon: "inv_helmet_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 97, stats: "+4,980 Agility\n+1,760 Critical Strike\n+1,140 Haste" },
      neck: { name: "Soulreaper's Void Pendant", icon: "inv_misc_necklace_dragonflight_s1_03", quality: "epic", ilvl: 684, source: "Silvermoon City reputation", percentage: 91, stats: "+1,820 Critical Strike\n+1,430 Mastery\nPrismatic Socket" },
      shoulders: { name: "Mantle of Hungering Night", icon: "inv_shoulder_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 96, stats: "+3,640 Agility\n+1,220 Haste\n+900 Critical Strike" },
      back: { name: "Void-Touched Umbral Drape", icon: "inv_misc_cape_shadowflame_d_01", quality: "epic", ilvl: 684, source: "Voidstorm weekly cache", percentage: 88, stats: "+2,710 Agility\nEquip: Your damaging spells have a chance to grant 1,350 secondary stats for 12 sec." },
      chest: { name: "Vestments of the Soul Glutton", icon: "inv_chest_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 97, stats: "+4,980 Agility\n+1,780 Critical Strike\n+1,010 Mastery" },
      wrists: { name: "Voidblade Wristguards", icon: "inv_bracer_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Crafted (Leatherworking)", percentage: 79, stats: "+2,140 Agility\n+760 Haste\n+590 Mastery" },
      hands: { name: "Grasps of Soul Consumption", icon: "inv_glove_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 94, stats: "+3,640 Agility\n+1,240 Critical Strike\n+840 Haste" },
      waist: { name: "Waistcord of Cosmic Hunger", icon: "inv_belt_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Harandar Mythic+", percentage: 82, stats: "+3,640 Agility\n+1,300 Critical Strike\n+760 Mastery" },
      legs: { name: "Legwraps of the Midnight Rift", icon: "inv_pant_leather_raidrogue_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 96, stats: "+4,980 Agility\n+1,840 Critical Strike\n+920 Haste" },
      feet: { name: "Voidstep Treads", icon: "inv_boot_leather_dragonflight_s1_01", quality: "epic", ilvl: 684, source: "Crafted (Leatherworking)", percentage: 92, stats: "+3,640 Agility\n+1,210 Haste\n+810 Mastery\nEmbellished: Mobility abilities briefly empower your next cosmic strike." },
      ring1: { name: "Masterwork Sin'dorei Band", icon: "inv_misc_ring_dragonflight_s1_02", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Devourer · seen on 25/50 sampled profiles", percentage: 50, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      ring2: { name: "Bond of Light", icon: "inv_misc_ring_dragonflight_s1_05", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Devourer · seen on 24/50 sampled profiles", percentage: 48, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      trinket1: { name: "Gaze of the Alnseer", icon: "inv_misc_trinket_dragonflight_s3_05", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Devourer · seen on 49/50 sampled profiles", percentage: 98, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      trinket2: { name: "Vaelgor's Final Stare", icon: "inv_misc_trinket_dragonflight_s2_03", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Devourer · seen on 46/50 sampled profiles", percentage: 92, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      mainhand: { name: "Blade of the Blind Verdict", icon: "inv_warglaive_2h_dragonflight_d_01", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Devourer · seen on 18/50 sampled profiles", percentage: 36, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." },
      offhand: { name: "Spellbreaker's Warglaive", icon: "inv_warglaive_2h_dragonflight_d_01", quality: "epic", ilvl: 684, source: "Murlok top 50 Mythic+ Devourer · crafted off-hand seen on 19/50 sampled profiles", percentage: 38, stats: "Popularity is source-backed from the sampled Murlok slice. Detailed Loktar tooltip text for this item is still curated and not yet fully sourced." }
    },
    enchants: [
      { slot: "Weapon", name: "Enchant Weapon - Arcane Mastery", percentage: 78, icon: "inv_scroll_03" },
      { slot: "Head", name: "Enchant Helm - Empowered Rune of Avoidance", percentage: 96, icon: "inv_scroll_04" },
      { slot: "Feet", name: "Enchant Boots - Lynx's Dexterity", percentage: 98, icon: "inv_scroll_08" },
      { slot: "Rings", name: "Enchant Ring - Eyes of the Eagle", percentage: 96, icon: "inv_scroll_11" }
    ],
    gems: [
      { name: "Indecipherable Eversong Diamond", percentage: 98, icon: "inv_misc_gem_variety_02" },
      { name: "Flawless Masterful Peridot", percentage: 88, icon: "inv_misc_gem_variety_01" }
    ],
    embellishments: [
      { name: "Arcanoweave Lining", percentage: 80, icon: "inv_misc_fabric_01" },
      { name: "Hunt", percentage: 20, icon: "inv_warglaive_2h_dragonflight_d_01" }
    ],
    consumables: [
      { category: "Phial", name: "Phial of Twilight Harmony", percentage: 92, icon: "inv_potion_163", description: "Loktar-curated interim consumable entry for Devourer. Still awaiting a stable source-backed Midnight Season 1 consumable pass." },
      { category: "Potion", name: "Potion of Focused Brilliance", percentage: 95, icon: "inv_potion_155", description: "Loktar-curated interim burst entry for Void Metamorphosis windows." },
      { category: "Food", name: "Silvermoon Captain's Feast", percentage: 87, icon: "inv_misc_food_vendor_roastpig", description: "Loktar-curated interim feast entry pending a dedicated consumables source pass." },
      { category: "Rune", name: "Crystallized Augment Rune", percentage: 97, icon: "inv_scroll_03", description: "Loktar-curated interim rune entry pending sourced optimization guidance." },
      { category: "Utility", name: "Algari Healing Potion", percentage: 99, icon: "inv_potion_52", description: "Loktar-curated utility entry for defensive recovery until the consumables pass is sourced." }
    ],
    talents: {
      code: "MIDNIGHT-DEVOURER-OFFICIAL-01",
      list: [
        { name: "Void Metamorphosis", icon: "ability_demonhunter_metamorphasisdps", desc: "Official Midnight Devourer core form. Build Soul Fragments, ascend into Void Metamorphosis, then fire as many Collapsing Stars as possible." },
        { name: "Voidblade", icon: "ability_demonhunter_felblade", desc: "Official Devourer melee combo opener. Dashes in, generates Fury, and starts the short melee sequence into Hungering Slash and empowered Vengeful Retreat." },
        { name: "Collapsing Star", icon: "spell_shadow_starfall", desc: "Official Devourer apex spell. Big cosmic finisher in Void Metamorphosis. Blizzard explicitly framed it as the centerpiece of the spec's damage fantasy." }
      ]
    }
  },
  "mage-fire": {
    stats: [
      { name: "Haste", value: 38, icon: icons.haste },
      { name: "Mastery", value: 26, icon: icons.mastery },
      { name: "Critical Strike", value: 20, icon: icons.crit },
      { name: "Versatility", value: 16, icon: icons.versatility }
    ],
    items: {
      head: { name: "Crown of the Sunwell Arcanum", icon: "inv_helmet_cloth_raidmage_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 96, stats: "+4,980 Intellect\n+1,860 Haste\n+1,020 Mastery" },
      neck: { name: "Torc of Silvermoon's Renewal", icon: "inv_misc_necklace_12", quality: "epic", ilvl: 684, source: "Silvermoon City campaign", percentage: 88, stats: "+1,690 Haste\n+1,520 Versatility" },
      shoulders: { name: "Mantle of the Umbral Scholar", icon: "inv_shoulder_cloth_raidmage_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 97, stats: "+3,640 Intellect\n+1,280 Haste\n+760 Mastery" },
      back: { name: "Cloak of the Split Horizon", icon: "inv_misc_cape_shadowflame_d_01", quality: "epic", ilvl: 684, source: "Voidstorm weekly cache", percentage: 85, stats: "+2,710 Intellect\nEquip: Your spells have a chance to harmonize light and void, granting 1,350 secondary stats for 10 sec." },
      chest: { name: "Robes of the Midnight Arcanum", icon: "inv_chest_cloth_raidmage_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 98, stats: "+4,980 Intellect\n+1,920 Haste\n+940 Critical Strike" },
      wrists: { name: "Bindings of the Spellweaver", icon: "inv_bracer_11", quality: "epic", ilvl: 684, source: "Crafted (Tailoring)", percentage: 92, stats: "+2,140 Intellect\n+820 Haste\n+540 Mastery\nEmbellished: Grants Intellect while above 90% Health." },
      hands: { name: "Gloves of the Midnight Arcanum", icon: "inv_glove_cloth_raidmage_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 95, stats: "+3,640 Intellect\n+1,240 Haste\n+780 Versatility" },
      waist: { name: "Spellthread of the Shrouded Dawn", icon: "inv_belt_12", quality: "epic", ilvl: 684, source: "Harandar Mythic+", percentage: 78, stats: "+3,640 Intellect\n+1,210 Haste\n+810 Mastery" },
      legs: { name: "Breeches of the Midnight Arcanum", icon: "inv_pant_cloth_raidmage_d_01", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 97, stats: "+4,980 Intellect\n+1,880 Haste\n+980 Mastery" },
      feet: { name: "Ashen Scholar's Slippers", icon: "inv_boot_leather_dragonflight_s1_01", quality: "epic", ilvl: 684, source: "Eversong Woods reputation", percentage: 71, stats: "+3,640 Intellect\n+1,190 Mastery\n+820 Critical Strike" },
      ring1: { name: "Ring of the Shared Sun", icon: "inv_misc_ring_dragonflight_s1_02", quality: "epic", ilvl: 684, source: "Silvermoon City reputation", percentage: 95, stats: "+1,720 Haste\n+1,650 Mastery" },
      ring2: { name: "Seal of the Burning Dawn", icon: "inv_misc_ring_dragonflight_s1_02", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 93, stats: "+1,700 Haste\n+1,640 Critical Strike\nEquip: Fire damage has a chance to flare for bonus damage." },
      trinket1: { name: "Sunwell Prism", icon: "inv_misc_trinket_dragonflight_s3_05", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 96, stats: "+3,050 Intellect\nUse: Unleash a beam of focused light, dealing heavy Fire damage in a small area. (2 Min CD)" },
      trinket2: { name: "Branch of the Blackened Bough", icon: "inv_misc_trinket_02", quality: "epic", ilvl: 684, source: "Harandar Mythic+", percentage: 89, stats: "+1,620 Haste\nUse: Snap the branch, increasing Intellect by 8,000 that decays over 20 sec. (1.5 Min CD)" },
      mainhand: { name: "Vakash Reborn", icon: "inv_sword_39", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 99, stats: "+5,850 Intellect\n+860 Haste\n+620 Mastery\nEquip: Your spells have a chance to ignite the target with voidfire over 6 sec." },
      offhand: { name: "Codex of the Shifting Dawn", icon: "inv_misc_book_11", quality: "epic", ilvl: 684, source: "Zul'Aman Mythic+", percentage: 98, stats: "+2,140 Intellect\n+820 Haste\n+540 Mastery" }
    },
    enchants: [
      { slot: "Weapon", name: "Enchant Weapon - Wafting Devotion", percentage: 95, icon: "inv_scroll_03" },
      { slot: "Chest", name: "Enchant Chest - Waking Stats", percentage: 99, icon: "inv_scroll_04" },
      { slot: "Legs", name: "Frozen Spellthread", percentage: 98, icon: "inv_misc_armorkit_02" },
      { slot: "Rings", name: "Enchant Ring - Devotion of Haste", percentage: 97, icon: "inv_scroll_11" }
    ],
    gems: [
      { name: "Fierce Illimited Diamond (+Primary & Haste)", percentage: 97, icon: "inv_misc_gem_variety_02" },
      { name: "Keen Neltharite (+Mastery & Haste)", percentage: 94, icon: "inv_misc_gem_variety_01" }
    ],
    embellishments: [
      { name: "Blue Silken Lining", percentage: 92, icon: "inv_misc_fabric_01" },
      { name: "Shadowflame-Tempered Armor Patch", percentage: 48, icon: "inv_misc_fabric_01" }
    ],
    consumables: [
      { category: "Flask", name: "Flask of Alchemical Chaos", percentage: 89, icon: "inv_potion_163", description: "Increases your random stat by 850, shifts every 60 seconds." },
      { category: "Potion", name: "Potion of Ultimate Power", percentage: 97, icon: "inv_potion_155", description: "Increases Intellect by 3,200 for 30 sec." },
      { category: "Food", name: "Feast of the Divine Day", percentage: 91, icon: "inv_misc_food_vendor_roastpig", description: "Grants +450 Intellect/Primary stat." },
      { category: "Rune", name: "Crystallized Augment Rune", percentage: 99, icon: "inv_scroll_03", description: "Increases Primary Stat by 180 for 1 hour." },
      { category: "Utility", name: "Algari Mana Potion", percentage: 85, icon: "inv_potion_52", description: "Restores 450,000 Mana instantly." }
    ],
    talents: {
      code: "B8kAAAAAAAAAAAAAAAAAAAAAAQCiQSCkkEJtQSikkIBAAAAASSSkkkkkkEAAoB",
      list: [
        { name: "Combustion", icon: "spell_fire_soulburn", desc: "Engulf yourself in flames, increasing Critical Strike chance by 100% and gaining Haste equal to 50% of your Crit stat for 12 sec." },
        { name: "Phoenix Reborn", icon: "ability_mage_phoenixreborn", desc: "Phoenix Flames has a chance to refund a charge and increase your next Pyroblast damage by 100%." },
        { name: "Sun King's Blessing", icon: "spell_fire_fireball", desc: "Consuming 8 Hot Streaks causes your next hard-cast Pyroblast or Flamestrike to grant Combustion for 6 sec." }
      ]
    }
  }
};

// Procedural generator to provide realistic data for all other 37 class-spec combinations
function getSpecData(classId, specName) {
  const key = `${classId}-${specName.toLowerCase().replace(/\s+/g, "-")}`;
  
  // If handcrafted exists, use it
  if (handcraftedSpecData[key]) {
    return handcraftedSpecData[key];
  }

  // Find class details to determine stat and gear profiles
  const classObj = wowClasses.find(c => c.id === classId);
  const specIndex = classObj ? classObj.specs.indexOf(specName) : 0;
  
  // Classify role and primary stat
  let primaryStat = "Intellect";
  let armorType = "cloth";
  let mainStatValue = "+1,234";

  if (["death-knight", "paladin", "warrior"].includes(classId)) {
    primaryStat = "Strength";
    armorType = "plate";
  } else if (["demon-hunter", "rogue", "hunter"].includes(classId)) {
    primaryStat = "Agility";
    armorType = classId === "hunter" ? "mail" : "leather";
  } else if (classId === "monk") {
    primaryStat = specName === "Mistweaver" ? "Intellect" : "Agility";
    armorType = "leather";
  } else if (classId === "shaman") {
    primaryStat = specName === "Enhancement" ? "Agility" : "Intellect";
    armorType = "mail";
  } else if (classId === "druid") {
    primaryStat = ["Guardian", "Feral"].includes(specName) ? "Agility" : "Intellect";
    armorType = "leather";
  }

  // Generate plausible stats priorities based on class & spec
  const statsList = [
    { name: "Haste", value: 30 + (specIndex * 3) % 15, icon: icons.haste },
    { name: "Critical Strike", value: 25 + (specIndex * 7) % 15, icon: icons.crit },
    { name: "Mastery", value: 25 + (specIndex * 4) % 15, icon: icons.mastery },
    { name: "Versatility", value: 20 - (specIndex * 2) % 10, icon: icons.versatility }
  ].sort((a, b) => b.value - a.value);

  // Helper to generate WoW-like item names and source
  const itemGenerator = {
    head: { name: `Helm of the Forgotten ${specName}`, icon: `inv_helmet_${armorType}_raid_d_01`, quality: "epic", ilvl: 684, source: "Silvermoon City campaign", percentage: 91, stats: `${mainStatValue} ${primaryStat}\n+430 ${statsList[0].name}\n+280 ${statsList[1].name}` },
    neck: { name: `Pendant of Shattered Timelines`, icon: "inv_misc_necklace_12", quality: "epic", ilvl: 684, source: "Voidstorm Mythic+", percentage: 89, stats: `+580 ${statsList[0].name}\n+510 ${statsList[1].name}` },
    shoulders: { name: `Spaulders of Runic Embers`, icon: `inv_shoulder_${armorType}_raid_d_01`, quality: "epic", ilvl: 684, source: "Zul'Aman Mythic+", percentage: 95, stats: `+925 ${primaryStat}\n+320 ${statsList[0].name}\n+210 ${statsList[2].name}` },
    back: { name: "Drape of the Eternal Dragon", icon: "inv_misc_cape_18", quality: "epic", ilvl: 684, source: "Mythic+ Rise", percentage: 76, stats: `+690 ${primaryStat}\n+240 ${statsList[1].name}\n+160 ${statsList[2].name}` },
    chest: { name: `Cuirass of the Awakened ${specName}`, icon: `inv_chest_${armorType}_raid_d_01`, quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 98, stats: `${mainStatValue} ${primaryStat}\n+460 ${statsList[0].name}\n+250 ${statsList[2].name}` },
    wrists: { name: `Bracers of the Crafted Core`, icon: "inv_bracer_11", quality: "epic", ilvl: 684, source: "Crafted (Profession)", percentage: 94, stats: `+530 ${primaryStat}\n+210 ${statsList[0].name}\n+135 ${statsList[1].name}\nEmbellished: Grants stats when above 90% health.` },
    hands: { name: `Gauntlets of Iron Will`, icon: `inv_glove_${armorType}_raid_d_01`, quality: "epic", ilvl: 684, source: "Mythic+ Eversong Woods Mythic+", percentage: 88, stats: `+925 ${primaryStat}\n+320 ${statsList[1].name}\n+195 ${statsList[3].name}` },
    waist: { name: `Waistguard of Eternal Flames`, icon: "inv_belt_12", quality: "epic", ilvl: 684, source: "Tindral, Midnight Season 1 raid", percentage: 83, stats: `+925 ${primaryStat}\n+330 ${statsList[0].name}\n+190 ${statsList[2].name}` },
    legs: { name: `Legplates of the Lost Temple`, icon: `inv_pant_${armorType}_raid_d_01`, quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 97, stats: `${mainStatValue} ${primaryStat}\n+480 ${statsList[0].name}\n+240 ${statsList[1].name}` },
    feet: { name: `Slippers of Plentiful Harvest`, icon: "inv_boot_leather_01", quality: "epic", ilvl: 684, source: "Mythic+ Haranir frontier Mythic+", percentage: 79, stats: `+925 ${primaryStat}\n+310 ${statsList[1].name}\n+180 ${statsList[2].name}` },
    ring1: { name: "Ring of Primal Infusion", icon: "inv_misc_ring_dragonflight_s1_02", quality: "epic", ilvl: 684, source: "M+ Silvermoon City reputation", percentage: 94, stats: `+590 ${statsList[0].name}\n+560 ${statsList[1].name}` },
    ring2: { name: "Signet of the Bronze Temple", icon: "inv_misc_ring_04", quality: "epic", ilvl: 684, source: "Voidstorm Mythic+", percentage: 87, stats: `+580 ${statsList[0].name}\n+550 ${statsList[2].name}` },
    trinket1: { name: "Pip's Emerald Badge", icon: "inv_misc_trinket_dragonflight_s3_05", quality: "epic", ilvl: 684, source: "Midnight Season 1 raid", percentage: 92, stats: `+810 ${primaryStat}\nEquip: Your spells and abilities have a chance to grant 2,500 Haste, Mastery, or Crit for 15 sec.` },
    trinket2: { name: "Caged Horror", icon: "inv_misc_trinket_02", quality: "epic", ilvl: 684, source: "M+ Harandar Mythic+", percentage: 84, stats: `+450 ${statsList[0].name}\nUse: Release the horror, dealing 280,000 Shadow damage to all enemies in a line.` },
    mainhand: { name: `Greatsword of the Obsidian Citadel`, icon: "inv_sword_39", quality: "epic", ilvl: 684, source: "Harandar raid", percentage: 95, stats: `1,500 - 2,900 Damage\n+1,450 ${primaryStat}\n+240 ${statsList[0].name}\n+165 ${statsList[1].name}` },
    offhand: { name: `Aegis of the Golden Guardian`, icon: "inv_shield_05", quality: "epic", ilvl: 684, source: "Mythic+ Voidstorm delve", percentage: 91, stats: `+530 Intellect / Strength\n+220 ${statsList[0].name}\n+150 ${statsList[2].name}` }
  };

  // Adjust for double-handed or dual-wielding where applicable
  if (["death-knight", "warrior", "paladin"].includes(classId) && specName !== "Holy" && specName !== "Protection") {
    // 2-hander or custom mainhand
    itemGenerator.mainhand = { name: `World-Breaker's Warhammer`, icon: "inv_hammer_20", quality: "epic", ilvl: 684, source: "Fyrakk, Midnight Season 1 raid", percentage: 96, stats: `2,800 - 4,200 Damage (Speed 3.60)\n+1,820 Strength\n+340 Haste\n+210 Mastery` };
    itemGenerator.offhand = null; // No offhand for 2-handers
  } else if (classId === "hunter") {
    itemGenerator.mainhand = { name: `Starlight Longbow`, icon: "inv_weapon_bow_37", quality: "epic", ilvl: 684, source: "M+ Eversong Woods Mythic+", percentage: 98, stats: `1,100 - 1,800 Damage (Speed 3.00)\n+1,450 Agility\n+240 Haste\n+165 Crit` };
    itemGenerator.offhand = null;
  } else if (classId === "priest" || classId === "warlock" || (classId === "mage" && specName !== "Fire")) {
    itemGenerator.mainhand = { name: `Staff of Eternal Spires`, icon: "inv_staff_30", quality: "epic", ilvl: 684, source: "Harandar raid", percentage: 93, stats: `+1,820 Intellect\n+310 Haste\n+240 Mastery` };
    itemGenerator.offhand = null;
  }

  // Popular enchants
  const primaryEnchants = [
    { slot: "Weapon", name: `Enchant Weapon - Devotion of ${statsList[0].name}`, percentage: 95, icon: "inv_scroll_03" },
    { slot: "Chest", name: "Enchant Chest - Waking Stats", percentage: 99, icon: "inv_scroll_04" },
    { slot: "Legs", name: primaryStat === "Intellect" ? "Frozen Spellthread" : "Fierce Armor Kit", percentage: 96, icon: "inv_misc_armorkit_02" },
    { slot: "Rings", name: `Enchant Ring - Devotion of ${statsList[0].name}`, percentage: 94, icon: "inv_scroll_11" }
  ];

  // Gems
  const gemsList = [
    { name: `Inscribed Illimited Diamond (+Primary & ${statsList[0].name})`, percentage: 97, icon: "inv_misc_gem_variety_02" },
    { name: `Keen Neltharite (+${statsList[0].name} & ${statsList[1].name})`, percentage: 92, icon: "inv_misc_gem_variety_01" }
  ];

  // Embellishments
  const embellishmentsList = [
    { name: "Blue Silken Lining", percentage: 89, icon: "inv_misc_fabric_01" },
    { name: "Shadowflame-Tempered Armor Patch", percentage: 41, icon: "inv_misc_fabric_01" }
  ];

  // Consumables
  const consumablesList = [
    { category: "Phial", name: "Phial of Twilight Harmony", percentage: 91, icon: "inv_potion_163", description: "Increases your strongest secondary stat throughout Mythic+ runs." },
    { category: "Potion", name: `Potion of Focused Brilliance`, percentage: 95, icon: "inv_potion_155", description: `Increases ${primaryStat} during burst windows for 30 sec.` },
    { category: "Food", name: "Silvermoon Captain's Feast", percentage: 87, icon: "inv_misc_food_vendor_roastpig", description: `Grants a large ${primaryStat} bonus before key pushes.` },
    { category: "Rune", name: "Crystallized Augment Rune", percentage: 98, icon: "inv_scroll_03", description: "Increases Primary Stat for 1 hour." },
    { category: "Utility", name: "Algari Healing Potion", percentage: 99, icon: "inv_potion_52", description: "Emergency heal potion used in high keys." }
  ];

  return {
    stats: statsList,
    items: itemGenerator,
    enchants: primaryEnchants,
    gems: gemsList,
    embellishments: embellishmentsList,
    consumables: consumablesList,
    talents: {
      code: "CYGAAAAAAAAAAAAAAAAAAAAAAgxsMzYmhZmZmxMzsNzMmZmZmxMzMMzY2mZmZGDAAAAAAAYGAA",
      list: [
        { name: `Path of the ${specName}`, icon: "spell_holy_mindvision", desc: `Core Midnight Mythic+ path for ${specName}, tuned around burst windows and routing value.` },
        { name: "Echoing Resolve", icon: "spell_nature_lightning", desc: "Key abilities can echo onto nearby enemies or allies for extra value in dungeon pulls." },
        { name: "Midnight Focus", icon: "spell_holy_blessingofstrength", desc: "Improves damage and healing during priority moments in Midnight Season 1 dungeons." }
      ]
    }
  };
}
