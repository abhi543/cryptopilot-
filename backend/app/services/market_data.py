import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.exchange_service import exchange_service
from backend.app.services.auto_trader import auto_trader
from backend.app.strategies.registry import strategy_manager

class MarketDataBroadcaster:
    """Manages active WebSocket connections and ticker broadcasts."""

    def __init__(self):
        self._active_connections: Set[WebSocket] = set()
        self._running = False
        self._task: asyncio.Task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self._active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self._active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Remaining connections: {len(self._active_connections)}")

    async def broadcast_json(self, message: dict):
        if not self._active_connections:
            return
        dead = []
        for connection in list(self._active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self._active_connections.discard(d)

    async def start_broadcasting(self):
        if self._running:
            return
        self._running = True
        auto_trader.set_broadcaster(self)
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("Market data broadcaster & AutoTrader pipeline started.")

    async def stop_broadcasting(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Market data broadcaster stopped.")

    async def _poll_loop(self):
        while self._running:
            try:
                tickers_data = []
                monitored = exchange_service.get_monitored_pairs()
                for sym in monitored:
                    try:
                        ticker = await exchange_service.fetch_ticker(sym)
                        ticker_dict = ticker.model_dump()
                        tickers_data.append(ticker_dict)

                        # 1. Multi-Pair Universal Bot Engine: Evaluates ALL pairs simultaneously!
                        if auto_trader.enabled:
                            asyncio.create_task(auto_trader.evaluate_ticker(ticker_dict))

                        # 2. Also evaluate any custom user-configured strategies
                        for s_id, strat in strategy_manager._instances.items():
                            if strat.symbol == sym:
                                sig = strat.on_tick(ticker_dict)
                                if sig:
                                    # Broadcast signal
                                    await self.broadcast_json({
                                        "type": "NEW_SIGNAL",
                                        "data": sig.model_dump()
                                    })
                                    # Trigger Autonomous Continuous Execution
                                    asyncio.create_task(auto_trader.handle_signal(sig))
                    except Exception as e:
                        logger.debug(f"Tick fetch skipped for {sym}: {e}")

                if tickers_data:
                    await self.broadcast_json({
                        "type": "TICKER_UPDATE",
                        "data": tickers_data
                    })
            except Exception as e:
                logger.error(f"Error in market broadcaster loop: {e}")
            await asyncio.sleep(settings.WS_REFRESH_INTERVAL_SEC)

market_broadcaster = MarketDataBroadcaster()
