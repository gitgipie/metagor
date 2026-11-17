// public/js/render/rotation.js
// Renders rotation summary + priority list from guides.json.

import { escapeHtml, escapeAttrUrl } from "../escape.js";

export function renderRotation(specId, guides, host) {
  const r = guides.rotations?.[specId];
  if (!r) {
    host.innerHTML = `<div class="empty-note">No curated rotation for this spec yet.</div>`;
    return;
  }
  host.innerHTML = `
    <div class="rotation-block">
      <p class="rotation-summary">${escapeHtml(r.summary || "")}</p>
      <ol class="rotation-priority">
        ${(r.priority || []).map(line => `<li>${escapeHtml(line)}</li>`).join("")}
      </ol>
      ${(r.links || []).length ? `
        <div class="rotation-links">
          ${r.links.map(l => `<a class="rotation-link" href="${escapeAttrUrl(l.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)} →</a>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}
