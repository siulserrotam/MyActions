param(
  [int]$Port = 9222,
  [switch]$FreshProfile
)

$ErrorActionPreference = 'Stop'

$operaCandidates = @(
  "$env:LOCALAPPDATA\Programs\Opera GX\opera.exe",
  "$env:LOCALAPPDATA\Programs\Opera\opera.exe",
  "$env:ProgramFiles\Opera GX\opera.exe",
  "$env:ProgramFiles\Opera\opera.exe"
)

$opera = $operaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $opera) {
  throw 'No se encontro opera.exe. Instala Opera GX o ajusta la ruta en tools/start-opera-debug.ps1.'
}

$profileDir = if ($FreshProfile) {
  Join-Path $env:LOCALAPPDATA 'MyActions-XTB-Opera'
} else {
  Join-Path $env:APPDATA 'Opera Software\Opera GX Stable'
}

New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$portOpen = Test-NetConnection 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
if ($portOpen.TcpTestSucceeded) {
  Write-Host "Opera/Chromium ya esta escuchando en http://127.0.0.1:$Port"
  exit 0
}

$runningOpera = Get-Process | Where-Object { $_.ProcessName -match '^opera' } | Select-Object -First 1
if ($runningOpera -and -not $FreshProfile) {
  Write-Host ''
  Write-Host 'Opera ya esta abierto, pero NO esta escuchando en el puerto de automatizacion.'
  Write-Host 'Para usar tu sesion real, cierra TODAS las ventanas de Opera GX y vuelve a ejecutar:'
  Write-Host '  npm.cmd run start'
  Write-Host ''
  Write-Host 'Si prefieres una sesion separada, ejecuta:'
  Write-Host '  npm.cmd run opera:fresh'
  Write-Host ''
  exit 2
}

$urls = @(
  'https://xstation5.xtb.com/?branch=lat#/_/loggedIn',
  'https://api.manantiallodge.com/dashboard/'
)

Start-Process -FilePath $opera -ArgumentList @(
  "--remote-debugging-port=$Port",
  '--remote-allow-origins=*',
  '--new-window',
  '--start-maximized',
  "--user-data-dir=$profileDir",
  $urls[0],
  $urls[1]
) -WindowStyle Normal

Write-Host "Opera GX iniciado con lectura remota en http://127.0.0.1:$Port"
Write-Host "Perfil usado: $profileDir"
Write-Host 'Si alguna pagina pide login, inicia sesion en la ventana de Opera; la terminal lo validara despues.'
