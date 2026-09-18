# PROGRESS.md

Cross-agent progress tracking, auditing, and handoff. **Append-only log** — never rewrite history here. Every agent appends a timestamped entry at session end.

## Current lock

| Owner | Task | Claimed at (UTC) | Status |
|---|---|---|---|
| agy | align main page class and spec selectors to Loot Finder dock standard | 2026-09-18 06:35 UTC | LOCKED |

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

**BUILT 2026-09-14, awaiting agy visual review.** opencode implemented the full-viewport overlay (`#talent-overlay` in index.html, z-9500): sticky header + scrollable body, Esc/backdrop-click/close-btn, focus management (close on open, Tree btn restored on close), idempotent wiring. Tree columns now `flex-wrap` (no nested scrollbars). Dead `tt-modal` CSS removed; gear.js cleanup line removed; cache-busters 68→69, module imports v53→v54. Headless QA: `scripts/qa-talent-overlay.mjs` (puppeteer-core driving system Edge, zero download; mirrors Pages layout via temp `public/data` junction, cleaned on exit) — **15/15 pass**. Screenshots for review: `qa/talent-overlay-desktop.png` (1440×900), `qa/talent-overlay-narrow.png` (800×700) — gitignored, not committed; agy must regenerate locally or eyeball the live site. Remaining for agy: visual pass (layout, node glow, line contrast) — structural work done.

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
- [2026-09-14 ~14:30 UTC] [opencode] Talent tree full-viewport overlay BUILT and verified. Files: `public/index.html` (new `#talent-overlay` markup, cache-busters 69), `public/js/render/talents.js` (overlay open/close, Esc + outside-click + close btn, focus management, idempotent wiring), `public/styles/components.css` (`.talent-overlay*` styles; removed dead `.slot-modal.tt-modal`; tree columns now flex-wrap, no nested scrollbars), `public/js/render/gear.js` (removed dead tt-modal cleanup), `public/js/app.js` (module versions v54), `scripts/qa-talent-overlay.mjs` (NEW headless QA: puppeteer-core + system Edge, zero download; self-hosts on :8123 with temp `public/data` junction mirroring Pages layout, junction removed on exit), `package.json`/lock (puppeteer-core devDep), `.gitignore` (qa/). QA 15/15 pass incl. resize, tooltip, Esc, focus restore, reopen, slot-modal independence, zero page errors. `node scripts/smoke-aggregate.mjs` still green.
- [2026-09-14 ~15:00 UTC] [opencode] Vision assessment run (Gemini 3.7 Flash) flagged missing/hollow spell icons. Expanded `scripts/qa-talent-overlay.mjs` to await/assert `img.naturalWidth > 0` for all 95 nodes. Result: **95/95 loaded successfully**. The vision model hallucinated hollow nodes due to the `grayscale(60%) brightness(0.5)` CSS filter on unselected nodes causing compression artifacts in the screenshot. Task complete. Lock released. NEXT: agy visual review and color system cleanup.
- [2026-09-15 ~13:15 UTC] [agy] Optimal Dungeon & Core Calculator prototype built and verified:
  - Created standalone calculator page `public/dungeon-calculator.html` with class/spec switcher defaulting to Monk Brewmaster.
  - Implemented `public/js/dungeon-calc.js` computation engine: factors in spec-specific loot eligibility (armor types, class weapon proficiencies, primary stat), calculates loot pool dilution ($K$ hits / $N$ eligible drops), adoption weighting, slot multipliers (Trinkets 2.2x, Weapons/Jewelry 1.6x, Catalyst armor 1.0x), and stat synergy.
  - Created `public/styles/dungeon-calc.css` matching Metagor dark aesthetic with tier badges (S/A/B/C), hit rate gauges, chase chips, and collapsible drop tables.
  - Linked calculator in `public/index.html` header highlights.
  - Added headless Edge QA verification script `scripts/qa-dungeon-calc.mjs` (zero console errors, verified 8 active dungeons, tested Brewmaster S-tier Voidscar Arena / Murder Row / Den of Nalorakk). Lock released.
