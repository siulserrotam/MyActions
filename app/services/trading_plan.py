from dataclasses import dataclass

from app.services.data_provider import MarketDataService
from app.services.indicators import IndicatorService
from app.services.intraday import IntradayMarketService
from app.services.trading_signal import TradingSignalService


@dataclass(frozen=True)
class ActiveTradingPlan:
    ticker: str
    style: str
    current_price: float
    decision: str
    buy_zone: str
    sell_zone: str
    reentry_zone: str
    daily_target_pct: float
    weekly_target_pct: float
    monthly_target_pct: float
    stop_loss: float
    take_profit: float
    holding_rule: str
    explanation: list[str]


class TradingPlanService:
    def build(self, ticker: str) -> dict[str, object]:
        prediction = TradingSignalService().predict(ticker)
        frame = IndicatorService().with_indicators(MarketDataService().get_history(ticker)).tail(65)
        latest = frame.iloc[-1]
        support = float(latest["support"])
        resistance = float(latest["resistance"])
        atr = float(latest["atr"])
        current = prediction.precio_actual
        intraday_note = "Sin lectura intradia disponible."
        try:
            intraday = IntradayMarketService().get_move(ticker)
            intraday_note = (
                f"Hoy va {intraday.change_pct}% contra apertura; tendencia {intraday.trend.lower()}."
            )
        except Exception:
            intraday = None

        cheap_entry = max(support, current - atr * 0.8)
        aggressive_entry = max(support, current - atr * 0.35)
        sell_target = min(resistance * 0.995, current * 1.10)
        weekly_target = min(resistance * 1.01, current * 1.14)
        monthly_target = min(resistance * 1.04, current * 1.22)
        stop_loss = min(prediction.stop_loss, cheap_entry - atr * 0.8)
        daily_target_pct = round((sell_target / current - 1) * 100, 2)
        weekly_target_pct = round((weekly_target / current - 1) * 100, 2)
        monthly_target_pct = round((monthly_target / current - 1) * 100, 2)
        decision = self._decision(prediction.senal, current, cheap_entry, resistance, daily_target_pct)

        explanation = [
            f"Entrada barata ideal entre ${cheap_entry:.2f} y ${aggressive_entry:.2f}.",
            f"Venta diaria viable cerca de ${sell_target:.2f} si hay fuerza y volumen.",
            f"Si sube 10% intradia contra apertura, tomar ganancia parcial o total.",
            f"Recomprar solo si retrocede a zona de soporte o confirma nueva ruptura.",
            intraday_note,
        ]

        plan = ActiveTradingPlan(
            ticker=ticker,
            style="Trading activo diario/semanal/mensual",
            current_price=current,
            decision=decision,
            buy_zone=f"${cheap_entry:.2f} - ${aggressive_entry:.2f}",
            sell_zone=f"${sell_target:.2f} diario / ${weekly_target:.2f} semanal / ${monthly_target:.2f} mensual",
            reentry_zone=f"Reentrada bajo ${aggressive_entry:.2f} o sobre ruptura confirmada de ${resistance:.2f}",
            daily_target_pct=daily_target_pct,
            weekly_target_pct=weekly_target_pct,
            monthly_target_pct=monthly_target_pct,
            stop_loss=round(stop_loss, 2),
            take_profit=round(sell_target, 2),
            holding_rule="No mantener por inercia: vender por objetivo, stop o perdida de tendencia.",
            explanation=explanation,
        )
        return plan.__dict__

    def _decision(
        self,
        signal: str,
        current: float,
        cheap_entry: float,
        resistance: float,
        daily_target_pct: float,
    ) -> str:
        if current <= cheap_entry * 1.01 and signal in {"COMPRAR", "MANTENER"}:
            return "COMPRAR ESCALONADO"
        if daily_target_pct >= 7 and signal == "COMPRAR":
            return "ESPERAR RETROCESO O COMPRAR PEQUENO"
        if current >= resistance * 0.985:
            return "VENDER / TOMAR GANANCIA"
        if signal == "VENDER":
            return "SALIR Y ESPERAR NUEVA ENTRADA"
        return "ESPERAR MEJOR PRECIO"
