// public/js/render/gem-enchant.js
// Renders the gems/embellishments list and the enchants summary on the right panel.
// Gems are grouped by category (Eversong Diamond vs Prismatic), matching murlok.io.
// Each gem row has a hover tooltip (stat bonuses) and a copy button (for AH search).

function wowheadIcon(icon) {
  if (!icon) return "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
}

// Enchants don't have item icons (they're spells). Use a default enchant scroll icon.
const ENCHANT_ICON = "inv_misc_enchantedscroll";
function enchantIcon(icon) {
  return wowheadIcon(icon || ENCHANT_ICON);
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

export function renderGems(spec, host) {
  const gems = spec.gems || [];

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
}

export function renderEmbellishments(spec, host) {
  const emb = spec.embellishments || [];
  host.innerHTML = "";
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
  row.className = "gem-row embellish-row";
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
    // If multiple items carry this effect, show count and make clickable
    if (e.items && e.items.length > 1) {
      sub.textContent = `${e.item_name} +${e.items.length - 1} more`;
      sub.classList.add("embellish-clickable");
    } else {
      sub.textContent = e.item_name;
    }
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

  // Click to open items modal (only if multiple items carry this effect)
  if (e.items && e.items.length > 1) {
    row.style.cursor = "pointer";
    row.classList.add("embellish-expandable");
    row.addEventListener("click", () => openEmbellishItemsModal(e));
  }

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

// --- Embellishment items modal (reuses slot-modal-backdrop from gear.js) ---
function openEmbellishItemsModal(emb) {
  hideGemTooltip();
  const backdrop = document.getElementById("slot-modal-backdrop");
  const title = document.getElementById("slot-modal-title");
  const list = document.getElementById("slot-modal-list");
  if (!backdrop || !title || !list) return;

  title.textContent = `${emb.name} — ${emb.items.length} Items`;
  list.innerHTML = "";

  emb.items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "slot-choice-item";
    if (it.item_id) row.dataset.wowhead = `item=${it.item_id}&domain=europe`;

    const rank = document.createElement("div");
    rank.className = "slot-choice-rank";
    rank.textContent = `#${i + 1}`;
    row.appendChild(rank);

    const iconWrap = document.createElement("div");
    iconWrap.className = "slot-choice-icon";
    const img = document.createElement("img");
    img.src = wowheadIcon(it.icon);
    img.alt = it.name || "item";
    img.onerror = () => { img.src = wowheadIcon(null); };
    iconWrap.appendChild(img);
    row.appendChild(iconWrap);

    const info = document.createElement("div");
    info.className = "slot-choice-info";
    const nameRow = document.createElement("div");
    nameRow.className = "slot-choice-name-row";
    const nameText = document.createElement("span");
    nameText.className = "slot-choice-name quality-epic";
    nameText.textContent = it.name || "Unknown";
    nameRow.appendChild(nameText);

    const copyBtn = document.createElement("button");
    copyBtn.className = "slot-choice-copy";
    copyBtn.type = "button";
    copyBtn.title = "Copy item name";
    copyBtn.textContent = "\u2398";
    copyBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      navigator.clipboard.writeText(it.name || "").then(() => {
        copyBtn.textContent = "\u2713";
        setTimeout(() => { copyBtn.textContent = "\u2398"; }, 1200);
      }).catch(() => {});
    });
    nameRow.appendChild(copyBtn);
    info.appendChild(nameRow);

    const meta = document.createElement("div");
    meta.className = "slot-choice-meta";
    meta.textContent = `Embellishment: ${emb.name}`;
    info.appendChild(meta);

    if (emb.stat_display) {
      const desc = document.createElement("div");
      desc.className = "slot-choice-stats";
      desc.textContent = emb.stat_display.replace(/^Equip:\s*/i, "");
      info.appendChild(desc);
    }
    row.appendChild(info);

    const count = document.createElement("div");
    count.className = "slot-choice-count";
    count.textContent = `${it.count}/${emb.count}`;
    row.appendChild(count);

    list.appendChild(row);
  });

  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

