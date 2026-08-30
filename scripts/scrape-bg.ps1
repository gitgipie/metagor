# Scripts are expected to be launched directly from the repo root, so this
# launcher just changes into the repo root and execs the node script.
# Example: pwsh .opencode/scripts/scrape-bg.ps1 -Specs monk-mistweaver monk-windwalker

param(
    [Parameter(Mandatory=$true, ValueFromRemainingArguments=$true)]
    [string[]]$Specs
)

$errActionPreference = 'Stop'

# Launch from the repo root (two levels up from .opencode\scripts\) so
# relative paths in the node script resolve correctly.
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $repoRoot

$args = @('scripts/run-once.mjs') + $Specs

# Use Start-Process to detach; redirect directly from node (not via the
# parent pwsh) so the progress-file appendFile() isn't intercepted.
Start-Process -FilePath 'node' -ArgumentList $args `
  -NoNewWindow -Wait `
  -RedirectStandardOutput (Join-Path $env:TEMP 'metagor-full-out.log') `
  -RedirectStandardError (Join-Path $env:TEMP 'metagor-full-err.log')
