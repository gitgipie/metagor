// public/js/app.js
// Meta'gor entry point. Loads two JSON files (aggregated_bis.json + guides.json)
// and renders the spec dashboard. Vanilla ESM, no framework.

import { wowClasses, findClass, listSpecIds, specId, SLOT_ORDER } from "./registry.js?v=16";
import { renderGear, renderRightColumn, initSlotModal } from "./render/gear.js?v=16";
import { renderStats } from "./render/stats.js?v=16";
import { renderConsumables } from "./render/consumables.js?v=16";
import { renderRotation } from "./render/rotation.js?v=16";
import { renderCreators } from "./render/creators.js?v=16";
import { renderTalents } from "./render/talents.js?v=16";
import { renderGems, renderEmbellishments, renderEnchants } from "./render/gem-enchant.js?v=16";
import { ensureWowheadScript } from "./wowhead.js?v=16";

const BIS_URL   = "./data/aggregated_bis.json?v=" + Date.now();
const GUIDES_URL = "./data/guides.json?v=" + Date.now();

const state = {
  currentSpecId: "demon-hunter-havoc",
  bis: null,
  guides: null
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function applyClassTheme(classObj) {
  const root = document.documentElement;
  root.style.setProperty("--class-color", classObj.color);
  root.style.setProperty("--class-color-glow", classObj.color + "2b");
  root.style.setProperty("--class-btn-glow", classObj.color + "4f");
}

function populateClassSelectors() {
  const host = $("#class-selectors");
  host.innerHTML = "";
  // Make the grid container reliable regardless of loktar CSS variable indirection.
  host.style.display = "grid";
  host.style.gridTemplateColumns = "repeat(auto-fit, minmax(120px, 1fr))";
  host.style.gap = "8px";
  host.style.padding = "10px";
  host.style.border = "1px solid var(--gold-border)";
  host.style.background = "rgba(12, 14, 18, 0.85)";
  for (const cls of wowClasses) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "class-btn";
    btn.dataset.classId = cls.id;
    btn.textContent = cls.name;
    btn.style.background = "rgba(20, 24, 30, 0.95)";
    btn.style.border = `1px solid ${cls.color}`;
    btn.style.color = "#e8e8e8";
    btn.style.padding = "10px 6px";
    btn.style.fontFamily = "Inter, sans-serif";
    btn.style.fontSize = "0.78rem";
    btn.style.fontWeight = "700";
    btn.style.textTransform = "uppercase";
    btn.style.letterSpacing = "0.4px";
    btn.style.cursor = "pointer";
    btn.style.borderRadius = "2px";
    btn.style.textAlign = "center";
    btn.addEventListener("click", () => {
      const first = cls.specs[0];
      switchSpec(specId(cls.id, first));
    });
    btn.addEventListener("mouseenter", () => { btn.style.background = cls.color; btn.style.color = "#000"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "rgba(20, 24, 30, 0.95)"; btn.style.color = "#e8e8e8"; });
    host.appendChild(btn);
  }
}

function populateSpecSelectors(activeClassId) {
  const host = $("#spec-selectors");
  host.innerHTML = "";
  const cls = findClass(activeClassId);
  if (!cls) return;
  host.style.display = "flex";
  host.style.flexWrap = "wrap";
  host.style.gap = "6px";
  host.style.padding = "10px";
  host.style.marginTop = "6px";
  host.style.border = "1px solid var(--gold-border)";
  host.style.background = "rgba(12, 14, 18, 0.6)";
  for (const spec of cls.specs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "spec-btn";
    btn.dataset.specId = specId(cls.id, spec);
    btn.textContent = spec;
    btn.style.background = "transparent";
    btn.style.border = `1px solid ${cls.color}`;
    btn.style.color = cls.color;
    btn.style.padding = "6px 14px";
    btn.style.fontFamily = "Inter, sans-serif";
    btn.style.fontSize = "0.8rem";
    btn.style.fontWeight = "600";
    btn.style.textTransform = "uppercase";
    btn.style.letterSpacing = "0.4px";
    btn.style.cursor = "pointer";
    btn.style.borderRadius = "2px";
    btn.addEventListener("click", () => switchSpec(specId(cls.id, spec)));
    btn.addEventListener("mouseenter", () => { btn.style.background = cls.color; btn.style.color = "#000"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; btn.style.color = cls.color; });
    host.appendChild(btn);
  }
}

function parseSpecId(specIdStr) {
  // spec IDs are <class-slug>-<spec-slug> where class-slug may contain hyphens
  // (e.g. "demon-hunter"). Match against the registry to split correctly.
  const cls = wowClasses.find(c => specIdStr.startsWith(c.id + "-"));
  if (!cls) return { classId: null, specName: "" };
  const specName = specIdStr.slice(cls.id.length + 1);
  return { classId: cls.id, specName };
}

function highlightActiveSelectors() {
  const { classId } = parseSpecId(state.currentSpecId);
  $$(".class-btn").forEach(b => b.classList.toggle("active", b.dataset.classId === classId));
  $$(".spec-btn").forEach(b => b.classList.toggle("active", b.dataset.specId === state.currentSpecId));
  if (classId) $("#class-selectors").dataset.activeClass = classId;
}

