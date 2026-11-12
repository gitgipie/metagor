# Changelog

All notable changes to Meta'gor are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions stay at `0.x` until the site moves to production (Cloudflare + custom domain).

Scheduled data refreshes (`github-actions[bot]` "Scheduled scrape" commits, twice daily since
2026-09-02) are not listed individually; they change `data/aggregated_bis.json` only.

> Versions 0.1.0–0.6.0 were reconstructed retroactively from git history on 2026-10-26.
> The commit each one ends at is noted so it can be tagged, checked out or redeployed.

## [Unreleased]

### Added
- Gearing matrix: The Unbinding of Kith'ix boss drops per difficulty (285/298/311/324) and the Labyrinth of Kindo'jan 308 Heroic Soul Fragment reward.
- Gearing matrix: patch 12.1.5 Ascendant Venomstone upgrade levels (Hero 321→328, Myth 334→341, crafted Hero weapon 318→325, crafted Myth weapon 331→337).
- `CHANGELOG.md` and a versioning rule in `AGENTS.md` (semver, `vX.Y.Z` tags, GitHub Releases).
- Gear and trinket spell/proc effect descriptions restored on tooltips and modals.
- Claude Code onboarded as a third agent (`CLAUDE.md`, workspace rules).
- Automated offline checks on every pull request (syntax, data schema, smoke and unit tests, season matrix, build).

### Changed
- All icons now load from Blizzard's render CDN (`render.worldofwarcraft.com`) instead of hotlinking Wowhead's image CDN; Wowhead tooltips unchanged.
- Loot Finder page script moved from an inline `<script>` into `public/js/loot-finder-page.js` (no visual change; allows a strict Content-Security-Policy).
- Original Loktar prototype moved out of the deployed site to `archive/loktar/` (kept for history, not published).

### Removed
- Discord-based Report Issue button, modal and issue-sync workflow/script (a Cloudflare Worker + Turnstile form replaces it later). `data/synced-issues.json` removed.

### Fixed
- Secondary stat percentage calculation, with a data repair pass.
- Scheduled data refresh no longer loses a whole run to one dropped connection: Raider.IO calls retry with a timeout,
  a spec that fails keeps its previous data (listed in `meta.stale_specs`) instead of disappearing, and the bot
  rebases before pushing so agent commits during a run can no longer reject the data push.
- Season mismatch between Raider.IO and Blizzard is resolved by lookup instead of a hardcoded slug formula.

### Security
- `public/_headers`: added `Content-Security-Policy-Report-Only`, `Strict-Transport-Security` and `Permissions-Policy` (effective on Cloudflare only; CSP is enforced in a later phase).
- Fonts (Cinzel, Inter) are self-hosted from `public/fonts/` (latin subset, OFL licences included); no more requests to Google Fonts.
- Untrusted/data-derived text rendered into HTML is now escaped via a shared `escapeHtml`/`safeUrl` helper (`public/js/escape.js`); inline `onerror` handler removed from talent icons.
- Removed the Discord issue reporter, which posted user input to a Discord webhook and synced it into GitHub issues.
- Discord issue sync no longer runs report text through a shell: a crafted report name or description could execute commands in the Actions job (which has repo write access). Arguments are now passed to `gh` as an array.
- Discord issue sync schedule paused until a new bot token is set (the old token was reset after the webhook leak); it can still be run manually.

## [0.6.0] - 2026-09-21

Ends at `35a73cb`.

### Added
- Multi-agent protocol: `AGENTS.md` hard rules, `PROGRESS.md` lock/log/handoff.
- Loot Finder (formerly Optimal Dungeon Calculator / Loot Targets): dungeon and raid boss targeting,
  loot spec optimisation and sniping advice, per-item spec drop icons, Catalyst base optimiser,
  Tier Set Only toggle, 5-slot secondary stat finder, KPI cards, class crest strip and icon docks.
- Gearing progression matrix: 2D grid, historical rarity colours, multi-select activity filters,
  compact mode by default.
