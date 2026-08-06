$ErrorActionPreference = 'Stop'

$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
  throw 'No se encontro chrome.exe. Instala Google Chrome o define la ruta manualmente en este script.'
}

$userDataDir = Join-Path $env:LOCALAPPDATA 'MyActions-XTB-Chrome'
New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null

$urls = @(
  'https://xstation5.xtb.com/#/_/loggedIn?detach=charts&detachDoClose=true',
  'https://api.manantiallodge.com/dashboard/'
)

Start-Process -FilePath $chrome -ArgumentList @(
  '--remote-debugging-port=9222',
  '--remote-allow-origins=*',
  '--new-window',
  '--start-maximized',
  "--user-data-dir=$userDataDir",
  $urls[0],
  $urls[1]
) -WindowStyle Normal

Write-Host "Chrome controlable iniciado en http://127.0.0.1:9222"
Write-Host "Perfil usado: $userDataDir"
Write-Host "Importante: este perfil es separado de tu Chrome normal. Inicia sesion en XTB dentro de esta ventana."
