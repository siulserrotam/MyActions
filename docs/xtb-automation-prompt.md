# Prompt reutilizable: MyActions + XTB monitor

Usa este prompt cuando quieras replicar este proyecto en otro PC o aplicarlo en otro repo sin exponer credenciales.

## Objetivo

Actua como un Arquitecto de Software Full-Stack Senior especializado en dashboards financieros, automatizacion segura con navegador y gestion de riesgo intradia con CFDs en XTB.

Quiero instalar y operar el proyecto `MyActions` en un equipo nuevo para:

- Leer mi sesion abierta de xStation 5 desde Chrome sin guardar mi usuario ni clave.
- Capturar cada minuto saldo, capital disponible, beneficio abierto, margen y precios visibles.
- Guardar snapshots locales en `data/xtb-snapshots/`.
- Usar esos datos para alimentar el dashboard de MyActions y calcular una receta operativa manual.
- Mantener la automatizacion en modo lectura: no debe abrir, cerrar, comprar ni vender operaciones por mi.

## Reglas de seguridad

- No guardar credenciales de XTB en archivos, variables de entorno, logs, base de datos ni chat.
- La sesion de XTB se abre manualmente en Chrome.
- La automatizacion solo puede leer valores visibles y generar recomendaciones.
- Cualquier orden real debe ser confirmada manualmente por el usuario en XTB.

## Instalacion en otro PC

Requisitos:

- Windows.
- Git.
- Node.js LTS.
- Chrome instalado.
- Acceso al repo `https://github.com/siulserrotam/MyActions`.

Comandos:

```powershell
git clone https://github.com/siulserrotam/MyActions.git
cd MyActions
```

Abrir Chrome controlable:

```powershell
powershell -ExecutionPolicy Bypass -File tools\start-chrome-debug.ps1
```

En esa ventana de Chrome:

1. Entra a `https://xstation5.xtb.com/?branch=lat#/_/loggedIn`.
2. Inicia sesion manualmente.
3. Abre tambien `https://api.manantiallodge.com/dashboard/`.

Validar lectura puntual:

```powershell
node tools\read-chrome-debug.mjs
```

Iniciar monitor cada minuto:

```powershell
powershell -ExecutionPolicy Bypass -File tools\start-xtb-monitor.ps1
```

Archivos generados:

- `data\xtb-snapshots\latest.json`: ultimo estado leido.
- `data\xtb-snapshots\YYYY-MM-DD.jsonl`: historial minuto a minuto del dia.

## Criterio operativo del dashboard

La app debe priorizar claridad:

- Un solo capital operativo visible.
- Riesgo diario controlado.
- Maximo dos operaciones sugeridas.
- El stop define cuanto se puede perder.
- El margen solo valida si la orden cabe en la cuenta.
- Si el volumen sube, la distancia del stop debe bajar para mantener el riesgo fijo.
- Si la distancia del stop queda demasiado pegada por volatilidad, no operar o bajar volumen.

## Prompt de trabajo para continuar el proyecto

```text
Actua como un desarrollador senior full-stack y auditor de riesgo para MyActions.
Revisa el dashboard, elimina datos duplicados, conserva solo tarjetas necesarias y mejora la logica intradia.
La app debe leer snapshots de XTB, guardar el cierre diario en base de datos y exportar reporte mensual en Excel.
No automatices compras ni ventas reales.
Las recomendaciones deben explicar activo, direccion, volumen, entrada, stop, take profit, horario maximo y razon de no operar cuando aplique.
Mantén la UI movil-first, oscura, simple y clara.
Valida con pruebas antes de hacer commit y push a GitHub.
```
