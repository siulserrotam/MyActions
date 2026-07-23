from datetime import UTC, date, datetime

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.models import DailyCapital


class CapitalService:
    def ensure_schema(self, session: Session) -> None:
        for column in ("available_capital", "margin_level_pct", "open_profit", "operation1_result", "operation2_result"):
            try:
                session.execute(text(f"ALTER TABLE daily_capital ADD COLUMN {column} FLOAT DEFAULT 0"))
                session.commit()
            except Exception:
                session.rollback()
        try:
            session.execute(text("ALTER TABLE daily_capital ADD COLUMN daily_result_status VARCHAR(32) DEFAULT 'pending'"))
            session.commit()
        except Exception:
            session.rollback()

    def latest(self, session: Session) -> dict[str, object] | None:
        self.ensure_schema(session)
        record = session.scalars(
            select(DailyCapital).order_by(DailyCapital.trade_date.desc(), DailyCapital.id.desc()).limit(1)
        ).first()
        return self._serialize(record) if record else None

    def by_date(self, session: Session, trade_date: date) -> dict[str, object] | None:
        self.ensure_schema(session)
        record = session.scalars(select(DailyCapital).where(DailyCapital.trade_date == trade_date)).first()
        return self._serialize(record) if record else None

    def history(self, session: Session, limit: int = 30) -> list[dict[str, object]]:
        self.ensure_schema(session)
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
        monthly_contribution: float = 0,
        daily_profit: float = 0,
        invested_accumulated: float = 0,
        monthly_invested: float = 0,
        gains_accumulated: float = 0,
        daily_gains: float = 0,
        available_capital: float = 0,
        margin_level_pct: float = 0,
        open_profit: float = 0,
        operation1_result: float = 0,
        operation2_result: float = 0,
        daily_result_status: str = "pending",
        risk_pct: float = 1,
        notes: str = "",
    ) -> dict[str, object]:
        self.ensure_schema(session)
        normalized_type = target_type if target_type in {"money", "percent"} else "money"
        now = datetime.now(UTC).replace(tzinfo=None)
        record = session.scalars(select(DailyCapital).where(DailyCapital.trade_date == trade_date)).first()
        if record is None:
            record = DailyCapital(
                trade_date=trade_date,
                balance=balance,
                target_value=target_value,
                target_type=normalized_type,
                monthly_contribution=monthly_contribution,
                daily_profit=daily_profit,
                invested_accumulated=invested_accumulated,
                monthly_invested=monthly_invested,
                gains_accumulated=gains_accumulated,
                daily_gains=daily_gains,
                available_capital=available_capital,
                margin_level_pct=margin_level_pct,
                open_profit=open_profit,
                operation1_result=operation1_result,
                operation2_result=operation2_result,
                daily_result_status=daily_result_status,
                risk_pct=risk_pct,
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
            record.monthly_contribution = monthly_contribution
            record.daily_profit = daily_profit
            record.invested_accumulated = invested_accumulated
            record.monthly_invested = monthly_invested
            record.gains_accumulated = gains_accumulated
            record.daily_gains = daily_gains
            record.available_capital = available_capital
            record.margin_level_pct = margin_level_pct
            record.open_profit = open_profit
            record.operation1_result = operation1_result
            record.operation2_result = operation2_result
            record.daily_result_status = daily_result_status
            record.risk_pct = risk_pct
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
            "monthly_contribution": round(record.monthly_contribution or 0, 2),
            "daily_profit": round(record.daily_profit or 0, 2),
            "invested_accumulated": round(record.invested_accumulated or 0, 2),
            "monthly_invested": round(record.monthly_invested or 0, 2),
            "gains_accumulated": round(record.gains_accumulated or 0, 2),
            "daily_gains": round(record.daily_gains or 0, 2),
            "available_capital": round(record.available_capital or 0, 2),
            "margin_level_pct": round(record.margin_level_pct or 0, 2),
            "open_profit": round(record.open_profit or 0, 2),
            "operation1_result": round(record.operation1_result or 0, 2),
            "operation2_result": round(record.operation2_result or 0, 2),
            "daily_realized_result": round((record.operation1_result or 0) + (record.operation2_result or 0), 2),
            "daily_result_status": record.daily_result_status or "pending",
            "risk_pct": round(record.risk_pct or 1, 4),
            "risk_per_trade": round(record.balance * ((record.risk_pct or 1) / 100), 2),
            "reward_per_trade": round(record.balance * ((record.risk_pct or 1) / 100) * 2, 2),
            "buying_power": round(record.balance * 4, 2),
            "broker": record.broker,
            "instrument_type": record.instrument_type,
            "notes": record.notes,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
        }
