$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Push-Location $rootDir
try {
  node tools\sync-dashboard-price.mjs
} finally {
  Pop-Location
}
