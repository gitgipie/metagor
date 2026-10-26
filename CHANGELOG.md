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
- `CHANGELOG.md` and a versioning rule in `AGENTS.md` (semver, `vX.Y.Z` tags, GitHub Releases).
- Gear and trinket spell/proc effect descriptions restored on tooltips and modals.
- Claude Code onboarded as a third agent (`CLAUDE.md`, workspace rules).
- Automated offline checks on every pull request (syntax, data schema, smoke and unit tests, season matrix, build).

### Fixed
- Secondary stat percentage calculation, with a data repair pass.
- Scheduled data refresh no longer loses a whole run to one dropped connection: Raider.IO calls retry with a timeout,
  a spec that fails keeps its previous data (listed in `meta.stale_specs`) instead of disappearing, and the bot
  rebases before pushing so agent commits during a run can no longer reject the data push.
- Season mismatch between Raider.IO and Blizzard is resolved by lookup instead of a hardcoded slug formula.

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
