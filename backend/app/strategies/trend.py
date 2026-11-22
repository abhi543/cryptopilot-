from typing import Optional, Dict, Any, List
from collections import deque
from backend.app.strategies.base import BaseStrategy
from backend.app.schemas.signal import SignalCreate
from backend.app.core.logging import logger

class TrendFollowingStrategy(BaseStrategy):
    """
    Trend Following Strategy (Moving Average Crossover & Momentum).
    
    Generates BUY signals when short-term momentum rises above long-term trend,
    and SELL / EXIT signals when the trend reverses downward.
    """

    @classmethod
    def strategy_type(cls) -> str:
        return "trend"

    def validate_parameters(self, params: Dict[str, Any]) -> bool:
        fast_period = params.get("fast_period", 9)
        slow_period = params.get("slow_period", 21)

        if fast_period <= 0 or slow_period <= 0:
            raise ValueError("Moving average periods must be positive integers")
        if fast_period >= slow_period:
            raise ValueError("'fast_period' must be strictly less than 'slow_period'")

        self.fast_period = int(fast_period)
        self.slow_period = int(slow_period)
        self.prices: deque = deque(maxlen=self.slow_period + 5)
        self.state["fast_ma"] = None
        self.state["slow_ma"] = None
        self.state["last_cross"] = None # 'bullish' | 'bearish'
        return True

    def _calc_ma(self, period: int) -> Optional[float]:
        if len(self.prices) < period:
            return None
        recent = list(self.prices)[-period:]
        return sum(recent) / period

    def on_tick(self, ticker: Dict[str, Any]) -> Optional[SignalCreate]:
        price = ticker.get("last_price") or ticker.get("close")
        if not price:
            return None

        self.prices.append(price)
        fast_ma = self._calc_ma(self.fast_period)
        slow_ma = self._calc_ma(self.slow_period)

        if fast_ma is None or slow_ma is None:
            return None

        self.state["fast_ma"] = fast_ma
        self.state["slow_ma"] = slow_ma
        last_cross = self.state.get("last_cross")

        signal = None
        if fast_ma > slow_ma and last_cross != "bullish":
            self.state["last_cross"] = "bullish"
            signal = SignalCreate(
                strategy_id=self.strategy_id,
                symbol=self.symbol,
                signal_type="BUY",
                price=price,
                confidence=0.88,
                reason=f"Golden Cross: Fast MA ({fast_ma:.2f}) crossed above Slow MA ({slow_ma:.2f})",
                metadata_json={
                    "fast_ma": fast_ma,
                    "slow_ma": slow_ma,
                    "strategy": "trend"
                }
            )
        elif fast_ma < slow_ma and last_cross != "bearish":
            self.state["last_cross"] = "bearish"
            signal = SignalCreate(
                strategy_id=self.strategy_id,
                symbol=self.symbol,
                signal_type="SELL",
                price=price,
                confidence=0.88,
                reason=f"Death Cross: Fast MA ({fast_ma:.2f}) crossed below Slow MA ({slow_ma:.2f})",
                metadata_json={
                    "fast_ma": fast_ma,
                    "slow_ma": slow_ma,
                    "strategy": "trend"
                }
            )

        return signal

    def on_candle(self, candle: Dict[str, Any]) -> Optional[SignalCreate]:
        return self.on_tick({"last_price": candle.get("close")})
