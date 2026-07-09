// public/js/render/talents.js
// Renders the talent build: loadout string + hero talent + visual tree modal popup.

function buildWowheadTreeUrl(classSlug, specSlug, loadoutString) {
  if (!loadoutString) return null;
  return `https://www.wowhead.com/talent-calc/${classSlug}/${specSlug}/${loadoutString}`;
}

// Map columns/rows to consecutive integers, preserving relative gaps.
// Example: cols=[15,16,18,19,21] -> [0,1,3,4,6] (the 1-col gap at 16-17
// and 2-col gap at 19-20 stay visible). This matches the actual Wowhead
// talent calculator layout where unused columns are simply empty space.
function compactPositions(nodes) {
  const usedCols = [...new Set(nodes.map(n => n.col))].sort((a, b) => a - b);
  const colMap = {};
  usedCols.forEach((col, i) => { colMap[col] = col - usedCols[0]; });

  const usedRows = [...new Set(nodes.map(n => n.row))].sort((a, b) => a - b);
  const rowMap = {};
  usedRows.forEach((row, i) => { rowMap[row] = row - usedRows[0]; });

  return nodes.map(n => ({ ...n, col: colMap[n.col], row: rowMap[n.row] }));
}

// Build a single tree section (class, spec, or hero) as a positioned grid.
function buildTreeSection(nodes, sectionTitle, sectionClass) {
  if (!nodes || nodes.length === 0) return "";

  // Filter out empty placeholder nodes that have no name, icon, and choices
  const activeNodes = nodes.filter(node => {
    const allChoices = node.choices || node.choice_options || [];
    return node.name || node.icon || allChoices.length > 0;
  });

  if (activeNodes.length === 0) return "";

  // Compact positions using only the active nodes
  const compactNodes = compactPositions(activeNodes);

  // Find the row/col ranges from compacted positions
  const minRow = Math.min(...compactNodes.map(n => n.row));
  const maxRow = Math.max(...compactNodes.map(n => n.row));
  const minCol = Math.min(...compactNodes.map(n => n.col));
  const maxCol = Math.max(...compactNodes.map(n => n.col));

  // Build a lookup map: "row,col" -> node (using compacted positions)
  const nodeMap = new Map();
  for (const n of compactNodes) {
    nodeMap.set(`${n.row},${n.col}`, n);
  }

  // Build SVG connection lines (using compacted positions)
  const connections = [];
  for (const n of compactNodes) {
    if (!n.unlocks || n.unlocks.length === 0) continue;
    for (const targetId of n.unlocks) {
      const target = compactNodes.find(t => t.id === targetId);
      if (!target) continue;
      connections.push({ from: n, to: target });
    }
  }

  // Calculate grid dimensions
  const rowSpan = maxRow - minRow + 1;
  const colSpan = maxCol - minCol + 1;
  const cellSize = 52; // px per grid cell
  const iconSize = 40;
  const gap = (cellSize - iconSize) / 2;

  // Detect rows with only one node — these need to be centered horizontally
  // over the tree's column span (like the lone top/bottom nodes in hero/spec trees)
  const nodesPerRow = {};
  for (const n of compactNodes) {
    const allCh = n.choices || n.choice_options || [];
    if (!n.name && allCh.length === 0 && !n.icon) continue;
    if (!nodesPerRow[n.row]) nodesPerRow[n.row] = [];
    nodesPerRow[n.row].push(n);
  }
  const singleNodeRows = new Set();
  for (const [row, rowNodes] of Object.entries(nodesPerRow)) {
    if (rowNodes.length === 1) singleNodeRows.add(Number(row));
  }

  // Helper: compute the actual pixel X center for a node's column,
  // accounting for single-node rows that are centered across the canvas.
  const canvasWidth = colSpan * cellSize;
  function nodeCenterX(node) {
    if (singleNodeRows.has(node.row)) {
      return canvasWidth / 2;
    }
    return (node.col - minCol) * cellSize + cellSize / 2;
  }

  // Build the SVG overlay for connection lines
  let svgLines = "";
  if (connections.length > 0) {
    const w = colSpan * cellSize;
    const h = rowSpan * cellSize;
    svgLines = `<svg class="talent-tree-svg" viewBox="0 0 ${w} ${h}" style="width:${w}px;height:${h}px;">`;
    for (const { from, to } of connections) {
      const x1 = nodeCenterX(from);
      const y1 = (from.row - minRow) * cellSize + cellSize / 2;
      const x2 = nodeCenterX(to);
      const y2 = (to.row - minRow) * cellSize + cellSize / 2;
      const selected = from.selected && to.selected;
      const lineColor = selected ? "#a335ee" : "#333";
      const lineW = selected ? 2 : 1;
      const opacity = selected ? 0.8 : 0.3;
      svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColor}" stroke-width="${lineW}" opacity="${opacity}"/>`;
    }
    svgLines += "</svg>";
  }

  // Build the grid with positioned nodes
  let nodesHtml = "";
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const node = nodeMap.get(`${r},${c}`);
      if (!node) continue;

      // Skip completely empty CHOICE nodes (no name, no choices, no choice_options)
      // These are placeholder nodes in the Blizzard API with no actual talent data
      const allChoicesForCheck = node.choices || node.choice_options || [];
      if (!node.name && allChoicesForCheck.length === 0 && !node.icon) continue;

      const isSelected = node.selected;
      const nodeType = node.type?.toLowerCase() || "passive";
      // Use the same centering logic as the SVG lines so nodes and lines match
      const centerX = nodeCenterX(node);
      const x = centerX - iconSize / 2;
      const y = (r - minRow) * cellSize + gap;

      // Determine the icon: use the node's icon, or the selected choice's icon
      let displayIcon = node.icon;
      let displayName = node.name;
      let displayDesc = node.description;
      let displayCast = node.cast_time;

      // For nodes with choices or choice_options, use the selected choice's info
      const allChoices = node.choices || node.choice_options || [];
      if (allChoices.length > 0) {
        const selectedChoice = allChoices.find(ch => ch.selected);
        if (selectedChoice) {
          displayIcon = selectedChoice.icon || displayIcon;
          displayName = selectedChoice.name;
          displayDesc = selectedChoice.description;
          displayCast = selectedChoice.cast_time;
        } else if (allChoices[0]) {
          // No selection — use the first choice as fallback for display
          if (!displayIcon) displayIcon = allChoices[0].icon;
          if (!displayName) displayName = allChoices[0].name;
        }
      }

      const iconUrl = displayIcon
        ? `https://wow.zamimg.com/images/wow/icons/medium/${displayIcon}.jpg`
        : "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg";

      // Build choice tooltip data: list all options with selected indicator
      const choicesData = allChoices.map(ch => `${ch.selected ? "✓ " : "  "}${ch.name}`).join(" | ");

      nodesHtml += `
        <div class="tt-node ${isSelected ? "tt-selected" : ""} tt-${nodeType}"
             style="left:${x}px;top:${y}px;width:${iconSize}px;height:${iconSize}px;"
             data-name="${(displayName || "Choice").replace(/"/g, "&quot;")}"
             data-desc="${(displayDesc || "").replace(/"/g, "&quot;").replace(/\r?\n/g, " ")}"
             data-cast="${displayCast || ""}"
             data-rank="${node.rank || 1}"
             data-choices="${choicesData.replace(/"/g, "&quot;")}">
          <img src="${iconUrl}" alt="${displayName || "talent"}" loading="lazy"
               onerror="this.src='https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg'">
          ${node.rank > 1 ? `<span class="tt-rank">${node.rank}</span>` : ""}
        </div>
      `;
    }
  }

  return `
    <h5 class="talent-tree-section-header">${sectionTitle}</h5>
      <div class="talent-tree-canvas" style="width:${colSpan * cellSize}px;height:${rowSpan * cellSize}px;">
        ${svgLines}
        ${nodesHtml}
      </div>
  `;
}