- [2026-09-16 ~09:35 UTC] [agy] Raid Boss targeting, 3-way mode filter, and native hover tooltips added to calculator:
  - Expanded `public/js/dungeon-calc.js` to extract master raid pool (105 unique items across 17 encounters) and evaluate raid bosses per spec.
  - Added 3-way segmented filter bar (`Mythic+ Dungeons`, `Raid Bosses`, `Combined Targets`) under the spec bar in `public/dungeon-calculator.html`.
  - Grouped raid loot by individual **Raid Boss** with raid instance subtitle, Hit Rate pool efficiency, and `[Raid Boss]` vs `[Mythic+ Dungeon]` badges.
  - Wired up native hover tooltips (`#metagor-item-tooltip`) and Wowhead power tooltips across all item rows and chase chips showing item levels, stats, source, boss, and ladder adoption %.
  - Verified with Edge headless QA test (`qa-dungeon-calc.mjs`), generated screenshots for raid and combined modes, confirmed zero console errors. Lock released.
- [2026-09-16 ~10:40 UTC] [agy] Loot Spec Optimization & Sniping Advice added to calculator:
  - Implemented `getLootSpecAdvice()` algorithm in `public/js/dungeon-calc.js` evaluating sibling specs of the player's class.
  - Enforced strict safety constraints: verified all #1 BiS and top chase items remain eligible in off-spec, and prevented cross-primary stat contamination (no Intellect drops for Agility specs).
  - Displayed loot spec recommendation badges (`✓ Optimal Loot Spec` vs `💡 Sniping Advice`) directly on dungeon and raid cards with clear mathematical explanations of pool shrinkage and drop probability gains.
  - Added `.loot-spec-advice` CSS with glowing gold highlights for sniping opportunities.
  - Verified with Edge headless QA test (`scripts/qa-dungeon-calc.mjs`), confirming 100% pass across dungeons and raids with zero console errors. Lock released.
- [2026-09-16 ~11:15 UTC] [agy] Spec drop eligibility icons and class drop tables added to calculator:
  - Added `SPEC_ICONS` lookup mapping all 40 specs to official Wowhead CDN icon textures (verified 40/40 HTTP 200).
  - Implemented spec-level weapon proficiency rules and empirical role-restricted trinket classification (tank-only / healer-only) in `isItemEligible()`.
  - Added "Loot Specs" column in dungeon and raid drop tables with official spec icon badges: fully colored for eligible specs, dimmed/grayscale for ineligible specs, and active class-colored glow border for the currently selected spec.
  - Displayed comprehensive class drops in expandable tables with clear `[Off-Spec]` badges and dynamic drop counts.
  - Bumped `dungeon-calc.css` cache buster to `?v=3`.
  - Verified with automated Edge QA script (`scripts/qa-dungeon-calc.mjs`, 15 spec icons rendered on top boss, 14 eligible, 1 grayed out, 0 console errors) and visual verification of Monk and Paladin drop tables. Lock released.
- [2026-09-16 ~11:55 UTC] [agy] Seasonal Gearing & Upgrade Matrix built and verified:
  - Created decoupled, season-agnostic JSON Schema `data/schema/season_matrix.schema.json` and Season 2 data file `data/season_matrix.json` modeling all 28 ilvl steps (256–344) across 5 upgrade tracks (Adventurer, Veteran, Champion, Hero, Myth) and endgame activities (M+ keys, Delves 1-11, Raids, Crafting crests, PvP/World).
  - Built `scripts/verify-season-matrix.mjs` verifying schema validity, monotonic rank consistency, and cross-referencing against live Blizzard gear in `data/aggregated_bis.json` (6,524/6,534 items matched, 99.85%).
  - Updated `.github/workflows/deploy-pages.yml` to stage `data/season_matrix.json` into `_site/data/` for GitHub Pages.
  - Implemented `public/gearing-matrix.html`, `public/styles/gearing-matrix.css`, and `public/js/gearing-matrix.js` featuring 3 dynamic modes: full Matrix Table View with real-time filters/search, Activity Milestones cards, and Interactive Upgrade Calculator.
  - Added global navigation switcher across BiS Dashboard (`index.html`), Drop Calculator (`dungeon-calculator.html`), and Gearing Matrix (`gearing-matrix.html`).
  - Added headless Edge QA test `scripts/qa-gearing-matrix.mjs` (verified 28 table rows, search, activity pills, mode switching, mobile responsive layout, zero console errors). Lock open.
