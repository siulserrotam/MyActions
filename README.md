# Trading Intelligence API

Plataforma modular para analizar TSM y generar senales de inversion con analisis tecnico, gestion de riesgo, backtesting y explicabilidad.

## Estado

Fase 1 implementada:

- API REST con FastAPI.
- Descarga/cache de historicos para `TSM`.
- Indicadores tecnicos principales.
- Motor de senales explicable.
- Gestion de riesgo con ATR.
- Backtesting comparativo.
- Dashboard web en `/dashboard`.
- Docker, Docker Compose y pruebas base.

La arquitectura esta preparada para incorporar modelos ML/DL avanzados, mas activos, bases de datos, Redis y proveedores externos.

## Uso local

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Abrir:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- Dashboard: http://127.0.0.1:8000/dashboard

## Endpoints

- `GET /health`
- `GET /predict`
- `GET /forecast`
- `GET /history`
- `GET /indicators`
- `GET /backtesting`
- `GET /metrics`
- `GET /model`
- `POST /train`
- `POST /retrain`

## Docker

```bash
docker compose up --build
```

## Deploy

El proyecto esta preparado para desplegarse en Vercel como FastAPI serverless y conectarse a Supabase PostgreSQL. Ver [docs/deployment.md](docs/deployment.md).

## Automatizacion XTB

Para replicar la lectura segura de xStation 5 en otro PC sin guardar credenciales, ver [docs/xtb-automation-prompt.md](docs/xtb-automation-prompt.md).

## Aviso

Este software es educativo y de apoyo analitico. No constituye asesoria financiera.