// Attach hover tooltips to talent nodes in the modal
function attachTalentNodeTooltips(container) {
  const nodes = container.querySelectorAll(".tt-node");
  nodes.forEach(node => {
    node.addEventListener("mouseenter", (e) => {
      const name = node.dataset.name || "Unknown";
      const desc = node.dataset.desc || "";
      const cast = node.dataset.cast || "";
      const rank = node.dataset.rank || "1";
      const choices = node.dataset.choices || "";
      const tt = document.getElementById("metagor-item-tooltip");
      if (!tt) return;
      const lines = [`<div class="tooltip-title quality-epic">${name}${rank > 1 ? ` (Rank ${rank})` : ""}</div>`];
      if (cast) lines.push(`<div class="tooltip-slot-type"><span>${cast}</span></div>`);
      if (desc) lines.push(`<div class="tooltip-stats"><div class="tooltip-stat-bonus">${desc}</div></div>`);
      if (choices) lines.push(`<div class="tooltip-source-detail">Choices: ${choices}</div>`);
      tt.innerHTML = lines.join("");
      tt.style.display = "block";
      positionTalentTooltip(e);
    });
    node.addEventListener("mousemove", positionTalentTooltip);
    node.addEventListener("mouseleave", () => {
      const tt = document.getElementById("metagor-item-tooltip");
      if (tt) tt.style.display = "none";
    });
  });
}

