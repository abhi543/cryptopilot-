from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.signal import Signal
from backend.app.schemas.signal import SignalCreate, SignalResponse
from backend.app.services.market_data import market_broadcaster
from backend.app.core.logging import logger

router = APIRouter()

@router.get("/", response_model=List[SignalResponse])
async def list_signals(
    strategy_id: Optional[str] = None,
    symbol: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve signals list."""
    stmt = select(Signal)
    if strategy_id:
        stmt = stmt.where(Signal.strategy_id == strategy_id)
    if symbol:
        stmt = stmt.where(Signal.symbol == symbol)
    stmt = stmt.offset(skip).limit(limit).order_by(Signal.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=SignalResponse, status_code=status.HTTP_201_CREATED)
async def create_signal(
    signal_in: SignalCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Register a new signal and broadcast to live subscribers."""
    db_signal = Signal(
        strategy_id=signal_in.strategy_id,
        symbol=signal_in.symbol,
        signal_type=signal_in.signal_type,
        price=signal_in.price,
        confidence=signal_in.confidence,
        reason=signal_in.reason,
        metadata_json=signal_in.metadata_json,
        status="PENDING"
    )
    db.add(db_signal)
    await db.commit()
    await db.refresh(db_signal)

    # Broadcast signal via websocket
    await market_broadcaster.broadcast_json({
        "type": "NEW_SIGNAL",
        "data": {
            "id": db_signal.id,
            "strategy_id": db_signal.strategy_id,
            "symbol": db_signal.symbol,
            "signal_type": db_signal.signal_type,
            "price": db_signal.price,
            "confidence": db_signal.confidence,
            "reason": db_signal.reason,
            "created_at": db_signal.created_at.isoformat()
        }
    })
    logger.info(f"Broadcasted signal {db_signal.id} ({db_signal.signal_type} {db_signal.symbol})")
    return db_signal
