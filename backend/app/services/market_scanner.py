import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import websockets
from sqlalchemy import select, and_
from backend.app.db.session import AsyncSessionLocal
from backend.app.models.market_candle import MarketCandle
from backend.app.schemas.scanner import (
    MarketScanItem,
    MarketScanResponse,
    ScannerTimeframe,
    TrendIndicator,
    FeedSource,
)
from backend.app.services.exchange_service import exchange_service
from backend.app.core.logging import logger

ASSET_NAMES: Dict[str, str] = {
    "BTC/USDT": "Bitcoin",
    "ETH/USDT": "Ethereum",
    "SOL/USDT": "Solana",
    "BNB/USDT": "BNB",
    "XRP/USDT": "Ripple",
    "DOGE/USDT": "Dogecoin",
    "ADA/USDT": "Cardano",
    "AVAX/USDT": "Avalanche",
    "LINK/USDT": "Chainlink",
    "NEAR/USDT": "NEAR Protocol",
    "SUI/USDT": "Sui Network",
    "APT/USDT": "Aptos",
    "RENDER/USDT": "Render",
    "PEPE/USDT": "Pepe",
    "SHIB/USDT": "Shiba Inu",
}

VALID_TIMEFRAMES: List[ScannerTimeframe] = ["5m", "15m", "1h", "4h", "1d"]

