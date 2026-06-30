// public/js/render/stats.js

const ICON = {
  crit: "spell_fire_firebolt",
  haste: "spell_nature_lightning",
  mastery: "spell_holy_blessingofstrength",
  versatility: "spell_holy_mindvision"
};

const LABEL = {
  crit: "Critical Strike",
  haste: "Haste",
  mastery: "Mastery",
  versatility: "Versatility"
};

function bar(value) {
  const pct = Math.max(0, Math.min(100, value));
  return `
    <div class="stat-bar">
      <div class="stat-bar-fill" style="width: ${pct}%"></div>
    </div>
  `;
}

export function renderStats(spec, host) {
  const s = spec.stats || {};
  const sums = s.secondary_rating_sums || s.secondary_gear_breakdown || {};
  const priority = s.priority || ["crit", "mastery", "haste", "versatility"];

  // Sort by the priority array if available, otherwise by rating sum descending
  const rows = priority.filter(k => sums[k] != null && sums[k] > 0);
  // Fallback: if priority exists but has zero-rating stats, add them at the end
  for (const k of ["crit", "haste", "mastery", "versatility"]) {
    if (!rows.includes(k) && sums[k] != null) rows.push(k);
  }

  const maxVal = Math.max(...rows.map(r => sums[r] || 0), 1);

  host.innerHTML = `
    <div class="stats-block">
      <div class="stats-priority-label">Priority: ${rows.map(r => capitalize(r)).join(" &gt; ")}</div>
      <div class="stats-secondary">
        ${rows.map(k => `
          <div class="stat-row">
            <img class="stat-icon" src="https://wow.zamimg.com/images/wow/icons/large/${ICON[k]}.jpg" alt="${k}">
            <div class="stat-name">${LABEL[k] || capitalize(k)}</div>
            <div class="stat-value">${(sums[k] || 0).toLocaleString()}</div>
          </div>
          ${bar(Math.round(((sums[k] || 0) / maxVal) * 100))}
        `).join("")}
      </div>
    </div>
  `;
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }