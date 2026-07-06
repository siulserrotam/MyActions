from datetime import UTC, datetime, timedelta
from pathlib import Path

import pandas as pd

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class MarketDataService:
    def __init__(self, data_dir: Path | None = None) -> None:
        self.data_dir = data_dir or settings.data_dir

    def get_history(self, ticker: str, years: int = 10) -> pd.DataFrame:
        cache_path = self.data_dir / f"{ticker.upper()}_history.csv"
        if cache_path.exists() and self._is_fresh(cache_path):
            return self._load(cache_path)

        try:
            frame = self._download(ticker, years)
            frame.to_csv(cache_path, index=True)
            return frame
        except Exception as exc:
            logger.warning("No se pudo descargar %s: %s", ticker, exc)
            if cache_path.exists():
                return self._load(cache_path)
            return self._synthetic_history(years)

    def _download(self, ticker: str, years: int) -> pd.DataFrame:
        import yfinance as yf

        start = (datetime.now(UTC) - timedelta(days=365 * years + 10)).date().isoformat()
        raw = yf.download(
            ticker,
            start=start,
            auto_adjust=False,
            actions=True,
            progress=False,
            threads=False,
        )
        if raw.empty:
            raise ValueError("Proveedor devolvio un historico vacio.")
        raw.columns = [self._normalize_column(col) for col in raw.columns]
        return self._standardize(raw)

    def _load(self, cache_path: Path) -> pd.DataFrame:
        return self._standardize(pd.read_csv(cache_path, index_col=0, parse_dates=True))

    def _standardize(self, frame: pd.DataFrame) -> pd.DataFrame:
        rename_map = {
            "Adj Close": "adjusted_close",
            "Adjusted Close": "adjusted_close",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
            "Dividends": "dividends",
            "Stock Splits": "splits",
        }
        frame = frame.rename(columns=rename_map)
        for column in ["open", "high", "low", "close", "adjusted_close", "volume"]:
            if column not in frame:
                raise ValueError(f"Falta columna requerida: {column}")
        for column in ["dividends", "splits"]:
            if column not in frame:
                frame[column] = 0.0
        frame = frame.sort_index()
        frame.index.name = "date"
        return frame[["open", "high", "low", "close", "adjusted_close", "volume", "dividends", "splits"]].dropna()

    def _is_fresh(self, cache_path: Path) -> bool:
        modified = datetime.fromtimestamp(cache_path.stat().st_mtime, tz=UTC)
        return datetime.now(UTC) - modified < timedelta(hours=18)

    def _normalize_column(self, column: object) -> str:
        if isinstance(column, tuple):
            return str(column[0])
        return str(column)

    def _synthetic_history(self, years: int) -> pd.DataFrame:
        periods = years * 252
        dates = pd.bdate_range(end=pd.Timestamp.today().normalize(), periods=periods)
        returns = pd.Series(0.0005, index=dates)
        prices = 90 * (1 + returns).cumprod()
        frame = pd.DataFrame(index=dates)
        frame["close"] = prices
        frame["open"] = frame["close"].shift(1).fillna(frame["close"]) * 0.998
        frame["high"] = frame[["open", "close"]].max(axis=1) * 1.012
        frame["low"] = frame[["open", "close"]].min(axis=1) * 0.988
        frame["adjusted_close"] = frame["close"]
        frame["volume"] = 10_000_000
        frame["dividends"] = 0.0
        frame["splits"] = 0.0
        return frame
