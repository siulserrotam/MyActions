from datetime import date

import numpy as np

from app.domain.constants import BUY, HOLD, SELL, SUPPORTED_HORIZONS, WAIT
from app.schemas.responses import ForecastPoint, ForecastResponse, PredictionResponse
from app.services.data_provider import MarketDataService
from app.services.indicators import IndicatorService
from app.services.risk import RiskService


class TradingSignalService:
    def __init__(self) -> None:
        self.data = MarketDataService()
        self.indicators = IndicatorService()
        self.risk = RiskService()

    def predict(self, ticker: str) -> PredictionResponse:
        frame = self.indicators.with_indicators(self.data.get_history(ticker))
        latest = frame.iloc[-1]
        previous = frame.iloc[-2]
        score, explanation = self._score(latest, previous)
        prob_up, prob_down, prob_sideways = self._probabilities(score)
        confidence = round(max(prob_up, prob_down, prob_sideways) * 100, 1)
        signal = self._signal(prob_up, prob_down, prob_sideways, latest)
        plan = self.risk.build_plan(
            price=float(latest["close"]),
            atr=float(latest["atr"]),
            confidence=confidence,
            bullish_probability=prob_up,
        )

        return PredictionResponse(
            ticker=ticker,
            fecha=date.today(),
            precio_actual=round(float(latest["close"]), 2),
            senal=signal,
            confianza=confidence,
            probabilidad_subida=round(prob_up, 4),
            probabilidad_bajada=round(prob_down, 4),
            probabilidad_lateralidad=round(prob_sideways, 4),
            riesgo=plan.level,
            horizonte="5 dias",
            precio_objetivo=plan.target_price,
            stop_loss=plan.stop_loss,
            take_profit=plan.take_profit,
            riesgo_beneficio=plan.risk_reward,
            modelo="TechnicalEnsemble-v1",
            explicacion=explanation,
        )

    def forecast(self, ticker: str, horizon_days: int = 5) -> ForecastResponse:
        frame = self.indicators.with_indicators(self.data.get_history(ticker))
        latest = frame.iloc[-1]
        prediction = self.predict(ticker)
        trend_component = float(latest["trend_slope"]) / float(latest["close"])
        momentum_component = float(latest["daily_return"])
        base_return = np.clip(trend_component + momentum_component, -0.03, 0.03)
        horizons = [h for h in SUPPORTED_HORIZONS if h <= horizon_days] or [horizon_days]
        points = [
            ForecastPoint(
                horizon_days=horizon,
                expected_price=round(float(latest["close"]) * (1 + base_return * horizon), 2),
                expected_return=round(base_return * horizon, 4),
                confidence=max(40.0, round(prediction.confianza - horizon * 0.9, 1)),
            )
            for horizon in horizons
        ]
        return ForecastResponse(ticker=ticker, generated_at=date.today(), points=points)

    def _score(self, latest, previous) -> tuple[float, list[str]]:
        score = 0.0
        explanation: list[str] = []

        checks = [
            (latest["ema_20"] > latest["ema_50"], 1.2, "EMA20 > EMA50"),
            (latest["ema_50"] > latest["ema_200"], 1.0, "EMA50 > EMA200"),
            (latest["macd"] > latest["macd_signal"], 0.9, "MACD positivo"),
            (45 <= latest["rsi"] <= 68, 0.8, f"RSI saludable ({latest['rsi']:.1f})"),
            (latest["close"] > latest["vwap"], 0.7, "Precio sobre VWAP"),
            (latest["adx"] > 20, 0.6, f"Tendencia con ADX {latest['adx']:.1f}"),
            (latest["volume"] > previous["volume"], 0.4, "Volumen creciente"),
            (latest["close"] > latest["support"] * 1.03, 0.3, "Precio respeta soporte reciente"),
        ]
        for condition, weight, message in checks:
            if bool(condition):
                score += weight
                explanation.append(message)
            else:
                score -= weight * 0.55

        if latest["rsi"] > 75:
            score -= 1.0
            explanation.append(f"RSI sobrecomprado ({latest['rsi']:.1f})")
        if latest["close"] >= latest["resistance"] * 0.99:
            score -= 0.5
            explanation.append("Precio cerca de resistencia")
        if latest["hist_volatility"] > 0.45:
            score -= 0.4
            explanation.append("Volatilidad elevada")

        if not explanation:
            explanation.append("Condiciones mixtas sin ventaja clara")
        return score, explanation

    def _probabilities(self, score: float) -> tuple[float, float, float]:
        up_raw = np.exp(score)
        down_raw = np.exp(-score * 0.8)
        sideways_raw = np.exp(-abs(score) * 0.35 + 0.8)
        total = up_raw + down_raw + sideways_raw
        return float(up_raw / total), float(down_raw / total), float(sideways_raw / total)

    def _signal(self, prob_up: float, prob_down: float, prob_sideways: float, latest) -> str:
        if prob_up >= 0.58 and latest["close"] < latest["resistance"] * 0.985:
            return BUY
        if prob_down >= 0.55:
            return SELL
        if prob_sideways >= 0.38 or latest["rsi"] > 72:
            return WAIT
        return HOLD
