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
CRON_SECRET=generate-a-long-random-value
ALERT_MIN_CONFIDENCE=75
ALERT_SIGNALS=COMPRAR,VENDER,ESPERAR MEJOR ENTRADA
INTRADAY_ALERT_THRESHOLD_PCT=10
INTRADAY_SESSION_BARS=78
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TO_PHONE=
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

## Alertas WhatsApp

La Fase 2 agrega:

- `GET /alerts/evaluate`: evalua si la senal actual amerita alerta.
- `GET /alerts/evaluate?notify=true`: envia WhatsApp si la condicion se cumple y la API key es valida.
- `GET /cron/daily-signal`: endpoint para Vercel Cron.
- `GET /alerts/intraday`: evalua subida o bajada intradia vs apertura.
- `GET /cron/intraday-signal`: endpoint para scheduler externo con alertas intradia.

Vercel Cron ejecuta un `GET` contra el path configurado en `vercel.json`. En Hobby, Vercel limita cron jobs a una ejecucion diaria y puede invocarlos en cualquier momento dentro de la hora configurada.

Para WhatsApp Cloud API necesitas crear una app en Meta Developers y configurar:

```env
WHATSAPP_ACCESS_TOKEN=token_de_meta
WHATSAPP_PHONE_NUMBER_ID=id_del_numero_emisor
WHATSAPP_TO_PHONE=numero_destino_en_formato_e164
```

Para Colombia, el formato E.164 es similar a:

```env
WHATSAPP_TO_PHONE=+573001112233
```

Meta documenta el envio de mensajes con `POST https://graph.facebook.com/{version}/{phone-number-id}/messages`.

## Alertas intradia 10%

La Fase 2B agrega alertas cuando TSM sube o baja al menos `INTRADAY_ALERT_THRESHOLD_PCT` frente al precio de apertura del dia. Tambien calcula:

- precio de apertura
- precio actual
- maximo y minimo intradia
- cambio porcentual contra apertura
- tendencia intradia
- proyeccion de cierre del mismo dia
- posible crecimiento o decrecimiento restante

Endpoint manual:

```text
GET /alerts/intraday
```

Envio por WhatsApp, si las credenciales estan configuradas:

```text
GET /alerts/intraday?notify=true
```

Para automatizarlo varias veces al dia en Vercel Hobby, usa un scheduler externo como cron-job.org, EasyCron, GitHub Actions schedule o UptimeRobot. Vercel documenta que en Hobby los cron jobs solo pueden ejecutarse una vez por dia; para frecuencia por minuto se requiere Pro o Enterprise.

Scheduler recomendado cada 5 o 15 minutos durante horario de mercado:

```text
GET https://api.manantiallodge.com/cron/intraday-signal
Header: x-cron-secret: <CRON_SECRET>
```

## Login del dashboard

Configura estas variables en Vercel para proteger el dashboard:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123*
JWT_SECRET=generate-a-long-random-value
APP_ENV=production
```

Luego ejecuta un redeploy. El dashboard quedara en:

```text
https://api.manantiallodge.com/dashboard/
```

Credenciales iniciales:

```text
usuario: admin
clave: Admin123*
```

## Inteligencia de mercado

Endpoints:

```text
GET /intelligence/news
GET /intelligence/opportunities
GET /intelligence/dividends
```

La inteligencia de mercado combina:

- senal tecnica de TSM
- titulares recientes de Yahoo Finance RSS
- ranking cuantitativo de acciones, ETFs, divisas ETF y cripto
- dividendos historicos recientes via yfinance
- enlace oficial de dividendos de TSMC

Fuentes de referencia:

- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Yahoo Finance News: https://finance.yahoo.com/news/
- Dividendos oficiales TSMC: https://investor.tsmc.com/english/latest-dividend
