// public/js/render/creators.js
// Renders YouTube creator cards from guides.json.

function handleFromUrl(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    return segs[0] ? `@${segs[0].replace(/^@/, "")}` : url;
  } catch { return url; }
}

export function renderCreators(specId, guides, host) {
  const list = guides.creators?.[specId] || [];
  if (!list.length) {
    host.innerHTML = `<div class="empty-note">No curated creators for this spec yet.</div>`;
    return;
  }
  host.innerHTML = `
    <div class="creators-block">
      ${list.map(c => `
        <a class="creator-card" href="${c.youtube}" target="_blank" rel="noopener noreferrer">
          <div class="creator-handle">${handleFromUrl(c.youtube)}</div>
          <div class="creator-name">${c.name}</div>
          <div class="creator-topic">${c.topic || ""}</div>
        </a>
      `).join("")}
    </div>
  `;
}
