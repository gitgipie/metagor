// public/js/render/gem-enchant.js
// Renders the gems/embellishments list and the enchants summary on the right panel.

function pct(n) { return Math.round((n || 0) * 100); }

function aggregateRow(e) {
  if (!e) return "";
  return `
    <div class="gem-enchant-row" ${e.item_id ? `data-item-id="${e.item_id}"` : ""} ${e.spell_id ? `data-spell-id="${e.spell_id}"` : ""}>
      <div class="gem-enchant-name">${e.name || "—"}</div>
      <div class="gem-enchant-pct">${pct(e.percent)}%</div>
    </div>
  `;
}

export function renderGemsAndEmbellishments(spec, host) {
  const gems = spec.gems || [];
  const emb = spec.embellishments || [];
  host.innerHTML = `
    <div class="gem-enchant-section">
      <h4>Gems</h4>
      ${gems.length ? gems.map(aggregateRow).join("") : `<div class="empty-note">No gem data.</div>`}
      <h4 style="margin-top:14px">Embellishments</h4>
      ${emb.length ? emb.map(aggregateRow).join("") : `<div class="empty-note">No embellishment data.</div>`}
    </div>
  `;
}

export function renderEnchants(spec, host) {
  const ench = spec.enchants || {};
  const entries = Object.entries(ench);
  if (!entries.length) {
    host.innerHTML = `<div class="empty-note">No enchant data.</div>`;
    return;
  }
  host.innerHTML = entries
    .map(([slot, e]) => `
      <div class="enchant-row" data-spell-id="${e.spell_id || ""}">
        <div class="enchant-slot">${capitalize(slot)}</div>
        <div class="enchant-name">${e.name || "—"}</div>
        <div class="enchant-pct">${pct(e.percent)}%</div>
      </div>
    `).join("");
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
