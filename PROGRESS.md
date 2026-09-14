# PROGRESS.md

Cross-agent progress tracking, auditing, and handoff. **Append-only log** — never rewrite history here. Every agent appends a timestamped entry at session end.

## Current lock

| Owner | Task | Claimed at (UTC) | Status |
|---|---|---|---|
| opencode | talent modal → full-viewport overlay (research + build) | 2026-09-14 | active |

**Lock rules:** claim by editing this table + committing `[<prefix>] lock: <task>`. One agent works at a time. Release the lock in your session-end log entry.

## Handoff / next steps

### Task spec for agy — color system cleanup (assigned by Gideon, 2026-09-14)

Goal: restrain the gold, and make selected-talent glow class-colored. Current state (verified in code):

- **Gold is everywhere** — ~90 usages of `var(--gold-text)` / `var(--gold-border)` across `public/styles/layout.css` + `components.css` + `tokens.css`. Panels, buttons, headers, scrollbars, stat values, tooltips all gold. It's loud; the design brief is dark, restrained, with class color as the hero accent.
- **Selected talent nodes glow purple, not class color** — `.tt-selected` in `components.css` (~line 439) hardcodes `var(--quality-epic)` purple glow. Meanwhile the runtime already mutates `--class-color` / `--class-color-glow` per selected spec (see `tokens.css` line 32 comment + `app.js`).
- **Scope:**
  1. Audit gold usages; keep gold for item-level/rank lines (WoW convention) and the logo frame; demote or neutralize it on generic UI chrome (panel borders, section headers, scrollbars, buttons) in favor of neutral borders + `--class-color` accents.
  2. `.tt-selected` glow → use `var(--class-color)`/`var(--class-color-glow)` instead of hardcoded purple. Also `.tt-node:hover` gold glow (`components.css` ~line 432) — consider class-colored or neutral.
  3. Do NOT touch the logo emblem asset, favicons, or the item-quality colors.
- **Verification:** local `npx http-server` in `public/`, eyeball 2–3 different classes (e.g. demon-hunter green, mage blue, priest white), confirm talent glow follows class color and gold reads restrained. agy has image input — use it.
- **Commit:** `[agy]` prefix, push, append log entry, release lock.

### Task: talent tree modal → full-viewport overlay (assigned: opencode builds, agy reviews)

Decision (Gideon, 2026-09-14): opencode implements (structural JS/CSS — fixed overlay, scroll/keyboard/resize, headless puppeteer QA); agy reviews visually (has image input). Not started. Next opencode session: claim lock first per protocol.

### Known open item — season rank ladders are Season-2 constants

The Hero/Myth/Champion/Veteran ilvl ladders powering "Hero x/6" rank lines are hardcoded Season 2 tables (Icy Veins-sourced, bonus-ID verified). Season 3 will silently produce wrong ranks. Fix when season turns: update ladder tables (frontend + comment in gear.js) or gate the feature off. Flagged 2026-08-31, still open.

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
- [2026-09-11 ~15:30 UTC] [opencode] Discord sync fix landed (commit `45a7041`): `scripts/sync-discord-issues.mjs` now gracefully skips (exit 0) when `DISCORD_BOT_TOKEN`/`DISCORD_CHANNEL_ID` are unset instead of crashing the workflow; workflow Node 20 → 22. Manually dispatched run verified green (13s).
- [2026-09-11 ~15:30 UTC] [opencode] Logo task closed. Gideon eyeball-verified Concept #5 The Shattered Sigil (master + favicons, deployed) and approved. Note: current opencode model (MiniMax M3) has no image input, so the vision pass was done by Gideon directly — verdict: approved as-is.
- [2026-09-11 ~15:30 UTC] [opencode] Two-workspace model adopted: agy's clone created at `C:\Users\Gideon\OneDrive\AI\AntiGravity\Projects\metagor`; opencode keeps `C:\Users\Gideon\OneDrive\AI\OpenCode\Projects\Meta'gor`. Protocol documented in AGENTS.md (git as the only sync boundary). agy still needs: `gh auth login` in its workspace, and `gh secret set DISCORD_CHANNEL_ID --repo gitgipie/metagor` when ready.
- [2026-09-14 ~07:00 UTC] [opencode] Discord issue sync now fully operational: `DISCORD_CHANNEL_ID` + reset `DISCORD_BOT_TOKEN` secrets set (old token had expired — 401). Manual dispatch verified end-to-end: auth OK, channel `metagor-bug-reports` read OK, 8 messages fetched. Test messages correctly skipped as non-report format; real site-reported issues will sync. agy setup confirmed done by Gideon.
- [2026-09-14 ~07:00 UTC] [opencode] KIMI K3-era TODO recovered from opencode SQLite history (`opencode.db`, session `ses_0bc8…`, Aug 29–31). Status: 6 of 8 items done (tier labels, tooltip reorder, rank x/6 lines, Catalyst cleanup, rank styling, logo/favicon). Two open: color system cleanup → assigned agy (spec above); talent modal full-viewport → opencode builds, agy reviews. Also flagged: Season-2 rank ladders are hardcoded and will break silently in Season 3 (see Known open item).