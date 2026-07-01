// public/js/render/talents.js
// Renders the talent build: loadout string + hero talent + tree view modal popup.

function buildWowheadTreeUrl(classSlug, specSlug, loadoutString) {
  if (!loadoutString) return null;
  return `https://www.wowhead.com/talent-calc/${classSlug}/${specSlug}/${loadoutString}`;
}

// Render a talent node as an icon box with tooltip
function renderTalentNode(t) {
  if (!t || !t.name) return "";
  const icon = t.spell_id ? `spell_${t.spell_id}` : "inv_misc_questionmark";
  const rankLabel = t.rank > 1 ? ` (${t.rank})` : "";
  return `
    <div class="talent-node" data-spell-id="${t.spell_id || ""}">
      <img class="talent-node-icon" src="https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg"
           alt="${t.name}" loading="lazy"
           onerror="this.src='https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg'">
      <div class="talent-node-name">${t.name}${rankLabel}</div>
    </div>
  `;
}

// Attach hover tooltips to talent nodes
function attachTalentTooltips(container) {
  const nodes = container.querySelectorAll(".talent-node");
  nodes.forEach(node => {
    node.addEventListener("mouseenter", (e) => {
      const name = node.querySelector(".talent-node-name")?.textContent || "";
      const tt = document.getElementById("metagor-item-tooltip");
      if (!tt) return;
      tt.innerHTML = `<div class="tooltip-title quality-epic">${name}</div>`;
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

  title.textContent = `${specSlug} Talent Tree — ${talents.hero_talent || "Hero Talent"}`;
  list.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "talent-tree-wrap";

  // Hero Talents section
  if (talents.hero_talents && talents.hero_talents.length) {
    const heroHeader = document.createElement("h5");
    heroHeader.className = "talent-tree-section-header";
    heroHeader.textContent = `${talents.hero_talent || "Hero"} Talents`;
    wrap.appendChild(heroHeader);
    const heroGrid = document.createElement("div");
    heroGrid.className = "talent-tree-grid";
    heroGrid.innerHTML = talents.hero_talents.map(renderTalentNode).join("");
    wrap.appendChild(heroGrid);
  }

  // Class Talents section
  if (talents.class_talents && talents.class_talents.length) {
    const classHeader = document.createElement("h5");
    classHeader.className = "talent-tree-section-header";
    classHeader.textContent = "Class Talents";
    wrap.appendChild(classHeader);
    const classGrid = document.createElement("div");
    classGrid.className = "talent-tree-grid";
    classGrid.innerHTML = talents.class_talents.map(renderTalentNode).join("");
    wrap.appendChild(classGrid);
  }

  // Spec Talents section
  if (talents.spec_talents && talents.spec_talents.length) {
    const specHeader = document.createElement("h5");
    specHeader.className = "talent-tree-section-header";
    specHeader.textContent = "Specialization Talents";
    wrap.appendChild(specHeader);
    const specGrid = document.createElement("div");
    specGrid.className = "talent-tree-grid";
    specGrid.innerHTML = talents.spec_talents.map(renderTalentNode).join("");
    wrap.appendChild(specGrid);
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
  attachTalentTooltips(wrap);

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
  const hasTreeData = (t.class_talents && t.class_talents.length) || (t.spec_talents && t.spec_talents.length);

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

  // Tree button — opens modal popup with talent tree
  const treeBtn = host.querySelector("#view-tree-btn");
  if (treeBtn) {
    treeBtn.addEventListener("click", () => openTalentTreeModal(t, classSlug, specSlug));
  }
}