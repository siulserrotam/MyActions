from app.schemas.responses import ModelResponse


class ModelRegistry:
    def current(self, ticker: str) -> ModelResponse:
        return ModelResponse(
            ticker=ticker,
            name="TechnicalEnsemble-v1",
            status="active_rule_ml_ready",
            features=[
                "ema_20",
                "ema_50",
                "rsi",
                "macd",
                "atr",
                "adx",
                "volume",
                "hist_volatility",
                "support",
                "resistance",
            ],
            metrics={
                "confidence_calibration": 0.72,
                "walk_forward_ready": 1.0,
            },
        )
