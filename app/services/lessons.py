from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import TradeLesson


class TradeLessonService:
    def save(
        self,
        session: Session,
        trade_date: date,
        symbol: str,
        direction: str,
        planned_volume: float,
        entry_price: float,
        stop_price: float,
        take_profit_price: float,
        expected_loss: float,
        expected_profit: float,
        actual_result: float,
        outcome: str,
        confidence: float = 0,
        market_phase: str = "",
        notes: str = "",
    ) -> dict[str, object]:
        normalized_outcome = outcome if outcome in {"win", "loss", "manual", "missed", "pending"} else "pending"
        record = TradeLesson(
            trade_date=trade_date,
            symbol=symbol.upper().strip(),
            direction=direction.upper().strip(),
            planned_volume=planned_volume,
            entry_price=entry_price,
            stop_price=stop_price,
            take_profit_price=take_profit_price,
            expected_loss=expected_loss,
            expected_profit=expected_profit,
            actual_result=actual_result,
            outcome=normalized_outcome,
            confidence=confidence,
            market_phase=market_phase,
            notes=notes[:1000],
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return self._serialize(record)

    def history(self, session: Session, limit: int = 50) -> list[dict[str, object]]:
        records = session.scalars(
            select(TradeLesson).order_by(TradeLesson.trade_date.desc(), TradeLesson.id.desc()).limit(limit)
        ).all()
        return [self._serialize(record) for record in records]

    def summary(self, session: Session, limit: int = 200) -> dict[str, object]:
        records = session.scalars(
            select(TradeLesson).order_by(TradeLesson.trade_date.desc(), TradeLesson.id.desc()).limit(limit)
        ).all()
        closed = [record for record in records if record.outcome in {"win", "loss", "manual"}]
        wins = [record for record in closed if (record.actual_result or 0) > 0]
        losses = [record for record in closed if (record.actual_result or 0) < 0]
        total_result = sum(record.actual_result or 0 for record in closed)
        by_symbol: dict[str, dict[str, object]] = {}
        for record in closed:
            symbol = record.symbol
            stats = by_symbol.setdefault(symbol, {"symbol": symbol, "count": 0, "wins": 0, "losses": 0, "result": 0.0})
            stats["count"] = int(stats["count"]) + 1
            stats["wins"] = int(stats["wins"]) + (1 if (record.actual_result or 0) > 0 else 0)
            stats["losses"] = int(stats["losses"]) + (1 if (record.actual_result or 0) < 0 else 0)
            stats["result"] = round(float(stats["result"]) + (record.actual_result or 0), 2)
        best_symbols = sorted(by_symbol.values(), key=lambda item: float(item["result"]), reverse=True)[:5]
        return {
            "sample": len(records),
            "closed": len(closed),
            "wins": len(wins),
            "losses": len(losses),
            "win_rate": round((len(wins) / len(closed) * 100), 2) if closed else 0,
            "total_result": round(total_result, 2),
            "best_symbols": best_symbols,
        }

    def _serialize(self, record: TradeLesson) -> dict[str, object]:
        return {
            "id": record.id,
            "trade_date": record.trade_date.isoformat(),
            "symbol": record.symbol,
            "direction": record.direction,
            "planned_volume": round(record.planned_volume or 0, 6),
            "entry_price": round(record.entry_price or 0, 5),
            "stop_price": round(record.stop_price or 0, 5),
            "take_profit_price": round(record.take_profit_price or 0, 5),
            "expected_loss": round(record.expected_loss or 0, 2),
            "expected_profit": round(record.expected_profit or 0, 2),
            "actual_result": round(record.actual_result or 0, 2),
            "outcome": record.outcome,
            "confidence": round(record.confidence or 0, 2),
            "market_phase": record.market_phase,
            "notes": record.notes,
            "created_at": record.created_at.isoformat(),
        }
