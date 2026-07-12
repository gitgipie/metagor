// public/js/render/consumables.js
// Renders the consumables card from guides.json (flask, potions, food, weapon_buff).
// Consumables are dynamically scraped from Icy Veins guides.
// Each item has a copy button for easy AH search.

function wowheadIcon(icon) {
  if (!icon) return "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
}

// Category icons (generic WoW icons for each consumable type)
const CATEGORY_ICONS = {
  flask: "inv_12_profession_alchemy_flask_sindoreipotion_red--",
  potion: "inv_12_profession_alchemy_voidpotion_red",
  food: "inv_tradeskill_cooking_feastofblood",
  weapon_buff: "inv_potion_103",
  augment_rune: "inv_10_enchanting_crystal_color2"
};

const CATEGORY_LABELS = {
  flask: "Flask",
  potion: "Potion",
  food: "Food",
  weapon_buff: "Weapon Buff",
  augment_rune: "Augment Rune"
};

function buildConsumableRow(item, category) {
  const row = document.createElement("div");
  row.className = "consumable-item";
  if (item.item_id) {
    row.dataset.itemId = item.item_id;
    row.dataset.wowhead = `item=${item.item_id}&domain=europe`;
  }

  const img = document.createElement("img");
  img.className = "consumable-icon";
  img.src = wowheadIcon(item.icon || CATEGORY_ICONS[category]);
  img.alt = item.name || "consumable";
  img.loading = "lazy";
  img.onerror = () => { img.src = wowheadIcon(CATEGORY_ICONS[category]); };
  row.appendChild(img);

  const info = document.createElement("div");
  info.className = "consumable-info";
  const label = document.createElement("div");
  label.className = "consumable-label";
  label.textContent = CATEGORY_LABELS[category] || category;
  info.appendChild(label);
  const name = document.createElement("div");
  name.className = "consumable-name";
  name.textContent = item.name || `Item #${item.item_id}`;
  info.appendChild(name);
  if (item.note) {
    const note = document.createElement("div");
    note.className = "consumable-note";
    note.textContent = item.note;
    info.appendChild(note);
  }
  row.appendChild(info);

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "gem-copy-btn consumable-copy";
  copyBtn.type = "button";
  copyBtn.title = "Copy item name";
  copyBtn.textContent = "\u2398";
  copyBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.name || "");
      copyBtn.textContent = "\u2713";
      copyBtn.classList.add("copied");
      setTimeout(() => { copyBtn.textContent = "\u2398"; copyBtn.classList.remove("copied"); }, 1200);
    } catch { /* clipboard unavailable */ }
  });
  row.appendChild(copyBtn);

  // Hover tooltip — shows the buff description from Icy Veins
  if (item.description) {
    row.addEventListener("mouseenter", (e) => showConsumableTooltip(e, item, category));
    row.addEventListener("mousemove", positionConsumableTooltip);
    row.addEventListener("mouseleave", hideConsumableTooltip);
  }

  return row;
}

// --- Consumable tooltip (reuses metagor-item-tooltip element) ---
function showConsumableTooltip(e, item, category) {
  const tt = document.getElementById("metagor-item-tooltip");
  if (!tt) return;
  const lines = [];
  lines.push(`<div class="tooltip-title quality-epic">${item.name || "Unknown"}</div>`);
  if (item.item_id) lines.push(`<div class="tooltip-ilvl">Item ID: ${item.item_id}</div>`);
  lines.push(`<div class="tooltip-source-tag">${CATEGORY_LABELS[category] || category}</div>`);
  if (item.description) {
    lines.push(`<div class="tooltip-stats"><div class="tooltip-stat-bonus">${item.description}</div></div>`);
  }
  if (item.note) {
    lines.push(`<div class="tooltip-source-detail">${item.note}</div>`);
  }
  lines.push(`<div class="tooltip-usage">Source: Icy Veins</div>`);
  tt.innerHTML = lines.join("");
  tt.style.display = "block";
  positionConsumableTooltip(e);
}

function positionConsumableTooltip(e) {
  const tt = document.getElementById("metagor-item-tooltip");
  if (!tt || tt.style.display !== "block") return;
  const ttW = tt.offsetWidth, ttH = tt.offsetHeight;
  let x = e.pageX + 15, y = e.pageY + 15;
  if (x + ttW > window.innerWidth) x = e.pageX - ttW - 15;
  if (y + ttH > window.scrollY + window.innerHeight) y = e.pageY - ttH - 15;
  tt.style.left = `${x}px`;
  tt.style.top = `${y}px`;
}

function hideConsumableTooltip() {
  const tt = document.getElementById("metagor-item-tooltip");
  if (tt) tt.style.display = "none";
}

export function renderConsumables(specId, guides, spec, host) {
  const set = guides.consumables?.[specId];
  if (!set) {
    host.innerHTML = `<div class="empty-note">No consumables data for this spec yet.</div>`;
    return;
  }

  host.innerHTML = "";
  const block = document.createElement("div");
  block.className = "consumables-block";

  if (set.flask) block.appendChild(buildConsumableRow(set.flask, "flask"));
  if (set.potions && Array.isArray(set.potions)) {
    for (const p of set.potions) block.appendChild(buildConsumableRow(p, "potion"));
  }
  if (set.food) block.appendChild(buildConsumableRow(set.food, "food"));

  // Weapon buff: the top oil from aggregated data (what top players use).
  // Oils are temporary weapon enchantments applied to weapons.
  const ench = spec?.enchants || {};
  const mhOils = (ench.mainhand || []).filter(e => e.name && isWeaponBuffName(e.name));
  const ohOils = (ench.offhand || []).filter(e => e.name && isWeaponBuffName(e.name));
  const allOils = [...mhOils, ...ohOils];
  if (allOils.length > 0) {
    const oilMap = new Map();
    for (const o of allOils) {
      const existing = oilMap.get(o.name);
      if (!existing || o.count > existing.count) oilMap.set(o.name, o);
    }
    const topOil = [...oilMap.values()].sort((a, b) => b.count - a.count)[0];
    const oilItem = {
      name: topOil.name,
      item_id: null,
      icon: "inv_potion_103",
      description: "Temporary weapon enchantment. Lasts 1 hour.",
      note: "Used by " + (topOil.count || 0) + " of 50 top players"
    };
    block.appendChild(buildConsumableRow(oilItem, "weapon_buff"));
  }

  // Augment Rune: a general stat-boosting consumable (from Icy Veins).
  // Not a weapon buff — it increases a primary stat, not weapon damage.
  if (set.augment_rune) {
    block.appendChild(buildConsumableRow(set.augment_rune, "augment_rune"));
  }

  // Source attribution
  if (set.source) {
    const source = document.createElement("div");
    source.className = "consumable-source";
    source.textContent = `Source: Icy Veins + Blizzard API`;
    block.appendChild(source);
  }

  host.appendChild(block);
}

// Check if a name is a temporary weapon buff (oil, rune) rather than a permanent enchant
function isWeaponBuffName(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("oil") || (n.includes("rune of") && !n.includes("enchant"));
}