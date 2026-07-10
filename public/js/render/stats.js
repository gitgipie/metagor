// public/js/render/stats.js

const ICON = {
  crit: "spell_fire_firebolt",
  haste: "spell_nature_lightning",
  mastery: "spell_holy_blessingofstrength",
  versatility: "spell_holy_mindvision",
  agility: "spell_holy_blessingofagility",
  intellect: "spell_holy_arcaneintellect",
  strength: "spell_holy_wordofstrength",
  stamina: "spell_health_posession"
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
  const ratingAvgs = s.secondary_rating_averages || s.secondary_averages || s.secondary_gear_breakdown || {};
  const pctAvgs = s.secondary_percent_averages || {};
  const primary = s.primary || {};
  const priority = s.priority || ["crit", "mastery", "haste", "versatility"];

  // Build rows in priority order (rating-based, matches murlok.io)
  const rows = priority.filter(k => ratingAvgs[k] != null);
  for (const k of ["crit", "haste", "mastery", "versatility"]) {
    if (!rows.includes(k) && ratingAvgs[k] != null) rows.push(k);
  }

  // Bar scale: proportional to rating (largest rating = full bar)
  const maxRating = Math.max(...rows.map(r => ratingAvgs[r] || 0), 1);

  // Determine the primary stat: whichever of agility/intellect/strength
  // has the highest value. Stamina is excluded (all classes have high stamina).
  const primaries = [
    { key: "agility", label: "Agility", val: primary.agility || 0 },
    { key: "intellect", label: "Intellect", val: primary.intellect || 0 },
    { key: "strength", label: "Strength", val: primary.strength || 0 }
  ].sort((a, b) => b.val - a.val);
  const primaryKey = primaries[0].key;
  const primaryLabel = primaries[0].label;
  const primaryVal = primaries[0].val;

  host.innerHTML = `
    <div class="stats-block">
      <div class="stats-priority-label">Priority: ${rows.map(r => LABEL[r] || capitalize(r)).join(" &gt; ")}</div>
      <div class="stats-secondary">
        <div class="stat-row stat-row-primary">
          <img class="stat-icon" src="https://wow.zamimg.com/images/wow/icons/large/${ICON[primaryKey] || "inv_misc_questionmark"}.jpg" alt="${primaryKey}">
          <div class="stat-name">${primaryLabel}</div>
          <div class="stat-value">${Math.round(primaryVal).toLocaleString()}</div>
        </div>
        ${rows.map(k => {
          const pct = Math.round((pctAvgs[k] || 0) * 10) / 10;
          const rating = Math.round(ratingAvgs[k] || 0);
          return `
          <div class="stat-row">
            <img class="stat-icon" src="https://wow.zamimg.com/images/wow/icons/large/${ICON[k]}.jpg" alt="${k}">
            <div class="stat-name">${LABEL[k] || capitalize(k)}</div>
            <div class="stat-value">${pct}%<span class="stat-rating">+${rating}</span></div>
          </div>
          ${bar(Math.round(((ratingAvgs[k] || 0) / maxRating) * 100))}
        `}).join("")}
      </div>
    </div>
  `;
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }