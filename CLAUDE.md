# CLAUDE.md

Claude Code entry point. The canonical rules live in `AGENTS.md`, shared by every agent on this repo — read it before doing anything.

@AGENTS.md

## Claude Code specifics

- **Commit prefix:** `[claude]` (e.g. `[claude] lock: <area> — <task>`, `[claude] feat: <description>`).
- **Workspace:** locally `C:\Users\Gideon\OneDrive\AI\Claude Code\Projects\Metagor\Main`; Project threads run in cloud sandboxes. Never edit files in the opencode or agy clones.
- **Every session:** `git pull` → check **Current locks** in `PROGRESS.md` → claim the area(s) on `main` → work on a `claude/<area>-<topic>` branch → open a **draft** PR (Gideon merges) → after merge, log and release on `main`. If another agent holds an area you need, don't touch its files.
- **Shell:** the local machine is Windows with no Python — use Node (`scripts/*.mjs`) or PowerShell. Cloud threads are Linux; still prefer Node so scripts work everywhere.
