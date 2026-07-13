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

// --- Weapon type detection ---
// Returns one of: "2H", "1H", "Shield", "Holder", or null
// Uses the item's inventory_type from Blizzard's API, resolved once per item
// during aggregation and stored on the gear entry. This is a property of the
// item itself, not the spec — a 2H sword is 2H regardless of who equips it.
function detectWeaponType(item) {
  if (!item) return null;
  // Check inventory_type first (most reliable — from Blizzard item API)
  const invType = item.inventory_type;
  if (invType) {
    if (invType === "TWOHWEAPON") return "2H";
    if (invType === "SHIELD") return "Shield";
    if (invType === "HOLDABLE") return "Holder";
    if (invType === "WEAPON") return "1H";
  }
  // Fallback to subclass for items without inventory_type
  const sub = item.item_subclass;
  if (!sub) return null;
  if (sub === "Shield") return "Shield";
  if (sub === "Miscellaneous") return "Holder";
  if (["Bow", "Crossbow", "Gun", "Polearm", "Staff"].includes(sub)) return "2H";
  if (["Wand", "Warglaives"].includes(sub)) return "1H";
  return "1H";
}

function weaponTypeBadgeClass(type) {
  return {
    "2H": "wt-2h", "1H": "wt-1h",
    "Shield": "wt-shield", "Holder": "wt-holder"
  }[type] || "";
}

function weaponTypeLabel(type) {
  return type || "";
}

// Should the offhand slot be shown for this spec?
// Hide if the offhand is an edge case (count <= 3) unless it's a
// Miscellaneous holder (casters use these with 2H staffs) or a
// Shield with meaningful adoption (count > 3).
function shouldShowOffhand(offhand) {
  if (!offhand || offhand.item_id == null) return false;
  const sub = offhand.item_subclass;
  const count = offhand.count || 0;
  if (sub === "Miscellaneous") return true;
  if (sub === "Shield" && count > 3) return true;
  if (count <= 3) return false;
  return true;
}

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

  // Weapon type badge (top-right corner) for weapon slots
  if ((slot === "mainhand" || slot === "offhand")) {
    const wt = detectWeaponType(entry);
    if (wt) {
      const badge = document.createElement("div");
      badge.className = `weapon-type-badge ${weaponTypeBadgeClass(wt)}`;
      badge.textContent = weaponTypeLabel(wt);
      wrap.appendChild(badge);
    }
  }

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

  // Socketed gem overlay (bottom-left corner, like WoW's socket UI)
  if (entry.socket_gem && entry.socket_gem.item_id) {
    const gemWrap = document.createElement("div");
    gemWrap.className = "slot-gem-overlay";
    const gemImg = document.createElement("img");
    gemImg.src = wowheadIcon(entry.socket_gem.icon);
    gemImg.alt = entry.socket_gem.name || "gem";
    gemImg.loading = "lazy";
    gemImg.onerror = () => { gemImg.src = wowheadIcon(null); };
    gemWrap.appendChild(gemImg);
    if (entry.socket_gem.item_id) {
      gemWrap.dataset.wowhead = `item=${entry.socket_gem.item_id}&domain=europe`;
    }
    wrap.appendChild(gemWrap);
  }

  // Custom hover tooltip (shows full item info beyond what Wowhead gives)
  wrap.addEventListener("mouseenter", (e) => showItemTooltip(e, entry, slot));
  wrap.addEventListener("mousemove", positionTooltip);
  wrap.addEventListener("mouseleave", hideTooltip);

  // Click handler → open alternatives modal
  if (entry.alternatives && entry.alternatives.length > 1) {
    wrap.style.cursor = "pointer";
    wrap.addEventListener("click", () => openSlotModal(slot, entry));
  }

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
  // Enchants — strip Blizzard UI markup like |A:Professions-ChatIcon...|a
  if (entry.enchantments && entry.enchantments.length) {
    for (const en of entry.enchantments) {
      if (en.display) {
        const clean = en.display.replace(/\s*\|A:[^|]*\|a\s*/g, "").replace(/\s*\|c[^|]*\|r\s*/g, "").trim();
        lines.push(`<div class="tooltip-enchant">${clean}</div>`);
      }
    }
  }
  // Socketed gem
  if (entry.socket_gem && entry.socket_gem.name) {
    const gemLine = entry.socket_gem.stat_display
      ? `${entry.socket_gem.name} (${entry.socket_gem.stat_display})`
      : entry.socket_gem.name;
    lines.push(`<div class="tooltip-gem">\u25C6 ${gemLine}</div>`);
  }
  // Source (Mythic+ · Dungeon, Crafted, Raid (Mythic) · Raid Name, Catalyst, etc.)
  if (entry.source) {
    lines.push(`<div class="tooltip-source-tag">${entry.source}</div>`);
  }
  // Show boss name for both raid and M+ items
  if (entry.boss) {
    lines.push(`<div class="tooltip-dungeon">Drops from: ${entry.boss}</div>`);
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
  // Left column: head, neck, shoulders, back, chest, wrists, hands
  for (const slot of ["head", "neck", "shoulders", "back", "chest", "wrists", "hands"]) {
    gearHost.appendChild(buildSlotEl(slot, gear[slot]));
  }
  // Weapon row: always show Main Hand. Show Off Hand only if it's a genuine
  // setup (count > 3) or a caster holder (Miscellaneous). Edge-case offhands
  // (1-3 players out of 50 using 1H on a 2H spec) are hidden.
  weaponHost.appendChild(buildSlotEl("mainhand", gear.mainhand));
  if (shouldShowOffhand(gear.offhand)) {
    weaponHost.appendChild(buildSlotEl("offhand", gear.offhand));
  }
}

