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
} finally {
  Pop-Location
}
