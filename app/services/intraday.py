from dataclasses import dataclass
from datetime import date

import pandas as pd

from app.core.config import settings


@dataclass(frozen=True)
class IntradayMove:
    ticker: str
    date: date
    open_price: float
    current_price: float
    high_price: float
    low_price: float
    change_pct: float
    high_change_pct: float
    low_change_pct: float
    trend: str
    projected_close_pct: float
    possible_remaining_pct: float
    bars_seen: int
    threshold_pct: float
    source: str


class IntradayMarketService:
    def get_move(self, ticker: str) -> IntradayMove:
        frame = self._download_intraday(ticker)
        open_price = float(frame["open"].iloc[0])
        current_price = float(frame["close"].iloc[-1])
        high_price = float(frame["high"].max())
        low_price = float(frame["low"].min())
        change_pct = self._pct(current_price, open_price)
        high_change_pct = self._pct(high_price, open_price)
        low_change_pct = self._pct(low_price, open_price)
        bars_seen = int(len(frame))
        projected_close_pct = self._project_close_pct(change_pct, bars_seen)
        possible_remaining_pct = round(projected_close_pct - change_pct, 2)

        return IntradayMove(
            ticker=ticker,
            date=date.today(),
            open_price=round(open_price, 2),
            current_price=round(current_price, 2),
            high_price=round(high_price, 2),
            low_price=round(low_price, 2),
            change_pct=round(change_pct, 2),
            high_change_pct=round(high_change_pct, 2),
            low_change_pct=round(low_change_pct, 2),
            trend=self._trend(change_pct, projected_close_pct),
            projected_close_pct=projected_close_pct,
            possible_remaining_pct=possible_remaining_pct,
            bars_seen=bars_seen,
            threshold_pct=settings.intraday_alert_threshold_pct,
            source="yfinance_intraday_5m",
        )

    def _download_intraday(self, ticker: str) -> pd.DataFrame:
        import yfinance as yf

        raw = yf.download(
            ticker,
            period="1d",
            interval="5m",
            auto_adjust=False,
            prepost=False,
            progress=False,
            threads=False,
        )
        if raw.empty:
            raise ValueError("No hay datos intradia disponibles para evaluar la alerta.")
        raw.columns = [str(col[0] if isinstance(col, tuple) else col).lower().replace(" ", "_") for col in raw.columns]
        required = {"open", "high", "low", "close"}
        missing = required - set(raw.columns)
        if missing:
            raise ValueError(f"Faltan columnas intradia: {', '.join(sorted(missing))}")
        return raw.dropna(subset=list(required))

    def _pct(self, value: float, base: float) -> float:
        if base == 0:
            return 0.0
        return ((value - base) / base) * 100

    def _project_close_pct(self, change_pct: float, bars_seen: int) -> float:
        progress = min(max(bars_seen / settings.intraday_session_bars, 0.1), 1.0)
        projection = change_pct / progress
        return round(max(min(projection, 25.0), -25.0), 2)

    def _trend(self, change_pct: float, projected_close_pct: float) -> str:
        if change_pct >= settings.intraday_alert_threshold_pct:
            return "ALCISTA FUERTE"
        if change_pct <= -settings.intraday_alert_threshold_pct:
            return "BAJISTA FUERTE"
        if projected_close_pct >= 5:
            return "ALCISTA"
        if projected_close_pct <= -5:
            return "BAJISTA"
        return "LATERAL"
