import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import XtbSnapshot


class XtbSnapshotService:
    def save(self, session: Session, items: list[dict[str, object]], source: str = "xtb") -> dict[str, object]:
        now = datetime.now(UTC).replace(tzinfo=None)
        saved: list[dict[str, object]] = []
        errors: dict[str, str] = {}

        for item in items[:40]:
            symbol = str(item.get("symbol") or "").upper().strip()
            price = float(item.get("price") or 0)
            if not symbol or price <= 0:
                continue

            try:
                record = session.execute(
                    select(XtbSnapshot).where(XtbSnapshot.symbol == symbol)
                ).scalar_one_or_none()
                payload = dict(item)
                if record is None:
                    record = XtbSnapshot(symbol=symbol, price=price, captured_at=now, updated_at=now)
                    session.add(record)

                record.bid = float(item.get("bid") or 0)
                record.ask = float(item.get("ask") or 0)
                record.price = price
                record.change_pct = float(item.get("change_pct") or 0)
                record.source = str(item.get("source") or source)[:64]
                record.payload_json = json.dumps(payload, ensure_ascii=True, default=str)
                record.updated_at = now
                saved.append(self._serialize(record))
            except Exception as exc:
                errors[symbol] = str(exc)

        session.commit()
        return {"count": len(saved), "items": saved, "errors": errors}

    def latest(self, session: Session, symbol: str | None = None, limit: int = 20) -> dict[str, object]:
        query = select(XtbSnapshot).order_by(XtbSnapshot.updated_at.desc()).limit(limit)
        normalized = ""
        if symbol:
            normalized = symbol.upper().strip()
            query = select(XtbSnapshot).where(XtbSnapshot.symbol == normalized).order_by(XtbSnapshot.updated_at.desc()).limit(1)
        rows = list(session.execute(query).scalars())
        return {
            "symbol": normalized or None,
            "count": len(rows),
            "items": [self._serialize(row) for row in rows],
        }

    @staticmethod
    def _serialize(record: XtbSnapshot) -> dict[str, object]:
        try:
            payload = json.loads(record.payload_json or "{}")
        except json.JSONDecodeError:
            payload = {}
        return {
            "symbol": record.symbol,
            "bid": round(record.bid, 6),
            "ask": round(record.ask, 6),
            "price": round(record.price, 6),
            "change_pct": round(record.change_pct, 6),
            "source": record.source,
            "updated_at": record.updated_at.isoformat(),
            "payload": payload,
        }
