$ErrorActionPreference = "Stop"

$intervalMs = if ($env:XTB_MONITOR_INTERVAL_MS) { $env:XTB_MONITOR_INTERVAL_MS } else { "60000" }
$env:XTB_MONITOR_INTERVAL_MS = $intervalMs

Write-Host "Iniciando monitor XTB cada $([int]$intervalMs / 1000) segundos."
Write-Host "Para detenerlo: Ctrl+C."
node tools\monitor-xtb.mjs
