$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Push-Location $rootDir
try {
  & "$scriptDir\start-opera-debug.ps1"
  if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Start-Sleep -Seconds 4
  node tools\ensure-pages.mjs
  Start-Sleep -Seconds 3
  node tools\read-chrome-debug.mjs
} finally {
  Pop-Location
}
