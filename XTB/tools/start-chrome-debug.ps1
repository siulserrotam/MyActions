$ErrorActionPreference = 'Stop'

$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
  throw 'No se encontró chrome.exe. Instala Google Chrome o define la ruta manualmente en este script.'
}

$userDataDir = Join-Path $env:LOCALAPPDATA 'MyActions-XTB-Chrome'
New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null

Start-Process -FilePath $chrome -ArgumentList @(
  '--remote-debugging-port=9222',
  '--remote-allow-origins=*',
  '--new-window',
  '--start-maximized',
  "--user-data-dir=$userDataDir",
  'about:blank'
) -WindowStyle Normal
