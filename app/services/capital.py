from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import DailyCapital


class CapitalService:
    def latest(self, session: Session) -> dict[str, object] | None:
        record = session.scalars(
            select(DailyCapital).order_by(DailyCapital.trade_date.desc(), DailyCapital.id.desc()).limit(1)
        ).first()
        return self._serialize(record) if record else None

    def by_date(self, session: Session, trade_date: date) -> dict[str, object] | None:
        record = session.scalars(select(DailyCapital).where(DailyCapital.trade_date == trade_date)).first()
        return self._serialize(record) if record else None

    def history(self, session: Session, limit: int = 30) -> list[dict[str, object]]:
        records = session.scalars(
            select(DailyCapital).order_by(DailyCapital.trade_date.desc(), DailyCapital.id.desc()).limit(limit)
        ).all()
        return [self._serialize(record) for record in records]

    def save(
        self,
        session: Session,
        trade_date: date,
        balance: float,
        target_value: float,
        target_type: str,
        notes: str = "",
    ) -> dict[str, object]:
        normalized_type = target_type if target_type in {"money", "percent"} else "money"
        now = datetime.now(UTC).replace(tzinfo=None)
        record = session.scalars(select(DailyCapital).where(DailyCapital.trade_date == trade_date)).first()
        if record is None:
            record = DailyCapital(
                trade_date=trade_date,
                balance=balance,
                target_value=target_value,
                target_type=normalized_type,
                broker="XTB",
                instrument_type="CFD",
                notes=notes,
                created_at=now,
                updated_at=now,
            )
            session.add(record)
        else:
            record.balance = balance
            record.target_value = target_value
            record.target_type = normalized_type
            record.notes = notes
            record.updated_at = now
        session.commit()
        session.refresh(record)
        return self._serialize(record)

    def _serialize(self, record: DailyCapital) -> dict[str, object]:
        target_profit = (
            record.balance * (record.target_value / 100)
            if record.target_type == "percent"
            else record.target_value
        )
        max_loss = target_profit / 2
        return {
            "id": record.id,
            "trade_date": record.trade_date.isoformat(),
            "balance": round(record.balance, 2),
            "target_value": round(record.target_value, 2),
            "target_type": record.target_type,
            "target_profit": round(target_profit, 2),
            "max_loss": round(max_loss, 2),
            "risk_per_trade": round(record.balance * 0.008, 2),
            "reward_per_trade": round(record.balance * 0.016, 2),
            "buying_power": round(record.balance * 4, 2),
            "broker": record.broker,
            "instrument_type": record.instrument_type,
            "notes": record.notes,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
        }