- Talent tree full-viewport overlay with headless QA script.
- First-time hero showcase with localStorage memory.
- Build pipeline (`scripts/build.mjs`) and Cloudflare Pages edge config (`public/_headers`).

### Changed
- Gearing matrix: "Peak Mythic" rows renamed "Beyond Myth" (the Myth track is still 6 ranks) and "Ascended" labels renamed "Ascendant" to match Blizzard's item tags.
- Gearing matrix patch label updated from 12.1.0 to 12.1.5.
- New logo emblem (Concept #5 "The Shattered Sigil") and regenerated favicon set.
- Main page panels: neutralised gold borders, unified rounding, class-coloured talent glow;
  class/spec selectors aligned to the Loot Finder dock.

### Removed
- 12.1.5 PTR speculation from the gearing matrix.

### Fixed
- Discord issue sync skips cleanly when its secrets are not configured.
- Devourer spec icon in drop tables; spacing between spec dock and main grid.

## [0.5.0] - 2026-09-05

Ends at `87011c0`.

### Added
- Season 2 data refresh for all 40 specs.
- Scheduled scrape workflow (twice daily on GitHub Actions) that commits data and dispatches the Pages deploy.
- Colour-coded data freshness pill.
- New vector Meta'gor emblem and favicon set.

### Changed
- Header pills discover patch, expansion and season name dynamically.
- Evidence-based item source classifier; tier items labelled plain "Tier" (no unprovable Vault/Catalyst claims).
- Gear tooltips follow in-game layout; rank/difficulty line removed in favour of Item Level only.

### Fixed
- Broken item icons (Blizzard file_data_id CDN), mobile overflow, banner 404.
- Raid items missing raid name/boss after Blizzard journal lag (loot map rebuilt).
- Missing stats and set name on offhand options in the weapon modal.

## [0.4.0] - 2026-07-13

Ends at `c315409`.

### Added
- All 40 specs, with multi-spec arguments and merge-with-existing data writes.
- Issue reporter with Discord webhook, plus Discord-to-GitHub issue sync.
- Weapon type badges and a 2H vs 1H+OH weapon configuration view with percentages.
- Consumable alternatives modals, potion "+N" badges and Blizzard descriptions.

### Changed
- Weapon oils moved from enchants to consumables; 2H/1H detection uses Blizzard `inventory_type`.

### Fixed
- Six community-reported issues (#1–#7), including the Eversong Diamond on Unholy DK.
- Primary stat detection, broken talent/stat icons, talent tree centring.

## [0.3.0] - 2026-07-08

Ends at `1aeb9c0`.

### Added
- Gems, embellishments and enchants sections with tooltips, alternatives and copy buttons.
- Consumables scraped from Icy Veins, with tooltips and real icons.
- Visual talent tree modal with positioned nodes, connection lines and spell icons.

### Fixed
- Talent tree choice nodes, hero talent leaks, layout and spacing.
- Cache-busting on JS/CSS includes.

## [0.2.0] - 2026-07-01

Ends at `36d6775`.

### Added
- Item source classification (Mythic+, Crafted, Raid, Catalyst) with dungeon and raid/boss names.
- Raider.IO per-spec rankings for candidate discovery; multi-region data (EU, US, KR, TW).
- Slot alternatives modal with icons and copy buttons.
- Stat priority from Blizzard's character statistics endpoint.

### Fixed
- HANDS slot mapping, unique-equipped ring/trinket pairs, enchant markup stripping.
- Raid discovery made fully dynamic (no hardcoded IDs).

## [0.1.0] - 2026-06-23

Ends at `42fa02e`.

### Added
- Initial static dashboard and Blizzard API scraper.
- GitHub Pages deploy workflow.

[Unreleased]: https://github.com/gitgipie/metagor/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/gitgipie/metagor/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/gitgipie/metagor/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/gitgipie/metagor/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/gitgipie/metagor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/gitgipie/metagor/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/gitgipie/metagor/releases/tag/v0.1.0
