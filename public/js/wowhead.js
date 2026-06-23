// public/js/wowhead.js
// Wowhead power.js tooltip contract. Items expose data-wowhead="item=NNN&domain=europe".
// Spells expose data-wowhead="spell=NNN".

const DOMAIN = "europe";

export function wowheadItemAttrs(entry) {
  if (!entry) return {};
  const attrs = {};
  if (entry.item_id) {
    attrs.wowhead = `item=${entry.item_id}&domain=${DOMAIN}`;
    attrs.wowheadItemId = String(entry.item_id);
  }
  return attrs;
}

export function wowheadSpellAttrs(entry) {
  if (!entry) return {};
  const attrs = {};
  if (entry.spell_id) {
    attrs.wowhead = `spell=${entry.spell_id}`;
    attrs.wowheadSpellId = String(entry.spell_id);
  }
  return attrs;
}

// Append the official Wowhead power.js script once. Idempotent.
export function ensureWowheadScript() {
  if (document.getElementById("wowhead-powerjs")) return;
  const s = document.createElement("script");
  s.id = "wowhead-powerjs";
  s.async = true;
  s.src = `https://wow.zamimg.com/js/tooltips.js?domain=${DOMAIN}&power`;
  document.head.appendChild(s);
}
