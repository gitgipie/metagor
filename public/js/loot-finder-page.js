// public/js/loot-finder-page.js
// Loot Finder page controller. Moved out of an inline <script> in loot-finder.html
// so the page works under a strict Content-Security-Policy (script-src 'self').

import { wowClasses, findClass, specId } from "./registry.js";
import { iconUrl } from "./icons.js";
import { escapeHtml } from "./escape.js";
import { ensureWowheadScript } from "./wowhead.js";
import { DungeonCalculator, renderItemTooltip, positionTooltip } from "./loot-finder.js";

let globalData = null;
let calculator = null;
let currentClass = "monk";
let currentSpec = "Brewmaster";
let currentMode = "dungeons"; // "dungeons" | "raids" | "both"
let tierOnlyMode = false;
let currentSlotFilter = "all"; // "all" | "head" | "shoulders" | "chest" | "hands" | "legs"
let currentEvalResult = null;

async function loadData() {
  try {
    const resp = await fetch("./data/aggregated_bis.json");
    if (resp.ok) return await resp.json();
  } catch (e) {}
  try {
    const resp2 = await fetch("../data/aggregated_bis.json");
    if (resp2.ok) return await resp2.json();
  } catch (e) {}
  throw new Error("Could not find aggregated_bis.json at ./data/ or ../data/");
}

async function init() {
  try {
    ensureWowheadScript();
    globalData = await loadData();
    calculator = new DungeonCalculator(globalData);

    bindModeButtons();
    bindTierToggle();
    bindTooltips();
    renderClassSelectors();
    const specContainer = document.getElementById("spec-selectors");
    if (specContainer) {
      specContainer.classList.add("dock-rollout");
    }
    selectSpec(currentClass, currentSpec);
  } catch (err) {
    console.error("Failed to load aggregated data:", err);
    document.getElementById("dungeons-container").innerHTML = `
      <div style="text-align:center; padding: 40px; color: #ef4444;">
        Failed to load data: ${escapeHtml(err.message)}
      </div>`;
  }
}

function bindModeButtons() {
  const modeBar = document.getElementById("calc-mode-bar");
  modeBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode-btn");
    if (!btn) return;
    const mode = btn.dataset.mode;
    if (mode === currentMode) return;

    currentMode = mode;
    modeBar.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    modeBar.classList.remove("rollout-pulse");
    void modeBar.offsetWidth;
    modeBar.classList.add("rollout-pulse");

    selectSpec(currentClass, currentSpec);
  });
}

function bindTierToggle() {
  const toggleBtn = document.getElementById("tier-only-toggle");
  const cluster = document.getElementById("tier-filter-cluster");
  const subbar = document.getElementById("tier-slot-subbar");

  function setTierMode(enabled, slot = "all") {
    tierOnlyMode = enabled;
    currentSlotFilter = slot;

    if (tierOnlyMode) {
      toggleBtn.classList.add("active");
      cluster.classList.add("active");
      subbar.classList.add("active");
      subbar.classList.remove("inactive");
    } else {
      toggleBtn.classList.remove("active");
      cluster.classList.remove("active");
      subbar.classList.remove("active");
      subbar.classList.add("inactive");
      currentSlotFilter = "all";
    }

    subbar.querySelectorAll(".slot-filter-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.slot === currentSlotFilter);
    });

    selectSpec(currentClass, currentSpec);
  }

  toggleBtn.addEventListener("click", () => {
    setTierMode(!tierOnlyMode, tierOnlyMode ? "all" : currentSlotFilter);
  });

  subbar.addEventListener("click", (e) => {
    const btn = e.target.closest(".slot-filter-btn");
    if (!btn) return;
    const slot = btn.dataset.slot;

    // If tier mode is off, clicking a slot pill automatically turns tier mode on for that slot
    if (!tierOnlyMode) {
      setTierMode(true, slot);
      return;
    }

    if (slot === currentSlotFilter) return;
    setTierMode(true, slot);
  });
}

