from typing import Dict, Type, Optional, Any
from sqlalchemy import select
from backend.app.strategies.base import BaseStrategy
from backend.app.strategies.grid import GridTradingStrategy
from backend.app.strategies.trend import TrendFollowingStrategy
from backend.app.strategies.breakout import BreakoutTradingStrategy
from backend.app.core.logging import logger

STRATEGY_CLASSES: Dict[str, Type[BaseStrategy]] = {
    "grid": GridTradingStrategy,
    "trend": TrendFollowingStrategy,
    "breakout": BreakoutTradingStrategy,
}

class StrategyManager:
    """Manages active in-memory strategy instances and lifecycle."""

    def __init__(self):
        self._instances: Dict[str, BaseStrategy] = {}

    def get_registered_types(self) -> list[str]:
        return list(STRATEGY_CLASSES.keys())

    def create(self, strategy_type: str, strategy_id: str, symbol: str, parameters: Dict[str, Any]) -> BaseStrategy:
        if strategy_type not in STRATEGY_CLASSES:
            raise ValueError(f"Unknown strategy type '{strategy_type}'. Available: {list(STRATEGY_CLASSES.keys())}")
        
        cls = STRATEGY_CLASSES[strategy_type]
        instance = cls(strategy_id=strategy_id, symbol=symbol, parameters=parameters)
        self._instances[strategy_id] = instance
        return instance

    def get(self, strategy_id: str) -> Optional[BaseStrategy]:
        return self._instances.get(strategy_id)

    def remove(self, strategy_id: str) -> Optional[BaseStrategy]:
        return self._instances.pop(strategy_id, None)

    def list_active(self) -> Dict[str, Dict[str, Any]]:
        return {s_id: inst.get_state() for s_id, inst in self._instances.items()}

    async def restore_active_from_db(self):
        """Restore all active strategies from the database into in-memory execution."""
        from backend.app.db.session import AsyncSessionLocal
        from backend.app.models.strategy import Strategy
        from backend.app.services.exchange_service import exchange_service

        try:
            async with AsyncSessionLocal() as session:
                stmt = select(Strategy).where(Strategy.status == "active")
                res = await session.execute(stmt)
                active_strats = res.scalars().all()

                for s in active_strats:
                    if s.strategy_type in STRATEGY_CLASSES:
                        inst = self.create(
                            strategy_type=s.strategy_type,
                            strategy_id=s.id,
                            symbol=s.symbol,
                            parameters=s.parameters
                        )
                        # Warm up price history with recent candles so indicators can signal immediately
                        try:
                            candles = await exchange_service.fetch_ohlcv(s.symbol, "1h", limit=30)
                            for c in candles:
                                inst.on_candle(c.model_dump())
                            logger.info(f"Restored and warmed up active strategy {s.id} ({s.name}) for {s.symbol}")
                        except Exception as warm_err:
                            logger.debug(f"Warmup error for strategy {s.id}: {warm_err}")
                logger.info(f"StrategyManager restored {len(self._instances)} active strategies from database.")
        except Exception as e:
            logger.warning(f"Failed to restore active strategies from DB: {e}")

strategy_manager = StrategyManager()

