import pytest
from backend.app.strategies.grid import GridTradingStrategy
from backend.app.strategies.trend import TrendFollowingStrategy
from backend.app.strategies.breakout import BreakoutTradingStrategy
from backend.app.strategies.registry import strategy_manager

def test_grid_strategy_signals():
    params = {
        "lower_price": 100.0,
        "upper_price": 200.0,
        "grid_levels": 5,
        "investment_per_grid": 50.0
    }
    grid = GridTradingStrategy(strategy_id="test-grid-1", symbol="BTC/USDT", parameters=params)
    assert len(grid.levels) == 5

    # First tick establishes position
    sig1 = grid.on_tick({"last_price": 150.0})
    assert sig1 is None

    # Price drops to lower grid level -> BUY
    sig2 = grid.on_tick({"last_price": 125.0})
    assert sig2 is not None
    assert sig2.signal_type == "BUY"

    # Price rebounds up -> SELL
    sig3 = grid.on_tick({"last_price": 175.0})
    assert sig3 is not None
    assert sig3.signal_type == "SELL"

def test_trend_strategy_crossover():
    params = {"fast_period": 2, "slow_period": 4}
    trend = TrendFollowingStrategy(strategy_id="test-trend-1", symbol="ETH/USDT", parameters=params)

    # Feed rising prices
    for p in [100.0, 102.0, 104.0, 106.0, 110.0]:
        sig = trend.on_tick({"last_price": p})
    
    # Should establish bullish state
    assert trend.state.get("last_cross") == "bullish"

def test_breakout_strategy():
    params = {"lookback_period": 5, "volume_threshold_factor": 1.0}
    breakout = BreakoutTradingStrategy(strategy_id="test-break-1", symbol="SOL/USDT", parameters=params)

    # Feed 5 candles within 100-110 range
    for p in [100.0, 105.0, 102.0, 108.0, 106.0]:
        breakout.on_candle({"high": p + 2, "low": p - 2, "close": p, "volume": 100.0})

    # Breakout candle above 110 with volume surge
    sig = breakout.on_candle({"high": 120.0, "low": 109.0, "close": 118.0, "volume": 250.0})
    assert sig is not None
    assert sig.signal_type == "BUY"
    assert "Bullish Breakout" in sig.reason

def test_strategy_manager():
    types = strategy_manager.get_registered_types()
    assert "grid" in types
    assert "trend" in types
    assert "breakout" in types
