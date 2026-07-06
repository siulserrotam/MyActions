from dataclasses import asdict, dataclass

from app.core.config import settings
from app.schemas.responses import PredictionResponse
from app.services.intraday import IntradayMarketService, IntradayMove
from app.services.notifications import NotificationResult, WhatsAppNotificationService
from app.services.trading_signal import TradingSignalService


@dataclass(frozen=True)
class AlertEvaluation:
    ticker: str
    should_alert: bool
    reason: str
    signal: str
    confidence: float
    price: float
    message: str
    notification: NotificationResult | None

    def to_dict(self) -> dict[str, object]:
        data = asdict(self)
        return data


class AlertService:
    def __init__(self) -> None:
        self.signals = {item.strip().upper() for item in settings.alert_signals.split(",") if item.strip()}
        self.trading = TradingSignalService()
        self.intraday = IntradayMarketService()
        self.whatsapp = WhatsAppNotificationService()

    def evaluate(self, ticker: str, notify: bool = False) -> AlertEvaluation:
        prediction = self.trading.predict(ticker)
        should_alert, reason = self._should_alert(prediction)
        message = self._build_message(prediction, should_alert, reason)
        notification = None
        if notify and should_alert:
            notification = self.whatsapp.send_text(message)
        elif notify:
            notification = NotificationResult(
                sent=False,
                channel="whatsapp",
                reason="No se envio porque la condicion de alerta no se cumplio.",
            )

        return AlertEvaluation(
            ticker=ticker,
            should_alert=should_alert,
            reason=reason,
            signal=prediction.senal,
            confidence=prediction.confianza,
            price=prediction.precio_actual,
            message=message,
            notification=notification,
        )

    def evaluate_intraday(self, ticker: str, notify: bool = False) -> dict[str, object]:
        move = self.intraday.get_move(ticker)
        should_alert, direction, reason = self._should_intraday_alert(move)
        message = self._build_intraday_message(move, should_alert, direction, reason)
        notification = None
        if notify and should_alert:
            notification = self.whatsapp.send_text(message)
        elif notify:
            notification = NotificationResult(
                sent=False,
                channel="whatsapp",
                reason="No se envio porque el movimiento intradia no alcanzo el umbral.",
            )

        return {
            "ticker": move.ticker,
            "date": move.date.isoformat(),
            "should_alert": should_alert,
            "direction": direction,
            "reason": reason,
            "open_price": move.open_price,
            "current_price": move.current_price,
            "high_price": move.high_price,
            "low_price": move.low_price,
            "change_pct": move.change_pct,
            "high_change_pct": move.high_change_pct,
            "low_change_pct": move.low_change_pct,
            "trend": move.trend,
            "projected_close_pct": move.projected_close_pct,
            "possible_remaining_pct": move.possible_remaining_pct,
            "bars_seen": move.bars_seen,
            "threshold_pct": move.threshold_pct,
            "message": message,
            "notification": asdict(notification) if notification else None,
        }

    def _should_alert(self, prediction: PredictionResponse) -> tuple[bool, str]:
        if prediction.senal.upper() not in self.signals:
            return False, f"Senal {prediction.senal} no esta en ALERT_SIGNALS."
        if prediction.confianza < settings.alert_min_confidence:
            return False, (
                f"Confianza {prediction.confianza}% menor al minimo "
                f"{settings.alert_min_confidence}%."
            )
        return True, "La senal cumple los criterios de alerta."

    def _build_message(self, prediction: PredictionResponse, should_alert: bool, reason: str) -> str:
        status = "ALERTA ACTIVADA" if should_alert else "Revision sin alerta"
        explanation = "; ".join(prediction.explicacion[:4])
        return (
            f"{status} - {prediction.ticker}\n"
            f"Senal: {prediction.senal}\n"
            f"Confianza: {prediction.confianza}%\n"
            f"Precio: ${prediction.precio_actual}\n"
            f"Riesgo: {prediction.riesgo}\n"
            f"Objetivo: ${prediction.precio_objetivo}\n"
            f"Stop loss: ${prediction.stop_loss}\n"
            f"Take profit: ${prediction.take_profit}\n"
            f"Motivo: {reason}\n"
            f"Explicacion: {explanation}\n"
            "Aviso: informacion educativa, no asesoria financiera."
        )

    def _should_intraday_alert(self, move: IntradayMove) -> tuple[bool, str, str]:
        threshold = settings.intraday_alert_threshold_pct
        if move.change_pct >= threshold:
            return True, "SUBIDA", f"El precio sube {move.change_pct}% vs apertura."
        if move.change_pct <= -threshold:
            return True, "BAJADA", f"El precio baja {abs(move.change_pct)}% vs apertura."
        return False, "SIN_UMBRAL", (
            f"Movimiento actual {move.change_pct}% no alcanza +/-{threshold}% vs apertura."
        )

    def _build_intraday_message(
        self,
        move: IntradayMove,
        should_alert: bool,
        direction: str,
        reason: str,
    ) -> str:
        status = "ALERTA INTRADIA" if should_alert else "Revision intradia"
        remaining_label = "posible variacion restante"
        if move.possible_remaining_pct > 0:
            remaining_label = "posible crecimiento restante"
        elif move.possible_remaining_pct < 0:
            remaining_label = "posible decrecimiento restante"
        return (
            f"{status} - {move.ticker}\n"
            f"Direccion: {direction}\n"
            f"Apertura: ${move.open_price}\n"
            f"Precio actual: ${move.current_price}\n"
            f"Cambio vs apertura: {move.change_pct}%\n"
            f"Maximo intradia: ${move.high_price} ({move.high_change_pct}%)\n"
            f"Minimo intradia: ${move.low_price} ({move.low_change_pct}%)\n"
            f"Tendencia: {move.trend}\n"
            f"Proyeccion cierre mismo dia: {move.projected_close_pct}%\n"
            f"{remaining_label}: {move.possible_remaining_pct}%\n"
            f"Motivo: {reason}\n"
            "Aviso: informacion educativa, no asesoria financiera."
        )