export function renderEnchants(spec, host) {
  const ench = spec.enchants || {};
  const entries = Object.entries(ench);
  if (!entries.length) {
    host.innerHTML = `<div class="empty-note">No enchant data.</div>`;
    return;
  }

  // Slot display order (matching murlok: Head, Shoulders, Chest, Hands, Legs, Feet, Rings, Main Hand, Off Hand)
  const slotOrder = ["head", "shoulders", "chest", "hands", "legs", "feet", "ring", "mainhand", "offhand"];
  const slotLabels = {
    head: "Head", shoulders: "Shoulders", chest: "Chest", hands: "Hands",
    legs: "Legs", feet: "Feet", ring: "Rings", mainhand: "Main Hand", offhand: "Off Hand"
  };

  // Sort slots by predefined order, then alphabetical for any extras
  entries.sort((a, b) => {
    const ia = slotOrder.indexOf(a[0]); const ib = slotOrder.indexOf(b[0]);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a[0].localeCompare(b[0]);
  });

  host.innerHTML = "";
  for (const [slot, enchantList] of entries) {
    if (!Array.isArray(enchantList) || enchantList.length === 0) continue;

    // Header with slot name
    const header = document.createElement("h5");
    header.className = "enchant-slot-header";
    header.textContent = slotLabels[slot] || capitalize(slot);
    host.appendChild(header);

    // Show only the most popular enchant; clickable if alternatives exist
    const top = enchantList[0];
    const row = document.createElement("div");
    row.className = "enchant-row";
    if (top.spell_id) row.dataset.spellId = top.spell_id;

    const name = document.createElement("div");
    name.className = "enchant-name";
    name.textContent = cleanEnchantName(top.name);
    row.appendChild(name);

    const rightWrap = document.createElement("div");
    rightWrap.className = "gem-copy-wrap";

    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = "gem-copy-btn";
    copyBtn.type = "button";
    copyBtn.title = "Copy enchant name";
    copyBtn.textContent = "\u2398";
    copyBtn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      try {
        await navigator.clipboard.writeText(cleanEnchantName(top.name));
        copyBtn.textContent = "\u2713";
        copyBtn.classList.add("copied");
        setTimeout(() => { copyBtn.textContent = "\u2398"; copyBtn.classList.remove("copied"); }, 1200);
      } catch { /* clipboard unavailable */ }
    });
    rightWrap.appendChild(copyBtn);

    const count = document.createElement("div");
    count.className = "enchant-count";
    count.textContent = top.count || 0;
    rightWrap.appendChild(count);

    // If there are alternatives, show "+N" hint and make clickable
    if (enchantList.length > 1) {
      const more = document.createElement("span");
      more.className = "enchant-more-hint";
      more.textContent = `+${enchantList.length - 1}`;
      rightWrap.appendChild(more);
      row.style.cursor = "pointer";
      row.classList.add("embellish-expandable");
      row.addEventListener("click", () => openEnchantAlternativesModal(slot, slotLabels[slot] || capitalize(slot), enchantList));
    }

    row.appendChild(rightWrap);
    host.appendChild(row);
  }
}

// --- Enchant alternatives modal (reuses slot-modal-backdrop from gear.js) ---
function openEnchantAlternativesModal(slot, slotLabel, enchantList) {
  const backdrop = document.getElementById("slot-modal-backdrop");
  const title = document.getElementById("slot-modal-title");
  const list = document.getElementById("slot-modal-list");
  if (!backdrop || !title || !list) return;

  title.textContent = `${slotLabel} — ${enchantList.length} Enchants`;
  list.innerHTML = "";

  enchantList.forEach((e, i) => {
    const row = document.createElement("div");
    row.className = "slot-choice-item";
    if (e.spell_id) row.dataset.wowhead = `spell=${e.spell_id}`;

    const rank = document.createElement("div");
    rank.className = "slot-choice-rank";
    rank.textContent = `#${i + 1}`;
    row.appendChild(rank);

    // Icon — enchants use a default scroll icon since they have no item icon
    const iconWrap = document.createElement("div");
    iconWrap.className = "slot-choice-icon";
    const img = document.createElement("img");
    img.src = enchantIcon(e.icon);
    img.alt = e.name || "enchant";
    img.onerror = () => { img.src = wowheadIcon(null); };
    iconWrap.appendChild(img);
    row.appendChild(iconWrap);

    const info = document.createElement("div");
    info.className = "slot-choice-info";
    const nameRow = document.createElement("div");
    nameRow.className = "slot-choice-name-row";
    const nameText = document.createElement("span");
    nameText.className = "slot-choice-name quality-epic";
    nameText.textContent = cleanEnchantName(e.name);
    nameRow.appendChild(nameText);

    // Copy button in modal
    const copyBtn = document.createElement("button");
    copyBtn.className = "slot-choice-copy";
    copyBtn.type = "button";
    copyBtn.title = "Copy enchant name";
    copyBtn.textContent = "\u2398";
    copyBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      navigator.clipboard.writeText(cleanEnchantName(e.name)).then(() => {
        copyBtn.textContent = "\u2713";
        setTimeout(() => { copyBtn.textContent = "\u2398"; }, 1200);
      }).catch(() => {});
    });
    nameRow.appendChild(copyBtn);
    info.appendChild(nameRow);

    const meta = document.createElement("div");
    meta.className = "slot-choice-meta";
    meta.textContent = slotLabel;
    info.appendChild(meta);

    row.appendChild(info);

    const count = document.createElement("div");
    count.className = "slot-choice-count";
    count.textContent = `${e.count}/50`;
    row.appendChild(count);

    list.appendChild(row);
  });

  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

// Strip Blizzard's |A:Professions-ChatIcon...|a artifacts from enchant display strings.
function cleanEnchantName(name) {
  if (!name) return "—";
  return name.replace(/\|A:Professions-ChatIcon[^|]*\|a/g, "").trim();
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }