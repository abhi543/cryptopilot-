from typing import List, Literal, Optional
from pydantic import BaseModel, Field

ScannerTimeframe = Literal["5m", "15m", "1h", "4h", "1d"]
TrendIndicator = Literal["BULLISH", "BEARISH", "NEUTRAL"]
FeedSource = Literal["LIVE_WEBSOCKET", "REST_POLLING"]

class MarketScanItem(BaseModel):
    symbol: str
    name: str
    price: float
    change_24h: float
    percentage_24h: float
    volume_24h: float
    high_24h: float
    low_24h: float
    timeframe: ScannerTimeframe
    timeframe_change_pct: float
    timeframe_high: float
    timeframe_low: float
    trend_indicator: TrendIndicator
    trend_score: float
    market_timestamp: int
    last_updated_at: str
    feed_source: FeedSource

class MarketScanResponse(BaseModel):
    timeframe: ScannerTimeframe
    last_successful_update: str
    connection_status: str
    monitored_count: int
    items: List[MarketScanItem]

class AddPairRequest(BaseModel):
    symbol: str

class CandleQuery(BaseModel):
    symbol: str
    timeframe: ScannerTimeframe = "1h"
    limit: int = Field(default=100, ge=10, le=500)
