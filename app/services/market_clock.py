from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo


class MarketClockService:
    ny_tz = ZoneInfo("America/New_York")

    def snapshot(self) -> dict[str, object]:
        now_ny = datetime.now(self.ny_tz)
        open_time = time(9, 30)
        close_time = time(16, 0)
        is_weekday = now_ny.weekday() < 5
        is_open = is_weekday and open_time <= now_ny.time() < close_time
        if is_open:
            status = "ABIERTO"
        elif is_weekday and now_ny.time() < open_time:
            status = "PRE-MERCADO / ESPERAR ORB"
        else:
            status = "CERRADO"

        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "new_york_time": now_ny.strftime("%Y-%m-%d %H:%M:%S"),
            "timezone": "America/New_York",
            "status": status,
            "is_open": is_open,
            "open_time": "09:30",
            "close_time": "16:00",
            "strategy_window": "ORB 5m: esperar vela 09:30-09:35 NY; evaluar desde 09:35 NY.",
        }
