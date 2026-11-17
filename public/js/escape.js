// public/js/escape.js
// Tiny shared helpers for building HTML strings from data-derived text.
// Anything that comes from the JSON data files (names, descriptions, notes,
// labels, urls) must go through escapeHtml() / safeUrl() before being put
// into innerHTML. Prefer textContent where there is no markup to build.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Escape text for use in HTML text content AND quoted attribute values.
export function escapeHtml(value) {
  if (value == null) return "";
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

// Only allow absolute http(s) URLs. Returns "" for anything else (javascript:,
// data:, relative, malformed). Result is NOT html-escaped: wrap in escapeHtml()
// when interpolating (or use escapeAttrUrl()).
export function safeUrl(value) {
  if (value == null) return "";
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

// safeUrl + escapeHtml in one step, for href="..." / src="..." interpolation.
export function escapeAttrUrl(value) {
  return escapeHtml(safeUrl(value));
}
