// public/js/app.js
// Meta'gor entry point. Loads two JSON files (aggregated_bis.json + guides.json)
// and renders the spec dashboard. Vanilla ESM, no framework.

import { wowClasses, findClass, listSpecIds, specId, SLOT_ORDER } from "./registry.js?v=54";
import { iconUrl } from "./icons.js?v=54";
import { renderGear, renderRightColumn, initSlotModal } from "./render/gear.js?v=54";
import { renderStats } from "./render/stats.js?v=54";
import { renderConsumables } from "./render/consumables.js?v=54";
import { renderRotation } from "./render/rotation.js?v=54";
import { renderCreators } from "./render/creators.js?v=54";
import { renderTalents } from "./render/talents.js?v=54";
import { renderGems, renderEmbellishments, renderEnchants } from "./render/gem-enchant.js?v=54";
import { renderShowcase } from "./render/showcase.js?v=54";
import { ensureWowheadScript } from "./wowhead.js?v=54";
import { initReportIssue } from "./report-issue.js?v=54";

const BIS_URL   = "./data/aggregated_bis.json?v=" + Date.now();
const GUIDES_URL = "./data/guides.json?v=" + Date.now();
const STORAGE_KEY = "metagor_preferred_spec";

const state = {
  currentSpecId: null,
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

function applyDefaultTheme() {
  const root = document.documentElement;
  root.style.setProperty("--class-color", "#00FF98");
  root.style.setProperty("--class-color-glow", "rgba(0, 255, 152, 0.2)");
  root.style.setProperty("--class-btn-glow", "rgba(0, 255, 152, 0.35)");
}

function applyClassTheme(classObj) {
  const root = document.documentElement;
  root.style.setProperty("--class-color", classObj.color);
  root.style.setProperty("--class-color-glow", classObj.color + "2b");
  root.style.setProperty("--class-btn-glow", classObj.color + "4f");
}

function populateClassSelectors() {
  const host = $("#class-selectors");
  if (!host) return;
  const existingButtons = host.querySelectorAll(".class-btn");
  const { classId: currentClassId } = parseSpecId(state.currentSpecId || "");

  if (existingButtons.length === wowClasses.length) {
    existingButtons.forEach(btn => {
      btn.classList.toggle("active", Boolean(currentClassId && btn.dataset.classId === currentClassId));
    });
    return;
  }

  host.innerHTML = "";
  for (const cls of wowClasses) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "class-btn class-icon-btn" + (currentClassId && cls.id === currentClassId ? " active" : "");
    btn.dataset.classId = cls.id;
    btn.setAttribute("aria-label", cls.name);
    btn.style.setProperty("--class-color", cls.color);

    btn.innerHTML = `
      <img class="class-icon-img" src="${iconUrl(cls.icon, 'large')}" alt="${cls.name}">
      <span class="btn-rollout-label">${cls.name}</span>
      <span class="class-popout-label">${cls.name}</span>
    `;

    btn.addEventListener("click", () => {
      const { classId } = parseSpecId(state.currentSpecId || "");
      if (classId === cls.id) return;
      const first = cls.specs[0];
      switchSpec(specId(cls.id, first));
    });

    host.appendChild(btn);
  }
}

function populateSpecSelectors(activeClassId) {
  const container = $(".spec-bar-container");
  const host = $("#spec-selectors");
  if (!host) return;

  if (!activeClassId) {
    if (container) container.style.display = "none";
    host.innerHTML = "";
    return;
  }
  if (container) container.style.display = "flex";

  const cls = findClass(activeClassId);
  if (!cls) return;

  const existingButtons = host.querySelectorAll(".spec-btn");
  const currentSpecNames = Array.from(existingButtons).map(b => b.dataset.spec);
  const isSameSpecs = currentSpecNames.length === cls.specs.length &&
                      cls.specs.every((s, i) => s === currentSpecNames[i]);

  if (isSameSpecs) {
    existingButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.specId === state.currentSpecId);
    });
    return;
  }

  host.innerHTML = "";
  host.classList.remove("dock-rollout");
  void host.offsetWidth; // Trigger reflow for smooth cascading entrance
  host.classList.add("dock-rollout");

  cls.specs.forEach((spec, idx) => {
    const sId = specId(cls.id, spec);
    const isSelected = sId === state.currentSpecId;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "spec-btn spec-icon-btn" + (isSelected ? " active" : "");
    btn.dataset.specId = sId;
    btn.dataset.spec = spec;
    btn.setAttribute("aria-label", spec);
    btn.style.setProperty("--class-color", cls.color);
    btn.style.setProperty("--item-idx", idx);

    const iconId = cls.specIcons?.[spec];
    const iconSrc = iconId ? iconUrl(iconId, "large") : "";

    btn.innerHTML = `
      ${iconSrc ? `<img class="spec-icon-img" src="${iconSrc}" alt="${spec}">` : `<span>${spec}</span>`}
      <span class="btn-rollout-label">${spec}</span>
      <span class="spec-popout-label">${spec}</span>
    `;

    btn.addEventListener("click", () => {
      if (state.currentSpecId === sId) return;
      switchSpec(sId);
    });

    host.appendChild(btn);
  });
}

function parseSpecId(specIdStr) {
  // spec IDs are <class-slug>-<spec-slug> where class-slug may contain hyphens
  // (e.g. "demon-hunter"). Match against the registry to split correctly.
  if (!specIdStr) return { classId: null, specName: "" };
  const cls = wowClasses.find(c => specIdStr.startsWith(c.id + "-"));
  if (!cls) return { classId: null, specName: "" };
  const specName = specIdStr.slice(cls.id.length + 1);
  return { classId: cls.id, specName };
}

