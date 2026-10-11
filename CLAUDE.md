# CLAUDE.md

Claude Code entry point. The canonical rules live in `AGENTS.md`, shared by every agent on this repo — read it before doing anything.

@AGENTS.md

## Claude Code specifics

- **Commit prefix:** `[claude]` (e.g. `[claude] lock: <task>`, `[claude] <description>`).
- **Workspace:** `C:\Users\Gideon\OneDrive\AI\Claude Code\Projects\Metagor\Main`. Never edit files in the opencode or agy clones.
- **Every session:** `git pull` → check **Current lock** in `PROGRESS.md` → claim it before editing → append a log entry and release the lock at the end. If another agent holds the lock, stop.
- **Shell:** this is a Windows machine; there is no Python installed. Use Node (`scripts/*.mjs`) or PowerShell for tooling.
