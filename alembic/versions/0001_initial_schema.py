"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "market_bars",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ticker", sa.String(length=16), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("open", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("adjusted_close", sa.Float(), nullable=False),
        sa.Column("volume", sa.Float(), nullable=False),
        sa.Column("dividends", sa.Float(), nullable=False),
        sa.Column("splits", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_market_bars_ticker", "market_bars", ["ticker"])
    op.create_index("ix_market_bars_timestamp", "market_bars", ["timestamp"])
    op.create_table(
        "prediction_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ticker", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("signal", sa.String(length=64), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(length=32), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prediction_logs_ticker", "prediction_logs", ["ticker"])
    op.create_index("ix_prediction_logs_created_at", "prediction_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_prediction_logs_created_at", table_name="prediction_logs")
    op.drop_index("ix_prediction_logs_ticker", table_name="prediction_logs")
    op.drop_table("prediction_logs")
    op.drop_index("ix_market_bars_timestamp", table_name="market_bars")
    op.drop_index("ix_market_bars_ticker", table_name="market_bars")
    op.drop_table("market_bars")
