from typing import Optional, Dict, Any, List
from backend.app.strategies.base import BaseStrategy
from backend.app.schemas.signal import SignalCreate
from backend.app.core.logging import logger

class GridTradingStrategy(BaseStrategy):
    """
    Grid Trading Strategy.
    
    Places a ladder of buy and sell orders within a defined price range.
    Profits from normal market fluctuations in ranging/sideways markets.
    """

    @classmethod
    def strategy_type(cls) -> str:
        return "grid"

    def validate_parameters(self, params: Dict[str, Any]) -> bool:
        lower_price = params.get("lower_price")
        upper_price = params.get("upper_price")
        grid_levels = params.get("grid_levels", 10)
        investment_per_grid = params.get("investment_per_grid", 100.0)

        if lower_price is None or upper_price is None:
            raise ValueError("Grid strategy requires 'lower_price' and 'upper_price'")
        if lower_price >= upper_price:
            raise ValueError("'lower_price' must be strictly lower than 'upper_price'")
        if grid_levels < 2:
            raise ValueError("'grid_levels' must be at least 2")
        if investment_per_grid <= 0:
            raise ValueError("'investment_per_grid' must be positive")

        # Precompute grid boundaries
        step = (upper_price - lower_price) / (grid_levels - 1)
        self.levels = [lower_price + i * step for i in range(grid_levels)]
        self.state["grid_levels"] = self.levels
        self.state["last_grid_index"] = None
        return True

    def on_tick(self, ticker: Dict[str, Any]) -> Optional[SignalCreate]:
        current_price = ticker.get("last_price") or ticker.get("close")
        if not current_price:
            return None

        # Determine nearest grid level
        closest_idx = min(range(len(self.levels)), key=lambda i: abs(self.levels[i] - current_price))
        last_idx = self.state.get("last_grid_index")

        if last_idx is None:
            self.state["last_grid_index"] = closest_idx
            return None

        signal = None
        # Price moved down to a lower grid level -> BUY
        if closest_idx < last_idx:
            signal = SignalCreate(
                strategy_id=self.strategy_id,
                symbol=self.symbol,
                signal_type="BUY",
                price=current_price,
                confidence=0.85,
                reason=f"Grid dip: level {closest_idx} reached from level {last_idx}",
                metadata_json={
                    "grid_level": closest_idx,
                    "target_price": self.levels[closest_idx],
                    "strategy": "grid"
                }
            )
            self.state["last_grid_index"] = closest_idx
        # Price moved up to a higher grid level -> SELL
        elif closest_idx > last_idx:
            signal = SignalCreate(
                strategy_id=self.strategy_id,
                symbol=self.symbol,
                signal_type="SELL",
                price=current_price,
                confidence=0.85,
                reason=f"Grid peak: level {closest_idx} reached from level {last_idx}",
                metadata_json={
                    "grid_level": closest_idx,
                    "target_price": self.levels[closest_idx],
                    "strategy": "grid"
                }
            )
            self.state["last_grid_index"] = closest_idx

        return signal

    def on_candle(self, candle: Dict[str, Any]) -> Optional[SignalCreate]:
        return self.on_tick({"last_price": candle.get("close")})
