from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass(frozen=True)
class NotificationResult:
    sent: bool
    channel: str
    reason: str
    provider_message_id: str | None = None


class WhatsAppNotificationService:
    def send_text(self, message: str) -> NotificationResult:
        if not self._is_configured():
            return NotificationResult(
                sent=False,
                channel="whatsapp",
                reason="WhatsApp no configurado. Faltan WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_TO_PHONE.",
            )

        url = f"https://graph.facebook.com/v20.0/{settings.whatsapp_phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": settings.whatsapp_to_phone.lstrip("+"),
            "type": "text",
            "text": {"preview_url": False, "body": message},
        }
        headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}"}

        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=20)
            response.raise_for_status()
            body = response.json()
            message_id = None
            if body.get("messages"):
                message_id = body["messages"][0].get("id")
            return NotificationResult(
                sent=True,
                channel="whatsapp",
                reason="Mensaje enviado.",
                provider_message_id=message_id,
            )
        except httpx.HTTPError as exc:
            return NotificationResult(
                sent=False,
                channel="whatsapp",
                reason=f"Error enviando WhatsApp: {exc}",
            )

    def _is_configured(self) -> bool:
        return bool(
            settings.whatsapp_access_token
            and settings.whatsapp_phone_number_id
            and settings.whatsapp_to_phone
        )
