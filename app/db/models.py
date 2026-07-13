from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class MarketBar(Base):
    __tablename__ = "market_bars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    open: Mapped[float] = mapped_column(Float)
    high: Mapped[float] = mapped_column(Float)
    low: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    adjusted_close: Mapped[float] = mapped_column(Float)
    volume: Mapped[float] = mapped_column(Float)
    dividends: Mapped[float] = mapped_column(Float, default=0)
    splits: Mapped[float] = mapped_column(Float, default=0)


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    signal: Mapped[str] = mapped_column(String(64))
    confidence: Mapped[float] = mapped_column(Float)
    risk_level: Mapped[str] = mapped_column(String(32))
    model_name: Mapped[str] = mapped_column(String(128))
    explanation: Mapped[str] = mapped_column(Text)


class DailyCapital(Base):
    __tablename__ = "daily_capital"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trade_date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    balance: Mapped[float] = mapped_column(Float)
    target_value: Mapped[float] = mapped_column(Float)
    target_type: Mapped[str] = mapped_column(String(16), default="money")
    broker: Mapped[str] = mapped_column(String(32), default="XTB")
    instrument_type: Mapped[str] = mapped_column(String(32), default="CFD")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, index=True)
