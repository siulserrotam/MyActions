import math
from dataclasses import dataclass
from typing import Literal


AssetCategory = Literal["favorites", "forex", "indices", "commodities", "crypto", "stocks"]
Direction = Literal["LONG", "SHORT"]


@dataclass(frozen=True)
class AssetConfig:
    symbol: str
    name: str
    category: AssetCategory
    multiplier: float


class DecisionEngineService:
    assets: dict[str, AssetConfig] = {
        "TSM.US": AssetConfig("TSM.US", "Taiwan Semiconductor CFD", "stocks", 1),
        "NVDA.US": AssetConfig("NVDA.US", "NVIDIA CFD", "stocks", 1),
        "AMD.US": AssetConfig("AMD.US", "AMD CFD", "stocks", 1),
        "AAPL.US": AssetConfig("AAPL.US", "Apple CFD", "stocks", 1),
        "MSFT.US": AssetConfig("MSFT.US", "Microsoft CFD", "stocks", 1),
        "GOOGL.US": AssetConfig("GOOGL.US", "Alphabet CFD", "stocks", 1),
        "AMZN.US": AssetConfig("AMZN.US", "Amazon CFD", "stocks", 1),
        "META.US": AssetConfig("META.US", "Meta Platforms CFD", "stocks", 1),
        "TSLA.US": AssetConfig("TSLA.US", "Tesla CFD", "stocks", 1),
        "SPY.US": AssetConfig("SPY.US", "SPY ETF CFD", "stocks", 1),
        "QQQ.US": AssetConfig("QQQ.US", "QQQ ETF CFD", "stocks", 1),
        "EURUSD": AssetConfig("EURUSD", "Euro / US Dollar", "forex", 100_000),
        "GBPUSD": AssetConfig("GBPUSD", "British Pound / US Dollar", "forex", 100_000),
        "USDJPY": AssetConfig("USDJPY", "US Dollar / Yen", "forex", 100_000),
        "US100": AssetConfig("US100", "Nasdaq 100 CFD", "indices", 1),
        "US500": AssetConfig("US500", "S&P 500 CFD", "indices", 1),
        "DE40": AssetConfig("DE40", "DAX 40 CFD", "indices", 1),
        "GOLD": AssetConfig("GOLD", "Gold CFD", "commodities", 100),
        "OIL": AssetConfig("OIL", "Oil CFD", "commodities", 1_000),
        "NATGAS": AssetConfig("NATGAS", "Natural Gas CFD", "commodities", 10_000),
        "BTCUSD": AssetConfig("BTCUSD", "Bitcoin CFD", "crypto", 1),
        "ETHUSD": AssetConfig("ETHUSD", "Ethereum CFD", "crypto", 1),
    }

    def universe(self) -> dict[str, object]:
        grouped: dict[str, list[dict[str, object]]] = {
            "favorites": [],
            "forex": [],
            "indices": [],
            "commodities": [],
            "crypto": [],
            "stocks": [],
        }
        favorite_symbols = {"TSM.US", "NVDA.US", "US100", "GOLD", "BTCUSD"}
        for asset in self.assets.values():
            payload = self._asset_payload(asset)
            grouped[asset.category].append(payload)
            if asset.symbol in favorite_symbols:
                grouped["favorites"].append(payload)
        return {"groups": grouped, "count": len(self.assets)}

    def calculate(
        self,
        symbol: str,
        direction: Direction,
        account_balance: float,
        risk_pct: float,
        entry_price: float,
        stop_price: float,
        take_profit_price: float | None = None,
        requested_volume: float | None = None,
    ) -> dict[str, object]:
        asset = self.resolve(symbol)
        normalized_risk_pct = min(max(float(risk_pct), 0.25), 1.0)
        risk_amount = round(account_balance * (normalized_risk_pct / 100), 2)
        distance = abs(entry_price - stop_price)
        if distance <= 0:
            raise ValueError("La entrada y el stop no pueden ser iguales.")
        raw_volume = risk_amount / (distance * asset.multiplier)
        capital_volume = account_balance / (entry_price * asset.multiplier)
        auto_volume = self._round_volume(raw_volume, asset.category)
        volume = self._round_requested_volume(requested_volume, asset.category) if requested_volume else auto_volume
        volume_basis = "manual" if requested_volume else "riesgo"
        order_type = "BUY STOP" if direction == "LONG" else "SELL STOP"
        take_profit = take_profit_price
        if take_profit is None:
            reward_distance = distance * 2
            take_profit = entry_price + reward_distance if direction == "LONG" else entry_price - reward_distance
        expected_loss = round(distance * asset.multiplier * volume, 2)
        expected_profit = round(abs(take_profit - entry_price) * asset.multiplier * volume, 2)
        position_value = round(entry_price * asset.multiplier * volume, 2)
        capital_usage_pct = round((position_value / account_balance) * 100, 2) if account_balance > 0 else 0
        risk_ok = expected_loss <= risk_amount

        return {
            "asset": self._asset_payload(asset),
            "direction": direction,
            "order_type": order_type,
            "simple_order_explanation": (
                "Compra si rompe hacia arriba." if direction == "LONG" else "Vende si rompe hacia abajo."
            ),
            "entry_price": round(entry_price, 5),
            "stop_loss": round(stop_price, 5),
            "take_profit": round(take_profit, 5),
            "account_balance": round(account_balance, 2),
            "risk_pct": round(normalized_risk_pct, 4),
            "risk_amount": risk_amount,
            "multiplier": asset.multiplier,
            "raw_volume": round(raw_volume, 8),
            "capital_volume": round(capital_volume, 8),
            "auto_volume": auto_volume,
            "requested_volume": volume if requested_volume else None,
            "volume_basis": volume_basis,
            "volume": volume,
            "position_value": position_value,
            "capital_usage_pct": capital_usage_pct,
            "expected_loss": expected_loss,
            "expected_profit": expected_profit,
            "risk_ok": risk_ok,
            "risk_excess": round(max(expected_loss - risk_amount, 0), 2),
            "risk_reward": self._risk_reward(expected_loss, expected_profit),
            "warnings": self._warnings(asset, direction),
        }

    def resolve(self, symbol: str) -> AssetConfig:
        normalized = symbol.upper().strip()
        if normalized in self.assets:
            return self.assets[normalized]
        if normalized.endswith(".US"):
            return AssetConfig(normalized, f"{normalized} CFD", "stocks", 1)
        raise ValueError("Activo no soportado todavia en el motor.")

    def _warnings(self, asset: AssetConfig, direction: Direction) -> list[dict[str, str]]:
        warnings: list[dict[str, str]] = []
        if direction == "SHORT":
            warnings.append(
                {
                    "level": "danger",
                    "message": (
                        f"ATENCION: Esta es una operacion bajista. Abre la pestana {asset.symbol} [CFD] "
                        "en XTB. NUNCA uses la pestana de Acciones Reales."
                    ),
                }
            )
        if asset.category in {"forex", "crypto"}:
            warnings.append(
                {
                    "level": "info",
                    "message": "APALANCAMIENTO ALTO: Verifica el spread en XTB antes de activar.",
                }
            )
        return warnings

    def _asset_payload(self, asset: AssetConfig) -> dict[str, object]:
        return {
            "symbol": asset.symbol,
            "name": asset.name,
            "category": asset.category,
            "multiplier": asset.multiplier,
        }

    def _round_volume(self, volume: float, category: AssetCategory) -> float:
        if category == "stocks":
            return float(math.floor(volume))
        if category == "forex":
            return round(volume, 3)
        if category in {"commodities", "crypto", "indices"}:
            return round(volume, 3)
        return round(volume, 3)

    def _round_requested_volume(self, volume: float, category: AssetCategory) -> float:
        if category == "stocks":
            return float(math.floor(volume))
        return round(volume, 3)

    def _risk_reward(self, loss: float, profit: float) -> str:
        if loss <= 0:
            return "N/A"
        return f"1:{round(profit / loss, 2)}"