function highlightActiveSelectors() {
  const { classId } = parseSpecId(state.currentSpecId || "");
  $$(".class-btn").forEach(b => b.classList.toggle("active", Boolean(classId && b.dataset.classId === classId)));
  $$(".spec-btn").forEach(b => b.classList.toggle("active", Boolean(state.currentSpecId && b.dataset.specId === state.currentSpecId)));
  const classSelectors = $("#class-selectors");
  if (classSelectors) {
    if (classId) classSelectors.dataset.activeClass = classId;
    else delete classSelectors.dataset.activeClass;
  }
}

function switchSpec(id) {
  state.currentSpecId = id;
  if (id) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (e) {}
    location.hash = id;
  } else {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    history.pushState(null, "", window.location.pathname);
  }
  render();
}

function render() {
  const showcaseEl = $("#hero-showcase");
  const dashboardEl = $("#main-dashboard");

  if (!state.currentSpecId) {
    applyDefaultTheme();
    populateClassSelectors();
    populateSpecSelectors(null);
    highlightActiveSelectors();

    if (showcaseEl) {
      showcaseEl.style.display = "block";
      renderShowcase(showcaseEl, (chosenSpecId) => {
        switchSpec(chosenSpecId);
      });
    }
    if (dashboardEl) {
      dashboardEl.style.display = "none";
    }
    return;
  }

  // Dashboard Mode
  if (showcaseEl) showcaseEl.style.display = "none";
  if (dashboardEl) dashboardEl.style.display = "grid";

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
  populateClassSelectors();
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
  renderConsumables(state.currentSpecId, state.guides, spec, $("#consumables-container"));
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

// "refreshed 2h ago" pill — always visible so users can trust the data age.
// Color-codes freshness: green pulse (fresh, < 13h), amber (aging), red (stale > 36h).
// With the twice-daily CI scrape, fresh data is never older than ~12h.
function paintRefreshedPill() {
  const el = document.getElementById("meta-refreshed");
  const generatedAt = state.bis?.meta?.generated_at;
  if (!el) return;
  if (!generatedAt) { el.textContent = "refreshed —"; return; }
  const ageMs = Date.now() - new Date(generatedAt).getTime();
  const mins = Math.max(0, Math.round(ageMs / 6e4));
  let label;
  if (mins < 1) label = "just now";
  else if (mins < 60) label = `${mins}m ago`;
  else if (mins < 60 * 24) label = `${Math.round(mins / 60)}h ago`;
  else label = `${Math.round(mins / 1440)}d ago`;
  el.textContent = `refreshed ${label}`;
  el.title = `Data generated ${new Date(generatedAt).toLocaleString()}`;
  const hours = ageMs / 3.6e6;
  const cls = hours > 36 ? "stale" : hours > 13 ? "aging" : "fresh";
  el.classList.remove("fresh", "aging", "stale");
  el.classList.add(cls);
  // Re-check periodically so a long-open tab never shows stale "2h ago".
  clearTimeout(paintRefreshedPill._timer);
  paintRefreshedPill._timer = setTimeout(paintRefreshedPill, 60_000);
}

function paintMetaPills() {
  const m = state.bis?.meta;
  if (!m) return;
  const patchEl = document.getElementById("meta-patch");
  const seasonEl = document.getElementById("meta-season");
  const sampleEl = document.getElementById("meta-sample");
  const regionEl = document.getElementById("meta-region");
  const expansionEl = document.getElementById("expansion-name");
  if (patchEl) patchEl.textContent = m.patch ? `patch ${m.patch}` : "patch unknown";
  // Prefer the user-friendly season name ("MN Season 2"); fall back to the raw id.
  if (seasonEl) seasonEl.textContent = m.season_name || (m.season_id ? `season ${m.season_id}` : "season unknown");
  if (sampleEl) sampleEl.textContent = `sample ${m.sample_size || 50}`;
  if (regionEl) {
    const r = m.region || "eu";
    // "eu+us" → "EU+US", "eu" → "EU"
    regionEl.textContent = r.split("+").map(s => s.toUpperCase()).join("+");
  }
  // Expansion title in the banner — from discovery, not hardcoded.
  if (expansionEl && m.expansion) expansionEl.textContent = m.expansion;
  paintRefreshedPill();
}

async function boot() {
  populateClassSelectors();
  initSlotModal();
  initReportIssue();

  // Wire up "Class Overview ->" reset link
  const overviewLink = document.getElementById("view-showcase-link");
  if (overviewLink) {
    overviewLink.addEventListener("click", (e) => {
      e.preventDefault();
      switchSpec(null);
    });
  }

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

  const allSpecs = listSpecIds();
  const isValidSpec = (id) => id && allSpecs.some(s => s.id === id);

  const hashSpec = location.hash ? location.hash.slice(1) : null;
  let storedSpec = null;
  try {
    storedSpec = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  if (isValidSpec(hashSpec)) {
    state.currentSpecId = hashSpec;
    try { localStorage.setItem(STORAGE_KEY, hashSpec); } catch (e) {}
  } else if (isValidSpec(storedSpec)) {
    state.currentSpecId = storedSpec;
    history.replaceState(null, "", `#${storedSpec}`);
  } else {
    state.currentSpecId = null; // First-Time Visitor: Showcase Mode!
  }

  render();
  checkStaleness();

  window.addEventListener("hashchange", () => {
    const newHash = location.hash ? location.hash.slice(1) : null;
    if (isValidSpec(newHash)) {
      state.currentSpecId = newHash;
      try { localStorage.setItem(STORAGE_KEY, newHash); } catch (e) {}
    } else if (!newHash) {
      state.currentSpecId = null;
    }
    render();
  });
}

document.addEventListener("DOMContentLoaded", boot);
