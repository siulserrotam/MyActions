import pandas as pd

from app.services.indicators import IndicatorService


def test_indicator_service_adds_core_columns() -> None:
    dates = pd.bdate_range("2024-01-01", periods=260)
    frame = pd.DataFrame(
        {
            "open": range(100, 360),
            "high": range(101, 361),
            "low": range(99, 359),
            "close": range(100, 360),
            "adjusted_close": range(100, 360),
            "volume": [1_000_000] * 260,
            "dividends": [0] * 260,
            "splits": [0] * 260,
        },
        index=dates,
    )

    result = IndicatorService().with_indicators(frame)

    assert not result.empty
    assert {"rsi", "macd", "ema_20", "ema_50", "atr", "adx"}.issubset(result.columns)
