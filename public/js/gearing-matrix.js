// public/js/gearing-matrix.js
// Frontend controller for the Seasonal Gearing & Upgrade Matrix.
// Consumes data/season_matrix.json and data/aggregated_bis.json.

import { wowClasses, findClass, specId } from "./registry.js";
import { iconUrl } from "./icons.js";

class GearingMatrixApp {
  constructor() {
    this.matrix = null;
    this.bisData = null;
    this.currentMode = "table"; // "table" | "milestones" | "calculator"
    this.selectedActivity = "all";
    this.selectedTrack = "all";
    this.searchQuery = "";
    this.selectedSpecKey = null;

    this.init();
  }

  async init() {
    try {
      // Parallel fetch for season matrix and live BiS data
      const [matrixRes, bisRes] = await Promise.all([
        fetch("./data/season_matrix.json"),
        fetch("./data/aggregated_bis.json")
      ]);

      if (!matrixRes.ok) throw new Error(`Failed to load season matrix: ${matrixRes.status}`);
      this.matrix = await matrixRes.json();

      if (bisRes.ok) {
        this.bisData = await bisRes.json();
      }

      this.updateHeaderMeta();
      this.buildSpecSelector();
      this.bindEvents();
      this.render();
    } catch (err) {
      console.error("[gearing-matrix] Initialization error:", err);
      const container = document.getElementById("matrix-content");
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #ff6b6b;">
            Failed to load seasonal matrix data. Please refresh or try again later.
          </div>
        `;
      }
    }
  }

  updateHeaderMeta() {
    if (!this.matrix || !this.matrix.meta) return;
    const meta = this.matrix.meta;
    const patchEl = document.getElementById("meta-patch");
    const seasonEl = document.getElementById("meta-season");
    const expansionEl = document.getElementById("expansion-name");

    if (patchEl) patchEl.textContent = `patch ${meta.patch}`;
    if (seasonEl) seasonEl.textContent = `season ${meta.season_id} (${meta.season_name})`;
    if (expansionEl && meta.expansion) expansionEl.textContent = meta.expansion;
  }

  buildSpecSelector() {
    const select = document.getElementById("spec-filter-select");
    if (!select) return;

    select.innerHTML = '<option value="">-- No Spec Filter (Show All) --</option>';

    for (const cls of wowClasses) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = cls.name;
      for (const spec of cls.specs) {
        const fullSpecKey = specId(cls.id, spec);
        const opt = document.createElement("option");
        opt.value = fullSpecKey;
        opt.textContent = `${cls.name} · ${spec}`;
        optgroup.appendChild(opt);
      }
      select.appendChild(optgroup);
    }

    select.addEventListener("change", (e) => {
      this.selectedSpecKey = e.target.value || null;
      this.render();
    });
  }

  bindEvents() {
    // Mode switcher buttons
    const modeButtons = document.querySelectorAll(".matrix-mode-btn");
    modeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        modeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentMode = btn.dataset.mode;
        this.render();
      });
    });

    // Activity filter pills
    const activityPills = document.querySelectorAll(".filter-pill[data-activity]");
    activityPills.forEach(pill => {
      pill.addEventListener("click", () => {
        activityPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.selectedActivity = pill.dataset.activity;
        this.render();
      });
    });

    // Track filter pills
    const trackPills = document.querySelectorAll(".filter-pill[data-track]");
    trackPills.forEach(pill => {
      pill.addEventListener("click", () => {
        trackPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.selectedTrack = pill.dataset.track;
        this.render();
      });
    });

    // Search input
    const searchInput = document.getElementById("matrix-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = (e.target.value || "").toLowerCase().trim();
        this.render();
      });
    }
  }

  render() {
    const container = document.getElementById("matrix-content");
    if (!container || !this.matrix) return;

    if (this.currentMode === "table") {
      container.innerHTML = this.renderTableView();
    } else if (this.currentMode === "milestones") {
      container.innerHTML = this.renderMilestonesView();
    } else if (this.currentMode === "calculator") {
      container.innerHTML = this.renderCalculatorView();
      this.bindCalculatorEvents();
    }
  }

  // --- 1. Table View ---
  renderTableView() {
    const rows = this.matrix.matrix_rows || [];
    const query = this.searchQuery;
    const actFilter = this.selectedActivity;
    const trackFilter = this.selectedTrack;

    let filteredRows = rows.filter(row => {
      // Track filter
      if (trackFilter !== "all") {
        const hasTrack = row.tracks.some(t => t.track_id === trackFilter);
        if (!hasTrack) return false;
      }

      // Activity filter
      if (actFilter === "mythic_plus") {
        if (!row.mythic_plus.drops && !row.mythic_plus.vault) return false;
      } else if (actFilter === "delves") {
        if (!row.delves.coffer && !row.delves.trove && !row.delves.vault) return false;
      } else if (actFilter === "raids") {
        if (!row.raids.drops && !row.raids.rare_drops && !row.raids.vault) return false;
      } else if (actFilter === "crafting") {
        if (!row.crafting && !row.ascended_boost) return false;
      } else if (actFilter === "pvp_world") {
        if (!row.pvp_and_world) return false;
      }

      // Text search query
      if (query) {
        const textContent = [
          row.ilvl.toString(),
          row.tracks.map(t => t.label).join(" "),
          row.mythic_plus.drops || "",
          row.mythic_plus.vault || "",
          row.delves.coffer || "",
          row.delves.trove || "",
          row.delves.vault || "",
          row.raids.drops || "",
          row.raids.rare_drops || "",
          row.raids.vault || "",
          row.crafting || "",
          row.pvp_and_world || "",
          row.ascended_boost || ""
        ].join(" ").toLowerCase();

        if (!textContent.includes(query)) return false;
      }

      return true;
    });

    if (filteredRows.length === 0) {
      return `
        <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
          No gearing entries match the selected filters.
        </div>
      `;
    }

    const html = [];
    html.push(`
      <div class="matrix-table-container">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="col-ilvl">Item Level</th>
              <th>Upgrade Tracks</th>
              <th>Mythic+ Dungeons</th>
              <th>Delves</th>
              <th>Raid Encounters</th>
              <th>Crafting &amp; Boosts</th>
              <th>World &amp; PvP</th>
            </tr>
          </thead>
          <tbody>
    `);

    for (const r of filteredRows) {
      // Track badges
      const trackBadges = r.tracks.length > 0
        ? r.tracks.map(t => `<span class="track-badge track-${t.track_id}">${t.label}</span>`).join(" ")
        : `<span class="track-badge track-unranked">Unranked</span>`;

      // M+ cell
      const mpLines = [];
      if (r.mythic_plus.drops) {
        mpLines.push(`<span class="badge-drop">Drop</span> <span>${r.mythic_plus.drops}</span>`);
      }
      if (r.mythic_plus.vault) {
        mpLines.push(`<span class="badge-vault">Vault</span> <span>${r.mythic_plus.vault}</span>`);
      }
      const mpContent = mpLines.length ? `<div class="activity-cell">${mpLines.map(l => `<div>${l}</div>`).join("")}</div>` : `<span class="activity-subtext">—</span>`;

      // Delves cell
      const delveLines = [];
      if (r.delves.coffer) {
        delveLines.push(`<span class="badge-drop">Coffer</span> <span>${r.delves.coffer}</span>`);
      }
      if (r.delves.trove) {
        delveLines.push(`<span class="badge-drop" style="color:#64b5f6; border-color:rgba(100,181,246,0.3); background:rgba(100,181,246,0.1);">Trove</span> <span>${r.delves.trove}</span>`);
      }
      if (r.delves.vault) {
        delveLines.push(`<span class="badge-vault">Vault</span> <span>${r.delves.vault}</span>`);
      }
      const delveContent = delveLines.length ? `<div class="activity-cell">${delveLines.map(l => `<div>${l}</div>`).join("")}</div>` : `<span class="activity-subtext">—</span>`;

      // Raids cell
      const raidLines = [];
      if (r.raids.drops) {
        raidLines.push(`<span class="badge-drop">Boss</span> <span>${r.raids.drops}</span>`);
      }
      if (r.raids.rare_drops) {
        raidLines.push(`<span class="badge-rare">Rare</span> <span>${r.raids.rare_drops}</span>`);
      }
      if (r.raids.vault) {
        raidLines.push(`<span class="badge-vault">Vault</span> <span>${r.raids.vault}</span>`);
      }
      const raidContent = raidLines.length ? `<div class="activity-cell">${raidLines.map(l => `<div>${l}</div>`).join("")}</div>` : `<span class="activity-subtext">—</span>`;

      // Crafting cell
      const craftLines = [];
      if (r.crafting) {
        craftLines.push(`<div><span class="badge-drop" style="color:#d4a373; border-color:rgba(212,163,115,0.3); background:rgba(212,163,115,0.1);">Craft</span> <span>${r.crafting}</span></div>`);
      }
      if (r.ascended_boost) {
        craftLines.push(`<div><span class="badge-rare" style="color:#b388ff; border-color:rgba(179,136,255,0.3); background:rgba(179,136,255,0.1);">Ascended</span> <span>${r.ascended_boost}</span></div>`);
      }
      const craftContent = craftLines.length ? `<div class="activity-cell">${craftLines.join("")}</div>` : `<span class="activity-subtext">—</span>`;

      // World & PvP cell
      const wpContent = r.pvp_and_world ? `<div><span>${r.pvp_and_world}</span></div>` : `<span class="activity-subtext">—</span>`;

      html.push(`
        <tr>
          <td class="col-ilvl">${r.ilvl}</td>
          <td>${trackBadges}</td>
          <td>${mpContent}</td>
          <td>${delveContent}</td>
          <td>${raidContent}</td>
          <td>${craftContent}</td>
          <td>${wpContent}</td>
        </tr>
      `);
    }

    html.push(`
          </tbody>
        </table>
      </div>
    `);

    return html.join("");
  }

  // --- 2. Milestones View ---
  renderMilestonesView() {
    const act = this.matrix.activities || {};
    const html = [];

    html.push('<div class="milestones-view">');

    // Mythic+ Card
    if (act.mythic_plus) {
      html.push(`
        <div class="milestone-card">
          <div class="milestone-header">
            <div class="milestone-title">
              <span>&#x1F5DD;</span> Mythic+ Keystones
            </div>
            <span class="milestone-badge">${act.mythic_plus.length} Milestones</span>
          </div>
          <div class="milestone-rows">
            ${act.mythic_plus.map(m => `
              <div class="milestone-row">
                <div class="milestone-key">${m.level}</div>
                <div class="milestone-values">
                  <span class="badge-drop">Drop ${m.drop_ilvl}</span>
                  <span class="badge-vault">Vault ${m.vault_ilvl}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `);
    }

    // Delves Card
    if (act.delves) {
      html.push(`
        <div class="milestone-card">
          <div class="milestone-header">
            <div class="milestone-title">
              <span>&#x1F6E1;</span> Delves Progression
            </div>
            <span class="milestone-badge">Tiers 1–11</span>
          </div>
          <div class="milestone-rows">
            ${act.delves.map(d => `
              <div class="milestone-row">
                <div class="milestone-key">${d.tier}</div>
                <div class="milestone-values">
                  <span class="badge-drop">Coffer ${d.coffer_ilvl}</span>
                  ${d.trove_ilvl ? `<span class="badge-drop" style="color:#64b5f6; border-color:rgba(100,181,246,0.3); background:rgba(100,181,246,0.1);">Trove ${d.trove_ilvl}</span>` : ""}
                  <span class="badge-vault">Vault ${d.vault_ilvl}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `);
    }

    // Raids Card
    if (act.raids) {
      html.push(`
        <div class="milestone-card">
          <div class="milestone-header">
            <div class="milestone-title">
              <span>&#x1F451;</span> Raid Difficulties
            </div>
            <span class="milestone-badge">4 Difficulties</span>
          </div>
          <div class="milestone-rows">
            ${act.raids.map(r => `
              <div class="milestone-row">
                <div class="milestone-key">${r.difficulty}</div>
                <div class="milestone-values">
                  <span class="badge-drop">Boss ${r.boss_drops_ilvl}</span>
                  <span class="badge-rare">Rare ${r.rare_drops_ilvl}</span>
                  <span class="badge-vault">Vault ${r.vault_ilvl}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `);
    }

    // Crafting Card
    if (act.crafting) {
      html.push(`
        <div class="milestone-card">
          <div class="milestone-header">
            <div class="milestone-title">
              <span>&#x2692;</span> Crafted Gear &amp; Boosts
            </div>
            <span class="milestone-badge">Crest Steps</span>
          </div>
          <div class="milestone-rows">
            ${act.crafting.map(c => `
              <div class="milestone-row">
                <div class="milestone-key">${c.name}</div>
                <div class="milestone-values">
                  <span class="badge-drop" style="color:#d4a373; border-color:rgba(212,163,115,0.3); background:rgba(212,163,115,0.1);">${c.ilvl}</span>
                  <span class="track-badge track-adventurer" style="margin:0;">${c.track}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `);
    }

    html.push("</div>");
    return html.join("");
  }

  // --- 3. Calculator View ---
  renderCalculatorView() {
    const tracks = this.matrix.tracks || [];

    return `
      <div class="upgrade-calc-panel">
        <h3 style="margin: 0 0 8px 0; color: var(--gold-text); font-size: 1.25rem;">Interactive Upgrade Pathway Calculator</h3>
        <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 20px;">
          Select your item's current upgrade track to view the rank steps, required crests, and maximum item level ceiling.
        </p>

        <div class="calc-selector-row">
          <div>
            <label class="filter-label">Select Track:</label>
            <select id="calc-track-select" class="spec-filter-select">
              ${tracks.map(t => `<option value="${t.id}">${t.name} (${t.ranks} Ranks · ${t.steps[0].ilvl}–${t.steps[t.steps.length - 1].ilvl})</option>`).join("")}
            </select>
          </div>
          <div id="calc-crest-info" style="font-size: 0.85rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;"></div>
        </div>

        <div class="upgrade-ladder-container" id="upgrade-ladder"></div>
      </div>
    `;
  }

  bindCalculatorEvents() {
    const select = document.getElementById("calc-track-select");
    if (!select) return;

    const renderLadder = (trackId) => {
      const track = (this.matrix.tracks || []).find(t => t.id === trackId);
      const ladderHost = document.getElementById("upgrade-ladder");
      const crestInfoHost = document.getElementById("calc-crest-info");
      if (!track || !ladderHost) return;

      const crest = (this.matrix.crest_types || []).find(c => c.id === track.crest);
      if (crestInfoHost && crest) {
        crestInfoHost.innerHTML = `
          <span>Required Crest:</span>
          <span class="badge-vault" style="color: var(--gold-text);">${crest.name}</span>
          <span style="color: var(--text-muted);">(${crest.source})</span>
        `;
      }

      ladderHost.innerHTML = track.steps.map((step, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === track.steps.length - 1;
        const cls = isLast ? "ladder-step max" : (isFirst ? "ladder-step current" : "ladder-step");
        return `
          <div class="${cls}">
            <div class="step-rank">Rank ${step.rank}/${track.ranks}</div>
            <div class="step-ilvl">${step.ilvl}</div>
            <div class="step-cost">${isFirst ? "Base Drop" : "15 Crests"}</div>
          </div>
        `;
      }).join("");
    };

    select.addEventListener("change", (e) => renderLadder(e.target.value));
    renderLadder(select.value);
  }
}

// Boot
window.addEventListener("DOMContentLoaded", () => {
  new GearingMatrixApp();
});
