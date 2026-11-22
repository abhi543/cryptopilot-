from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

TradeSide = Literal["BUY", "SELL", "LONG", "SHORT"]
OrderType = Literal["MARKET", "LIMIT", "STOP_LIMIT"]
TradeStatus = Literal["OPEN", "FILLED", "PARTIALLY_FILLED", "CANCELLED", "REJECTED"]

class TradeBase(BaseModel):
    strategy_id: Optional[str] = None
    signal_id: Optional[str] = None
    symbol: str
    side: str
    position_side: Optional[str] = "LONG"  # 'LONG' | 'SHORT'
    leverage: Optional[int] = 10
    margin: Optional[float] = 0.0
    liquidation_price: Optional[float] = None
    order_type: OrderType = "MARKET"
    price: float = Field(..., gt=0)
    amount: float = Field(..., gt=0)
    cost: float = Field(..., ge=0)
    fee: float = Field(default=0.0, ge=0)
    fee_currency: str = "USDT"
    exchange: str = "bybit"
    is_paper: bool = True
    source: Optional[str] = "bot"

class TradeCreate(TradeBase):
    pass

class ManualTradeRequest(BaseModel):
    symbol: str
    side: str = "BUY"
    position_side: Optional[str] = "LONG"  # 'LONG' | 'SHORT'
    leverage: Optional[int] = 10
    amount: float = Field(..., gt=0)
    order_type: OrderType = "MARKET"
    price: Optional[float] = None

class TradeResponse(TradeBase):
    id: str
    realized_pnl: float
    status: TradeStatus
    external_order_id: Optional[str] = None
    created_at: datetime
    closed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
