from dataclasses import asdict, dataclass

from app.core.config import settings
from app.schemas.responses import PredictionResponse
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
