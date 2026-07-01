// public/js/render/talents.js
// Renders the talent build: loadout string + hero talent + tree view button.

function buildWowheadTreeUrl(classSlug, specSlug, loadoutString) {
  if (!loadoutString) return null;
  return `https://www.wowhead.com/talent-calc/${classSlug}/${specSlug}/${loadoutString}`;
}

export function renderTalents(spec, host) {
  const t = spec.talents || {};
  const code = t.loadout_string || "";
  const classSlug = spec.class || "";
  const specSlug = spec.spec || "";
  const treeUrl = buildWowheadTreeUrl(classSlug, specSlug, code);

  host.innerHTML = `
    <div class="talents-block">
      <div class="talent-code-box">
        <div class="talent-string" id="talent-string-display" title="${code}">${code || "(no loadout yet)"}</div>
        <div class="talent-btn-row">
          <button class="copy-btn" id="copy-talent-btn" type="button" title="Copy talent loadout string">Copy</button>
          ${treeUrl ? `<button class="tree-btn" id="view-tree-btn" type="button" title="View talent tree on Wowhead">Tree</button>` : ""}
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
      } catch { /* clipboard may be unavailable in some browsers */ }
    });
  }

  // Tree button — opens Wowhead talent calculator in new tab
  const treeBtn = host.querySelector("#view-tree-btn");
  if (treeBtn && treeUrl) {
    treeBtn.addEventListener("click", () => {
      window.open(treeUrl, "_blank", "noopener,noreferrer");
    });
  }
}