function positionTalentTooltip(e) {
  const tt = document.getElementById("metagor-item-tooltip");
  if (!tt || tt.style.display !== "block") return;
  let x = e.pageX + 15, y = e.pageY + 15;
  if (x + tt.offsetWidth > window.innerWidth) x = e.pageX - tt.offsetWidth - 15;
  if (y + tt.offsetHeight > window.scrollY + window.innerHeight) y = e.pageY - tt.offsetHeight - 15;
  tt.style.left = `${x}px`;
  tt.style.top = `${y}px`;
}

function openTalentTreeModal(talents, classSlug, specSlug) {
  const backdrop = document.getElementById("slot-modal-backdrop");
  const title = document.getElementById("slot-modal-title");
  const list = document.getElementById("slot-modal-list");
  if (!backdrop || !title || !list) return;

  // Add the wider modal class for the talent tree
  const modal = backdrop.querySelector(".slot-modal");
  if (modal) modal.classList.add("tt-modal");

  title.textContent = `${specSlug} Talent Tree — ${talents.hero_talent || "Hero Talent"}`;
  list.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "talent-tree-wrap";

  const tree = talents.tree;
  if (tree) {
    // Horizontal layout: Class → Hero → Spec (in-game left-to-right order)
    const columns = document.createElement("div");
    columns.className = "talent-tree-columns";

    if (tree.class_nodes && tree.class_nodes.length) {
      const col = document.createElement("div");
      col.className = "talent-tree-section tt-class-section";
      col.innerHTML = buildTreeSection(tree.class_nodes, "Class Talents", "tt-class-section");
      columns.appendChild(col);
    }
    if (tree.hero_nodes && tree.hero_nodes.length) {
      const col = document.createElement("div");
      col.className = "talent-tree-section tt-hero-section";
      col.innerHTML = buildTreeSection(tree.hero_nodes, `${tree.hero_tree_name || talents.hero_talent || "Hero"} Talents`, "tt-hero-section");
      columns.appendChild(col);
    }
    if (tree.spec_nodes && tree.spec_nodes.length) {
      const col = document.createElement("div");
      col.className = "talent-tree-section tt-spec-section";
      col.innerHTML = buildTreeSection(tree.spec_nodes, "Specialization Talents", "tt-spec-section");
      columns.appendChild(col);
    }

    wrap.appendChild(columns);
  } else {
    // Fallback: flat list if no tree data
    const fallback = document.createElement("div");
    fallback.className = "talent-tree-columns";
    if (talents.class_talents && talents.class_talents.length) {
      const col = document.createElement("div");
      col.className = "talent-tree-section";
      col.innerHTML = `<h5 class="talent-tree-section-header">Class Talents</h5>`;
      const grid = document.createElement("div");
      grid.className = "talent-tree-grid";
      grid.innerHTML = talents.class_talents.map(t => `<div class="talent-node"><img class="talent-node-icon" src="https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg" alt="${t.name}"><div class="talent-node-name">${t.name}</div></div>`).join("");
      col.appendChild(grid);
      fallback.appendChild(col);
    }
    if (talents.hero_talents && talents.hero_talents.length) {
      const col = document.createElement("div");
      col.className = "talent-tree-section";
      col.innerHTML = `<h5 class="talent-tree-section-header">${talents.hero_talent || "Hero"} Talents</h5>`;
      const grid = document.createElement("div");
      grid.className = "talent-tree-grid";
      grid.innerHTML = talents.hero_talents.map(t => `<div class="talent-node"><img class="talent-node-icon" src="https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg" alt="${t.name}"><div class="talent-node-name">${t.name}</div></div>`).join("");
      col.appendChild(grid);
      fallback.appendChild(col);
    }
    if (talents.spec_talents && talents.spec_talents.length) {
      const col = document.createElement("div");
      col.className = "talent-tree-section";
      col.innerHTML = `<h5 class="talent-tree-section-header">Specialization Talents</h5>`;
      const grid = document.createElement("div");
      grid.className = "talent-tree-grid";
      grid.innerHTML = talents.spec_talents.map(t => `<div class="talent-node"><img class="talent-node-icon" src="https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg" alt="${t.name}"><div class="talent-node-name">${t.name}</div></div>`).join("");
      col.appendChild(grid);
      fallback.appendChild(col);
    }
    wrap.appendChild(fallback);
  }

  // Wowhead link at bottom
  const treeUrl = buildWowheadTreeUrl(classSlug, specSlug, talents.loadout_string);
  if (treeUrl) {
    const link = document.createElement("a");
    link.className = "talent-tree-wowhead-link";
    link.href = treeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View full tree on Wowhead";
    wrap.appendChild(link);
  }

  list.appendChild(wrap);
  attachTalentNodeTooltips(wrap);

  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

export function renderTalents(spec, host) {
  const t = spec.talents || {};
  const code = t.loadout_string || "";
  const classSlug = spec.class || "";
  const specSlug = spec.spec || "";
  const treeUrl = buildWowheadTreeUrl(classSlug, specSlug, code);
  const hasTreeData = t.tree || (t.class_talents && t.class_talents.length) || (t.spec_talents && t.spec_talents.length);

  host.innerHTML = `
    <div class="talents-block">
      <div class="talent-code-box">
        <div class="talent-string" id="talent-string-display" title="${code}">${code || "(no loadout yet)"}</div>
        <div class="talent-btn-row">
          <button class="copy-btn" id="copy-talent-btn" type="button" title="Copy talent loadout string">Copy</button>
          ${hasTreeData ? `<button class="tree-btn" id="view-tree-btn" type="button" title="View talent tree">Tree</button>` : ""}
        </div>
      </div>
      ${t.hero_talent ? `
        <div class="talent-hero">
          <span class="talent-hero-label">Hero Talent</span>
          <span class="talent-hero-value">${t.hero_talent}</span>
        </div>
      ` : ""}
    </div>
  `;

  // Copy button
  const copyBtn = host.querySelector("#copy-talent-btn");
  if (copyBtn && code) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      } catch { /* clipboard may be unavailable */ }
    });
  }

  // Tree button — opens modal popup with visual talent tree
  const treeBtn = host.querySelector("#view-tree-btn");
  if (treeBtn) {
    treeBtn.addEventListener("click", () => openTalentTreeModal(t, classSlug, specSlug));
  }
}