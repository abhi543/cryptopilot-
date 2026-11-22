from datetime import datetime
from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

StrategyType = Literal["grid", "trend", "breakout"]
StrategyStatus = Literal["draft", "active", "paused", "stopped"]

class StrategyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    strategy_type: StrategyType
    symbol: str = Field(..., example="BTC/USDT")
    parameters: Dict[str, Any] = Field(default_factory=dict)
    allocated_capital: float = Field(default=0.0, ge=0.0)

class StrategyCreate(StrategyBase):
    pass

class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    allocated_capital: Optional[float] = None
    status: Optional[StrategyStatus] = None

class StrategyResponse(StrategyBase):
    id: str
    user_id: Optional[str] = None
    status: StrategyStatus
    current_capital: float
    total_pnl: float
    win_rate: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
