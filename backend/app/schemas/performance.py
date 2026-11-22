from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict

class PerformanceRecordBase(BaseModel):
    strategy_id: str
    total_equity: float = Field(..., ge=0)
    daily_pnl: float = 0.0
    cumulative_pnl: float = 0.0
    win_rate: float = Field(default=0.0, ge=0.0, le=100.0)
    total_trades: int = Field(default=0, ge=0)
    winning_trades: int = Field(default=0, ge=0)
    losing_trades: int = Field(default=0, ge=0)
    profit_factor: float = Field(default=0.0, ge=0)
    max_drawdown: float = Field(default=0.0, ge=0.0, le=100.0)
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

class PerformanceRecordCreate(PerformanceRecordBase):
    pass

class PerformanceRecordResponse(PerformanceRecordBase):
    id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
