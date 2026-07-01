// public/js/render/gem-enchant.js
// Renders the gems/embellishments list and the enchants summary on the right panel.
// Gems are grouped by category (Eversong Diamond vs Prismatic), matching murlok.io.
// Each gem row has a hover tooltip (stat bonuses) and a copy button (for AH search).

function wowheadIcon(icon) {
  if (!icon) return "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
}

// Categorize a gem by its name. Eversong Diamonds are epic gems; everything else is prismatic.
function gemCategory(name) {
  if (!name) return "Prismatic";
  return /eversong\s*diamond/i.test(name) ? "Eversong Diamond" : "Prismatic";
}

// Build a gem row element with tooltip + copy button.
function buildGemRow(g) {
  const row = document.createElement("div");
  row.className = "gem-row";
  if (g.item_id) {
    row.dataset.itemId = g.item_id;
    row.dataset.wowhead = `item=${g.item_id}&domain=europe`;
  }

  const img = document.createElement("img");
  img.className = "gem-icon";
  img.src = wowheadIcon(g.icon);
  img.alt = g.name || "gem";
  img.loading = "lazy";
  img.onerror = () => { img.src = wowheadIcon(null); };
  row.appendChild(img);

  const name = document.createElement("div");
  name.className = "gem-name";
  name.textContent = g.name || "—";
  row.appendChild(name);

  const copyWrap = document.createElement("div");
  copyWrap.className = "gem-copy-wrap";

  const copyBtn = document.createElement("button");
  copyBtn.className = "gem-copy-btn";
  copyBtn.type = "button";
  copyBtn.title = "Copy gem name";
  copyBtn.textContent = "\u2398";
  copyBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(g.name || "");
      copyBtn.textContent = "\u2713";
      copyBtn.classList.add("copied");
      setTimeout(() => { copyBtn.textContent = "\u2398"; copyBtn.classList.remove("copied"); }, 1200);
    } catch { /* clipboard unavailable */ }
  });
  copyWrap.appendChild(copyBtn);

  const count = document.createElement("div");
  count.className = "gem-count";
  count.textContent = g.count || 0;
  copyWrap.appendChild(count);

  row.appendChild(copyWrap);

  // Hover tooltip — shows gem stats + usage count
  row.addEventListener("mouseenter", (e) => showGemTooltip(e, g));
  row.addEventListener("mousemove", positionTooltip);
  row.addEventListener("mouseleave", hideGemTooltip);

  return row;
}

// --- Gem tooltip (reuses the metagor-item-tooltip element from gear.js) ---
function showGemTooltip(e, g) {
  const tt = document.getElementById("metagor-item-tooltip");
  if (!tt) return;
  const lines = [];
  lines.push(`<div class="tooltip-title quality-epic">${g.name || "Unknown"}</div>`);
  if (g.stat_display) {
    // Stat display like "+16 Mastery & +7 Critical Strike" — split on & for readability
    const stats = g.stat_display.split(/\s*&\s*/).filter(Boolean);
    if (stats.length) lines.push(`<div class="tooltip-stats">${stats.map(s => `<div class="tooltip-stat-bonus">${s}</div>`).join("")}</div>`);
  }
  if (g.item_id) lines.push(`<div class="tooltip-source-tag">Item ID: ${g.item_id}</div>`);
  lines.push(`<div class="tooltip-usage">Socketed by ${g.count || 0} of 50 top players</div>`);

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

function hideGemTooltip() {
  const tt = document.getElementById("metagor-item-tooltip");
  if (tt) tt.style.display = "none";
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

  host.innerHTML = "";

  if (gems.length === 0) {
    const note = document.createElement("div");
    note.className = "empty-note";
    note.textContent = "No gem data.";
    host.appendChild(note);
  } else {
    for (const cat of cats) {
      const header = document.createElement("h5");
      header.className = "gem-category";
      header.textContent = cat;
      host.appendChild(header);
      for (const g of grouped[cat]) host.appendChild(buildGemRow(g));
    }
  }

  const embHeader = document.createElement("h4");
  embHeader.style.marginTop = "14px";
  embHeader.textContent = "Embellishments";
  host.appendChild(embHeader);
  if (emb.length === 0) {
    const note = document.createElement("div");
    note.className = "empty-note";
    note.textContent = "No embellishment data.";
    host.appendChild(note);
  } else {
    for (const e of emb) host.appendChild(buildEmbellishmentRow(e));
  }
}

function buildEmbellishmentRow(e) {
  const row = document.createElement("div");
  row.className = "gem-row";
  if (e.spell_id) row.dataset.spellId = e.spell_id;
  if (e.item_ids?.length) {
    row.dataset.itemId = e.item_ids[0];
    row.dataset.wowhead = `item=${e.item_ids[0]}&domain=europe`;
  }

  const img = document.createElement("img");
  img.className = "gem-icon";
  img.src = wowheadIcon(e.icon);
  img.alt = e.name || "embellishment";
  img.loading = "lazy";
  img.onerror = () => { img.src = wowheadIcon(null); };
  row.appendChild(img);

  const nameWrap = document.createElement("div");
  nameWrap.className = "embellish-name-wrap";
  const name = document.createElement("div");
  name.className = "gem-name embellish-effect";
  name.textContent = e.name || "—";
  nameWrap.appendChild(name);
  if (e.item_name) {
    const sub = document.createElement("div");
    sub.className = "embellish-item-sub";
    sub.textContent = e.item_name;
    nameWrap.appendChild(sub);
  }
  row.appendChild(nameWrap);

  const copyWrap = document.createElement("div");
  copyWrap.className = "gem-copy-wrap";
  const copyBtn = document.createElement("button");
  copyBtn.className = "gem-copy-btn";
  copyBtn.type = "button";
  copyBtn.title = "Copy embellishment name";
  copyBtn.textContent = "\u2398";
  copyBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    try {
      await navigator.clipboard.writeText(e.name || "");
      copyBtn.textContent = "\u2713";
      copyBtn.classList.add("copied");
      setTimeout(() => { copyBtn.textContent = "\u2398"; copyBtn.classList.remove("copied"); }, 1200);
    } catch { /* clipboard unavailable */ }
  });
  copyWrap.appendChild(copyBtn);

  const count = document.createElement("div");
  count.className = "gem-count";
  count.textContent = e.count || 0;
  copyWrap.appendChild(count);
  row.appendChild(copyWrap);

  // Hover tooltip — shows embellishment effect description
  row.addEventListener("mouseenter", (ev) => showEmbellishTooltip(ev, e));
  row.addEventListener("mousemove", positionTooltip);
  row.addEventListener("mouseleave", hideGemTooltip);
  return row;
}

function showEmbellishTooltip(e, emb) {
  const tt = document.getElementById("metagor-item-tooltip");
  if (!tt) return;
  const lines = [];
  lines.push(`<div class="tooltip-title quality-epic">${emb.name || "Unknown"}</div>`);
  if (emb.item_name) lines.push(`<div class="tooltip-source-tag">${emb.item_name}</div>`);
  if (emb.stat_display) {
    // Strip the "Equip: " prefix and show the effect description
    const clean = emb.stat_display.replace(/^Equip:\s*/i, "");
    lines.push(`<div class="tooltip-stats"><div class="tooltip-stat-bonus">${clean}</div></div>`);
  }
  if (emb.spell_id) lines.push(`<div class="tooltip-source-tag">Spell ID: ${emb.spell_id}</div>`);
  lines.push(`<div class="tooltip-usage">Used by ${emb.count || 0} of 50 top players</div>`);
  tt.innerHTML = lines.join("");
  tt.style.display = "block";
  positionTooltip(e);
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