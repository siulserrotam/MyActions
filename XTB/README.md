# MYACTIONS + XTB

Flujo local para leer datos visibles de XTB desde Opera GX con debug remoto.

## Reglas

- No guarda usuario ni clave.
- No compra, no vende y no cierra operaciones.
- Solo lee informacion visible en pantalla.
- Las ordenes reales siempre las confirmas manualmente en XTB.

## Uso rapido

1. Desde `C:\Users\Admin\OneDrive\Documentos\INTRUCCION EMPLEO\XTB`, ejecuta:

```powershell
npm.cmd run start
```

2. Si la terminal indica que Opera ya estaba abierto sin automatizacion, cierra todas las ventanas de Opera GX y repite:

```powershell
npm.cmd run start
```

3. Si XTB o MyActions piden login, inicia sesion en la ventana de Opera que se abrio. La terminal no guarda usuario ni clave.

4. Valida lectura puntual:

```powershell
npm.cmd run read
```

5. Inicia monitor continuo:

```powershell
npm.cmd run monitor
```

## Paginas abiertas automaticamente

```text
https://xstation5.xtb.com/?branch=lat#/_/loggedIn
```

```text
https://api.manantiallodge.com/dashboard/
```

## Datos generados

- `data\xtb-snapshots\latest.json`
- `data\xtb-snapshots\YYYY-MM-DD.jsonl`