- [2026-09-16 ~13:55 UTC] [agy] Renamed to Loot Targets & implemented Season 2 Catalyst Base optimizer:
  - Renamed feature and files to **Loot Targets** (`public/targets.html`, `public/styles/targets.css`, `public/js/targets.js`).
  - Preserved backward compatibility: `public/dungeon-calculator.html` automatically redirects to `targets.html`, while `dungeon-calc.js` and `dungeon-calc.css` alias and re-export `targets.js` / `targets.css`.
  - Implemented Season 2 Revival Catalyst base stat retention mechanics: non-tier drops in tier slots (`HEAD`, `SHOULDER`, `CHEST`, `HANDS`, `LEGS`) with top secondary stats are scored with a 1.8x multiplier and tagged as `[⚡ Catalyst Base]`.
  - Added `⚡ Top Catalyst Base Target` KPI highlight card, `⚡ Tier Base` chase chips, and tooltips indicating secondary stat retention upon tier conversion.
  - Updated navigation links across `public/index.html` and `public/gearing-matrix.html` to point to `Loot Targets`.
  - Updated `scripts/qa-dungeon-calc.mjs` verifying redirect, Catalyst Base KPI, badges, chase chips, and tooltips with zero console errors. Lock released.
- [2026-09-16 ~15:35 UTC] [agy] Added Tier Bases Only quick-toggle and 5-slot secondary stat finder:
  - Added `⚡ Tier Bases Only` toggle button to filter bar in `public/targets.html`.
  - Added 5-slot subbar (`All 5 Slots`, `Head`, `Shoulders`, `Chest`, `Hands`, `Legs`) allowing players to drill down to any single tier slot with a single click.
  - Enhanced `public/js/targets.js`: audited and fixed `HAND` and `ROBE` inventory types in `TIER_SLOTS` and `armorSlots`, built 5-slot `tierSlotMatrix` with top drops per slot, and implemented target filtering and EV re-scoring in tier-only mode.
  - Implemented adaptive 5-slot KPI grid: displays the top piece for each of the 5 tier slots (or #1 / #2 runner-up when a specific slot is active).
  - Styled `.tier-only-toggle` and `.tier-slot-subbar` in `public/styles/targets.css`.
  - Updated `scripts/qa-dungeon-calc.mjs`: tested toggle, 5 slot KPI headers, tier item validation, and chest slot filtering with zero console errors. Lock released.
- [2026-09-16 ~18:30 UTC] [agy] Renamed to Loot Finder & restructured filter bar layout:
  - Officially rebranded feature to **Loot Finder** following team vote (`public/loot-finder.html`, `public/js/loot-finder.js`, `public/styles/loot-finder.css`).
  - Preserved zero-delay backward compatibility: `public/targets.html` and `public/dungeon-calculator.html` redirect to `loot-finder.html`; legacy JS and CSS re-export new modules.
  - Restructured filter bar hierarchy: separated primary activity selector (`Mythic+ Dungeons`, `Raid Bosses`, `Combined Targets`) from secondary filters.
  - Created `.secondary-filter-bar` and `.tier-filter-cluster` positioning `[ ⚡ Tier Bases Only ]` toggle and slot selector (`All 5 Slots`, `Head`, `Shoulders`, `Chest`, `Hands`, `Legs`) directly below on their own unified horizontal line.
  - Implemented interactive slot switching: slot pills are dimmed when inactive, and clicking any slot pill immediately activates tier mode for that slot.
  - Tuned CSS button padding so the filter bar stays on a single line across desktop and tablet viewports.
  - Updated navigation links across `public/index.html` and `public/gearing-matrix.html` (`Loot Finder →`).
  - Ran `scripts/qa-dungeon-calc.mjs` and `scripts/smoke-aggregate.mjs` (100% pass, 0 errors). Eyeball verified layout with visual screenshots. Lock released.
- [2026-09-17 ~08:30 UTC] [agy] Harmonized control bar shape language and calibrated vertical spacing rhythm:
  - Enclosed spec selectors in a matching sleek dark-glass track (`.spec-bar-container` / `.spec-bar`), harmonizing Row 2 with the Activity and Tier filter bars (`border-radius: 8px`, `padding: 4px`, `gap: 6px`).
  - Updated spec buttons to clean `Inter` typography and soft `border-radius: 6px`, eliminating the isolated floating oval capsules.
  - Softened the harsh 4px/2px class grid container into modern `border-radius: 10px` with `border-radius: 6px` class buttons, replacing the heavy gold border with a restrained dark-glass border.
  - Calibrated vertical spacing rhythm: 24px below Class Grid, 26px below Spec Track, 18px below Activity Mode, and 36px below Tier Filters before KPI cards.
  - Fixed dynamic test assertion in `scripts/qa-dungeon-calc.mjs` to be resilient against overnight CI ladder scrapes.
  - Verified with headless Edge QA test (`scripts/qa-dungeon-calc.mjs`, 0 errors) and smoke aggregate test. Visual verification across Monk and Paladin confirmed. Lock released.
- [2026-09-17 ~08:55 UTC] [agy] Renamed QA test script to qa-loot-finder & added scroll/leaflet motion:
  - Renamed `scripts/qa-dungeon-calc.mjs` &rarr; `scripts/qa-loot-finder.mjs` and updated header comments.
  - Added npm scripts to `package.json`: `"qa:loot-finder": "node scripts/qa-loot-finder.mjs"` and `"qa:matrix": "node scripts/qa-gearing-matrix.mjs"`.
  - Implemented Tier Bases "Scroll" expansion motion: centered compact toggle button under Raid Bosses when inactive, expanding dynamically to the left while unrolling the 5 slot pills to the right when active.
  - Implemented `.leaflet-pop` unfold spring transition on spec container when switching classes.
  - Verified with `npm run qa:loot-finder` (0 errors) and smoke aggregate test. Visual verification confirmed via screenshots. Lock released.
- [2026-09-17 ~10:45 UTC] [agy] Formatted 5 KPI cards in uniform single row with rock-solid card dimensions:
  - Replaced wrapping auto-fit grid with `grid-template-columns: repeat(5, minmax(0, 1fr))` on desktop, ensuring all 5 cards remain on a single horizontal row without wrapping.
  - Locked card dimensions (`height: 104px; min-height: 104px; justify-content: space-between`) with fixed-height labels (`2.2em`), single-line truncated values with hover tooltips (`title`), and single-line subtitles (`1.3em`).
  - Completely eliminated card height/width shifting across spec switches, class switches, and activity filter changes.
  - Verified with `npm run qa:loot-finder` (0 errors) and smoke aggregate test. Visual verification confirmed at 1440x1100 across both Standard and Tier Bases modes. Lock released.
- [2026-09-17 ~11:20 UTC] [agy] Updated activity switcher labels and added animated swirly portal icons:
  - Updated activity switcher labels in `public/loot-finder.html` from `Mythic+ Dungeons` -> `M+ Dungeons`, `Raid Bosses` -> `Raid`, and `Combined Targets` -> `Both`.
  - Replaced static unicode glyphs with bespoke inline SVG spinning portal swirl vortexes (`.portal-icon`, `.portal-vortex`, `@keyframes portal-spin`):
    - `M+ Dungeons`: Azure/cyan swirling vortex pin with luminous core and themed active glow (`#38bdf8`).
    - `Raid`: Emerald/fel green swirling vortex pin with luminous core and themed active glow (`#4ade80`).
    - `Both`: Radiant triad vortex intertwining Azure Blue, Fel Green, and Amber-Gold ribbons into an ultimate legendary sun-gold core and glow (`#f59e0b`).
  - Added interactive spin-speed transitions (`8s` normal -> `3.5s` on hover/active) and subtle event-horizon aura.
  - Verified with `npm run qa:loot-finder` (0 errors), `node scripts/smoke-aggregate.mjs` (pass), and visual high-DPI screenshots across all 3 activity states. Lock released.
- [2026-09-17 ~11:50 UTC] [agy] Standardized uniform button length for spec buttons and activity mode buttons:
  - Standardized `.mode-btn` to a uniform `width: 160px; justify-content: center;`, ensuring `M+ Dungeons`, `Raid`, and `Both` all share identical button length and centered alignment.
  - Standardized `.spec-btn` to a uniform `width: 160px; justify-content: center; text-align: center;`, eliminating width discrepancies between short spec names (`Havoc`, `Holy`, `Arms`) and longer spec names (`Vengeance`, `Protection`, `Restoration`).
  - Established geometric harmony between the Spec track and the Activity mode bar (both 500px wide for 3-spec classes, aligning each spec button directly over its corresponding activity button).
  - Added responsive flex rules for mobile viewports (`@media (max-width: 768px)`: `flex: 1 1 0; min-width: 0; width: auto`).
  - Verified with `npm run qa:loot-finder` (0 errors), `node scripts/smoke-aggregate.mjs` (pass), empirical button width measurements (160px across all specs and modes), and visual screenshots. Lock released.
- [2026-09-17 ~13:20 UTC] [agy] Renamed to Tier Set Only and replaced lightning bolt with authentic Season 2 Venomblight Manaflux icon:
  - Renamed "Tier Bases Only" -> "Tier Set Only" across the toggle button, subtitle, empty state notifications, drop table toggles, and pool gauge strings.
  - Replaced generic unicode/AI lightning bolts (`⚡` / `&#x26A1;`) throughout Loot Finder with the authentic World of Warcraft Season 2 Matrix Catalyst icon: Venomblight Manaflux (square potion bottle containing glowing green manaflux, anvil silhouette, and cork stopper with metallic beveled frame).
  - Saved high-resolution reference to `design/manaflux-source.png` and created `scripts/generate-manaflux-icon.mjs` using `sharp` with transparent chamfered corner cutouts, outputting web asset `public/images/venomblight-manaflux.png` (128x128).
  - Styled `.tier-toggle-icon` and `.manaflux-inline-icon` in `public/styles/loot-finder.css` with emerald/nature hover & active drop-shadow glow and seamless inline alignment.
  - Updated 5-slot KPI card headers from "Head Base" -> "Head Tier", "Shoulders Tier", "Chest Tier", "Hands Tier", "Legs Tier".
  - Verified with `npm run qa:loot-finder` (100% pass, 0 errors), `node scripts/smoke-aggregate.mjs` (pass), and high-DPI browser verification screenshots across inactive and active states. Lock released.
- [2026-09-17 ~15:45 UTC] [agy] Implemented single-row Class Crest Strip with hover popout labels:
  - Enriched `wowClasses` catalog in `public/js/registry.js` with official Blizzard Game Data API `file_data_id`s for all 13 playable classes.
  - Replaced the asymmetric 13-button grid in `public/loot-finder.html` with a centered single-row Class Crest Strip (`.class-grid-container` / `.class-grid`), rendering 42x42px icon buttons (`.class-btn.class-icon-btn`) loaded directly from Blizzard's CDN via `iconUrl()`.
  - Implemented smooth interactive hover mechanics in `public/styles/loot-finder.css`: button elevates smoothly (`translateY(-5px) scale(1.15)`) with class-color glow and displays an absolutely-positioned floating badge (`.class-popout-label`) with class-color border, text, and downward arrow indicator, with zero layout shift or button jumping.
  - Added responsive rules for mobile screens (wraps into compact two-row flex with 36x36px icons).
  - Updated QA test suite in `scripts/qa-loot-finder.mjs` to verify all 13 class buttons, images, and popouts.
  - Verified with `npm run qa:loot-finder` (100% pass, 0 errors), `node scripts/smoke-aggregate.mjs` (pass), and browser visual verification across idle and hovered class states. Lock released.
- [2026-09-17 ~16:25 UTC] [agy] Unified Loot Finder navigation with icon buttons and hover popouts (Spec, Mode, Tier Set):
  - Enriched `public/js/registry.js` with official Blizzard Game Data API `file_data_id`s for all 40 specializations across all 13 classes, and added `getSpecIcon(classId, specName)` helper.
  - Updated `renderSpecSelectors` in `public/loot-finder.html` to render 42x42px spec icon buttons (`.spec-btn.spec-icon-btn`) with Blizzard CDN images and glowing class-colored hover popout badges (`.spec-popout-label`).
  - Transformed the Activity Mode bar into 42x42px icon buttons with animated spinning portal vortex SVGs and floating popout badges (`.mode-popout-label` for `M+ DUNGEONS`, `RAID`, `BOTH`) with azure, emerald, and legendary gold theme glows.
  - Transformed the Tier Set toggle into a 42x42px square Venomblight Manaflux icon button with an emerald hover popout label (`.tier-popout-label`), smoothly unrolling the 5 slot pills (`All 5 Slots`, `Head`, `Shoulders`, `Chest`, `Hands`, `Legs`) when active.
  - Solved cross-tier stacking context clipping by elevating active/hovered dock containers to `z-index: 80` (`.class-grid-container`, `.spec-bar-container`, `.calc-mode-container`, `.secondary-filter-bar`).
  - Added mobile responsive sizing rules for `≤ 768px` (36x36px icon buttons).
  - Updated `scripts/qa-loot-finder.mjs` with assertions for spec icons, mode portal icons, and tier toggle icon; 100% pass (0 errors). Smoke tests pass. Eyeball verified via high-DPI screenshots. Lock released.
- [2026-09-17 ~17:00 UTC] [agy] Implemented Fluid Cascading Scroll Rollout animations across Class, Spec, and Mode selectors:
  - Added `@keyframes spec-dock-rollout` and `@keyframes spec-icon-rollout` in `public/styles/loot-finder.css` for horizontal unrolling and staggered spring entrances using `--item-idx * 55ms` with `backwards` fill mode to maintain hover/active states.
  - Added `@keyframes mode-dock-pulse` for luminous energy wave propagation into the mode dock on spec/mode switches (`--class-color-glow`).
  - Added `@keyframes card-cascade-rollout` with `--card-idx * 40ms` stagger (capped at 8) for smooth cascading target card entrances.
  - Wired DOM reflow triggers (`void el.offsetWidth`) and dynamic CSS variable attachments in `public/loot-finder.html` across `renderClassSelectors`, `renderSpecSelectors`, `selectSpec`, `bindModeButtons`, and `renderTargets`.
  - Updated `scripts/qa-loot-finder.mjs` with assertions for `.dock-rollout`, `--item-idx`, `.card-rollout`, and `--card-idx`.
  - Verified with `npm run qa:loot-finder` (100% pass, 0 errors), `node scripts/smoke-aggregate.mjs` (pass), and high-DPI browser verification screenshots. Lock released.
- [2026-09-17 ~17:45 UTC] [agy] Implemented Selected Button Label Rollout System (Class, Spec, Mode & Tier Set):
  - Eliminated destructive `container.innerHTML = ""` DOM wipes in `renderClassSelectors()` and `renderSpecSelectors()`, persisting DOM nodes so native CSS transitions run smoothly without flicker.
  - Implemented `.btn-rollout-label` in `public/styles/loot-finder.css`: inactive buttons remain compact 42x42px icon squares, while active buttons smoothly expand horizontally (`max-width: 42px -> 220px`) and roll out their glowing text label (`max-width: 0 -> 140px`, `opacity: 0 -> 1`, `margin-left: 7px`) using `cubic-bezier(0.16, 1, 0.3, 1)`.
  - Wired across all 4 tiers: Class button active rolls out class name, Spec button active rolls out spec name, Mode button active rolls out mode name, and Tier Set button active rolls out "Tier Set" next to the Manaflux bottle.
  - Pinned icon padding so the icon maintains its exact 4px/7px/8px left offset, ensuring zero jitter/jumping during rollout.
  - Hidden redundant floating popout badges on active buttons since the name is already displayed inside the expanded pill.
  - Updated responsive rules for mobile screens (36px compact icons expanding to 170px pills with 0.72rem font).
  - Updated `scripts/qa-loot-finder.mjs` with assertions for `.btn-rollout-label` text across all 4 tiers; 100% pass (0 errors). Smoke tests pass. Eyeball verified via high-DPI screenshots. Lock released.
- [2026-09-17 ~18:55 UTC] [agy] Fixed Devourer Spec Icon in Drop Tables & Separated Item Badges Below Name:
  - Corrected Devourer Demon Hunter spec icon in Loot Table drop rows: updated `classSpecs` in `public/js/loot-finder.js` to prefer `cls.specIcons?.[name]` from `registry.js` (`7455385`), and mapped `SPEC_ICONS["demon-hunter-devourer"] = 7455385` so it no longer erroneously inherits Havoc's icon (`ability_demonhunter_specdps`).
  - Separated item name and item status tags (`#1 BiS`, `Top Meta`, `Catalyst Tier`, `Off-Spec`) in `public/loot-finder.html`: created structured `.item-cell-content` containing `.item-cell-name` and a dedicated flex container `.item-cell-badges` placed directly beneath the name.
  - Refined table typography & layout in `public/styles/loot-finder.css`: removed inline `margin-left: 6px` from badges, set `.items-table th:first-child, .items-table td:first-child` to `min-width: 220px`, and set `white-space: nowrap` on `.item-cell-name` to prevent awkward mid-name wrapping and cutoffs.
  - Updated `scripts/qa-loot-finder.mjs` with Step 8 asserting Devourer spec icon URL (`7455385.jpg`), badge separation container, and absence of badge text inside `.item-cell-name`.
  - Verified with `npm run qa:loot-finder` (100% pass, 0 errors), `node scripts/smoke-aggregate.mjs` (pass), and high-DPI browser verification screenshots (`loot-targets-devourer-dungeon-card.png`, `loot-targets-demon-hunter-devourer.png`). Lock released.