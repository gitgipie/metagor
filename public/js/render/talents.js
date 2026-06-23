// public/js/render/talents.js
// Renders the talent build: loadout string + hero talent.

export function renderTalents(spec, host) {
  const t = spec.talents || {};
  const code = t.loadout_string || "";
  host.innerHTML = `
    <div class="talents-block">
      <div class="talent-code-box">
        <div class="talent-string" id="talent-string-display">${code || "(no loadout yet)"}</div>
        <button class="copy-btn" id="copy-talent-btn" type="button">Copy</button>
      </div>
      ${t.hero_talent ? `
        <div class="talent-hero">
          <span class="talent-hero-label">Hero Talent</span>
          <span class="talent-hero-value">${t.hero_talent}</span>
        </div>
      ` : ""}
    </div>
  `;
  const btn = host.querySelector("#copy-talent-btn");
  if (btn && code) {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      } catch { /* clipboard may be unavailable in some browsers */ }
    });
  }
}
