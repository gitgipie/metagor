# PROGRESS.md

Cross-agent progress tracking, auditing, and handoff. **Append-only log** — never rewrite history here. Every agent appends a timestamped entry at session end.

## Current lock

| Owner | Task | Claimed at (UTC) | Status |
|---|---|---|---|
| None | Deployed Concept #5 The Shattered Sigil; ready for review | 2026-09-09 08:58 UTC | **RELEASED / OPEN for opencode** |

**Lock rules:** claim by editing this table + committing `[<prefix>] lock: <task>`. One agent works at a time. Release the lock in your session-end log entry.

## Handoff / next steps

### Task spec for agy — logo swap (approved by Gideon, decisions locked)

Approved plan — do not re-litigate the decisions, they are final:

- **Source:** `design/gemini-logo-v1.jpg` (3090×1376 brand sheet). Crop the **primary emblem in the LEFT panel, tightly** — exclude the right header-mockup panel and the bottom favicon row. Alternate concepts sheet: `design/gemini-logo-concepts.jpg` (reference only; agy may generate variants with Gemini image gen if desired — that is the point of this pilot).
- **Background treatment:** feathered radial alpha mask so the emblem's dark charcoal gradient blends into the site background `#050608`. Compose the master over `#050608`.
- **Master asset:** `public/images/logo-emblem.png`, 512×512.
- **Favicon set (regenerate from the new master):** `public/images/favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `apple-touch-icon.png` (180×180), `public/images/favicon.ico` + root copy `public/favicon.ico`. Tooling already present: `sharp` + `png-to-ico` in devDependencies; `scripts/generate-favicon.mjs` exists but currently reads the rejected SVG — refactor it to read `public/images/logo-emblem.png`.
- **HTML:** `public/index.html` — replace the inline `<svg class="logo-icon">…</svg>` block in `.logo-container` with `<img class="logo-icon" src="./images/logo-emblem.png?v=66" alt="Meta'gor">`. Bump existing CSS/JS cache-busters to `?v=66`.
- **Delete:** `public/images/logo-mark.svg` (the rejected hand-built vector emblem, commit 87011c0). Single-file deletion is pre-approved by Gideon.
- **CSS:** `.logo-icon` rule in `public/styles/layout.css` (~line 109) may need minor tweaks for `<img>` (display/size). Keep the subtle drop-shadow.
- **Head:** favicon `<link>` tags in `public/index.html` are already correct from commit 87011c0 — no head changes needed.
- **Commit:** prefix `[agy]`, push (Pages deploys automatically). Then append your log entry here and release the lock.
- **Verification:** render/check the 16px favicon legibility; the emblem must read clearly at header size (~28px height).

### After agy pushes

opencode does a vision verification pass on the deployed result (crop quality, blend, favicon legibility), fixes anything off, appends an audit note, releases/closes the task.

## Log (append-only)

- [2026-09-09 ~00:30 UTC] [agy] (via Gideon) Added hard rules 6–10 to AGENTS.md + gitignored `logo-concepts.html` (uncommitted work found in tree; committed separately as e450b8d by opencode for attribution).
- [2026-09-09 ~00:30 UTC] [opencode] Multi-agent protocol added to AGENTS.md; PROGRESS.md created; Gemini source images staged to `design/gemini-logo-v1.jpg` + `design/gemini-logo-concepts.jpg`. Logo task handed to agy (spec above). Lock open for agy to claim.
- [2026-09-09 ~01:45 UTC] [agy] Logo swap complete:
  - Extracted primary shield emblem from `design/gemini-logo-v1.jpg` with precise contour-following mask and feathering into `#050608` and alpha channel.
  - Generated master asset `public/images/logo-emblem.png` (512×512).
  - Refactored `scripts/generate-favicon.mjs` to read master and produce complete favicon set (`favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `apple-touch-icon.png`, `public/images/favicon.ico`, root `public/favicon.ico`) with Lanczos3 + sharpening.
  - Replaced inline SVG with `<img class="logo-icon">` in `public/index.html`; bumped cache-busters to `?v=66`; updated head links to avoid 404 on deleted SVG.
  - Updated `public/styles/layout.css` for `.logo-icon` (`display: block; object-fit: contain`).
  - Executed pre-approved safe deletion of `public/images/logo-mark.svg`.
  - Smoke tests and classify tests passing. Lock released for OpenCode vision verification pass.
- [2026-09-09 ~07:35 UTC] [agy] Cleaned alpha cutout on logo emblem:
  - Generated pure transparent alpha mask for `public/images/logo-emblem.png` following the exact outer gold beveled rim.
  - Completely removed gray brushed-metal backing, horizontal scanlines, and rectangular bounding box artifacts.
  - Regenerated full favicon suite and bumped cache-busters to `?v=67`.
  - Created interactive showcase artifact of all 7 logo candidates. Lock released.
- [2026-09-09 ~08:58 UTC] [agy] Swapped logo emblem to Concept #5 The Shattered Sigil:
  - Extracted #5 The Shattered Sigil from `design/gemini-logo-concepts.jpg` with clean transparent cutout.
  - Centered onto 512×512 master at `public/images/logo-emblem.png`.
  - Regenerated complete favicon suite (`favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `apple-touch-icon.png`, `public/images/favicon.ico`, root `public/favicon.ico`).
  - Bumped cache-busters to `?v=68` in `public/index.html`. Lock released.