class MarketScannerService:
    """
    Cryptocurrency Market Scanner Service.
    
    Streams real-time market data across multiple timeframes (5m, 15m, 1h, 4h, 1d),
    calculates trend momentum, stores deduplicated historical candles, and manages
    monitored cryptocurrency pairs.
    """

    def __init__(self):
        self._monitored_pairs: List[str] = [
            "BTC/USDT",
            "ETH/USDT",
            "SOL/USDT",
            "BNB/USDT",
            "XRP/USDT",
            "DOGE/USDT",
        ]
        self._live_ticker_cache: Dict[str, Dict[str, Any]] = {}
        self._candle_cache: Dict[str, Dict[str, List[Any]]] = {} # symbol -> timeframe -> list of candles
        self._last_successful_update: float = time.time()
        self._connection_source: FeedSource = "REST_POLLING"
        self._running: bool = False
        self._ws_task: Optional[asyncio.Task] = None
        self._rest_sync_task: Optional[asyncio.Task] = None

    def get_monitored_pairs(self) -> List[str]:
        return list(self._monitored_pairs)

    async def add_pair(self, symbol: str) -> bool:
        symbol = symbol.upper().strip()
        if not symbol.endswith("/USDT") and "/" not in symbol:
            symbol = f"{symbol}/USDT"

        if symbol in self._monitored_pairs:
            return True

        valid = await exchange_service.validate_symbol(symbol)
        if not valid:
            raise ValueError(f"Trading pair '{symbol}' is not a valid active spot pair on Binance.")

        self._monitored_pairs.append(symbol)
        # Pre-warm ticker
        try:
            t = await exchange_service.fetch_ticker(symbol)
            self._live_ticker_cache[symbol] = t.model_dump()
        except Exception as e:
            logger.warning(f"Scanner: Prewarm for {symbol} failed: {e}")

        logger.info(f"Scanner: Added pair '{symbol}' (Total: {len(self._monitored_pairs)})")
        return True

    def remove_pair(self, symbol: str) -> bool:
        symbol = symbol.upper().strip()
        if symbol in self._monitored_pairs:
            if len(self._monitored_pairs) <= 1:
                raise ValueError("Scanner must keep at least one monitored pair.")
            self._monitored_pairs.remove(symbol)
            self._live_ticker_cache.pop(symbol, None)
            logger.info(f"Scanner: Removed pair '{symbol}'")
            return True
        return False

    async def start(self):
        if self._running:
            return
        self._running = True
        self._ws_task = asyncio.create_task(self._binance_ws_loop())
        self._rest_sync_task = asyncio.create_task(self._periodic_candle_sync())
        logger.info("MarketScannerService background sync started.")

    async def stop(self):
        self._running = False
        if self._ws_task:
            self._ws_task.cancel()
        if self._rest_sync_task:
            self._rest_sync_task.cancel()
        logger.info("MarketScannerService stopped.")

    async def _binance_ws_loop(self):
        """Connect to Binance WebSocket miniTicker stream for real-time live price pushing."""
        uri = "wss://stream.binance.com:9443/ws/!miniTicker@arr"
        while self._running:
            try:
                logger.info(f"Scanner: Connecting to exchange WebSocket stream: {uri}")
                async with websockets.connect(uri, ping_interval=20, ping_timeout=10) as ws:
                    self._connection_source = "LIVE_WEBSOCKET"
                    logger.info("Scanner: Connected to live Binance WebSocket stream.")

                    while self._running:
                        msg = await ws.recv()
                        data = json.loads(msg)
                        # Array of miniTickers: s=symbol, c=close, h=high, l=low, v=volume, q=quoteVolume
                        for item in data:
                            raw_sym = item.get("s", "")
                            # Map e.g. BTCUSDT -> BTC/USDT
                            for mon in self._monitored_pairs:
                                if raw_sym == mon.replace("/", ""):
                                    last_p = float(item.get("c", 0.0))
                                    high_p = float(item.get("h", 0.0))
                                    low_p = float(item.get("l", 0.0))
                                    vol = float(item.get("q", 0.0)) # Quote volume in USDT
                                    open_p = float(item.get("o", last_p))
                                    chg = last_p - open_p
                                    pct = ((last_p - open_p) / open_p * 100.0) if open_p > 0 else 0.0

                                    self._live_ticker_cache[mon] = {
                                        "symbol": mon,
                                        "last_price": last_p,
                                        "high_24h": high_p,
                                        "low_24h": low_p,
                                        "volume_24h": vol,
                                        "change_24h": chg,
                                        "percentage_24h": pct,
                                        "timestamp": int(item.get("E", time.time() * 1000)),
                                    }
                                    self._last_successful_update = time.time()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._connection_source = "REST_POLLING"
                logger.warning(f"Scanner: Exchange WebSocket interrupted ({e}). Falling back to REST API. Reconnecting in 5s...")
                await asyncio.sleep(5)

    async def _periodic_candle_sync(self):
        """Fetch and store historical OHLCV data into the database with duplicate prevention."""
        while self._running:
            try:
                for symbol in list(self._monitored_pairs):
                    for tf in VALID_TIMEFRAMES:
                        await self.sync_and_store_candles(symbol, tf, limit=50)
                        await asyncio.sleep(0.2) # Rate limit pacing
                self._last_successful_update = time.time()
            except Exception as e:
                logger.error(f"Scanner: Error in periodic candle sync: {e}")
            await asyncio.sleep(60) # Sync candles every 60 seconds

    async def sync_and_store_candles(self, symbol: str, timeframe: ScannerTimeframe, limit: int = 50) -> List[Any]:
        """Fetch live OHLCV from exchange and store in database, strictly preventing duplicate candles."""
        try:
            candles = await exchange_service.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            if not candles:
                return []

            # Cache in memory for quick trend calculations
            if symbol not in self._candle_cache:
                self._candle_cache[symbol] = {}
            self._candle_cache[symbol][timeframe] = candles

            # Deduplicated database insert
            async with AsyncSessionLocal() as session:
                # Query existing timestamps in range
                min_ts = min(c.timestamp for c in candles)
                max_ts = max(c.timestamp for c in candles)

                stmt = select(MarketCandle.timestamp).where(
                    and_(
                        MarketCandle.symbol == symbol,
                        MarketCandle.timeframe == timeframe,
                        MarketCandle.timestamp >= min_ts,
                        MarketCandle.timestamp <= max_ts,
                    )
                )
                res = await session.execute(stmt)
                existing_timestamps = set(res.scalars().all())

                new_count = 0
                for c in candles:
                    if c.timestamp not in existing_timestamps:
                        db_candle = MarketCandle(
                            symbol=symbol,
                            timeframe=timeframe,
                            timestamp=c.timestamp,
                            open=c.open,
                            high=c.high,
                            low=c.low,
                            close=c.close,
                            volume=c.volume,
                        )
                        session.add(db_candle)
                        existing_timestamps.add(c.timestamp)
                        new_count += 1

                if new_count > 0:
                    await session.commit()
                    logger.debug(f"Scanner: Stored {new_count} new candles for {symbol} ({timeframe})")

            return candles
        except Exception as e:
            logger.warning(f"Scanner: Could not sync candles for {symbol} {timeframe}: {e}")
            return []

    async def scan_markets(self, timeframe: ScannerTimeframe = "1h") -> MarketScanResponse:
        """
        Produce a comprehensive live scan across all monitored cryptocurrencies.
        Never invents missing prices: strictly reports real exchange data.
        """
        items: List[MarketScanItem] = []

        for symbol in self._monitored_pairs:
            # 1. Ticker price from live cache or fallback to exchange REST fetch
            ticker_data = self._live_ticker_cache.get(symbol)
            if not ticker_data:
                try:
                    t = await exchange_service.fetch_ticker(symbol)
                    ticker_data = t.model_dump()
                    self._live_ticker_cache[symbol] = ticker_data
                except Exception as e:
                    logger.error(f"Scanner: Unable to retrieve real price for {symbol}: {e}")
                    continue # Strict rule: Never invent missing prices

            cur_price = float(ticker_data["last_price"])
            chg_24h = float(ticker_data.get("change_24h", 0.0))
            pct_24h = float(ticker_data.get("percentage_24h", 0.0))
            vol_24h = float(ticker_data.get("volume_24h", 0.0))
            h_24h = float(ticker_data.get("high_24h", cur_price))
            l_24h = float(ticker_data.get("low_24h", cur_price))
            ts = int(ticker_data.get("timestamp", int(time.time() * 1000)))

            # 2. Timeframe calculations & Trend Indicator
            candles = self._candle_cache.get(symbol, {}).get(timeframe)
            if not candles:
                # Synchronize now if cache empty
                candles = await self.sync_and_store_candles(symbol, timeframe, limit=30)

            tf_change_pct = pct_24h
            tf_high = h_24h
            tf_low = l_24h
            trend: TrendIndicator = "NEUTRAL"
            trend_score = 0.0

            if candles and len(candles) >= 2:
                latest_c = candles[-1]
                first_c = candles[0]
                tf_high = max(c.high for c in candles[-10:]) if len(candles) >= 10 else latest_c.high
                tf_low = min(c.low for c in candles[-10:]) if len(candles) >= 10 else latest_c.low
                
                # Timeframe price change from latest candle open
                if latest_c.open > 0:
                    tf_change_pct = ((cur_price - latest_c.open) / latest_c.open) * 100.0

                # Trend Calculation: Moving average (SMA20) comparison & Momentum
                closes = [c.close for c in candles]
                sma20 = sum(closes[-20:]) / len(closes[-20:]) if len(closes) >= 20 else sum(closes) / len(closes)
                trend_score = ((cur_price - sma20) / sma20 * 100.0) if sma20 > 0 else 0.0

                if cur_price > sma20 and tf_change_pct > 0.05:
                    trend = "BULLISH"
                elif cur_price < sma20 and tf_change_pct < -0.05:
                    trend = "BEARISH"
                else:
                    trend = "NEUTRAL"

            name = ASSET_NAMES.get(symbol, symbol.split("/")[0])

            items.append(
                MarketScanItem(
                    symbol=symbol,
                    name=name,
                    price=cur_price,
                    change_24h=chg_24h,
                    percentage_24h=pct_24h,
                    volume_24h=vol_24h,
                    high_24h=h_24h,
                    low_24h=l_24h,
                    timeframe=timeframe,
                    timeframe_change_pct=round(tf_change_pct, 2),
                    timeframe_high=tf_high,
                    timeframe_low=tf_low,
                    trend_indicator=trend,
                    trend_score=round(trend_score, 2),
                    market_timestamp=ts,
                    last_updated_at=datetime.fromtimestamp(self._last_successful_update, tz=timezone.utc).isoformat(),
                    feed_source=self._connection_source,
                )
            )

        return MarketScanResponse(
            timeframe=timeframe,
            last_successful_update=datetime.fromtimestamp(self._last_successful_update, tz=timezone.utc).strftime("%H:%M:%S UTC"),
            connection_status=self._connection_source,
            monitored_count=len(items),
            items=items,
        )

market_scanner = MarketScannerService()
