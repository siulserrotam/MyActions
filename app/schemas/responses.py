from datetime import date
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    app: str
    ticker: str


class PredictionResponse(BaseModel):
    ticker: str
    fecha: date
    precio_actual: float
    senal: str
    confianza: float
    probabilidad_subida: float
    probabilidad_bajada: float
    probabilidad_lateralidad: float
    riesgo: str
    horizonte: str
    precio_objetivo: float
    stop_loss: float
    take_profit: float
    riesgo_beneficio: str
    modelo: str
    explicacion: list[str]


class ForecastPoint(BaseModel):
    horizon_days: int
    expected_price: float
    expected_return: float
    confidence: float


class ForecastResponse(BaseModel):
    ticker: str
    generated_at: date
    points: list[ForecastPoint]


class HistoryResponse(BaseModel):
    ticker: str
    rows: int
    data: list[dict[str, Any]]


class IndicatorsResponse(BaseModel):
    ticker: str
    latest: dict[str, Any]


class BacktestStrategyResult(BaseModel):
    strategy: str
    initial_capital: float
    final_capital: float
    total_return: float
    trades: int
    winners: int
    losers: int
    max_drawdown: float
    profit_factor: float
    sharpe: float
    sortino: float


class BacktestResponse(BaseModel):
    ticker: str
    summary: dict[str, float | int | str]
    strategies: list[BacktestStrategyResult]


class MetricsResponse(BaseModel):
    ticker: str
    metrics: dict[str, float | int | str]


class ModelResponse(BaseModel):
    ticker: str
    name: str
    status: str
    features: list[str] = Field(default_factory=list)
    metrics: dict[str, float] = Field(default_factory=dict)


class TrainResponse(BaseModel):
    ticker: str
    model: str
    trained: bool
    metrics: dict[str, float]
    message: str