function bindTooltips() {
  const tt = document.getElementById("metagor-item-tooltip");
  const container = document.getElementById("dungeons-container");

  container.addEventListener("mouseover", (e) => {
    const itemEl = e.target.closest("[data-item-id]");
    if (!itemEl || !currentEvalResult) return;
    const itemId = Number(itemEl.dataset.itemId);
    const item = currentEvalResult.allItemsMap.get(itemId);
    if (!item) return;

    renderItemTooltip(tt, item);
    tt.style.display = "block";
    positionTooltip(e, tt);
  });

  container.addEventListener("mousemove", (e) => {
    if (tt.style.display === "block") {
      positionTooltip(e, tt);
    }
  });

  container.addEventListener("mouseout", (e) => {
    const itemEl = e.target.closest("[data-item-id]");
    if (itemEl) {
      tt.style.display = "none";
    }
  });
}

function renderClassSelectors() {
  const container = document.getElementById("class-selectors");
  const existingButtons = container.querySelectorAll(".class-btn");
  if (existingButtons.length === wowClasses.length) {
    existingButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.class === currentClass);
    });
    return;
  }

  container.innerHTML = "";

  for (const cls of wowClasses) {
    const btn = document.createElement("button");
    btn.className = "class-btn class-icon-btn" + (cls.id === currentClass ? " active" : "");
    btn.setAttribute("data-class", cls.id);
    btn.setAttribute("aria-label", cls.name);
    btn.style.setProperty("--class-color", cls.color);

    btn.innerHTML = `
      <img class="class-icon-img" src="${escapeHtml(iconUrl(cls.icon, 'large'))}" alt="${escapeHtml(cls.name)}">
      <span class="btn-rollout-label">${escapeHtml(cls.name)}</span>
      <span class="class-popout-label">${escapeHtml(cls.name)}</span>
    `;

    btn.onclick = () => {
      if (currentClass === cls.id) return;
      currentClass = cls.id;
      currentSpec = cls.specs[0];
      renderClassSelectors();
      selectSpec(currentClass, currentSpec);
    };
    container.appendChild(btn);
  }
}

function renderSpecSelectors(clsObj) {
  const container = document.getElementById("spec-selectors");
  const existingButtons = container.querySelectorAll(".spec-btn");
  const currentSpecNames = Array.from(existingButtons).map(b => b.dataset.spec);
  const isSameSpecs = currentSpecNames.length === clsObj.specs.length &&
                      clsObj.specs.every((s, i) => s === currentSpecNames[i]);

  if (isSameSpecs) {
    existingButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.spec === currentSpec);
    });
    return;
  }

  container.innerHTML = "";

  clsObj.specs.forEach((spec, idx) => {
    const btn = document.createElement("button");
    btn.className = "spec-btn spec-icon-btn" + (spec === currentSpec ? " active" : "");
    btn.setAttribute("data-spec", spec);
    btn.setAttribute("aria-label", spec);
    btn.style.setProperty("--class-color", clsObj.color);
    btn.style.setProperty("--item-idx", idx);

    const iconId = clsObj.specIcons?.[spec];
    const iconSrc = iconId ? iconUrl(iconId, "large") : "";

    btn.innerHTML = `
      ${iconSrc ? `<img class="spec-icon-img" src="${escapeHtml(iconSrc)}" alt="${escapeHtml(spec)}">` : `<span>${escapeHtml(spec)}</span>`}
      <span class="btn-rollout-label">${escapeHtml(spec)}</span>
      <span class="spec-popout-label">${escapeHtml(spec)}</span>
    `;

    btn.onclick = () => {
      if (currentSpec === spec) return;
      currentSpec = spec;
      renderSpecSelectors(clsObj);
      selectSpec(currentClass, currentSpec);
    };
    container.appendChild(btn);
  });
}

