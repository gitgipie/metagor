// ==========================================================================
// Seasonal Gearing & Upgrade Matrix — 2D Progression Matrix Grid Controller
// World of Warcraft: Midnight Season 2 (Patch 12.1 / 12.1.5)
// ==========================================================================

class GearingMatrixApp {
  constructor() {
    this.matrix = null;
    this.currentFilter = "all"; // 'all' | 'pve' | 'solo' | 'craft-pvp'
    this.searchQuery = "";
    this.density = "normal"; // 'normal' | 'compact'

    this.init();
  }

  async init() {
    try {
      await this.loadData();
      this.initDom();
      this.bindEvents();
      this.render();
    } catch (err) {
      console.error("[gearing-matrix] Boot error:", err);
      const host = document.getElementById("matrix-content");
      if (host) {
        host.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #f87171;">
            Failed to load seasonal matrix: ${err.message}
          </div>
        `;
      }
    }
  }

  async loadData() {
    const res = await fetch("./data/season_matrix.json?v=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching season_matrix.json`);
    this.matrix = await res.json();
  }

  initDom() {
    const meta = this.matrix.meta || {};
    const patchEl = document.getElementById("meta-patch");
    const seasonEl = document.getElementById("meta-season");
    const expNameEl = document.getElementById("expansion-name");

    if (patchEl && meta.patch) patchEl.textContent = `patch ${meta.patch}`;
    if (seasonEl && meta.season_name) seasonEl.textContent = meta.season_name;
    if (expNameEl && meta.expansion) expNameEl.textContent = meta.expansion;
  }

  bindEvents() {
    // Activity Filter Buttons
    const filterButtons = document.querySelectorAll(".activity-btn");
    filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentFilter = btn.getAttribute("data-filter") || "all";
        this.render();
      });
    });

    // Search Input
    const searchInput = document.getElementById("matrix-search");
    const clearBtn = document.getElementById("search-clear-btn");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        if (clearBtn) {
          clearBtn.style.display = this.searchQuery ? "block" : "none";
        }
        this.render();
      });
    }

    if (clearBtn && searchInput) {
      clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        this.searchQuery = "";
        clearBtn.style.display = "none";
        this.render();
        searchInput.focus();
      });
    }

    // Density Switch
    const densityButtons = document.querySelectorAll(".density-btn");
    densityButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        densityButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.density = btn.getAttribute("data-density") || "normal";

        const contentWrapper = document.getElementById("matrix-content");
        if (contentWrapper) {
          if (this.density === "compact") {
            contentWrapper.classList.add("density-compact");
          } else {
            contentWrapper.classList.remove("density-compact");
          }
        }
      });
    });
  }

  // Bind dynamic crosshair hover handlers
  bindGridHoverEvents() {
    const table = document.querySelector(".matrix-grid");
    if (!table) return;

    const cells = table.querySelectorAll("tbody td, thead th");
    cells.forEach(cell => {
      cell.addEventListener("mouseenter", () => {
        const colIndex = cell.getAttribute("data-col");
        if (colIndex !== null) {
          table.querySelectorAll(`[data-col="${colIndex}"]`).forEach(c => {
            c.classList.add("col-hover-active");
          });
        }
      });

      cell.addEventListener("mouseleave", () => {
        const colIndex = cell.getAttribute("data-col");
        if (colIndex !== null) {
          table.querySelectorAll(`[data-col="${colIndex}"]`).forEach(c => {
            c.classList.remove("col-hover-active");
          });
        }
      });
    });
  }

  render() {
    const host = document.getElementById("matrix-content");
    if (!host) return;

    host.innerHTML = this.render2DMatrixGrid();
    this.bindGridHoverEvents();
  }

  // ==========================================================================
  // 2D Progression Matrix Grid Renderer (Faithful to Community Excel Sheet)
  // ==========================================================================
  render2DMatrixGrid() {
    const rows = this.matrix.matrix_rows || [];
    const query = this.searchQuery;
    const filter = this.currentFilter;

    // Filter rows based on search query
    let filteredRows = rows.filter(row => {
      if (!query) return true;
      const textParts = [
        row.display_ilvl || row.ilvl.toString(),
        row.rank_name || "",
        row.tracks ? row.tracks.map(t => t.label).join(" ") : "",
        row.pvp || "",
        row.world || "",
        row.crafting || "",
        row.ascended_boost || "",
        row.prey?.hunt || "",
        row.prey?.souls || "",
        row.prey?.vault || "",
        row.delves?.coffer || "",
        row.delves?.trove || "",
        row.delves?.vault || "",
        row.dungeons?.drops || "",
        row.dungeons?.vault || "",
        row.raids?.lair || "",
        row.raids?.abyss || "",
        row.raids?.vault || ""
      ];
      return textParts.join(" ").toLowerCase().includes(query);
    });

    if (filteredRows.length === 0) {
      return `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">🔍</div>
          No progression milestones match "<strong>${escapeHtml(query)}</strong>".
        </div>
      `;
    }

    // Determine which column groups to show based on active filter
    const showPvP = filter === "all" || filter === "craft-pvp";
    const showWorld = filter === "all" || filter === "solo";
    const showCraft = filter === "all" || filter === "craft-pvp";
    const showBoost = filter === "all" || filter === "craft-pvp";
    const showPrey = filter === "all" || filter === "solo";
    const showDelves = filter === "all" || filter === "solo";
    const showDungeons = filter === "all" || filter === "pve";
    const showRaids = filter === "all" || filter === "pve";

    const html = [];
    html.push('<div class="matrix-grid-scroll-pane">');
    html.push('<table class="matrix-grid">');

    // 1. Multi-Tier Header (Super-Header & Sub-Header)
    html.push('<thead>');
    
    // Super-Header Row
    html.push('<tr class="super-header-row">');
    html.push('<th colspan="3" class="th-group-progression sticky-col-rank">Progression Milestones</th>');
    if (showPvP) html.push('<th colspan="1" class="th-group-pvp">⚔️ PVP</th>');
    if (showWorld) html.push('<th colspan="1" class="th-group-world">🗺️ Quests &amp; World</th>');
    if (showCraft) html.push('<th colspan="1" class="th-group-craft">⚒️ Crafted Gear</th>');
    if (showBoost) html.push('<th colspan="1" class="th-group-boost">🧪 12.1.5 Boost</th>');
    if (showPrey) html.push('<th colspan="3" class="th-group-prey">👁️ Prey Hunts</th>');
    if (showDelves) html.push('<th colspan="3" class="th-group-delves">🛡️ Delves</th>');
    if (showDungeons) html.push('<th colspan="2" class="th-group-dungeons">🗝️ Dungeons</th>');
    if (showRaids) html.push('<th colspan="3" class="th-group-raids">👑 Raids (12.1 / 12.1.5)</th>');
    html.push('</tr>');

    // Sub-Header Row with Column Index Tracking for Crosshair Hover
    let colIdx = 0;
    html.push('<tr class="sub-header-row">');
    
    // Pinned Left Columns
    html.push(`<th class="sticky-col-rank" data-col="${colIdx++}">Rank</th>`);
    html.push(`<th class="sticky-col-ilvl" data-col="${colIdx++}">Item Level</th>`);
    html.push(`<th class="sticky-col-track" data-col="${colIdx++}">Upgrade Track</th>`);

    // Dynamic Columns
    if (showPvP) html.push(`<th data-col="${colIdx++}">Arena / BG</th>`);
    if (showWorld) html.push(`<th data-col="${colIdx++}">Activities &amp; Quests</th>`);
    if (showCraft) html.push(`<th data-col="${colIdx++}">Base &amp; Crests</th>`);
    if (showBoost) html.push(`<th data-col="${colIdx++}">Venomstone Boost</th>`);
    if (showPrey) {
      html.push(`<th data-col="${colIdx++}">Hunt Reward</th>`);
      html.push(`<th data-col="${colIdx++}">Nightmare Souls</th>`);
      html.push(`<th data-col="${colIdx++}">Great Vault</th>`);
    }
    if (showDelves) {
      html.push(`<th data-col="${colIdx++}">Bountiful Coffers</th>`);
      html.push(`<th data-col="${colIdx++}">Trovehunter</th>`);
      html.push(`<th data-col="${colIdx++}">Great Vault</th>`);
    }
    if (showDungeons) {
      html.push(`<th data-col="${colIdx++}">Drops</th>`);
      html.push(`<th data-col="${colIdx++}">Great Vault &amp; Bonus</th>`);
    }
    if (showRaids) {
      html.push(`<th data-col="${colIdx++}">Lair / 1-Boss</th>`);
      html.push(`<th data-col="${colIdx++}">Venomous Abyss</th>`);
      html.push(`<th data-col="${colIdx++}">Great Vault &amp; Bonus</th>`);
    }

    html.push('</tr>');
    html.push('</thead>');

    // 2. Table Body (Rows)
    html.push('<tbody>');

    for (const r of filteredRows) {
      const rankId = r.rank_id || "unranked";
      const rowClass = `row-${rankId}`;
      const rankBadgeClass = `badge-rank-${rankId}`;
      const displayIlvl = r.display_ilvl || r.ilvl;

      // Track Ladder Pills
      const trackPills = (r.tracks && r.tracks.length > 0)
        ? r.tracks.map(t => {
            const pillClass = rankId === "peak" ? "track-pill-peak" : `track-pill-${t.track_id}`;
            return `<span class="track-pill ${pillClass}">${t.label}</span>`;
          }).join(" ")
        : (rankId === "peak"
            ? `<span class="track-pill track-pill-peak">Peak 9/9</span>`
            : `<span class="cell-empty">—</span>`);

      let dataCol = 0;
      html.push(`<tr class="${rowClass}">`);

      // 1. Rank (Sticky)
      html.push(`
        <td class="sticky-col-rank" data-col="${dataCol++}">
          <span class="badge-rank ${rankBadgeClass}">${r.rank_name || "Unranked"}</span>
        </td>
      `);

      // 2. Item Level (Sticky)
      html.push(`
        <td class="sticky-col-ilvl cell-ilvl" data-col="${dataCol++}">
          ${displayIlvl}
        </td>
      `);

      // 3. Upgrade Track (Sticky)
      html.push(`
        <td class="sticky-col-track" data-col="${dataCol++}">
          ${trackPills}
        </td>
      `);

      // 4. PVP
      if (showPvP) {
        html.push(`
          <td data-col="${dataCol++}">
            ${r.pvp ? `<span class="chip chip-pvp">${escapeHtml(r.pvp)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
      }

      // 5. Quests & World
      if (showWorld) {
        html.push(`
          <td data-col="${dataCol++}">
            ${r.world ? `<span class="chip chip-world">${escapeHtml(r.world)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
      }

      // 6. Crafted Gear
      if (showCraft) {
        html.push(`
          <td data-col="${dataCol++}">
            ${r.crafting ? `<span class="chip chip-craft">${escapeHtml(r.crafting)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
      }

      // 7. Ascendant Venomstone Boost (12.1.5)
      if (showBoost) {
        html.push(`
          <td data-col="${dataCol++}">
            ${r.ascended_boost ? `<span class="chip chip-boost">${escapeHtml(r.ascended_boost)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
      }

      // 8. Prey Hunts (3 cols)
      if (showPrey) {
        html.push(`
          <td data-col="${dataCol++}">
            ${r.prey?.hunt ? `<span class="chip chip-prey">${escapeHtml(r.prey.hunt)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
        html.push(`
          <td data-col="${dataCol++}">
            ${r.prey?.souls ? `<span class="chip chip-prey">${escapeHtml(r.prey.souls)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
        html.push(`
          <td data-col="${dataCol++}">
            ${r.prey?.vault ? `<span class="chip chip-prey" style="font-weight:700;">${escapeHtml(r.prey.vault)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
      }

      // 9. Delves (3 cols)
      if (showDelves) {
        html.push(`
          <td data-col="${dataCol++}">
            ${r.delves?.coffer ? `<span class="chip chip-delve-coffer">${escapeHtml(r.delves.coffer)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
        html.push(`
          <td data-col="${dataCol++}">
            ${r.delves?.trove ? `<span class="chip chip-delve-trove">${escapeHtml(r.delves.trove)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
        html.push(`
          <td data-col="${dataCol++}">
            ${r.delves?.vault ? `<span class="chip chip-delve-vault">Vault ${escapeHtml(r.delves.vault)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
      }

      // 10. Dungeons (2 cols)
      if (showDungeons) {
        html.push(`
          <td data-col="${dataCol++}">
            ${r.dungeons?.drops ? `<span class="chip chip-dungeon-drop">${escapeHtml(r.dungeons.drops)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
        html.push(`
          <td data-col="${dataCol++}">
            ${r.dungeons?.vault ? `<span class="chip chip-dungeon-vault">Vault ${escapeHtml(r.dungeons.vault)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
      }

      // 11. Raids (3 cols)
      if (showRaids) {
        html.push(`
          <td data-col="${dataCol++}">
            ${r.raids?.lair ? `<span class="chip chip-raid-lair">${escapeHtml(r.raids.lair)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
        html.push(`
          <td data-col="${dataCol++}">
            ${r.raids?.abyss ? `<span class="chip chip-raid-abyss">${escapeHtml(r.raids.abyss)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
        html.push(`
          <td data-col="${dataCol++}">
            ${r.raids?.vault ? `<span class="chip chip-raid-vault">Vault ${escapeHtml(r.raids.vault)}</span>` : '<span class="cell-empty">·</span>'}
          </td>
        `);
      }

      html.push('</tr>');
    }

    html.push('</tbody>');
    html.push('</table>');
    html.push('</div>'); // end matrix-grid-scroll-pane

    return html.join("");
  }
}

// Utility HTML Escaper
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Boot on DOM ready
window.addEventListener("DOMContentLoaded", () => {
  new GearingMatrixApp();
});
