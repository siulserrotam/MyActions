import numpy as np
import pandas as pd


class IndicatorService:
    def with_indicators(self, frame: pd.DataFrame) -> pd.DataFrame:
        data = frame.copy()
        close = data["close"]
        high = data["high"]
        low = data["low"]
        volume = data["volume"]

        for window in [9, 20, 50, 100, 200]:
            data[f"ema_{window}"] = close.ewm(span=window, adjust=False).mean()
        for window in [20, 50, 200]:
            data[f"sma_{window}"] = close.rolling(window).mean()

        data["rsi"] = self._rsi(close)
        macd, macd_signal, macd_hist = self._macd(close)
        data["macd"] = macd
        data["macd_signal"] = macd_signal
        data["macd_hist"] = macd_hist
        data["atr"] = self._atr(high, low, close)
        data["adx"] = self._adx(high, low, close)
        data["cci"] = self._cci(high, low, close)
        data["roc"] = close.pct_change(12) * 100
        data["momentum"] = close.diff(10)
        data["obv"] = self._obv(close, volume)
        data["mfi"] = self._mfi(high, low, close, volume)
        data["vwap"] = (close * volume).cumsum() / volume.cumsum()

        bb_mid = close.rolling(20).mean()
        bb_std = close.rolling(20).std()
        data["bb_mid"] = bb_mid
        data["bb_upper"] = bb_mid + 2 * bb_std
        data["bb_lower"] = bb_mid - 2 * bb_std

        data["williams_r"] = self._williams_r(high, low, close)
        data["stoch_k"], data["stoch_d"] = self._stochastic(high, low, close)
        data["hist_volatility"] = close.pct_change().rolling(20).std() * np.sqrt(252)
        data["daily_return"] = close.pct_change()
        data["weekly_return"] = close.pct_change(5)
        data["monthly_return"] = close.pct_change(21)
        data["trend_slope"] = close.rolling(20).apply(self._slope, raw=True)
        data["support"] = low.rolling(20).min()
        data["resistance"] = high.rolling(20).max()
        data["ema_cross_20_50"] = np.where(data["ema_20"] > data["ema_50"], 1, -1)
        data["parabolic_sar_proxy"] = data["ema_20"] - data["atr"]
        data["supertrend_proxy"] = np.where(close > data["ema_20"], 1, -1)
        data["ichimoku_tenkan"] = (high.rolling(9).max() + low.rolling(9).min()) / 2
        data["ichimoku_kijun"] = (high.rolling(26).max() + low.rolling(26).min()) / 2
        data["candle_body_pct"] = (close - data["open"]) / close.replace(0, np.nan)
        data["bullish_candle"] = np.where(close > data["open"], 1, 0)
        data["bearish_candle"] = np.where(close < data["open"], 1, 0)

        return data.replace([np.inf, -np.inf], np.nan).dropna()

    def _rsi(self, close: pd.Series, period: int = 14) -> pd.Series:
        delta = close.diff()
        gains = delta.clip(lower=0).rolling(period).mean()
        losses = (-delta.clip(upper=0)).rolling(period).mean()
        rs = gains / losses.replace(0, np.nan)
        return (100 - (100 / (1 + rs))).fillna(100)

    def _macd(self, close: pd.Series) -> tuple[pd.Series, pd.Series, pd.Series]:
        fast = close.ewm(span=12, adjust=False).mean()
        slow = close.ewm(span=26, adjust=False).mean()
        macd = fast - slow
        signal = macd.ewm(span=9, adjust=False).mean()
        return macd, signal, macd - signal

    def _atr(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        previous_close = close.shift(1)
        true_range = pd.concat(
            [(high - low), (high - previous_close).abs(), (low - previous_close).abs()],
            axis=1,
        ).max(axis=1)
        return true_range.rolling(period).mean()

    def _adx(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        plus_dm = high.diff()
        minus_dm = -low.diff()
        plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0)
        minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0)
        atr = self._atr(high, low, close, period)
        plus_di = 100 * plus_dm.rolling(period).mean() / atr.replace(0, np.nan)
        minus_di = 100 * minus_dm.rolling(period).mean() / atr.replace(0, np.nan)
        dx = (100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan))
        return dx.rolling(period).mean()

    def _cci(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20) -> pd.Series:
        typical = (high + low + close) / 3
        sma = typical.rolling(period).mean()
        mad = (typical - sma).abs().rolling(period).mean()
        return (typical - sma) / (0.015 * mad.replace(0, np.nan))

    def _obv(self, close: pd.Series, volume: pd.Series) -> pd.Series:
        direction = np.sign(close.diff()).fillna(0)
        return (direction * volume).cumsum()

    def _mfi(
        self,
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        volume: pd.Series,
        period: int = 14,
    ) -> pd.Series:
        typical = (high + low + close) / 3
        money_flow = typical * volume
        positive = money_flow.where(typical.diff() > 0, 0).rolling(period).sum()
        negative = money_flow.where(typical.diff() < 0, 0).rolling(period).sum()
        ratio = positive / negative.replace(0, np.nan)
        return (100 - (100 / (1 + ratio))).fillna(100)

    def _williams_r(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        highest = high.rolling(period).max()
        lowest = low.rolling(period).min()
        return -100 * (highest - close) / (highest - lowest).replace(0, np.nan)

    def _stochastic(
        self,
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        period: int = 14,
    ) -> tuple[pd.Series, pd.Series]:
        lowest = low.rolling(period).min()
        highest = high.rolling(period).max()
        k = 100 * (close - lowest) / (highest - lowest).replace(0, np.nan)
        return k, k.rolling(3).mean()

    def _slope(self, values: np.ndarray) -> float:
        x = np.arange(len(values))
        return float(np.polyfit(x, values, 1)[0])