function selectSpec(classId, specName) {
  const clsObj = findClass(classId);
  if (!clsObj) return;

  document.documentElement.style.setProperty("--class-color", clsObj.color);
  document.documentElement.style.setProperty("--class-color-glow", clsObj.color + "44");

  renderSpecSelectors(clsObj);

  const modeBar = document.getElementById("calc-mode-bar");
  if (modeBar) {
    modeBar.classList.remove("rollout-pulse");
    void modeBar.offsetWidth;
    modeBar.classList.add("rollout-pulse");
  }

  const sId = specId(classId, specName);
  currentEvalResult = calculator.evaluate(sId, currentMode, {
    tierOnly: tierOnlyMode,
    slotFilter: currentSlotFilter
  });
  if (!currentEvalResult) {
    document.getElementById("dungeons-container").innerHTML = `<div style="text-align:center; padding:40px;">No data for spec: ${escapeHtml(sId)}</div>`;
    return;
  }

  renderKPIs(currentEvalResult, clsObj);
  renderTargets(currentEvalResult, clsObj);

  // Refresh Wowhead tooltips
  if (window.$WowheadPower) {
    window.$WowheadPower.refreshLinks();
  }
}

function renderKPIs(result, clsObj) {
  const kpiContainer = document.getElementById("kpi-grid");
  const topTarget = result.targets[0];
  const topStats = result.statPriority.slice(0, 2).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" & ");

  // IF IN TIER SET ONLY MODE:
  if (result.options?.tierOnly) {
    const matrix = result.tierSlotMatrix || {};

    if (result.options.slotFilter === "all") {
      // 5 Slot Highlight Cards
      const slots = [
        { key: "head", label: "👑 Head Tier", icon: "head" },
        { key: "shoulders", label: "🛡️ Shoulders Tier", icon: "shoulders" },
        { key: "chest", label: "🦺 Chest Tier", icon: "chest" },
        { key: "hands", label: "🧤 Hands Tier", icon: "hands" },
        { key: "legs", label: "👖 Legs Tier", icon: "legs" }
      ];

      kpiContainer.innerHTML = slots.map(s => {
        const topDrop = matrix[s.key]?.[0];
        const optColor = topDrop?.score >= 1.3 ? "#22d3ee" : topDrop?.score >= 1.15 ? "#00FF98" : "#e4e4e7";
        const val = topDrop ? topDrop.item.name : "None in pool";
        const sub = topDrop ? `${topDrop.targetName} · ${topDrop.synergyLabel}` : "No drop found";
        return `
          <div class="kpi-card">
            <div class="kpi-label">${s.label}</div>
            <div class="kpi-value" title="${escapeHtml(val)}" style="color: ${optColor}; font-size: 1.05rem;">${escapeHtml(val)}</div>
            <div class="kpi-sub" title="${escapeHtml(sub)}">${escapeHtml(sub)}</div>
          </div>
        `;
      }).join("");
      return;
    } else {
      // Specific Slot Focus Cards
      const slotKey = result.options.slotFilter;
      const slotDrops = matrix[slotKey] || [];
      const topPick = slotDrops[0];
      const runnerUp = slotDrops[1];
      const thirdPick = slotDrops[2];

      const p1Val = topPick ? topPick.item.name : "None";
      const p1Sub = topPick ? `${topPick.targetName} · ${topPick.synergyLabel}` : "No drop in pool";
      const p2Val = runnerUp ? runnerUp.item.name : "—";
      const p2Sub = runnerUp ? `${runnerUp.targetName} · ${runnerUp.synergyLabel}` : "Only 1 drop found";
      const statSub = `Primary: ${result.primaryStat.toUpperCase()} · Least: ${result.statPriority[result.statPriority.length - 1]}`;

      kpiContainer.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Selected Tier Slot</div>
          <div class="kpi-value" style="color: #22d3ee;">${escapeHtml(slotKey.toUpperCase())}</div>
          <div class="kpi-sub">Revival Catalyst Base Farm</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">#1 Optimal ${escapeHtml(slotKey.toUpperCase())} Drop</div>
          <div class="kpi-value" title="${escapeHtml(p1Val)}" style="color: #67e8f9;">${escapeHtml(p1Val)}</div>
          <div class="kpi-sub" title="${escapeHtml(p1Sub)}">${escapeHtml(p1Sub)}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">#2 Runner-Up ${escapeHtml(slotKey.toUpperCase())}</div>
          <div class="kpi-value" title="${escapeHtml(p2Val)}" style="color: #00FF98;">${escapeHtml(p2Val)}</div>
          <div class="kpi-sub" title="${escapeHtml(p2Sub)}">${escapeHtml(p2Sub)}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Target Secondary Stats</div>
          <div class="kpi-value" title="${escapeHtml(topStats)}">${escapeHtml(topStats)}</div>
          <div class="kpi-sub" title="${escapeHtml(statSub)}">${escapeHtml(statSub)}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Pool Availability</div>
          <div class="kpi-value" style="color: ${escapeHtml(clsObj.color)};">${slotDrops.length} Drops</div>
          <div class="kpi-sub" title="Across ${result.targets.length} drop encounters">Across ${result.targets.length} drop encounters</div>
        </div>
      `;
      return;
    }
  }

  // STANDARD FULL LOOT TARGETS VIEW
  const bestHitRate = [...result.targets].sort((a, b) => b.hitRate - a.hitRate)[0];

  // Find best trinket target
  let bestTrinketTarget = null;
  let topTrinketItem = null;
  for (const t of result.targets) {
    if (t.topTrinkets && t.topTrinkets.length > 0) {
      if (!topTrinketItem || t.topTrinkets[0].metaPercent > topTrinketItem.metaPercent) {
        bestTrinketTarget = t;
        topTrinketItem = t.topTrinkets[0];
      }
    }
  }

  // Find best Catalyst Base target
  let bestCatalystTarget = null;
  let topCatalystItem = null;
  for (const t of result.targets) {
    if (t.catalystBases && t.catalystBases.length > 0) {
      const opt = t.catalystBases.find(c => c.isOptimalCatalyst) || t.catalystBases[0];
      if (!topCatalystItem || (opt.isOptimalCatalyst && !topCatalystItem.isOptimalCatalyst) || opt.statSynergy.score > topCatalystItem.statSynergy.score) {
        bestCatalystTarget = t;
        topCatalystItem = opt;
      }
    }
  }

  const labelPrefix = currentMode === "raids" ? "Raid Boss" : currentMode === "both" ? "Overall Target" : "Dungeon";
  const topTargetName = topTarget ? topTarget.name : "N/A";
  const topTargetSub = topTarget ? `${topTarget.subtitle} · EV: ${topTarget.compositeScore} pts (${topTarget.tier} Tier)` : "";
  const hitRateVal = bestHitRate ? Math.round(bestHitRate.hitRate * 100) + "%" : "N/A";
  const hitRateSub = bestHitRate ? `${bestHitRate.name} (${bestHitRate.hitCount} of ${bestHitRate.eligibleCount} drops)` : "";
  const trinketVal = topTrinketItem ? topTrinketItem.name : "No Trinket";
  const trinketSub = bestTrinketTarget ? `${bestTrinketTarget.name} · ${topTrinketItem ? Math.round(topTrinketItem.metaPercent * 100) + "% top players" : ""}` : "";
  const catVal = topCatalystItem ? topCatalystItem.name : "Tier Drops";
  const catSub = bestCatalystTarget ? `${bestCatalystTarget.name} · ${topCatalystItem ? `${topCatalystItem.slotName.toUpperCase()} (${topCatalystItem.statSynergy.label})` : "Standard Tier Slots"}` : "Standard Tier Slots";
  const statSub = `Primary: ${result.primaryStat.toUpperCase()} · Least: ${result.statPriority[result.statPriority.length - 1]}`;

  kpiContainer.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">#1 Recommended ${labelPrefix}</div>
      <div class="kpi-value" title="${escapeHtml(topTargetName)}" style="color: #FFD700;">${escapeHtml(topTargetName)}</div>
      <div class="kpi-sub" title="${escapeHtml(topTargetSub)}">${escapeHtml(topTargetSub)}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Highest Pool Efficiency</div>
      <div class="kpi-value" title="${escapeHtml(hitRateVal)}" style="color: ${escapeHtml(clsObj.color)};">${escapeHtml(hitRateVal)}</div>
      <div class="kpi-sub" title="${escapeHtml(hitRateSub)}">${escapeHtml(hitRateSub)}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Top Trinket Target</div>
      <div class="kpi-value" title="${escapeHtml(trinketVal)}" style="color: #A335EE;">${escapeHtml(trinketVal)}</div>
      <div class="kpi-sub" title="${escapeHtml(trinketSub)}">${escapeHtml(trinketSub)}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label"><img class="manaflux-inline-icon" src="images/venomblight-manaflux.png" alt="Catalyst" width="14" height="14"> Top Catalyst Target</div>
      <div class="kpi-value" title="${escapeHtml(catVal)}" style="color: #22d3ee;">${escapeHtml(catVal)}</div>
      <div class="kpi-sub" title="${escapeHtml(catSub)}">${escapeHtml(catSub)}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Target Secondary Stats</div>
      <div class="kpi-value" title="${escapeHtml(topStats)}">${escapeHtml(topStats)}</div>
      <div class="kpi-sub" title="${escapeHtml(statSub)}">${escapeHtml(statSub)}</div>
    </div>
  `;
}

function renderTargets(result, clsObj) {
  const container = document.getElementById("dungeons-container");
  container.innerHTML = "";

  if (!result.targets || result.targets.length === 0) {
    const filterMsg = result.options?.tierOnly 
      ? `No tier set drops found for ${result.options.slotFilter === 'all' ? 'any tier slot' : result.options.slotFilter.toUpperCase()} in ${currentMode} mode. Try switching to Combined Targets.`
      : `No eligible drops found for this view mode.`;
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">${escapeHtml(filterMsg)}</div>`;
    return;
  }

  const isTierOnly = !!result.options?.tierOnly;

  result.targets.forEach((target, i) => {
    const card = document.createElement("div");
    card.className = `dungeon-card card-rollout tier-${escapeHtml(target.tier.toLowerCase())}`;
    card.style.setProperty("--card-idx", Math.min(i, 8));

    const hitPercent = Math.round(target.hitRate * 100);

    // Chase items: in Tier Set mode, show all tier items in the target
    let chaseCandidates = [];
    if (isTierOnly) {
      chaseCandidates = target.items;
    } else {
      chaseCandidates = [
        ...target.items.filter(it => it.isBis || it.metaPercent >= 0.15),
        ...target.items.filter(it => it.isOptimalCatalyst && !it.isBis && it.metaPercent < 0.15)
      ];
    }

    // Deduplicate
    const uniqueChase = [];
    const seenChase = new Set();
    for (const it of chaseCandidates) {
      if (!seenChase.has(it.item_id)) {
        seenChase.add(it.item_id);
        uniqueChase.push(it);
      }
    }

    const chaseChipsHtml = uniqueChase.slice(0, 5).map(it => `
      <div class="chase-chip ${it.isBis ? 'bis' : it.isCatalystBase ? 'catalyst' : ''}" data-item-id="${escapeHtml(it.item_id)}" data-wowhead="item=${escapeHtml(it.item_id)}&domain=europe">
        <img class="chase-chip-icon" src="${escapeHtml(iconUrl(it.icon))}" alt="${escapeHtml(it.name)}">
        <span class="chase-chip-name">${escapeHtml(it.name)}</span>
        ${it.isBis 
          ? '<span class="chase-chip-meta">#1 BiS</span>' 
          : it.isCatalystBase 
            ? `<span class="chase-chip-meta catalyst"><img class="manaflux-inline-icon" src="images/venomblight-manaflux.png" alt="Tier" width="12" height="12"> ${escapeHtml(it.slotName.toUpperCase())}</span>` 
            : `<span style="font-size:0.75rem; color:#9da3af;">${Math.round(it.metaPercent * 100)}%</span>`}
      </div>
    `).join("");

    // Drop table rows
    const tableRowsHtml = target.items.map(it => {
      const statsBadges = (it.stats || []).map(s => {
        const name = s.name || s.type || "";
        const isTop = result.statPriority.slice(0, 2).some(p => name.toLowerCase().includes(p));
        return `<span class="stat-pill ${isTop ? 'top' : ''}">${escapeHtml(name)}</span>`;
      }).join("");

      const isCurrent = it.isCurrentEligible;

      const specBadgesHtml = (it.eligibleSpecs || []).map(s => `
        <span class="spec-icon-badge ${s.isEligible ? 'eligible' : 'ineligible'} ${s.isCurrent ? 'current-spec' : ''}"
              title="${escapeHtml(s.name)}: ${s.isEligible ? 'Eligible to drop' : 'Does NOT drop for this spec'}">
          <img class="spec-icon-img" src="${escapeHtml(iconUrl(s.icon, 'small'))}" alt="${escapeHtml(s.name)}">
        </span>
      `).join("");

      const badges = [];
      if (it.isBis) {
        badges.push('<span class="item-badge-bis">#1 BiS</span>');
      } else if (it.isMeta) {
        badges.push('<span class="item-badge-meta">Top Meta</span>');
      }
      if (it.isCatalystBase) {
        badges.push(`<span class="item-badge-catalyst ${it.isOptimalCatalyst ? 'optimal' : ''}" title="Season 2 Catalyst: Converts to Tier Set while keeping ${escapeHtml(it.statSynergy.label)} stats"><img class="manaflux-inline-icon" src="images/venomblight-manaflux.png" alt="Catalyst" width="13" height="13"> Catalyst Tier</span>`);
      }
      if (!isCurrent) {
        badges.push('<span class="item-badge-offspec">Off-Spec</span>');
      }
      const badgesHtml = badges.length > 0 ? `<div class="item-cell-badges">${badges.join("")}</div>` : "";

      return `
        <tr class="item-row ${isCurrent ? '' : 'off-spec-row'}" data-item-id="${escapeHtml(it.item_id)}" data-wowhead="item=${escapeHtml(it.item_id)}&domain=europe">
          <td>
            <div class="item-cell-title">
              <img class="item-cell-icon" src="${escapeHtml(iconUrl(it.icon))}" alt="${escapeHtml(it.name)}">
              <div class="item-cell-content">
                <span class="item-cell-name ${isCurrent ? '' : 'muted'}">${escapeHtml(it.name)}</span>
                ${badgesHtml}
              </div>
            </div>
          </td>
          <td>${escapeHtml(it.slotName.toUpperCase())}</td>
          <td>${escapeHtml(it.boss || it.encounter || "Chest / Drop")}</td>
          <td class="spec-icons-cell">
            <div class="spec-icons-row" title="Drop eligibility across ${escapeHtml(clsObj.name)} specializations">
              ${specBadgesHtml}
            </div>
          </td>
          <td style="font-weight:700; color:${!isCurrent ? '#71717a' : it.metaPercent >= 0.3 ? '#FFD700' : it.metaPercent >= 0.1 ? '#d8b4fe' : '#9da3af'};">
            ${!isCurrent ? '<span style="font-size:0.75rem; color:#71717a; font-weight:normal;">Off-Spec</span>' : it.metaPercent > 0 ? Math.round(it.metaPercent * 100) + "%" : "—"}
          </td>
          <td>${statsBadges || '<span style="color:#71717a;">—</span>'}</td>
          <td>
            <span style="font-size:0.75rem; font-weight:600; color:${!isCurrent ? '#71717a' : it.isCatalystBase ? '#22d3ee' : it.statSynergy.score >= 1.2 ? '#00FF98' : it.statSynergy.score <= 0.9 ? '#ef4444' : '#9da3af'};">
              ${!isCurrent ? 'Off-Spec Drop' : it.isCatalystBase ? `<img class="manaflux-inline-icon" src="images/venomblight-manaflux.png" alt="Catalyst" width="12" height="12"> ${escapeHtml(it.statSynergy.label)}` : it.statSynergy.label}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    const offSpecCount = target.items.length - target.eligibleCount;
    const toggleLabel = isTierOnly
      ? `View All ${target.items.length} Tier Set Drops & Stats`
      : (offSpecCount > 0 
        ? `View All ${target.items.length} Drops (${target.eligibleCount} ${currentSpec} · ${offSpecCount} Off-Spec) & Stats`
        : `View All ${target.eligibleCount} Drops & Stats`);

    // In Tier Set mode, default table to open for quick secondary stat inspection
    const defaultTableOpen = isTierOnly;

    card.innerHTML = `
      <div class="dungeon-header">
        <div class="dungeon-title-group">
          <span class="tier-badge tier-${escapeHtml(target.tier.toLowerCase())}">${escapeHtml(target.tier)} TIER</span>
          <span class="target-type-badge ${escapeHtml(target.type)}">${target.type === 'raid' ? 'Raid Boss' : 'Mythic+ Dungeon'}</span>
          <div class="dungeon-title-info">
            <span class="dungeon-name">${escapeHtml(target.name)}</span>
            <span class="dungeon-subtitle">${escapeHtml(target.subtitle)}</span>
          </div>
        </div>
        <div class="dungeon-metrics">
          <div class="metric-pill">
            <span class="metric-pill-label">${isTierOnly ? 'Stat Match' : 'Hit Rate'}</span>
            <span class="metric-pill-val highlight">${hitPercent}%</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">${isTierOnly ? 'Tier Drops' : 'Loot Pool'}</span>
            <span class="metric-pill-val">${target.hitCount} / ${target.eligibleCount} ${isTierOnly ? 'optimal' : 'drops'}</span>
          </div>
          <div class="metric-pill">
            <span class="metric-pill-label">EV Score</span>
            <span class="metric-pill-val">${target.compositeScore}</span>
          </div>
        </div>
      </div>

      <!-- Pool Dilution Gauge -->
      <div class="pool-bar-container">
        <div class="pool-bar-info">
          <span>${isTierOnly 
            ? `<strong>${target.hitCount}</strong> of <strong>${target.eligibleCount}</strong> Tier Set drops roll with Optimal or Good secondary stats` 
            : `<strong>${target.hitCount}</strong> of <strong>${target.eligibleCount}</strong> drops are Top Meta, Catalyst Bases, or Stat-Aligned`}</span>
        </div>
        <div class="pool-bar-track">
          <div class="pool-bar-fill" style="width: ${hitPercent}%;"></div>
        </div>
      </div>

      <!-- Loot Spec Optimization Advice -->
      ${target.lootSpecAdvice ? `
        <div class="loot-spec-advice ${target.lootSpecAdvice.isCurrent ? 'current' : 'switch'}">
          <span class="loot-spec-badge">${target.lootSpecAdvice.isCurrent ? '✓ Optimal Loot Spec' : '💡 Sniping Advice'}</span>
          <span class="loot-spec-name">${escapeHtml(target.lootSpecAdvice.recommendedSpecName)}</span>
          <span class="loot-spec-reason">— ${escapeHtml(target.lootSpecAdvice.reason)}</span>
        </div>
      ` : ''}

      <!-- Chase Chips -->
      ${chaseChipsHtml ? `<div class="chase-chips">${chaseChipsHtml}</div>` : ''}

      <!-- Accordion Toggle for Detailed Drop Table -->
      <button class="items-table-toggle" data-key="${escapeHtml(target.key)}">
        <span>${defaultTableOpen ? 'Hide Tier Drops' : toggleLabel}</span>
        <span class="toggle-icon">${defaultTableOpen ? '&uarr;' : '&darr;'}</span>
      </button>

      <div class="items-table-wrapper" style="display: ${defaultTableOpen ? 'block' : 'none'};">
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Slot</th>
              <th>Boss / Source</th>
              <th title="Specializations eligible to receive this drop. Fully colored = drops for spec. Dimmed = does not drop.">Loot Specs</th>
              <th>Usage</th>
              <th>Secondary Stats</th>
              <th>Stat Synergy</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    `;

    // Toggle drop table visibility
    const toggleBtn = card.querySelector(".items-table-toggle");
    const tableWrapper = card.querySelector(".items-table-wrapper");
    const toggleIcon = card.querySelector(".toggle-icon");
    toggleBtn.onclick = () => {
      const isOpen = tableWrapper.style.display !== "none";
      tableWrapper.style.display = isOpen ? "none" : "block";
      toggleIcon.innerHTML = isOpen ? "&darr;" : "&uarr;";
      toggleBtn.querySelector("span").textContent = isOpen 
        ? toggleLabel
        : `Hide Tier Drops`;
    };

    container.appendChild(card);
  });
}

// Boot
init();
