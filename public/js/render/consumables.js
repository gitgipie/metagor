// public/js/render/consumables.js
// Renders the consumables card from guides.json (flask, potions, food, weapon_buff).

function row({ label, item, sub }) {
  if (!item) return "";
  const safeName = item.name || `Item #${item.item_id}`;
  return `
    <div class="consumable-item" data-item-id="${item.item_id}">
      <div class="consumable-label">${label}</div>
      <div class="consumable-name">${safeName}</div>
      ${item.note ? `<div class="consumable-note">${item.note}</div>` : ""}
      ${sub ? `<div class="consumable-sub">${sub}</div>` : ""}
    </div>
  `;
}

export function renderConsumables(specId, guides, host) {
  const set = guides.consumables?.[specId];
  if (!set) {
    host.innerHTML = `<div class="empty-note">No curated consumables for this spec yet.</div>`;
    return;
  }
  const potionLines = (set.potions || []).map(p => row({ label: "Potion", item: p })).join("");
  host.innerHTML = `
    <div class="consumables-block">
      ${row({ label: "Flask",   item: set.flask })}
      ${potionLines}
      ${row({ label: "Food",    item: set.food })}
      ${row({ label: "Weapon Buff", item: set.weapon_buff })}
    </div>
  `;
}
