from datetime import UTC, datetime

import pandas as pd


class LiveMarketService:
    symbol_map = {
        "TSM.US": "TSM",
        "NVDA.US": "NVDA",
        "AMD.US": "AMD",
        "AAPL.US": "AAPL",
        "MSFT.US": "MSFT",
        "GOOGL.US": "GOOGL",
        "AMZN.US": "AMZN",
        "META.US": "META",
        "TSLA.US": "TSLA",
        "SPY.US": "SPY",
        "QQQ.US": "QQQ",
        "US100": "NQ=F",
        "US500": "^GSPC",
        "DE40": "^GDAXI",
        "GOLD": "GC=F",
        "OIL": "BZ=F",
        "NATGAS": "NG=F",
        "BTCUSD": "BTC-USD",
        "ETHUSD": "ETH-USD",
        "AVAX": "AVAX-USD",
        "SOL": "SOL-USD",
        "XRP": "XRP-USD",
        "DOGE": "DOGE-USD",
        "ADA": "ADA-USD",
        "LINK": "LINK-USD",
        "DOT": "DOT-USD",
        "EURUSD": "EURUSD=X",
        "GBPUSD": "GBPUSD=X",
        "USDJPY": "JPY=X",
    }

    def quote(self, symbol: str) -> dict[str, object]:
        normalized = symbol.upper().strip()
        yahoo_symbol = self.symbol_map.get(normalized, normalized.replace(".US", ""))
        frame = self._download(yahoo_symbol, include_prepost=True)
        latest = frame.iloc[-1]
        price = float(latest["close"])
        regular_frame = self._regular_session(frame)
        market_phase = self._market_phase(latest.name, regular_frame)
        latest_regular_close, previous_regular_close = self._chart_close_context(yahoo_symbol) or self._daily_close_context(yahoo_symbol, price)
        regular_open = float(regular_frame.iloc[0]["open"]) if not regular_frame.empty else float(frame.iloc[0]["open"])
        previous_close = previous_regular_close
        regular_close = float(regular_frame.iloc[-1]["close"]) if not regular_frame.empty else latest_regular_close
        premarket_change_pct = ((price - regular_close) / regular_close * 100) if regular_close else 0
        regular_change_pct = ((regular_close - previous_close) / previous_close * 100) if previous_close else 0
        intraday_change_pct = ((price - regular_open) / regular_open * 100) if regular_open else 0
        change_pct = premarket_change_pct if market_phase in {"pre", "post"} else intraday_change_pct
        return {
            "symbol": normalized,
            "provider_symbol": yahoo_symbol,
            "price": round(price, 5),
            "open": round(regular_open, 5),
            "previous_close": round(previous_close, 5),
            "regular_close": round(regular_close, 5),
            "high": round(float(frame["high"].max()), 5),
            "low": round(float(frame["low"].min()), 5),
            "change_pct": round(change_pct, 2),
            "premarket_change_pct": round(premarket_change_pct, 2),
            "regular_change_pct": round(regular_change_pct, 2),
            "intraday_change_pct": round(intraday_change_pct, 2),
            "market_phase": market_phase,
            "source": "yfinance_1m_prepost",
            "signal_source": "yfinance_1m_prepost",
            "updated_at": datetime.now(UTC).isoformat(),
        }

    def quotes(self, symbols: list[str]) -> dict[str, object]:
        items: list[dict[str, object]] = []
        errors: dict[str, str] = {}
        for symbol in symbols:
            try:
                items.append(self.quote(symbol))
            except Exception as exc:
                errors[symbol.upper().strip()] = str(exc)
        return {
            "count": len(items),
            "items": items,
            "errors": errors,
            "updated_at": datetime.now(UTC).isoformat(),
        }

    def bars(self, symbol: str, limit: int = 30, interval: str = "1m", period: str = "1d") -> dict[str, object]:
        normalized = symbol.upper().strip()
        yahoo_symbol = self.symbol_map.get(normalized, normalized.replace(".US", ""))
        safe_interval = interval if interval in {"1m", "5m", "15m", "30m", "60m", "1h"} else "1m"
        safe_period = period if period in {"1d", "5d", "1mo"} else "1d"
        yahoo_interval = "60m" if safe_interval == "1h" else safe_interval
        raw_frame = self._download(yahoo_symbol, include_prepost=True, period=safe_period, interval=yahoo_interval)
        window_minutes = self._window_minutes(safe_interval, limit)
        frame = self._window_frame(raw_frame, window_minutes).tail(limit)
        items: list[dict[str, object]] = []
        for index, row in frame.iterrows():
            timestamp = index
            if isinstance(timestamp, pd.Timestamp):
                if timestamp.tzinfo is None:
                    timestamp = timestamp.tz_localize("UTC")
                timestamp_text = timestamp.tz_convert("UTC").isoformat()
            else:
                timestamp_text = datetime.now(UTC).isoformat()
            items.append(
                {
                    "symbol": normalized,
                    "provider_symbol": yahoo_symbol,
                    "timestamp": timestamp_text,
                    "open": round(float(row["open"]), 6),
                    "high": round(float(row["high"]), 6),
                    "low": round(float(row["low"]), 6),
                    "close": round(float(row["close"]), 6),
                    "source": f"yfinance_ohlc_{safe_interval}",
                    "is_ohlc": True,
                }
            )
        return {
            "symbol": normalized,
            "provider_symbol": yahoo_symbol,
            "interval": safe_interval,
            "period": safe_period,
            "window_minutes": window_minutes,
            "start_at": self._timestamp_text(frame.index[0]) if not frame.empty else None,
            "end_at": self._timestamp_text(frame.index[-1]) if not frame.empty else None,
            "count": len(items),
            "items": items,
            "source": f"yfinance_ohlc_{safe_interval}",
            "is_real": len(items) >= 2,
            "is_real_ohlc": len(items) >= 2,
            "updated_at": datetime.now(UTC).isoformat(),
        }

    @staticmethod
    def _window_minutes(interval: str, limit: int) -> int:
        interval_minutes = {
            "1m": 1,
            "5m": 5,
            "15m": 15,
            "30m": 30,
            "60m": 60,
            "1h": 60,
        }.get(interval, 1)
        return max(interval_minutes, interval_minutes * max(2, limit))

    @staticmethod
    def _window_frame(frame: pd.DataFrame, window_minutes: int) -> pd.DataFrame:
        if frame.empty or not isinstance(frame.index, pd.DatetimeIndex):
            return frame
        latest = frame.index[-1]
        start = latest - pd.Timedelta(minutes=window_minutes)
        window = frame[frame.index >= start]
        return window if not window.empty else frame

    @staticmethod
    def _timestamp_text(timestamp) -> str:
        if isinstance(timestamp, pd.Timestamp):
            if timestamp.tzinfo is None:
                timestamp = timestamp.tz_localize("UTC")
            return timestamp.tz_convert("UTC").isoformat()
        return datetime.now(UTC).isoformat()

    def _download(self, yahoo_symbol: str, include_prepost: bool = False, period: str = "1d", interval: str = "1m"):
        import yfinance as yf

        raw = yf.download(
            yahoo_symbol,
            period=period,
            interval=interval,
            auto_adjust=False,
            prepost=include_prepost,
            progress=False,
            threads=False,
        )
        if raw.empty:
            raw = yf.download(
                yahoo_symbol,
                period="5d",
                interval="1d",
                auto_adjust=False,
                prepost=False,
                progress=False,
                threads=False,
            )
        if raw.empty:
            raise ValueError("Proveedor devolvio precio vacio.")
        raw.columns = [str(col[0] if isinstance(col, tuple) else col).lower().replace(" ", "_") for col in raw.columns]
        required = {"open", "high", "low", "close"}
        missing = required - set(raw.columns)
        if missing:
            raise ValueError(f"Faltan columnas: {', '.join(sorted(missing))}")
        return raw.dropna(subset=list(required))

    def _daily_close_context(self, yahoo_symbol: str, fallback: float) -> tuple[float, float]:
        try:
            daily = self._download(yahoo_symbol, include_prepost=False, period="5d", interval="1d")
            if len(daily) >= 2:
                return float(daily.iloc[-1]["close"]), float(daily.iloc[-2]["close"])
            if len(daily) == 1:
                close = float(daily.iloc[-1]["close"])
                return close, close
        except Exception:
            return fallback, fallback
        return fallback, fallback

    @staticmethod
    def _chart_close_context(yahoo_symbol: str) -> tuple[float, float] | None:
        try:
            import httpx

            response = httpx.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}",
                params={"interval": "1m", "range": "1d", "includePrePost": "true"},
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=10,
            )
            response.raise_for_status()
            result = response.json()["chart"]["result"][0]
            meta = result.get("meta", {})
            regular_close = float(meta.get("regularMarketPrice") or 0)
            previous_close = float(meta.get("chartPreviousClose") or 0)
            if regular_close > 0 and previous_close > 0:
                return regular_close, previous_close
        except Exception:
            return None
        return None

    @staticmethod
    def _regular_session(frame):
        if not isinstance(frame.index, pd.DatetimeIndex):
            return frame
        localized = frame
        if localized.index.tz is None:
            localized = localized.tz_localize("UTC")
        ny_index = localized.index.tz_convert("America/New_York")
        return localized[(ny_index.time >= pd.Timestamp("09:30").time()) & (ny_index.time <= pd.Timestamp("16:00").time())]

    @staticmethod
    def _market_phase(latest_index, regular_frame) -> str:
        if not isinstance(latest_index, pd.Timestamp):
            return "regular"
        latest = latest_index
        if latest.tzinfo is None:
            latest = latest.tz_localize("UTC")
        latest_ny = latest.tz_convert("America/New_York")
        current_time = latest_ny.time()
        if current_time < pd.Timestamp("09:30").time():
            return "pre"
        if current_time > pd.Timestamp("16:00").time():
            return "post"
        return "regular" if not regular_frame.empty else "pre"
