// public/js/render/gem-enchant.js
// Renders the gems/embellishments list and the enchants summary on the right panel.
// Gems are grouped by category (Eversong Diamond vs Prismatic), matching murlok.io.

function wowheadIcon(icon) {
  if (!icon) return "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
}

// Categorize a gem by its name. Eversong Diamonds are epic gems; everything else is prismatic.
function gemCategory(name) {
  if (!name) return "Prismatic";
  return /eversong\s*diamond/i.test(name) ? "Eversong Diamond" : "Prismatic";
}

function gemRow(g) {
  if (!g) return "";
  const wowhead = g.item_id ? `data-wowhead="item=${g.item_id}&domain=europe"` : "";
  return `
    <div class="gem-row" data-item-id="${g.item_id || ""}" ${wowhead}>
      <img class="gem-icon" src="${wowheadIcon(g.icon)}" alt="${g.name || "gem"}"
           onerror="this.src='${wowheadIcon(null)}'">
      <div class="gem-name">${g.name || "—"}</div>
      <div class="gem-count">${g.count || 0}</div>
    </div>
  `;
}

export function renderGemsAndEmbellishments(spec, host) {
  const gems = spec.gems || [];
  const emb = spec.embellishments || [];

  // Group gems by category (Eversong Diamond, Prismatic) — matches murlok.io
  const grouped = {};
  for (const g of gems) {
    const cat = gemCategory(g.name);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(g);
  }
  // Sort categories: Eversong Diamond first, then Prismatic
  const catOrder = ["Eversong Diamond", "Prismatic"];
  const cats = Object.keys(grouped).sort((a, b) => {
    const ia = catOrder.indexOf(a); const ib = catOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  let gemsHtml = "";
  if (gems.length === 0) {
    gemsHtml = `<div class="empty-note">No gem data.</div>`;
  } else {
    for (const cat of cats) {
      gemsHtml += `<h5 class="gem-category">${cat}</h5>`;
      gemsHtml += grouped[cat].map(gemRow).join("");
    }
  }

  host.innerHTML = `
    <div class="gem-enchant-section">
      <h4>Gems</h4>
      ${gemsHtml}
      <h4 style="margin-top:14px">Embellishments</h4>
      ${emb.length ? emb.map(embellishmentRow).join("") : `<div class="empty-note">No embellishment data.</div>`}
    </div>
  `;
}

function embellishmentRow(e) {
  if (!e) return "";
  return `
    <div class="gem-row" data-spell-id="${e.spell_id || ""}">
      <img class="gem-icon" src="${wowheadIcon(e.icon)}" alt="${e.name || "embellishment"}"
           onerror="this.src='${wowheadIcon(null)}'">
      <div class="gem-name">${e.name || "—"}</div>
      <div class="gem-count">${e.count || 0}</div>
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
        <div class="enchant-name">${cleanEnchantName(e.name)}</div>
        <div class="enchant-count">${e.count || 0}/${e.count ? 50 : 0}</div>
      </div>
    `).join("");
}

// Strip Blizzard's |A:Professions-ChatIcon...|a artifacts from enchant display strings.
function cleanEnchantName(name) {
  if (!name) return "—";
  return name.replace(/\|A:Professions-ChatIcon[^|]*\|a/g, "").trim();
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }