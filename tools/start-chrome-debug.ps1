$ErrorActionPreference = "Stop"

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profile = Join-Path $env:LOCALAPPDATA "MyActions\ChromeDebugProfile"
$port = 9222

if (-not (Test-Path $chrome)) {
  throw "No se encontro Chrome en $chrome"
}

New-Item -ItemType Directory -Force -Path $profile | Out-Null

Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-port=$port",
  "--user-data-dir=$profile",
  "--no-first-run",
  "--no-default-browser-check",
  "https://xstation5.xtb.com/?branch=lat#/_/loggedIn",
  "https://api.manantiallodge.com/dashboard/"
)

Write-Host "Chrome controlable abierto en puerto $port."
Write-Host "Inicia sesion en XTB y MyActions en esa ventana. Luego avisa: ya esta listo."
