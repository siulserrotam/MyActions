from datetime import UTC, datetime


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
        "US100": "^NDX",
        "US500": "^GSPC",
        "DE40": "^GDAXI",
        "GOLD": "GC=F",
        "OIL": "CL=F",
        "NATGAS": "NG=F",
        "BTCUSD": "BTC-USD",
        "ETHUSD": "ETH-USD",
        "EURUSD": "EURUSD=X",
        "GBPUSD": "GBPUSD=X",
        "USDJPY": "JPY=X",
    }

    def quote(self, symbol: str) -> dict[str, object]:
        normalized = symbol.upper().strip()
        yahoo_symbol = self.symbol_map.get(normalized, normalized.replace(".US", ""))
        frame = self._download(yahoo_symbol)
        latest = frame.iloc[-1]
        first = frame.iloc[0]
        price = float(latest["close"])
        open_price = float(first["open"])
        change_pct = ((price - open_price) / open_price * 100) if open_price else 0
        return {
            "symbol": normalized,
            "provider_symbol": yahoo_symbol,
            "price": round(price, 5),
            "open": round(open_price, 5),
            "high": round(float(frame["high"].max()), 5),
            "low": round(float(frame["low"].min()), 5),
            "change_pct": round(change_pct, 2),
            "source": "yfinance_5m",
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

    def _download(self, yahoo_symbol: str):
        import yfinance as yf

        raw = yf.download(
            yahoo_symbol,
            period="1d",
            interval="5m",
            auto_adjust=False,
            prepost=False,
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
