// public/js/render/gear.js
// Renders the 16-slot paper doll against aggregated_bis.json.

import { SLOT_LAYOUT } from "../registry.js";

function wowheadIcon(icon) {
  if (!icon) return "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
  // If icon is a string (Wowhead texture name like "inv_helm_leather_d_01"), use it.
  if (typeof icon === "string") {
    return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
  }
  // If icon is a number (Blizzard media id), fall back to questionmark.
  return "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
}

const SLOT_LABELS = {
  head: "Head", neck: "Neck", shoulders: "Shoulder", back: "Back",
  chest: "Chest", wrists: "Wrist", hands: "Hands", waist: "Waist",
  legs: "Legs", feet: "Feet",
  finger1: "Ring 1", finger2: "Ring 2",
  trinket1: "Trinket 1", trinket2: "Trinket 2",
  mainhand: "Main Hand", offhand: "Off Hand"
};

const QUALITY_CLASS = {
  poor: "quality-poor", common: "quality-common", uncommon: "quality-uncommon",
  rare: "quality-rare", epic: "quality-epic", legendary: "quality-legendary"
};

function buildSlotEl(slot, entry) {
  const wrap = document.createElement("div");
  wrap.className = "equip-slot";
  wrap.dataset.slot = slot;

  if (!entry || entry.item_id == null) {
    const ph = document.createElement("span");
    ph.className = "slot-placeholder";
    ph.textContent = SLOT_LABELS[slot] || slot;
    wrap.appendChild(ph);
    return wrap;
  }

  // Quality border
  const qClass = QUALITY_CLASS[entry.quality] || "quality-epic";
  wrap.classList.add(qClass);

  // Icon image
  const img = document.createElement("img");
  img.src = wowheadIcon(entry.icon);
  img.alt = entry.name || SLOT_LABELS[slot] || slot;
  img.loading = "lazy";
  img.onerror = () => { img.src = "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg"; };
  wrap.appendChild(img);

  // Wowhead tooltip data attribute
  if (entry.item_id) {
    wrap.dataset.wowhead = `item=${entry.item_id}&domain=europe`;
  }

  // Percentage tag
  if (typeof entry.percent === "number") {
    const tag = document.createElement("div");
    tag.className = "slot-percent";
    tag.textContent = `${Math.round(entry.percent * 100)}%`;
    wrap.appendChild(tag);
  }

  // Custom hover tooltip (shows full item info beyond what Wowhead gives)
  wrap.addEventListener("mouseenter", (e) => showItemTooltip(e, entry, slot));
  wrap.addEventListener("mousemove", positionTooltip);
  wrap.addEventListener("mouseleave", hideTooltip);

  return wrap;
}

function showItemTooltip(e, entry, slot) {
  const tt = document.getElementById("metagor-item-tooltip");
  if (!tt) return;
  const lines = [];
  lines.push(`<div class="tooltip-title ${QUALITY_CLASS[entry.quality] || "quality-epic"}">${entry.name || "Unknown"}</div>`);
  if (entry.ilvl) lines.push(`<div class="tooltip-ilvl">Item Level ${entry.ilvl}</div>`);
  lines.push(`<div class="tooltip-slot-type"><span>${SLOT_LABELS[slot] || slot}</span>${entry.item_subclass ? `<span>${entry.item_subclass}</span>` : ""}</div>`);
  // Stats
  if (entry.stats && entry.stats.length) {
    const statsHtml = entry.stats.map(s => {
      const cls = s.is_equip_bonus ? "tooltip-stat-bonus" : "tooltip-stat-base";
      return `<div class="${cls}">${s.display || `${s.name} +${s.value}`}</div>`;
    }).join("");
    lines.push(`<div class="tooltip-stats">${statsHtml}</div>`);
  }
  // Set info
  if (entry.set_name) {
    lines.push(`<div class="tooltip-set">${entry.set_name}</div>`);
    if (entry.set_effects) {
      for (const eff of entry.set_effects) lines.push(`<div class="tooltip-set-effect">${eff}</div>`);
    }
  }
  // Enchants
  if (entry.enchantments && entry.enchantments.length) {
    for (const en of entry.enchantments) {
      if (en.display) lines.push(`<div class="tooltip-enchant">${en.display}</div>`);
    }
  }
  // Source (Mythic+ · Dungeon, Crafted, Raid (Mythic), Catalyst, etc.)
  if (entry.source) {
    lines.push(`<div class="tooltip-source-tag">${entry.source}</div>`);
  }
  if (entry.name_description && entry.name_description !== entry.source) {
    lines.push(`<div class="tooltip-source-detail">${entry.name_description}</div>`);
  }
  // Usage percentage
  if (typeof entry.percent === "number") {
    lines.push(`<div class="tooltip-usage">Used by ${Math.round(entry.percent * 100)}% of top 50 (${entry.count}/50)</div>`);
  }

  tt.innerHTML = lines.join("");
  tt.style.display = "block";
  positionTooltip(e);
}

function positionTooltip(e) {
  const tt = document.getElementById("metagor-item-tooltip");
  if (!tt || tt.style.display !== "block") return;
  const ttW = tt.offsetWidth, ttH = tt.offsetHeight;
  let x = e.pageX + 15, y = e.pageY + 15;
  if (x + ttW > window.innerWidth) x = e.pageX - ttW - 15;
  if (y + ttH > window.scrollY + window.innerHeight) y = e.pageY - ttH - 15;
  tt.style.left = `${x}px`;
  tt.style.top = `${y}px`;
}

function hideTooltip() {
  const tt = document.getElementById("metagor-item-tooltip");
  if (tt) tt.style.display = "none";
}

export function renderGear(spec, classId, gearHost, weaponHost) {
  const gear = spec.gear || {};
  // Left column: head, neck, shoulders, back, chest, wrists
  for (const slot of ["head", "neck", "shoulders", "back", "chest", "wrists"]) {
    gearHost.appendChild(buildSlotEl(slot, gear[slot]));
  }
  // Weapon row: mainhand, offhand
  for (const slot of ["mainhand", "offhand"]) {
    weaponHost.appendChild(buildSlotEl(slot, gear[slot]));
  }
}

// Exported separately so app.js can render the right column.
export function renderRightColumn(spec, host) {
  const gear = spec.gear || {};
  for (const slot of ["hands", "waist", "legs", "feet", "finger1", "finger2", "trinket1", "trinket2"]) {
    host.appendChild(buildSlotEl(slot, gear[slot]));
  }
}