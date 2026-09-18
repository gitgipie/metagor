// public/js/gearing-matrix.js
// Visual Progression Matrix Graph & Interactive Gearing Controller.
// Consumes data/season_matrix.json and data/aggregated_bis.json.

import { wowClasses, findClass, specId } from "./registry.js";
import { iconUrl } from "./icons.js";

class GearingMatrixApp {
  constructor() {
    this.matrix = null;
    this.bisData = null;
    this.currentMode = "graph"; // "graph" (Primary Visual Matrix) | "milestones" | "table"
    this.activeTracePath = "all"; // "all" | "mplus" | "delves" | "raids" | "crafting" | "pvp"
    this.selectedSpecKey = null;
    this.searchQuery = "";

    this.init();
  }

  async init() {
    try {
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

    // Path tracing buttons
    const pathButtons = document.querySelectorAll(".path-btn");
    pathButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        pathButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeTracePath = btn.dataset.path;
        this.applyPathTrace();
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

  applyPathTrace() {
    const path = this.activeTracePath;
    const nodes = document.querySelectorAll(".flow-node");
    if (!nodes.length) return;

    nodes.forEach(node => {
      if (path === "all") {
        node.classList.remove("dimmed", "highlighted");
      } else {
        const actType = node.dataset.activity;
        if (actType === path) {
          node.classList.add("highlighted");
          node.classList.remove("dimmed");
        } else {
          node.classList.add("dimmed");
          node.classList.remove("highlighted");
        }
      }
    });
  }

  render() {
    const container = document.getElementById("matrix-content");
    if (!container || !this.matrix) return;

    if (this.currentMode === "graph") {
      container.innerHTML = this.renderGraphMatrixView();
      this.applyPathTrace();
    } else if (this.currentMode === "milestones") {
      container.innerHTML = this.renderMilestonesView();
    } else if (this.currentMode === "table") {
      container.innerHTML = this.renderTableView();
    }
  }

  // ==========================================================================
  // 1. VISUAL PROGRESSION MATRIX GRAPH
  // ==========================================================================
  renderGraphMatrixView() {
    const brackets = [
      {
        id: "peak",
        rarityClass: "bracket-peak",
        pillClass: "pill-peak",
        pillLabel: "🔥 Peak Mythic Zenith",
        name: "Peak Mythic & Ascended Ceiling",
        ilvlRange: "ilvl 338 – 344",
        crestInfo: "Peak Ranks · Mythic Crests & Ascended Venomstone",
        nodes: [
          {
            activity: "raids",
            icon: "👑",
            actName: "Raid Encounters",
            title: "Mythic Last 2 & Kith'ix",
            badges: [
              { type: "rare", label: "Drop 344 (The Coiled Altar)" },
              { type: "vault", label: "Vault 344 (Mythic Last 2 + Kith'ix)" }
            ],
            notes: "Hex Lord's Dooming Idol, Silken Voodoo Drape, Girdle of Toxic Regret"
          },
          {
            activity: "crafting",
            icon: "⚒️",
            actName: "Ascended Crafting",
            title: "Patch 12.1.5 Venomstone Boosts",
            badges: [
              { type: "craft", label: "Craft 338 (Ascend Myth)" },
              { type: "craft", label: "Max 341 Boost" }
            ],
            notes: "Ultimate crafted power ceiling using Ascendent Venomstones"
          },
          {
            activity: "pvp",
            icon: "⚔️",
            actName: "Ranked PvP",
            title: "Conquest Scaling Max",
            badges: [
              { type: "drop", label: "PvE 292" },
              { type: "rare", label: "Arena/BG Scaled 344" }
            ],
            notes: "Conquest gladiatorial gear scales to ilvl 344 in rated PvP instances"
          }
        ]
      },
      {
        id: "myth",
        rarityClass: "bracket-myth",
        pillClass: "pill-myth",
        pillLabel: "🟠 Legendary / Mythic",
        name: "Mythic Tier Progression",
        ilvlRange: "ilvl 318 – 334",
        crestInfo: "6 Ranks · Requires Myth Crests (+80 for Crafts)",
        nodes: [
          {
            activity: "raids",
            icon: "👑",
            actName: "Raid Encounters",
            title: "Mythic Raid (The Venomous Abyss)",
            badges: [
              { type: "drop", label: "Boss Drops 318 (Myth 1/6)" },
              { type: "vault", label: "Standard Vault 334 (Myth 6/6)" }
            ],
            notes: "Endgame raid drops start at Myth 1/6 and vault reaches max standard rank 6/6"
          },
          {
            activity: "mplus",
            icon: "🗝️",
            actName: "Mythic+ Dungeons",
            title: "Keystone +10 or Higher",
            badges: [
              { type: "vault", label: "Weekly Vault 318 (Myth 1/6)" }
            ],
            notes: "Highest weekly Great Vault reward accessible from dungeon keystones"
          },
          {
            activity: "crafting",
            icon: "⚒️",
            actName: "Crafted Equipment",
            title: "Spark + 80 Myth Crests",
            badges: [
              { type: "craft", label: "Craft 321 (Myth 2/6)" },
              { type: "craft", label: "Ascend Hero 325/328" }
            ],
            notes: "Empowered craft matches Mythic raid item level"
          },
          {
            activity: "pvp",
            icon: "⚔️",
            actName: "World Boss",
            title: "Nymrissa - Mythic Encounter",
            badges: [
              { type: "drop", label: "World Drop 318 (Myth 1/6)" }
            ],
            notes: "Rotating outdoor world encounter"
          }
        ]
      },
      {
        id: "hero",
        rarityClass: "bracket-hero",
        pillClass: "pill-hero",
        pillLabel: "🟣 Epic / Heroic",
        name: "Heroic Tier Progression",
        ilvlRange: "ilvl 305 – 321",
        crestInfo: "6 Ranks · Requires Gilded / Hero Crests",
        nodes: [
          {
            activity: "raids",
            icon: "👑",
            actName: "Raid Encounters",
            title: "Heroic Raid (The Venomous Abyss)",
            badges: [
              { type: "drop", label: "Boss Drops 305 (Hero 1/6)" },
              { type: "rare", label: "Kith'ix 311 (Hero 3/6)" },
              { type: "vault", label: "Normal Vault 305 (Hero 1/6)" }
            ],
            notes: "Heroic drops upgrade up to 321 ilvl (Hero 6/6)"
          },
          {
            activity: "mplus",
            icon: "🗝️",
            actName: "Mythic+ Dungeons",
            title: "Keystones +6 to +10+",
            badges: [
              { type: "drop", label: "Drops 305–311 (Hero 1–3)" },
              { type: "vault", label: "Vault 305–315 (+2 to +9)" }
            ],
            notes: "+6/+7 drops 305, +8/+9 drops 308, +10+ drops 311. Vault reaches 315 at +7 to +9"
          },
          {
            activity: "delves",
            icon: "🛡️",
            actName: "Delves Progression",
            title: "Tier 8 to 11 Delves",
            badges: [
              { type: "drop", label: "Trove 305 (T8–11)" },
              { type: "vault", label: "Weekly Vault 305 (Hero 1/6)" }
            ],
            notes: "Tier 8+ Delve Great Vault awards Hero 1/6 (305); T11 Journey 9 drops Tormented Soul (305)"
          },
          {
            activity: "crafting",
            icon: "⚒️",
            actName: "Crafted Equipment",
            title: "Spark + 80 Hero Crests",
            badges: [
              { type: "craft", label: "Craft 308 (Hero 2/6)" }
            ],
            notes: "Infused with 80 Gilded/Hero Crests"
          }
        ]
      },
      {
        id: "champion",
        rarityClass: "bracket-champion",
        pillClass: "pill-champion",
        pillLabel: "🔵 Rare / Champion",
        name: "Champion Tier Progression",
        ilvlRange: "ilvl 292 – 315",
        crestInfo: "8 Ranks · Requires Runed Crests",
        nodes: [
          {
            activity: "raids",
            icon: "👑",
            actName: "Raid Encounters",
            title: "Normal Raid (The Venomous Abyss)",
            badges: [
              { type: "drop", label: "Boss Drops 292 (Champion 1/8)" },
              { type: "rare", label: "Kith'ix 298 (Champion 3/8)" },
              { type: "vault", label: "LFR Vault 292 (Champion 1/8)" }
            ],
            notes: "Normal raid drops upgrade through 315 ilvl (Champion 8/8)"
          },
          {
            activity: "mplus",
            icon: "🗝️",
            actName: "Mythic+ Dungeons",
            title: "Mythic 0 (M0) to Key +5",
            badges: [
              { type: "drop", label: "Drops 292–302 (M0–+5)" },
              { type: "vault", label: "Vault 302 (M0 Vault)" }
            ],
            notes: "M0 drops 292, +2/+3 drops 295, +4 drops 298, +5 drops 302"
          },
          {
            activity: "delves",
            icon: "🛡️",
            actName: "Delves Progression",
            title: "Tier 7 to 11 Bountiful Delves",
            badges: [
              { type: "drop", label: "Coffer 292–295 (T7–11)" },
              { type: "vault", label: "Vault 298–302 (T6–7)" }
            ],
            notes: "Bountiful Coffers with Restored Keys drop Champion 1/8 and 2/8"
          },
          {
            activity: "crafting",
            icon: "⚒️",
            actName: "Crafted Equipment",
            title: "Spark of Tides (Base Crafted)",
            badges: [
              { type: "craft", label: "Base Craft 295 (Champion 2/8)" }
            ],
            notes: "Foundational Season 2 spark craft"
          },
          {
            activity: "pvp",
            icon: "⚔️",
            actName: "Ranked PvP & World",
            title: "Conquest Gear & Relics",
            badges: [
              { type: "drop", label: "Conquest 292 (Scales to 344)" },
              { type: "drop", label: "2 Atal'Utek Fragments (292)" }
            ],
            notes: "Conquest equipment base starts on Champion track"
          }
        ]
      },
      {
        id: "veteran",
        rarityClass: "bracket-veteran",
        pillClass: "pill-veteran",
        pillLabel: "🟢 Uncommon / Veteran",
        name: "Veteran Tier Progression",
        ilvlRange: "ilvl 279 – 302",
        crestInfo: "8 Ranks · Requires Carved Crests",
        nodes: [
          {
            activity: "raids",
            icon: "👑",
            actName: "Raid Encounters",
            title: "Raid Finder (LFR)",
            badges: [
              { type: "drop", label: "LFR Drops 279 (Veteran 1/8)" },
              { type: "rare", label: "Kith'ix LFR 285 (Veteran 3/8)" }
            ],
            notes: "Introductory raid tier drops Veteran 1/8"
          },
          {
            activity: "mplus",
            icon: "🗝️",
            actName: "Dungeon Vault",
            title: "Heroic Dungeon Great Vault",
            badges: [
              { type: "vault", label: "Heroic Vault 289 (Veteran 4/8)" }
            ],
            notes: "Weekly Great Vault from running Heroic Dungeons"
          },
          {
            activity: "delves",
            icon: "🛡️",
            actName: "Delves Progression",
            title: "Tier 5 & 6 Delves",
            badges: [
              { type: "drop", label: "Coffer 279–282 (T5–6)" },
              { type: "drop", label: "Trove 282–289 (T4–5)" },
              { type: "vault", label: "Vault 279–289 (T1–4)" }
            ],
            notes: "Tier 1–4 Delve Great Vault yields Veteran 1/8 to 4/8"
          },
          {
            activity: "crafting",
            icon: "⚒️",
            actName: "Crafted Equipment",
            title: "Blue Craft + 80 Veteran Crests",
            badges: [
              { type: "craft", label: "Craft 282 (Veteran 2/8)" }
            ],
            notes: "Intermediate craft"
          },
          {
            activity: "pvp",
            icon: "⚔️",
            actName: "PvP & Outdoor Events",
            title: "Field Accolades & War Mode",
            badges: [
              { type: "drop", label: "Field Accolades 279" },
              { type: "drop", label: "Pinnacle Cache 285" },
              { type: "drop", label: "War Mode 289 (Scales 331)" }
            ],
            notes: "Weekly outdoor meta achievements and Bloody Token gear"
          }
        ]
      },
      {
        id: "adventurer",
        rarityClass: "bracket-adventurer",
        pillClass: "pill-adventurer",
        pillLabel: "⚪ Common / Adventurer",
        name: "Adventurer Tier Progression",
        ilvlRange: "ilvl 266 – 289",
        crestInfo: "8 Ranks · Requires Weathered Crests",
        nodes: [
          {
            activity: "mplus",
            icon: "🗝️",
            actName: "Dungeon Drops",
            title: "Heroic Dungeons",
            badges: [
              { type: "drop", label: "Boss Drops 276 (Adventurer 4/8)" }
            ],
            notes: "End-of-run drops from Heroic dungeon bosses"
          },
          {
            activity: "delves",
            icon: "🛡️",
            actName: "Delves Progression",
            title: "Tier 1 to 4 Bountiful Delves",
            badges: [
              { type: "drop", label: "Coffer 266–276 (Tier 1–4)" }
            ],
            notes: "Starter Bountiful delve chests drop Adventurer ranks 1 through 4"
          },
          {
            activity: "crafting",
            icon: "⚒️",
            actName: "Crafted Equipment",
            title: "Blue Craft + 80 Adventurer Crests",
            badges: [
              { type: "craft", label: "Starter Craft 266 (Adv 1/8)" }
            ],
            notes: "Introductory profession crafts"
          },
          {
            activity: "pvp",
            icon: "⚔️",
            actName: "World Activities",
            title: "World Quests & Prey Hunts",
            badges: [
              { type: "drop", label: "World Quests 266" },
              { type: "drop", label: "Normal Prey Hunt 266" }
            ],
            notes: "Outdoor zone quests and hunt events"
          }
        ]
      },
      {
        id: "unranked",
        rarityClass: "bracket-unranked",
        pillClass: "pill-unranked",
        pillLabel: "🔘 Poor / Unranked",
        name: "Unranked & Leveling Starter",
        ilvlRange: "ilvl 201 – 263",
        crestInfo: "Starter Leveling Gear · Not Upgradeable",
        nodes: [
          {
            activity: "pvp",
            icon: "⚔️",
            actName: "Story Campaign",
            title: "12.1 Campaign & Leveling",
            badges: [
              { type: "drop", label: "12.1 Campaign 256" },
              { type: "drop", label: "Leveling 201–214" }
            ],
            notes: "Midnight story quest rewards"
          },
          {
            activity: "mplus",
            icon: "🗝️",
            actName: "Dungeons",
            title: "Normal & Follower Dungeons",
            badges: [
              { type: "drop", label: "Drops 259 (Unranked)" }
            ],
            notes: "Story mode dungeon drops"
          },
          {
            activity: "pvp",
            icon: "⚔️",
            actName: "Starter PvP",
            title: "Honor Equipment",
            badges: [
              { type: "drop", label: "PvE 263" },
              { type: "vault", label: "Arena/BG Scaled 331" }
            ],
            notes: "Purchased with Honor; scales to ilvl 331 in PvP"
          }
        ]
      }
    ];

    const html = [];
    html.push('<div class="graph-matrix-view">');

    for (const b of brackets) {
      html.push(`
        <div class="tier-bracket ${b.rarityClass}" data-tier="${b.id}">
          <div class="tier-header">
            <div class="tier-identity">
              <span class="tier-rarity-pill ${b.pillClass}">${b.pillLabel}</span>
              <h3 class="tier-name">${b.name}</h3>
              <span class="tier-ilvl-badge">${b.ilvlRange}</span>
            </div>
            <div class="tier-meta-badges">
              <span class="tier-crest-tag">${b.crestInfo}</span>
            </div>
          </div>

          <div class="tier-flow-grid">
            ${b.nodes.map(n => `
              <div class="flow-node" data-activity="${n.activity}">
                <div class="flow-node-header">
                  <span class="flow-node-activity">
                    <span>${n.icon}</span> ${n.actName}
                  </span>
                </div>
                <div class="flow-node-content">${n.title}</div>
                <div class="flow-node-badges">
                  ${n.badges.map(bg => `<span class="badge-${bg.type}">${bg.label}</span>`).join("")}
                </div>
                ${n.notes ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${n.notes}</div>` : ""}
              </div>
            `).join("")}
          </div>
        </div>
      `);
    }

    html.push('</div>');
    return html.join("");
  }

  // ==========================================================================
  // 2. MILESTONES VIEW (Deep-Dive Activity Cards)
  // ==========================================================================
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
              <span>🗝️</span> Mythic+ Keystones
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
              <span>🛡️</span> Delves Progression
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
              <span>👑</span> Raid Difficulties
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
              <span>⚒️</span> Crafted Gear &amp; Boosts
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

  // ==========================================================================
  // 3. TABLE VIEW (Compact Data Reference)
  // ==========================================================================
  renderTableView() {
    const rows = this.matrix.matrix_rows || [];
    const query = this.searchQuery;

    let filteredRows = rows.filter(row => {
      if (!query) return true;
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

      return textContent.includes(query);
    });

    if (filteredRows.length === 0) {
      return `
        <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
          No gearing entries match the search query.
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
      const isPeak = r.ilvl >= 337;
      const trackBadges = r.tracks.length > 0
        ? r.tracks.map(t => {
            const badgeClass = isPeak ? "track-peak" : `track-${t.track_id}`;
            return `<span class="track-badge ${badgeClass}">${t.label}</span>`;
          }).join(" ")
        : (isPeak ? `<span class="track-badge track-peak">Peak Mythic</span>` : `<span class="track-badge track-unranked">Unranked</span>`);

      const mpLines = [];
      if (r.mythic_plus.drops) mpLines.push(`<span class="badge-drop">Drop</span> <span>${r.mythic_plus.drops}</span>`);
      if (r.mythic_plus.vault) mpLines.push(`<span class="badge-vault">Vault</span> <span>${r.mythic_plus.vault}</span>`);
      const mpContent = mpLines.length ? `<div class="activity-cell">${mpLines.map(l => `<div>${l}</div>`).join("")}</div>` : `<span class="activity-subtext">—</span>`;

      const delveLines = [];
      if (r.delves.coffer) delveLines.push(`<span class="badge-drop">Coffer</span> <span>${r.delves.coffer}</span>`);
      if (r.delves.trove) delveLines.push(`<span class="badge-drop" style="color:#64b5f6; border-color:rgba(100,181,246,0.3); background:rgba(100,181,246,0.1);">Trove</span> <span>${r.delves.trove}</span>`);
      if (r.delves.vault) delveLines.push(`<span class="badge-vault">Vault</span> <span>${r.delves.vault}</span>`);
      const delveContent = delveLines.length ? `<div class="activity-cell">${delveLines.map(l => `<div>${l}</div>`).join("")}</div>` : `<span class="activity-subtext">—</span>`;

      const raidLines = [];
      if (r.raids.drops) raidLines.push(`<span class="badge-drop">Boss</span> <span>${r.raids.drops}</span>`);
      if (r.raids.rare_drops) raidLines.push(`<span class="badge-rare">Rare</span> <span>${r.raids.rare_drops}</span>`);
      if (r.raids.vault) raidLines.push(`<span class="badge-vault">Vault</span> <span>${r.raids.vault}</span>`);
      const raidContent = raidLines.length ? `<div class="activity-cell">${raidLines.map(l => `<div>${l}</div>`).join("")}</div>` : `<span class="activity-subtext">—</span>`;

      const craftLines = [];
      if (r.crafting) craftLines.push(`<div><span class="badge-craft">Craft</span> <span>${r.crafting}</span></div>`);
      if (r.ascended_boost) craftLines.push(`<div><span class="badge-rare">Ascended</span> <span>${r.ascended_boost}</span></div>`);
      const craftContent = craftLines.length ? `<div class="activity-cell">${craftLines.join("")}</div>` : `<span class="activity-subtext">—</span>`;

      const wpContent = r.pvp_and_world ? `<div><span>${r.pvp_and_world}</span></div>` : `<span class="activity-subtext">—</span>`;

      html.push(`
        <tr ${isPeak ? 'style="background:rgba(255,69,0,0.05);"' : ""}>
          <td class="col-ilvl" ${isPeak ? 'style="color:#ff6b35;"' : ""}>${r.ilvl}</td>
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
}

// Boot on DOM ready
window.addEventListener("DOMContentLoaded", () => {
  new GearingMatrixApp();
});
