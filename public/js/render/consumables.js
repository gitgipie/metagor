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
  weapon_buff: "inv_10_enchanting_crystal_color2"
};

const CATEGORY_LABELS = {
  flask: "Flask",
  potion: "Potion",
  food: "Food",
  weapon_buff: "Weapon Buff"
};

function buildConsumableRow(item, category) {
  const row = document.createElement("div");
  row.className = "consumable-item";
  if (item.item_id) row.dataset.itemId = item.item_id;

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

  return row;
}

export function renderConsumables(specId, guides, host) {
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
  if (set.weapon_buff) block.appendChild(buildConsumableRow(set.weapon_buff, "weapon_buff"));

  // Source attribution
  if (set.source) {
    const source = document.createElement("div");
    source.className = "consumable-source";
    source.textContent = `Source: Icy Veins`;
    block.appendChild(source);
  }

  host.appendChild(block);
}