function switchSpec(id) {
  state.currentSpecId = id;
  location.hash = id;
  render();
}

function render() {
  const spec = state.bis?.specializations?.[state.currentSpecId];
  if (!spec) {
    renderEmpty();
    return;
  }
  const { classId, specName: rawSpecName } = parseSpecId(state.currentSpecId);
  const classObj = findClass(classId);
  if (!classObj) {
    renderEmpty();
    return;
  }

  applyClassTheme(classObj);
  populateSpecSelectors(classId);
  highlightActiveSelectors();

  // Header
  const specName = rawSpecName.split("-").map(s => s[0]?.toUpperCase() + s.slice(1)).join(" ");
  $("#doll-spec-name").textContent = specName;
  $("#doll-class-name").textContent = classObj.name;
  $("#doll-class-name").style.color = classObj.color;
  $("#doll-role-text").textContent = (spec.role || "dps").toUpperCase();

  // Doll slots
  const leftHost  = $("#doll-left-slots");
  const rightHost = $("#doll-right-slots");
  const weaponHost = $("#doll-weapon-slots");
  leftHost.innerHTML = "";
  rightHost.innerHTML = "";
  weaponHost.innerHTML = "";
  renderGear(spec, classId, leftHost, weaponHost);
  renderRightColumn(spec, rightHost);

  // Side panels
  renderStats(spec, $("#stats-container"));
  renderConsumables(state.currentSpecId, state.guides, $("#consumables-container"));
  renderRotation(state.currentSpecId, state.guides, $("#rotation-container"));
  renderCreators(state.currentSpecId, state.guides, $("#creators-container"));
  renderTalents(spec, $("#talents-container"));
  renderGems(spec, $("#gems-embellishments-container"));
  renderEmbellishments(spec, $("#embellishments-container"));
  renderEnchants(spec, $("#enchants-container"));

  // Wowhead tooltips
  ensureWowheadScript();
}

function renderEmpty() {
  $("#doll-spec-name").textContent = "No data";
  $("#doll-class-name").textContent = state.currentSpecId;
  $("#doll-role-text").textContent = "—";
  $("#doll-left-slots").innerHTML = "";
  $("#doll-right-slots").innerHTML = "";
  $("#doll-weapon-slots").innerHTML = "";
  $("#stats-container").innerHTML = `<div class="empty-note">No aggregated data for "${state.currentSpecId}". Try another spec, or check data/aggregated_bis.json.</div>`;
  $("#consumables-container").innerHTML = "";
  $("#rotation-container").innerHTML = "";
  $("#creators-container").innerHTML = "";
  $("#talents-container").innerHTML = "";
  $("#gems-embellishments-container").innerHTML = "";
  $("#embellishments-container").innerHTML = "";
  $("#enchants-container").innerHTML = "";
}

function checkStaleness() {
  const generatedAt = state.bis?.meta?.generated_at;
  if (!generatedAt) return;
  const ageHours = (Date.now() - new Date(generatedAt).getTime()) / 3.6e6;
  if (ageHours <= 36) return;
  const banner = document.createElement("div");
  banner.className = "stale-banner";
  banner.textContent = `Data is ${Math.round(ageHours)}h old — patch may be in flight. Last refresh ${generatedAt}.`;
  document.body.prepend(banner);
}

function paintMetaPills() {
  const m = state.bis?.meta;
  if (!m) return;
  const patchEl = document.getElementById("meta-patch");
  const seasonEl = document.getElementById("meta-season");
  const sampleEl = document.getElementById("meta-sample");
  const regionEl = document.getElementById("meta-region");
  if (patchEl) patchEl.textContent = m.patch ? `patch ${m.patch}` : "patch unknown";
  if (seasonEl) seasonEl.textContent = m.season_id ? `season ${m.season_id}` : "season unknown";
  if (sampleEl) sampleEl.textContent = `sample ${m.sample_size || 50}`;
  if (regionEl) {
    const r = m.region || "eu";
    // "eu+us" → "EU+US", "eu" → "EU"
    regionEl.textContent = r.split("+").map(s => s.toUpperCase()).join("+");
  }
}

async function boot() {
  populateClassSelectors();
  initSlotModal();
  try {
    const [bis, guides] = await Promise.all([loadJson(BIS_URL), loadJson(GUIDES_URL)]);
    state.bis = bis;
    state.guides = guides;
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `
      <div class="fatal">
        <h1>Meta'gor failed to load</h1>
        <pre>${e.message}</pre>
        <p>Make sure data/aggregated_bis.json and data/guides.json exist and are reachable from the dev server.</p>
      </div>
    `;
    return;
  }
  paintMetaPills();
  if (location.hash) state.currentSpecId = location.hash.slice(1);
  render();
  checkStaleness();
  window.addEventListener("hashchange", () => {
    state.currentSpecId = location.hash.slice(1) || "demon-hunter-havoc";
    render();
  });
}

document.addEventListener("DOMContentLoaded", boot);
