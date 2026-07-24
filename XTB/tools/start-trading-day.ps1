$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Push-Location $rootDir
try {
  & "$scriptDir\start-opera-debug.ps1"
  Start-Sleep -Seconds 4
  node tools\ensure-pages.mjs
  Start-Sleep -Seconds 3
  node tools\read-chrome-debug.mjs

  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-ExecutionPolicy', 'Bypass',
    '-NoProfile',
    '-Command',
    '$env:XTB_SYNC_INTERVAL_MS="10000"; Set-Location "C:\Users\Admin\OneDrive\Documentos\INTRUCCION EMPLEO\XTB"; npm.cmd run sync:watch'
  ) -WindowStyle Hidden

  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-ExecutionPolicy', 'Bypass',
    '-NoProfile',
    '-Command',
    '$env:DASHBOARD_CLEAN_INTERVAL_MS="10000"; Set-Location "C:\Users\Admin\OneDrive\Documentos\INTRUCCION EMPLEO\XTB"; npm.cmd run clean:watch'
  ) -WindowStyle Hidden

  Write-Host ''
  Write-Host 'Dia iniciado: sync XTB + Modo Simple quedaron corriendo cada 10 segundos.'
} finally {
  Pop-Location
}
