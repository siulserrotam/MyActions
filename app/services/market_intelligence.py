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
        "NVDA": ("Accion", "Nvidia"),
        "AMD": ("Accion", "Advanced Micro Devices"),
        "ASML": ("Accion", "ASML Holding"),
        "AVGO": ("Accion", "Broadcom"),
        "AAPL": ("Accion", "Apple"),
        "MSFT": ("Accion", "Microsoft"),
        "GOOGL": ("Accion", "Alphabet"),
        "AMZN": ("Accion", "Amazon"),
        "META": ("Accion", "Meta Platforms"),
        "PLTR": ("Accion", "Palantir"),
        "UBER": ("Accion", "Uber"),
        "SPY": ("ETF", "S&P 500"),
        "QQQ": ("ETF", "Nasdaq 100"),
        "SMH": ("ETF", "Semiconductores"),
        "VGT": ("ETF", "Tecnologia"),
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

    def opportunities(self, symbols: list[str] | None = None) -> dict[str, object]:
        rows = []
        universe = self._selected_universe(symbols)
        for symbol, (asset_type, name) in universe.items():
            rows.append(self._asset_snapshot(symbol, asset_type, name))
        ranked = sorted(rows, key=lambda item: item["score"], reverse=True)
        cheap_ranked = sorted(rows, key=lambda item: item.get("cheap_rebound_score", -999), reverse=True)
        best = ranked[0] if ranked else None
        best_cheap = cheap_ranked[0] if cheap_ranked else None
        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "best_current_area": best,
            "best_cheap_candidate": best_cheap,
            "assets": ranked,
            "cheap_candidates": cheap_ranked[:8],
            "interpretation": (
                "Para trading activo, prioriza candidatos con descuento moderado, soporte cercano, "
                "RSI no sobrecomprado y momentum empezando a mejorar. Si el score barato es bajo, espera."
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
        high = frame["high"] if "high" in frame else close
        low = frame["low"] if "low" in frame else close
        return_30d = self._pct(close.iloc[-1], close.iloc[-min(len(close), 22)])
        return_90d = self._pct(close.iloc[-1], close.iloc[0])
        return_5d = self._pct(close.iloc[-1], close.iloc[-min(len(close), 6)])
        volatility = float(daily_return.std() * np.sqrt(252) * 100) if not daily_return.empty else 0
        max_90d = float(close.max())
        min_90d = float(close.min())
        support = float(low.tail(22).min())
        resistance = float(high.tail(22).max())
        drawdown = float((close.iloc[-1] / max_90d - 1) * 100)
        rsi = self._rsi(close)
        distance_to_support = self._pct(close.iloc[-1], support)
        breakout_room = self._pct(resistance, close.iloc[-1])
        score = round(return_30d * 1.1 + return_90d * 0.55 - volatility * 0.12 + drawdown * 0.25, 2)
        cheap_rebound_score = self._cheap_rebound_score(
            drawdown=drawdown,
            rsi=rsi,
            return_5d=return_5d,
            distance_to_support=distance_to_support,
            breakout_room=breakout_room,
            volatility=volatility,
        )
        if score >= 8:
            action = "FAVORABLE"
        elif score <= -8:
            action = "ESPERAR / EVITAR"
        else:
            action = "NEUTRAL"
        cheap_action = self._cheap_action(cheap_rebound_score)
        return {
            "symbol": symbol,
            "asset_type": asset_type,
            "name": name,
            "last_price": round(float(close.iloc[-1]), 2),
            "min_90d": round(min_90d, 2),
            "max_90d": round(max_90d, 2),
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "rsi": round(rsi, 2),
            "return_5d_pct": round(return_5d, 2),
            "return_30d_pct": round(return_30d, 2),
            "return_90d_pct": round(return_90d, 2),
            "volatility_pct": round(volatility, 2),
            "drawdown_pct": round(drawdown, 2),
            "distance_to_support_pct": round(distance_to_support, 2),
            "upside_to_resistance_pct": round(breakout_room, 2),
            "score": score,
            "action": action,
            "cheap_rebound_score": cheap_rebound_score,
            "cheap_action": cheap_action,
            "buy_zone": f"${support:.2f} - ${float(close.iloc[-1]) * 0.985:.2f}",
            "sell_zone": f"${resistance * 0.99:.2f} o +8%/+10% si rompe con volumen",
            "why": self._why_candidate(drawdown, rsi, return_5d, distance_to_support, breakout_room),
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

    def _selected_universe(self, symbols: list[str] | None) -> dict[str, tuple[str, str]]:
        if not symbols:
            return self.asset_universe
        selected: dict[str, tuple[str, str]] = {}
        for symbol in symbols:
            normalized = symbol.upper().strip()
            if not normalized:
                continue
            selected[normalized] = self.asset_universe.get(normalized, ("Accion", normalized))
        return selected

    def _rsi(self, close: pd.Series, period: int = 14) -> float:
        delta = close.diff()
        gains = delta.clip(lower=0).rolling(period).mean()
        losses = (-delta.clip(upper=0)).rolling(period).mean()
        rs = gains / losses.replace(0, np.nan)
        rsi = (100 - (100 / (1 + rs))).fillna(50)
        return float(rsi.iloc[-1])

    def _cheap_rebound_score(
        self,
        drawdown: float,
        rsi: float,
        return_5d: float,
        distance_to_support: float,
        breakout_room: float,
        volatility: float,
    ) -> float:
        discount_score = min(abs(drawdown), 25) * 1.2 if drawdown < -3 else -4
        rsi_score = 12 if 35 <= rsi <= 58 else 4 if 28 <= rsi < 35 else -8 if rsi > 70 else 0
        support_score = 10 if 0 <= distance_to_support <= 5 else 4 if distance_to_support <= 9 else -4
        momentum_score = 8 if return_5d > 0 else -3
        upside_score = min(max(breakout_room, 0), 18) * 0.8
        volatility_penalty = min(volatility * 0.12, 10)
        return round(discount_score + rsi_score + support_score + momentum_score + upside_score - volatility_penalty, 2)

    def _cheap_action(self, score: float) -> str:
        if score >= 35:
            return "BARATA CON POTENCIAL"
        if score >= 22:
            return "VIGILAR PARA ENTRADA"
        if score >= 10:
            return "ESPERAR MEJOR PRECIO"
        return "NO PRIORITARIA"

    def _why_candidate(
        self,
        drawdown: float,
        rsi: float,
        return_5d: float,
        distance_to_support: float,
        breakout_room: float,
    ) -> list[str]:
        reasons = []
        if drawdown < -3:
            reasons.append(f"Cotiza {abs(drawdown):.1f}% bajo su maximo de 90 dias.")
        if 35 <= rsi <= 58:
            reasons.append(f"RSI {rsi:.1f}: no esta sobrecomprada.")
        if 0 <= distance_to_support <= 5:
            reasons.append(f"Esta cerca de soporte ({distance_to_support:.1f}%).")
        if return_5d > 0:
            reasons.append(f"Momentum 5 dias positivo ({return_5d:.1f}%).")
        if breakout_room > 5:
            reasons.append(f"Espacio hasta resistencia de {breakout_room:.1f}%.")
        if not reasons:
            reasons.append("No muestra descuento/rebote suficientemente claro.")
        return reasons
