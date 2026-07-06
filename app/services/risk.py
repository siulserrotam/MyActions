from dataclasses import dataclass


@dataclass(frozen=True)
class RiskPlan:
    level: str
    stop_loss: float
    take_profit: float
    target_price: float
    risk_reward: str
    position_size_pct: float


class RiskService:
    def build_plan(self, price: float, atr: float, confidence: float, bullish_probability: float) -> RiskPlan:
        atr = max(float(atr), price * 0.01)
        stop_distance = atr * (1.8 if bullish_probability >= 0.55 else 1.2)
        reward_multiple = 3.0 if confidence >= 80 else 2.2 if confidence >= 65 else 1.5
        stop_loss = price - stop_distance
        take_profit = price + stop_distance * reward_multiple
        target_price = price * (1 + (bullish_probability - 0.5) * 0.18)
        risk_pct = stop_distance / price

        if risk_pct < 0.025 and confidence >= 75:
            level = "BAJO"
            position = 0.08
        elif risk_pct < 0.05:
            level = "MEDIO"
            position = 0.05
        else:
            level = "ALTO"
            position = 0.025

        return RiskPlan(
            level=level,
            stop_loss=round(stop_loss, 2),
            take_profit=round(take_profit, 2),
            target_price=round(target_price, 2),
            risk_reward=f"1:{reward_multiple:g}",
            position_size_pct=position,
        )
