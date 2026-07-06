import numpy as np
import pandas as pd

from app.schemas.responses import BacktestResponse, BacktestStrategyResult
from app.services.data_provider import MarketDataService
from app.services.indicators import IndicatorService


class BacktestingService:
    def __init__(self, initial_capital: float = 10_000.0) -> None:
        self.initial_capital = initial_capital
        self.data = MarketDataService()
        self.indicators = IndicatorService()

    def run(self, ticker: str) -> BacktestResponse:
        frame = self.indicators.with_indicators(self.data.get_history(ticker)).tail(756)
        strategies = [
            self._evaluate("Modelo IA", frame, self._ai_signal(frame)),
            self._evaluate("Buy & Hold", frame, pd.Series(1, index=frame.index)),
            self._evaluate("Cruce EMA", frame, np.where(frame["ema_20"] > frame["ema_50"], 1, 0)),
            self._evaluate("MACD", frame, np.where(frame["macd"] > frame["macd_signal"], 1, 0)),
            self._evaluate("RSI", frame, np.where(frame["rsi"] < 35, 1, np.where(frame["rsi"] > 70, 0, np.nan))),
        ]
        best = max(strategies, key=lambda item: item.final_capital)
        return BacktestResponse(
            ticker=ticker,
            summary={
                "best_strategy": best.strategy,
                "best_final_capital": best.final_capital,
                "best_total_return": best.total_return,
                "initial_capital": self.initial_capital,
            },
            strategies=strategies,
        )

    def _ai_signal(self, frame: pd.DataFrame) -> pd.Series:
        score = (
            (frame["ema_20"] > frame["ema_50"]).astype(int)
            + (frame["macd"] > frame["macd_signal"]).astype(int)
            + (frame["rsi"].between(45, 68)).astype(int)
            + (frame["close"] > frame["vwap"]).astype(int)
            + (frame["adx"] > 20).astype(int)
        )
        return (score >= 3).astype(int)

    def _evaluate(self, strategy: str, frame: pd.DataFrame, signal_like) -> BacktestStrategyResult:
        signal = pd.Series(signal_like, index=frame.index).ffill().fillna(0).clip(0, 1)
        returns = frame["close"].pct_change().fillna(0)
        strategy_returns = returns * signal.shift(1).fillna(0)
        equity = self.initial_capital * (1 + strategy_returns).cumprod()
        trades = int(signal.diff().abs().fillna(0).sum())
        winning_days = int((strategy_returns > 0).sum())
        losing_days = int((strategy_returns < 0).sum())
        gross_profit = float(strategy_returns[strategy_returns > 0].sum())
        gross_loss = abs(float(strategy_returns[strategy_returns < 0].sum()))
        drawdown = equity / equity.cummax() - 1

        sharpe = self._ratio(strategy_returns.mean(), strategy_returns.std())
        downside = strategy_returns[strategy_returns < 0].std()
        sortino = self._ratio(strategy_returns.mean(), downside)

        return BacktestStrategyResult(
            strategy=strategy,
            initial_capital=self.initial_capital,
            final_capital=round(float(equity.iloc[-1]), 2),
            total_return=round(float(equity.iloc[-1] / self.initial_capital - 1), 4),
            trades=trades,
            winners=winning_days,
            losers=losing_days,
            max_drawdown=round(float(drawdown.min()), 4),
            profit_factor=round(gross_profit / gross_loss, 4) if gross_loss else 99.0,
            sharpe=round(sharpe, 4),
            sortino=round(sortino, 4),
        )

    def _ratio(self, mean: float, std: float | None) -> float:
        if std is None or std == 0 or np.isnan(std):
            return 0.0
        return float((mean / std) * np.sqrt(252))
