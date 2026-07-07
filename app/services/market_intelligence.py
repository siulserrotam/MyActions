from dataclasses import dataclass
from datetime import UTC, datetime
from xml.etree import ElementTree

import httpx
import numpy as np
import pandas as pd

from app.services.data_provider import MarketDataService
from app.services.trading_signal import TradingSignalService


@dataclass(frozen=True)
class NewsItem:
    title: str
    source: str
    url: str
    published: str
    sentiment: str
    score: int


class MarketIntelligenceService:
    asset_universe = {
        "TSM": ("Accion", "Taiwan Semiconductor"),
        "SPY": ("ETF", "S&P 500"),
        "QQQ": ("ETF", "Nasdaq 100"),
        "GLD": ("ETF", "Oro"),
        "TLT": ("ETF", "Bonos largos USA"),
        "UUP": ("Divisa ETF", "Dolar estadounidense"),
        "FXE": ("Divisa ETF", "Euro"),
        "BTC-USD": ("Cripto", "Bitcoin"),
    }

    positive_terms = {
        "beat",
        "growth",
        "surge",
        "rally",
        "upgrade",
        "record",
        "strong",
        "ai",
        "chip",
        "semiconductor",
        "expansion",
        "dividend",
    }
    negative_terms = {
        "miss",
        "fall",
        "drop",
        "warning",
        "cut",
        "downgrade",
        "risk",
        "war",
        "tariff",
        "recession",
        "weak",
        "sanction",
        "selloff",
    }

    def news_assessment(self, ticker: str = "TSM") -> dict[str, object]:
        signal = TradingSignalService().predict(ticker)
        items = self._fetch_news(ticker)
        news_score = sum(item.score for item in items)
        technical_score = (signal.probabilidad_subida - signal.probabilidad_bajada) * 100
        combined_score = round(technical_score + news_score * 2, 2)
        if combined_score >= 45:
            action = "MANTENER / COMPRAR SOLO CON RIESGO CONTROLADO"
            risk = "MEDIO"
        elif combined_score <= -15:
            action = "REDUCIR EXPOSICION / ESPERAR"
            risk = "ALTO"
        else:
            action = "MANTENER Y ESPERAR CONFIRMACION"
            risk = "MEDIO"

        return {
            "ticker": ticker,
            "generated_at": datetime.now(UTC).isoformat(),
            "technical_signal": signal.senal,
            "technical_confidence": signal.confianza,
            "news_score": news_score,
            "combined_score": combined_score,
            "risk": risk,
            "path": action,
            "summary": self._summary(signal.senal, signal.confianza, news_score, action),
            "news": [item.__dict__ for item in items],
            "disclaimer": "Apoyo analitico educativo; no es asesoria financiera.",
        }

    def opportunities(self) -> dict[str, object]:
        rows = []
        for symbol, (asset_type, name) in self.asset_universe.items():
            rows.append(self._asset_snapshot(symbol, asset_type, name))
        ranked = sorted(rows, key=lambda item: item["score"], reverse=True)
        best = ranked[0] if ranked else None
        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "best_current_area": best,
            "assets": ranked,
            "interpretation": (
                "Prioriza los activos con score alto, momentum positivo y drawdown controlado. "
                "Si todos los scores son bajos, la lectura favorece esperar liquidez."
            ),
            "disclaimer": "Ranking cuantitativo educativo; valida costos, impuestos y perfil de riesgo.",
        }

    def dividends(self, ticker: str = "TSM") -> dict[str, object]:
        history = MarketDataService().get_history(ticker)
        try:
            import yfinance as yf

            dividends = yf.Ticker(ticker).dividends.tail(8)
            records = [
                {"date": str(index.date()), "amount": round(float(value), 4)}
                for index, value in dividends.items()
            ]
        except Exception:
            records = []
        annualized = round(sum(item["amount"] for item in records[-4:]), 4) if records else 0
        price = round(float(history["close"].iloc[-1]), 2)
        yield_pct = round((annualized / price) * 100, 2) if price and annualized else 0
        return {
            "ticker": ticker,
            "price": price,
            "recent_dividends": records,
            "estimated_annual_dividend": annualized,
            "estimated_yield_pct": yield_pct,
            "official_source": "https://investor.tsmc.com/english/latest-dividend",
            "note": "Para fechas exactas usa la pagina oficial de dividendos de TSMC.",
        }

    def _fetch_news(self, ticker: str) -> list[NewsItem]:
        feeds = [
            ("Yahoo Finance", f"https://finance.yahoo.com/rss/headline?s={ticker}"),
            ("Yahoo Finance Markets", "https://finance.yahoo.com/news/rssindex"),
        ]
        items: list[NewsItem] = []
        for source, url in feeds:
            try:
                response = httpx.get(url, timeout=10)
                response.raise_for_status()
                root = ElementTree.fromstring(response.text)
                for item in root.findall(".//item")[:6]:
                    title = item.findtext("title", default="").strip()
                    link = item.findtext("link", default="").strip()
                    published = item.findtext("pubDate", default="").strip()
                    score = self._headline_score(title)
                    items.append(
                        NewsItem(
                            title=title,
                            source=source,
                            url=link,
                            published=published,
                            sentiment=self._sentiment(score),
                            score=score,
                        )
                    )
            except Exception:
                continue
        if not items:
            items.extend(self._fetch_yfinance_news(ticker))
        return items[:10]

    def _fetch_yfinance_news(self, ticker: str) -> list[NewsItem]:
        try:
            import yfinance as yf

            raw_items = yf.Ticker(ticker).news or []
        except Exception:
            return []
        items: list[NewsItem] = []
        for raw in raw_items[:10]:
            content = raw.get("content", raw) if isinstance(raw, dict) else {}
            title = str(content.get("title") or raw.get("title") or "").strip()
            if not title:
                continue
            url = str(content.get("canonicalUrl", {}).get("url") or content.get("clickThroughUrl", {}).get("url") or raw.get("link") or "")
            published = str(content.get("pubDate") or raw.get("providerPublishTime") or "")
            score = self._headline_score(title)
            items.append(
                NewsItem(
                    title=title,
                    source=str(content.get("provider", {}).get("displayName") or raw.get("publisher") or "Yahoo Finance"),
                    url=url,
                    published=published,
                    sentiment=self._sentiment(score),
                    score=score,
                )
            )
        return items

    def _headline_score(self, title: str) -> int:
        words = {part.strip(".,:;!?()[]{}'\"").lower() for part in title.split()}
        return len(words & self.positive_terms) - len(words & self.negative_terms)

    def _sentiment(self, score: int) -> str:
        if score > 0:
            return "POSITIVO"
        if score < 0:
            return "NEGATIVO"
        return "NEUTRAL"

    def _summary(self, signal: str, confidence: float, news_score: int, action: str) -> str:
        return (
            f"Senal tecnica {signal} con {confidence}% de confianza. "
            f"El puntaje de noticias es {news_score}. Camino sugerido: {action}."
        )

    def _asset_snapshot(self, symbol: str, asset_type: str, name: str) -> dict[str, object]:
        frame = self._download_asset(symbol)
        if frame.empty:
            return {
                "symbol": symbol,
                "asset_type": asset_type,
                "name": name,
                "score": -999,
                "action": "SIN DATOS",
            }
        close = frame["close"]
        daily_return = close.pct_change().dropna()
        return_30d = self._pct(close.iloc[-1], close.iloc[-min(len(close), 22)])
        return_90d = self._pct(close.iloc[-1], close.iloc[0])
        volatility = float(daily_return.std() * np.sqrt(252) * 100) if not daily_return.empty else 0
        drawdown = float((close.iloc[-1] / close.cummax().iloc[-1] - 1) * 100)
        score = round(return_30d * 1.4 + return_90d * 0.7 - volatility * 0.15 + drawdown * 0.4, 2)
        if score >= 8:
            action = "FAVORABLE"
        elif score <= -8:
            action = "ESPERAR / EVITAR"
        else:
            action = "NEUTRAL"
        return {
            "symbol": symbol,
            "asset_type": asset_type,
            "name": name,
            "last_price": round(float(close.iloc[-1]), 2),
            "return_30d_pct": round(return_30d, 2),
            "return_90d_pct": round(return_90d, 2),
            "volatility_pct": round(volatility, 2),
            "drawdown_pct": round(drawdown, 2),
            "score": score,
            "action": action,
        }

    def _download_asset(self, symbol: str) -> pd.DataFrame:
        try:
            import yfinance as yf

            raw = yf.download(symbol, period="90d", interval="1d", progress=False, threads=False, auto_adjust=False)
            if raw.empty:
                return pd.DataFrame()
            raw.columns = [str(col[0] if isinstance(col, tuple) else col).lower().replace(" ", "_") for col in raw.columns]
            return raw.dropna(subset=["close"])
        except Exception:
            return pd.DataFrame()

    def _pct(self, current: float, previous: float) -> float:
        if previous == 0:
            return 0.0
        return float((current - previous) / previous * 100)
