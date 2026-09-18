// public/js/render/showcase.js
// Renders the First-Time Visitor Hero Showcase when no class/spec is active.
// Offers feature highlights and an interactive role-filtered spec catalog.

import { wowClasses, specId } from "../registry.js?v=54";
import { iconUrl } from "../icons.js?v=54";

export function getSpecRole(classId, specName) {
  if (specName === "Blood" || specName === "Guardian" || specName === "Brewmaster" ||
      (specName === "Protection" && (classId === "paladin" || classId === "warrior")) ||
      (specName === "Vengeance" && classId === "demon-hunter")) {
    return "tank";
  }
  if (specName === "Restoration" || specName === "Preservation" || specName === "Mistweaver" ||
      (specName === "Holy" && (classId === "paladin" || classId === "priest")) ||
      specName === "Discipline") {
    return "healer";
  }
  if (specName === "Balance" || specName === "Devastation" || specName === "Augmentation" ||
      specName === "Beast Mastery" || specName === "Marksmanship" ||
      classId === "mage" || classId === "warlock" ||
      specName === "Shadow" || specName === "Elemental") {
    return "ranged";
  }
  return "melee";
}

const ROLE_META = {
  all:    { label: "All Specs", icon: "✨", count: 40 },
  tank:   { label: "Tanks",     icon: "🛡️", count: 6 },
  healer: { label: "Healers",   icon: "💚", count: 7 },
  melee:  { label: "Melee DPS", icon: "⚔️", count: 14 },
  ranged: { label: "Ranged DPS",icon: "🏹", count: 13 }
};

export function renderShowcase(hostEl, onSelectSpec) {
  if (!hostEl) return;

  // Build spec dataset
  const allSpecs = [];
  for (const cls of wowClasses) {
    for (const spec of cls.specs) {
      const sId = specId(cls.id, spec);
      const icon = cls.specIcons?.[spec];
      const role = getSpecRole(cls.id, spec);
      allSpecs.push({
        id: sId,
        classId: cls.id,
        className: cls.name,
        color: cls.color,
        specName: spec,
        icon,
        role
      });
    }
  }

  let activeRoleFilter = "all";

  hostEl.innerHTML = `
    <div class="hero-showcase-card">
      <div class="showcase-header">
        <div class="showcase-badge">Midnight Season 2 · Live Best in Slot</div>
        <h2 class="showcase-title">Choose Your Specialization</h2>
        <p class="showcase-subtitle">
          Directly resolved from top 50 Mythic+ ladder profiles via official Blizzard API and Raider.IO rankings.
          Select any specialization below or pick a class from the top dock to inspect BiS gear, stat priorities, and talent builds.
        </p>
      </div>

      <div class="showcase-features-grid">
        <div class="showcase-feature-card">
          <div class="showcase-feature-icon">🛡️</div>
          <div class="showcase-feature-title">Live BiS &amp; Drop Sources</div>
          <p class="showcase-feature-desc">
            Dungeon drops, raid boss sources, and Catalyst tier recommendations verified against top ladder keystoners.
          </p>
        </div>

        <div class="showcase-feature-card">
          <div class="showcase-feature-icon">⚡</div>
          <div class="showcase-feature-title">Talent Trees &amp; Stat Ratios</div>
          <p class="showcase-feature-desc">
            Visual Blizzard talent tree overlay, exportable loadout strings, and real aggregate secondary stat weights.
          </p>
        </div>

        <div class="showcase-feature-card">
          <div class="showcase-feature-icon">💎</div>
          <div class="showcase-feature-title">Enchants, Gems &amp; Consumables</div>
          <p class="showcase-feature-desc">
            Prismatic jewelcrafting gems, crafted embellishments, and curated guides from top world creators.
          </p>
        </div>
      </div>

      <div class="showcase-divider"></div>

      <div class="showcase-picker-section">
        <div class="showcase-role-tabs" id="showcase-role-tabs">
          ${Object.entries(ROLE_META).map(([roleKey, meta]) => `
            <button type="button" class="showcase-role-tab ${roleKey === activeRoleFilter ? 'active' : ''}" data-role="${roleKey}">
              <span class="role-tab-icon">${meta.icon}</span>
              <span class="role-tab-label">${meta.label}</span>
              <span class="role-tab-count">${meta.count}</span>
            </button>
          `).join("")}
        </div>

        <div class="showcase-specs-grid" id="showcase-specs-grid"></div>
      </div>
    </div>
  `;

  const tabsHost = hostEl.querySelector("#showcase-role-tabs");
  const gridHost = hostEl.querySelector("#showcase-specs-grid");

  function renderGrid() {
    const filtered = activeRoleFilter === "all"
      ? allSpecs
      : allSpecs.filter(s => s.role === activeRoleFilter);

    gridHost.innerHTML = filtered.map(s => {
      const roleBadge = s.role === "tank" ? "🛡️ Tank"
        : s.role === "healer" ? "💚 Healer"
        : s.role === "ranged" ? "🏹 Ranged"
        : "⚔️ Melee";

      return `
        <div class="showcase-spec-card" data-spec-id="${s.id}" style="--spec-color: ${s.color};">
          <img class="showcase-spec-icon" src="${iconUrl(s.icon, 'medium')}" alt="${s.specName}" loading="lazy">
          <div class="showcase-spec-info">
            <span class="showcase-spec-name">${s.specName}</span>
            <span class="showcase-class-name" style="color: ${s.color};">${s.className}</span>
          </div>
          <span class="showcase-spec-role">${roleBadge}</span>
        </div>
      `;
    }).join("");

    gridHost.querySelectorAll(".showcase-spec-card").forEach(card => {
      card.addEventListener("click", () => {
        const specId = card.dataset.specId;
        if (specId && typeof onSelectSpec === "function") {
          onSelectSpec(specId);
        }
      });
    });
  }

  tabsHost.addEventListener("click", (e) => {
    const btn = e.target.closest(".showcase-role-tab");
    if (!btn) return;
    const role = btn.dataset.role;
    if (role === activeRoleFilter) return;

    activeRoleFilter = role;
    tabsHost.querySelectorAll(".showcase-role-tab").forEach(b => {
      b.classList.toggle("active", b.dataset.role === role);
    });
    renderGrid();
  });

  renderGrid();
}
