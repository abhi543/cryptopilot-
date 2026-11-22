from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from backend.app.schemas.signal import SignalCreate
from backend.app.core.logging import logger

class BaseStrategy(ABC):
    """
    Abstract Base Class for all CryptoPilot trading strategies.
    
    Encapsulates strategy parameters, state, and signal generation.
    Strictly isolated from exchange order execution and frontend UI.
    """
    def __init__(self, strategy_id: str, symbol: str, parameters: Dict[str, Any]):
        self.strategy_id = strategy_id
        self.symbol = symbol
        self.parameters = parameters
        self.state: Dict[str, Any] = {}
        self.validate_parameters(parameters)
        logger.info(f"Initialized strategy '{self.strategy_type()}' [{strategy_id}] for {symbol}")

    @classmethod
    @abstractmethod
    def strategy_type(cls) -> str:
        """Returns the canonical name of the strategy: 'grid', 'trend', or 'breakout'."""
        pass

    @abstractmethod
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate configuration parameters for this strategy."""
        pass

    @abstractmethod
    def on_tick(self, ticker: Dict[str, Any]) -> Optional[SignalCreate]:
        """
        Evaluate real-time ticker data (price, bid, ask, volume)
        and optionally return a trading signal.
        """
        pass

    @abstractmethod
    def on_candle(self, candle: Dict[str, Any]) -> Optional[SignalCreate]:
        """
        Evaluate closed OHLCV candle data and optionally return a trading signal.
        """
        pass

    def get_state(self) -> Dict[str, Any]:
        """Return the current internal state of the strategy (for telemetry & monitoring)."""
        return {
            "strategy_id": self.strategy_id,
            "strategy_type": self.strategy_type(),
            "symbol": self.symbol,
            "parameters": self.parameters,
            "state": self.state
        }
