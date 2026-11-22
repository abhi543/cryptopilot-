from typing import Optional, Dict, Any, List
from collections import deque
from backend.app.strategies.base import BaseStrategy
from backend.app.schemas.signal import SignalCreate
from backend.app.core.logging import logger

class BreakoutTradingStrategy(BaseStrategy):
    """
    Breakout Trading Strategy.
    
    Monitors highest high and lowest low over a lookback window.
    Emits BUY when price breaks above recent resistance,
    and SELL when price breaches recent support.
    """

    @classmethod
    def strategy_type(cls) -> str:
        return "breakout"

    def validate_parameters(self, params: Dict[str, Any]) -> bool:
        lookback = params.get("lookback_period", 20)
        volume_factor = params.get("volume_threshold_factor", 1.2)

        if lookback < 5:
            raise ValueError("'lookback_period' must be at least 5")
        if volume_factor <= 0:
            raise ValueError("'volume_threshold_factor' must be positive")

        self.lookback = int(lookback)
        self.volume_factor = float(volume_factor)
        self.highs: deque = deque(maxlen=self.lookback)
        self.lows: deque = deque(maxlen=self.lookback)
        self.volumes: deque = deque(maxlen=self.lookback)
        self.state["resistance"] = None
        self.state["support"] = None
        return True

    def on_candle(self, candle: Dict[str, Any]) -> Optional[SignalCreate]:
        high = candle.get("high")
        low = candle.get("low")
        close = candle.get("close")
        volume = candle.get("volume", 0)

        if high is None or low is None or close is None:
            return None

        signal = None

        if len(self.highs) >= self.lookback:
            resistance = max(self.highs)
            support = min(self.lows)
            avg_volume = sum(self.volumes) / len(self.volumes) if self.volumes else 1.0

            self.state["resistance"] = resistance
            self.state["support"] = support

            # Resistance breakout
            if close > resistance and volume >= (avg_volume * self.volume_factor):
                signal = SignalCreate(
                    strategy_id=self.strategy_id,
                    symbol=self.symbol,
                    signal_type="BUY",
                    price=close,
                    confidence=0.92,
                    reason=f"Bullish Breakout: Price {close:.2f} broke resistance {resistance:.2f} on {volume:.1f} volume",
                    metadata_json={
                        "breakout_type": "resistance_break",
                        "resistance": resistance,
                        "support": support,
                        "volume_ratio": volume / avg_volume if avg_volume > 0 else 1.0,
                        "strategy": "breakout"
                    }
                )
            # Support breakdown
            elif close < support:
                signal = SignalCreate(
                    strategy_id=self.strategy_id,
                    symbol=self.symbol,
                    signal_type="SELL",
                    price=close,
                    confidence=0.90,
                    reason=f"Bearish Breakdown: Price {close:.2f} breached support {support:.2f}",
                    metadata_json={
                        "breakout_type": "support_break",
                        "resistance": resistance,
                        "support": support,
                        "strategy": "breakout"
                    }
                )

        self.highs.append(high)
        self.lows.append(low)
        self.volumes.append(volume)
        return signal

    def on_tick(self, ticker: Dict[str, Any]) -> Optional[SignalCreate]:
        # Form simulated candle from ticker tick
        price = ticker.get("last_price") or ticker.get("close")
        if not price:
            return None
        return self.on_candle({
            "high": price,
            "low": price,
            "close": price,
            "volume": ticker.get("volume", 10.0)
        })