// Exported separately so app.js can render the right column.
export function renderRightColumn(spec, host) {
  const gear = spec.gear || {};
  for (const slot of ["waist", "legs", "feet", "finger1", "finger2", "trinket1", "trinket2"]) {
    host.appendChild(buildSlotEl(slot, gear[slot]));
  }
}

// --- Slot alternatives modal ---

function openSlotModal(slot, entry) {
  hideTooltip();
  const backdrop = document.getElementById("slot-modal-backdrop");
  const title = document.getElementById("slot-modal-title");
  const list = document.getElementById("slot-modal-list");
  if (!backdrop || !title || !list) return;

  title.textContent = `${SLOT_LABELS[slot] || slot} — Top ${entry.alternatives.length} Alternatives`;
  list.innerHTML = "";

  // For weapon slots, detect weapon type from inventory_type
  const isWeaponSlot = (slot === "mainhand" || slot === "offhand");

  // Filter out edge-case weapons that don't match the spec's dominant weapon type.
  // If the top mainhand is 2H (count > 5), filter out 1H weapons with count <= 2
  // from the alternatives — these are from players who couldn't equip 2H or had
  // stale profile data.
  let displayAlternatives = entry.alternatives;
  if (isWeaponSlot) {
    const topAlt = entry.alternatives[0];
    const topType = detectWeaponType(topAlt);
    if (topType === "2H" && (topAlt.count || 0) > 5) {
      displayAlternatives = entry.alternatives.filter(alt => {
        const altType = detectWeaponType(alt);
        if (altType === "1H" && (alt.count || 0) <= 2) return false;
        return true;
      });
    }
  }

  title.textContent = `${SLOT_LABELS[slot] || slot} — Top ${displayAlternatives.length} Alternatives`;
  list.innerHTML = "";

  displayAlternatives.forEach((alt, i) => {
    const row = document.createElement("div");
    row.className = "slot-choice-item";

    const rank = document.createElement("div");
    rank.className = "slot-choice-rank";
    rank.textContent = `#${i + 1}`;
    row.appendChild(rank);

    const icon = document.createElement("div");
    icon.className = "slot-choice-icon";
    const img = document.createElement("img");
    img.src = wowheadIcon(alt.icon);
    img.alt = alt.name || "Unknown";
    img.onerror = () => { img.src = wowheadIcon(null); };
    icon.appendChild(img);
    row.appendChild(icon);

    const info = document.createElement("div");
    info.className = "slot-choice-info";

    const name = document.createElement("div");
    name.className = "slot-choice-name-row";
    const nameText = document.createElement("span");
    nameText.className = `slot-choice-name ${QUALITY_CLASS[alt.quality] || "quality-epic"}`;
    nameText.textContent = alt.name || "Unknown";
    name.appendChild(nameText);

    // Weapon type badge for weapon slot alternatives
    if (isWeaponSlot) {
      const wt = detectWeaponType(alt);
      if (wt) {
        const wtBadge = document.createElement("span");
        wtBadge.className = `weapon-type-badge ${weaponTypeBadgeClass(wt)}`;
        wtBadge.textContent = weaponTypeLabel(wt);
        name.appendChild(wtBadge);
      }
    }

    const copyBtn = document.createElement("button");
    copyBtn.className = "slot-choice-copy";
    copyBtn.type = "button";
    copyBtn.title = "Copy item name";
    copyBtn.textContent = "\u2398";
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(alt.name || "");
        copyBtn.textContent = "\u2713";
        setTimeout(() => { copyBtn.textContent = "\u2398"; }, 1200);
      } catch { /* clipboard unavailable */ }
    });
    name.appendChild(copyBtn);
    info.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "slot-choice-meta";
    const parts = [];
    if (alt.ilvl) parts.push(`ilvl ${alt.ilvl}`);
    if (alt.item_subclass) parts.push(alt.item_subclass);
    if (alt.source) parts.push(alt.source);
    meta.textContent = parts.join(" · ");
    info.appendChild(meta);

    if (alt.stats && alt.stats.length) {
      const stats = document.createElement("div");
      stats.className = "slot-choice-stats";
      stats.innerHTML = alt.stats.map(s => s.display || `${s.name} +${s.value}`).join("<br>");
      info.appendChild(stats);
    }

    if (alt.set_name) {
      const setEl = document.createElement("div");
      setEl.className = "slot-choice-set";
      setEl.textContent = alt.set_name;
      info.appendChild(setEl);
    }

    row.appendChild(info);

    const count = document.createElement("div");
    count.className = "slot-choice-count";
    count.textContent = `${alt.count}/${50}`;
    row.appendChild(count);

    // Hover tooltip on each alternative row
    row.addEventListener("mouseenter", (e) => showItemTooltip(e, alt, slot));
    row.addEventListener("mousemove", positionTooltip);
    row.addEventListener("mouseleave", hideTooltip);

    list.appendChild(row);
  });

  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeSlotModal() {
  const backdrop = document.getElementById("slot-modal-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  // Remove the talent tree wider-modal class if present
  const modal = backdrop.querySelector(".slot-modal");
  if (modal) modal.classList.remove("tt-modal");
  hideTooltip();
}

// Wire up close handlers (idempotent)
let modalWired = false;
export function initSlotModal() {
  if (modalWired) return;
  modalWired = true;
  const backdrop = document.getElementById("slot-modal-backdrop");
  const closeBtn = document.getElementById("slot-modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeSlotModal);
  if (backdrop) backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeSlotModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSlotModal(); });
}