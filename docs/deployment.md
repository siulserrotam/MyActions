# Deployment Guide

Esta guia deja `MyActions` listo para publicarse como API FastAPI en Vercel, usando Supabase como PostgreSQL administrado y Hostinger como administrador DNS del dominio `manantiallodge.com`.

## Arquitectura recomendada

- `https://api.manantiallodge.com`: Trading Intelligence API en Vercel.
- `https://manantiallodge.com`: sitio principal existente en Hostinger, sin cambios.
- Supabase PostgreSQL: persistencia de historicos, senales y logs.
- GitHub: repositorio fuente conectado a Vercel.

Uso `api.manantiallodge.com` porque es el camino menos riesgoso: no mueve el dominio principal ni interrumpe el sitio actual.

## Vercel

El proyecto incluye:

- `api/index.py`: entrypoint ASGI que expone `app`.
- `vercel.json`: enruta todo el trafico a FastAPI.
- `requirements.txt`: dependencias que Vercel instala en build.

En Vercel:

1. Importa el nuevo repositorio de GitHub.
2. Framework preset: Other.
3. Root directory: raiz del repo.
4. Build command: dejar vacio.
5. Output directory: dejar vacio.
6. Agrega las variables de entorno indicadas abajo.

La documentacion oficial de Vercel indica que para FastAPI la plataforma busca una instancia `FastAPI` llamada `app` en los entrypoints soportados, y que el runtime Python ejecuta apps ASGI.

## Supabase

En el dashboard de Supabase, abre tu proyecto, pulsa `Connect` y copia el connection string de Postgres.

Variables sugeridas para Vercel:

```env
APP_NAME=Trading Intelligence API
APP_ENV=production
DEFAULT_TICKER=TSM
DATA_DIR=/tmp/data
MODEL_DIR=/tmp/models
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/postgres
REDIS_URL=
API_KEY=generate-a-long-random-value
JWT_SECRET=generate-a-long-random-value
```

Para Vercel/serverless conviene usar el pooler de Supabase cuando este disponible. Supabase documenta que el connection string se obtiene desde el boton `Connect` del dashboard.

## Hostinger DNS

En Vercel, agrega el dominio `api.manantiallodge.com` al proyecto. Luego en Hostinger crea o ajusta:

```text
Type: CNAME
Name/Host: api
Value/Target: cname.vercel-dns.com
TTL: default
```

Vercel documenta que los subdominios se configuran con CNAME. Si algun dia quieres mover tambien el dominio apex `manantiallodge.com`, hazlo como cambio separado porque puede afectar el sitio principal.

## GitHub

Cuando el repositorio remoto exista:

```powershell
git remote add origin https://github.com/USUARIO/REPO.git
git branch -M main
git push -u origin main
```

Despues, importa ese repo en Vercel.

## Validacion local

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Abrir:

- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/dashboard
