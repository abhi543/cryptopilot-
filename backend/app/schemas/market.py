from typing import List, Optional
from pydantic import BaseModel

class Ticker(BaseModel):
    symbol: str
    last_price: float
    high_24h: float
    low_24h: float
    volume_24h: float
    change_24h: float
    percentage_24h: float
    timestamp: int

class OHLCV(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class Position(BaseModel):
    symbol: str
    asset: str
    side: str = "LONG"  # "LONG" | "SHORT"
    amount: float
    entry_price: float
    current_price: float
    position_value: float
    leverage: int = 10
    margin: float = 0.0
    liquidation_price: Optional[float] = None
    unrealized_pnl: float = 0.0
    unrealized_pnl_pct: float = 0.0  # ROE %
    source: Optional[str] = "bot"

class ClosePositionRequest(BaseModel):
    symbol: str
    position_side: Optional[str] = None
    source: Optional[str] = "manual"

class MarketOverview(BaseModel):
    exchange: str
    market_type: str = "futures"
    tickers: List[Ticker]
    active_strategies_count: int
    total_paper_balance: float
    available_margin: float = 0.0
    total_unrealized_pnl: float
