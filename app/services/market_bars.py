from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import MarketBar


class MarketBarService:
    def save_quote(
        self,
        session: Session,
        symbol: str,
        price: float,
        source: str = "manual",
        timestamp: datetime | None = None,
    ) -> dict[str, object]:
        if price <= 0:
            raise ValueError("price debe ser mayor a cero")
        normalized = symbol.upper().strip()
        captured_at = timestamp or datetime.now(UTC)
        if captured_at.tzinfo is not None:
            captured_at = captured_at.astimezone(UTC).replace(tzinfo=None)
        minute = captured_at.replace(second=0, microsecond=0)

        record = session.execute(
            select(MarketBar).where(
                MarketBar.ticker == normalized,
                MarketBar.timestamp == minute,
            )
        ).scalar_one_or_none()

        if record is None:
            record = MarketBar(
                ticker=normalized,
                timestamp=minute,
                open=price,
                high=price,
                low=price,
                close=price,
                adjusted_close=price,
                volume=0,
                dividends=0,
                splits=0,
            )
            session.add(record)
        else:
            record.high = max(record.high, price)
            record.low = min(record.low, price)
            record.close = price
            record.adjusted_close = price

        session.commit()
        session.refresh(record)
        return self._serialize(record, source=source)

    def save_quotes(self, session: Session, items: list[dict[str, object]], source: str = "manual") -> dict[str, object]:
        saved: list[dict[str, object]] = []
        errors: dict[str, str] = {}
        for item in items[:80]:
            symbol = str(item.get("symbol") or "").upper().strip()
            price = float(item.get("price") or 0)
            if not symbol or price <= 0:
                continue
            try:
                saved.append(self.save_quote(session, symbol=symbol, price=price, source=source))
            except Exception as exc:
                errors[symbol] = str(exc)
        return {
            "count": len(saved),
            "items": saved,
            "errors": errors,
        }

    def recent(self, session: Session, symbol: str, limit: int = 30) -> dict[str, object]:
        normalized = symbol.upper().strip()
        rows = list(
            session.execute(
                select(MarketBar)
                .where(MarketBar.ticker == normalized)
                .order_by(MarketBar.timestamp.desc())
                .limit(limit)
            ).scalars()
        )
        rows.reverse()
        return {
            "symbol": normalized,
            "interval": "1m",
            "window_minutes": limit,
            "count": len(rows),
            "items": [self._serialize(row) for row in rows],
            "is_real": len(rows) >= 2,
        }

    def prune(self, session: Session, days: int = 7) -> int:
        cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=days)
        rows = session.execute(select(MarketBar).where(MarketBar.timestamp < cutoff)).scalars().all()
        count = len(rows)
        for row in rows:
            session.delete(row)
        session.commit()
        return count

    @staticmethod
    def _serialize(record: MarketBar, source: str | None = None) -> dict[str, object]:
        return {
            "symbol": record.ticker,
            "timestamp": record.timestamp.isoformat(),
            "open": round(record.open, 6),
            "high": round(record.high, 6),
            "low": round(record.low, 6),
            "close": round(record.close, 6),
            "source": source or "market_bars",
        }
