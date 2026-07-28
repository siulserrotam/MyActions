$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Push-Location $rootDir
try {
  try {
    & "$scriptDir\start-opera-debug.ps1"
  } catch {
    Write-Host "Opera no disponible, usando Chrome debug..."
    & "$scriptDir\start-chrome-debug.ps1"
  }
  Start-Sleep -Seconds 4
  node tools\ensure-pages.mjs
  Start-Sleep -Seconds 3
  node tools\read-chrome-debug.mjs

  $escapedRoot = $rootDir.Replace("'", "''")
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-ExecutionPolicy', 'Bypass',
    '-NoProfile',
    '-Command',
    "`$env:XTB_SYNC_INTERVAL_MS='5000'; Set-Location '$escapedRoot'; npm.cmd run sync:watch"
  ) -WindowStyle Hidden

  Write-Host ''
  Write-Host 'Dia iniciado: sync XTB cada 5 segundos. El dashboard usa la vista simple nativa de produccion.'
} finally {
  Pop-Location
}
