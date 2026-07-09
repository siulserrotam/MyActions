from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP, getcontext

import pandas as pd

getcontext().prec = 28


@dataclass(frozen=True)
class OrbAccountRules:
    capital: Decimal = Decimal("2500")
    risk_amount: Decimal = Decimal("20")
    reward_amount: Decimal = Decimal("40")
    buying_power: Decimal = Decimal("10000")
    max_wins: int = 2
    max_losses: int = 1


class OrbService:
    allowed_tickers = {"NVDA", "AMD", "AAPL", "SPY"}

    def calculate(
        self,
        ticker: str,
        opening_high: float,
        opening_low: float,
        entry_price: float,
        wins_today: int = 0,
        losses_today: int = 0,
    ) -> dict[str, object]:
        ticker = ticker.upper().strip()
        if ticker not in self.allowed_tickers:
            raise ValueError("Ticker ORB soportado: NVDA, AMD, AAPL o SPY.")

        rules = OrbAccountRules()
        high = self._money(opening_high)
        low = self._money(opening_low)
        entry = self._money(entry_price)
        if high <= low:
            raise ValueError("El maximo de la vela debe ser mayor que el minimo.")

        control = self._daily_control(wins_today, losses_today, rules)
        direction = self._direction(entry, high, low)
        if direction == "SIN ROMPIMIENTO":
            return {
                "ticker": ticker,
                "allowed": False,
                "direction": direction,
                "reason": "El precio de entrada esta dentro del rango inicial; no hay ORB valido.",
                "daily_control": control,
            }
        if not control["can_trade"]:
            return {
                "ticker": ticker,
                "allowed": False,
                "direction": direction,
                "reason": control["message"],
                "daily_control": control,
            }

        stop = low if direction == "LARGO / COMPRA" else high
        risk_per_share = abs(entry - stop)
        if risk_per_share <= 0:
            raise ValueError("La distancia al stop debe ser mayor que cero.")
        exact_shares = rules.risk_amount / risk_per_share
        whole_shares = exact_shares.to_integral_value(rounding=ROUND_DOWN)
        take_profit = entry + risk_per_share * Decimal("2") if direction == "LARGO / COMPRA" else entry - risk_per_share * Decimal("2")
        buying_power_used = exact_shares * entry
        whole_buying_power = whole_shares * entry
        expected_profit = exact_shares * abs(take_profit - entry)
        expected_loss = exact_shares * risk_per_share

        return {
            "ticker": ticker,
            "generated_at": datetime.now(UTC).isoformat(),
            "allowed": buying_power_used <= rules.buying_power,
            "direction": direction,
            "opening_high": self._fmt(high),
            "opening_low": self._fmt(low),
            "entry_price": self._fmt(entry),
            "stop_loss": self._fmt(stop),
            "take_profit": self._fmt(take_profit),
            "risk_per_share": self._fmt(risk_per_share),
            "exact_shares": self._fmt(exact_shares, places="0.0001"),
            "whole_shares": int(whole_shares),
            "buying_power_used": self._fmt(buying_power_used),
            "whole_share_buying_power_used": self._fmt(whole_buying_power),
            "expected_loss": self._fmt(expected_loss),
            "expected_profit": self._fmt(expected_profit),
            "buying_power_limit": self._fmt(rules.buying_power),
            "account_capital": self._fmt(rules.capital),
            "risk_amount": self._fmt(rules.risk_amount),
            "reward_amount": self._fmt(rules.reward_amount),
            "risk_reward": "1:2",
            "daily_control": control,
            "status": self._status(buying_power_used, rules.buying_power),
            "instructions": [
                "No entrar si el rompimiento no supera claramente el maximo/minimo de la primera vela de 5 minutos.",
                "Programar stop loss y take profit inmediatamente despues de entrar.",
                "Si la operacion 1 pierde, cerrar el dia.",
                "Si logras 2 ganadoras, cerrar el dia.",
            ],
        }

    def intraday_session(self, ticker: str) -> dict[str, object]:
        ticker = ticker.upper().strip()
        if ticker not in self.allowed_tickers:
            raise ValueError("Ticker ORB soportado: NVDA, AMD, AAPL o SPY.")
        frame = self._download_intraday(ticker)
        rows = []
        for index, row in frame.tail(90).iterrows():
            rows.append(
                {
                    "time": str(index),
                    "open": round(float(row["open"]), 4),
                    "high": round(float(row["high"]), 4),
                    "low": round(float(row["low"]), 4),
                    "close": round(float(row["close"]), 4),
                    "volume": round(float(row.get("volume", 0)), 2),
                }
            )
        first = frame.iloc[0] if not frame.empty else None
        opening_range = None
        if first is not None:
            opening_range = {
                "high": round(float(first["high"]), 4),
                "low": round(float(first["low"]), 4),
                "open": round(float(first["open"]), 4),
                "close": round(float(first["close"]), 4),
            }
        return {
            "ticker": ticker,
            "interval": "5m",
            "opening_range": opening_range,
            "bars": rows,
        }

    def _download_intraday(self, ticker: str) -> pd.DataFrame:
        import yfinance as yf

        raw = yf.download(ticker, period="1d", interval="5m", prepost=False, auto_adjust=False, progress=False, threads=False)
        if raw.empty:
            raise ValueError("No hay datos intradia 5m disponibles.")
        raw.columns = [str(col[0] if isinstance(col, tuple) else col).lower().replace(" ", "_") for col in raw.columns]
        return raw.dropna(subset=["open", "high", "low", "close"])

    def _direction(self, entry: Decimal, high: Decimal, low: Decimal) -> str:
        if entry > high:
            return "LARGO / COMPRA"
        if entry < low:
            return "CORTO / VENTA"
        return "SIN ROMPIMIENTO"

    def _daily_control(self, wins: int, losses: int, rules: OrbAccountRules) -> dict[str, object]:
        total = wins + losses
        if losses >= rules.max_losses:
            return {
                "can_trade": False,
                "trade_number": total + 1,
                "message": "Ya existe 1 perdida hoy. Freno de mano: cerramos por hoy.",
            }
        if wins >= rules.max_wins:
            return {
                "can_trade": False,
                "trade_number": total + 1,
                "message": "Ya alcanzaste 2 ganadoras. Meta del dia cumplida; cerramos por hoy.",
            }
        return {
            "can_trade": True,
            "trade_number": total + 1,
            "message": f"Operacion {total + 1} de la jornada. Si sale negativa, cerramos por hoy.",
        }

    def _status(self, buying_power_used: Decimal, limit: Decimal) -> str:
        if buying_power_used > limit:
            return "NO OPERAR: excede poder de compra."
        return "OPERACION VALIDA si el rompimiento es real y ejecutas stop/target."

    def _money(self, value: float) -> Decimal:
        return Decimal(str(value)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

    def _fmt(self, value: Decimal, places: str = "0.01") -> float:
        return float(value.quantize(Decimal(places), rounding=ROUND_HALF_UP))
