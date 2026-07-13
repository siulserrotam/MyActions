from datetime import UTC, datetime
from typing import Any

from app.services.market_intelligence import MarketIntelligenceService
from app.services.orb import OrbAccountRules, OrbService


class OrbDashboardService:
    tickers = ("NVDA", "AMD", "AAPL", "SPY", "TSM")

    def __init__(self) -> None:
        self.orb = OrbService()
        self.intelligence = MarketIntelligenceService()

    def build(self, selected_ticker: str = "NVDA", capital: dict[str, Any] | None = None) -> dict[str, Any]:
        selected = selected_ticker.upper().strip()
        if selected not in self.tickers:
            selected = "NVDA"

        capital_value = float(capital["balance"]) if capital and capital.get("balance") else None
        candidates = [self._candidate(ticker, include_news=False, account_capital=capital_value) for ticker in self.tickers]
        candidates = sorted(candidates, key=lambda item: item["score"], reverse=True)
        best = candidates[0] if candidates else None
        selected_candidate = next((item for item in candidates if item["ticker"] == selected), best)
        for candidate in candidates:
            if candidate is best or candidate is selected_candidate:
                self._attach_news(candidate)
        candidates = sorted(candidates, key=lambda item: item["score"], reverse=True)
        best = candidates[0] if candidates else None
        selected_candidate = next((item for item in candidates if item["ticker"] == selected), best)
        rules = self.orb._rules(capital_value)

        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "selected_ticker": selected,
            "best_ticker": best["ticker"] if best else selected,
            "rules": {
                "capital": float(rules.capital),
                "risk_amount": float(rules.risk_amount),
                "reward_amount": float(rules.reward_amount),
                "buying_power": float(rules.buying_power),
                "max_wins": rules.max_wins,
                "max_losses": rules.max_losses,
                "risk_reward": "1:2",
                "source": "capital_guardado" if capital_value else "parametros_base",
            },
            "capital": capital,
            "broker": {
                "name": "XTB",
                "instrument_type": "CFD",
                "note": "CFD permite operar largo o corto. Confirma spreads, swap, margen y disponibilidad del simbolo en XTB antes de entrar.",
            },
            "recommendation": best,
            "selected": selected_candidate,
            "candidates": candidates,
            "session": selected_candidate.get("session", {"ticker": selected, "bars": [], "opening_range": None}),
            "disclaimer": "Apoyo educativo para controlar riesgo. No es asesoria financiera ni garantia de resultado.",
        }

    def _candidate(
        self,
        ticker: str,
        include_news: bool = True,
        account_capital: float | None = None,
    ) -> dict[str, Any]:
        base: dict[str, Any] = {
            "ticker": ticker,
            "score": -999.0,
            "status": "SIN DATOS",
            "action": "ESPERAR",
            "reason": "No se pudieron cargar datos intradia.",
            "news": [],
            "news_score": 0,
            "session": {"ticker": ticker, "bars": [], "opening_range": None},
        }
        try:
            session = self.orb.intraday_session(ticker)
            base["session"] = session
            opening = session.get("opening_range") or {}
            bars = session.get("bars") or []
            if not opening or not bars:
                return base

            last = bars[-1]
            price = float(last["close"])
            high = float(opening["high"])
            low = float(opening["low"])
            open_price = float(opening["open"])
            range_width = high - low
            range_pct = (range_width / open_price * 100) if open_price else 0.0
            change_from_open_pct = ((price - open_price) / open_price * 100) if open_price else 0.0
            news_items = self._news_items(ticker) if include_news else []
            news_score = sum(int(item.get("score", 0)) for item in news_items[:6])
            direction, action = self._direction(price, high, low, news_score)
            suggested_entry = self._entry(direction, high, low, price)
            plan = self._plan(ticker, high, low, suggested_entry, account_capital)
            quality = self._range_quality(range_pct)
            momentum = abs(change_from_open_pct) * 3
            breakout_bonus = 18 if price > high or price < low else 0
            score = round(quality + momentum + breakout_bonus + news_score * 2, 2)

            base.update(
                {
                    "score": score,
                    "status": direction,
                    "action": action,
                    "reason": self._reason(direction, range_pct, change_from_open_pct, news_score),
                    "price": round(price, 2),
                    "opening_high": round(high, 4),
                    "opening_low": round(low, 4),
                    "opening_open": round(open_price, 4),
                    "range_pct": round(range_pct, 2),
                    "change_from_open_pct": round(change_from_open_pct, 2),
                    "suggested_entry": round(suggested_entry, 4),
                    "suggested_sell": plan.get("take_profit"),
                    "suggested_stop": plan.get("stop_loss"),
                    "position_size": plan.get("exact_shares"),
                    "buying_power_used": plan.get("buying_power_used"),
                    "plan_allowed": plan.get("allowed", False),
                    "plan_status": plan.get("status", "Esperar confirmacion."),
                    "news_score": news_score,
                    "news": news_items[:4],
                }
            )
        except Exception as exc:
            base["reason"] = f"No se pudieron cargar datos de {ticker}: {exc}"
        return base

    def _attach_news(self, candidate: dict[str, Any]) -> None:
        ticker = str(candidate.get("ticker", ""))
        if not ticker:
            return
        news_items = self._news_items(ticker)
        news_score = sum(int(item.get("score", 0)) for item in news_items[:6])
        candidate["news"] = news_items[:4]
        candidate["news_score"] = news_score
        candidate["score"] = round(float(candidate.get("score", 0)) + news_score * 2, 2)
        candidate["reason"] = self._reason(
            str(candidate.get("status", "RANGO INICIAL")),
            float(candidate.get("range_pct", 0)),
            float(candidate.get("change_from_open_pct", 0)),
            news_score,
        )

    def _news_items(self, ticker: str) -> list[dict[str, Any]]:
        try:
            return [item.__dict__ for item in self.intelligence._fetch_news(ticker)]
        except Exception:
            return []

    def _direction(self, price: float, high: float, low: float, news_score: int) -> tuple[str, str]:
        if price > high:
            return "RUPTURA ALCISTA", "COMPRAR SOLO SI SOSTIENE SOBRE EL MAXIMO ORB"
        if price < low:
            return "RUPTURA BAJISTA", "EVITAR COMPRA / SOLO SHORT SI TU BROKER LO PERMITE"
        if news_score >= 2:
            return "ESPERAR RUPTURA ALCISTA", "VIGILAR COMPRA SOBRE EL MAXIMO ORB"
        if news_score <= -2:
            return "ESPERAR RUPTURA BAJISTA", "NO COMPRAR TODAVIA"
        return "RANGO INICIAL", "ESPERAR CONFIRMACION"

    def _entry(self, direction: str, high: float, low: float, price: float) -> float:
        tick = 0.01
        if "BAJISTA" in direction:
            return min(price, low - tick)
        return max(price, high + tick)

    def _plan(
        self,
        ticker: str,
        high: float,
        low: float,
        entry: float,
        account_capital: float | None,
    ) -> dict[str, Any]:
        try:
            return self.orb.calculate(
                ticker=ticker,
                opening_high=high,
                opening_low=low,
                entry_price=entry,
                account_capital=account_capital,
            )
        except Exception as exc:
            return {"allowed": False, "status": str(exc)}

    def _range_quality(self, range_pct: float) -> float:
        if 0.25 <= range_pct <= 1.6:
            return 30.0
        if 1.6 < range_pct <= 2.8:
            return 18.0
        if 0.1 <= range_pct < 0.25:
            return 10.0
        return 2.0

    def _reason(self, direction: str, range_pct: float, change_pct: float, news_score: int) -> str:
        parts = [
            f"ORB de 5m: rango {range_pct:.2f}%.",
            f"Movimiento vs apertura: {change_pct:.2f}%.",
            f"Noticias: score {news_score}.",
        ]
        if "RUPTURA" in direction:
            parts.append("Tiene senal operativa, pero solo con stop y take profit cargados antes de entrar.")
        else:
            parts.append("Aun no hay ruptura limpia; esperar evita comprar dentro del ruido.")
        return " ".join(parts)
