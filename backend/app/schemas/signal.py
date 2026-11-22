from datetime import datetime
from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

SignalType = Literal["BUY", "SELL", "HOLD"]
SignalStatus = Literal["PENDING", "EXECUTED", "CANCELLED", "EXPIRED"]

class SignalBase(BaseModel):
    strategy_id: str
    symbol: str
    signal_type: SignalType
    price: float = Field(..., gt=0)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    reason: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

class SignalCreate(SignalBase):
    pass

class SignalResponse(SignalBase):
    id: str
    status: SignalStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
