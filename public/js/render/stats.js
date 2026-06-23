// public/js/render/stats.js

const ICON = {
  crit: "spell_fire_firebolt",
  haste: "spell_nature_lightning",
  mastery: "spell_holy_blessingofstrength",
  versatility: "spell_holy_mindvision"
};

function bar(value) {
  // value: 0..100 (or beyond). Clamp visual.
  const pct = Math.max(0, Math.min(100, value));
  return `
    <div class="stat-bar">
      <div class="stat-bar-fill" style="width: ${pct}%"></div>
    </div>
  `;
}

export function renderStats(spec, host) {
  const s = spec.stats || {};
  const breakdown = s.secondary_gear_breakdown || {};
  const rows = ["crit", "mastery", "haste", "versatility"]
    .filter(k => breakdown[k] != null)
    .sort((a, b) => (breakdown[b] || 0) - (breakdown[a] || 0));

  host.innerHTML = `
    <div class="stats-block">
      <div class="stats-primary">
        <div class="stats-primary-label">Primary</div>
        <div class="stats-primary-value">${formatPrimary(s.primary)}</div>
      </div>
      <div class="stats-secondary">
        ${rows.map(k => `
          <div class="stat-row">
            <img class="stat-icon" src="https://wow.zamimg.com/images/wow/icons/large/${ICON[k]}.jpg" alt="${k}">
            <div class="stat-name">${capitalize(k)}</div>
            <div class="stat-value">${breakdown[k]}</div>
          </div>
          ${bar(normalize(breakdown[k], rows.map(r => breakdown[r] || 0)))}
        `).join("")}
      </div>
    </div>
  `;
}

function formatPrimary(primary) {
  if (!primary) return "—";
  const [k, v] = Object.entries(primary)[0] || [];
  if (!k) return "—";
  return `${Math.round(v).toLocaleString()} ${capitalize(k)}`;
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

function normalize(value, allValues) {
  const max = Math.max(...allValues, 1);
  return Math.round((value / max) * 100);
}
