from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.app.db.session import get_db
from backend.app.models.performance import PerformanceRecord
from backend.app.models.strategy import Strategy
from backend.app.models.trade import Trade
from backend.app.schemas.performance import PerformanceRecordResponse
from backend.app.services.exchange_service import exchange_service

router = APIRouter()

@router.get("/summary")
async def get_portfolio_summary(db: AsyncSession = Depends(get_db)) -> Any:
    """Get aggregated portfolio performance and strategy summary."""
    strat_stmt = select(
        func.count(Strategy.id).label("total_strategies"),
        func.sum(Strategy.allocated_capital).label("total_allocated"),
        func.sum(Strategy.total_pnl).label("total_pnl"),
    )
    strat_res = await db.execute(strat_stmt)
    strat_row = strat_res.one()

    trade_stmt = select(
        func.count(Trade.id).label("total_trades"),
        func.sum(Trade.cost).label("total_volume"),
        func.sum(Trade.fee).label("total_fees")
    )
    trade_res = await db.execute(trade_stmt)
    trade_row = trade_res.one()

    balances = exchange_service.get_paper_balances()
    positions = await exchange_service.get_positions()
    cash_usdt = balances.get("USDT", 0.0)
    total_margin_used = balances.get("margin_used", sum(p.margin for p in positions))
    available_margin = balances.get("available_margin", cash_usdt)
    positions_value = sum(p.position_value for p in positions)
    total_unrealized_pnl = sum(p.unrealized_pnl for p in positions)
    total_equity = cash_usdt + total_unrealized_pnl

    return {
        "total_strategies": strat_row.total_strategies or 0,
        "total_allocated_capital": float(strat_row.total_allocated or 0.0),
        "total_realized_pnl": float(strat_row.total_pnl or 0.0),
        "total_unrealized_pnl": float(total_unrealized_pnl),
        "cash_balance": float(cash_usdt),
        "available_margin": float(available_margin),
        "margin_used": float(total_margin_used),
        "positions_value": float(positions_value),
        "total_equity": float(total_equity),
        "positions_count": len(positions),
        "total_trades": trade_row.total_trades or 0,
        "total_volume": float(trade_row.total_volume or 0.0),
        "total_fees": float(trade_row.total_fees or 0.0),
        "paper_balances": balances,
        "system_status": "ONLINE",
        "trading_mode": "FUTURES",
        "market_type": "USDT-M Perpetual Futures"
    }

@router.get("/records", response_model=List[PerformanceRecordResponse])
async def list_performance_records(
    strategy_id: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get historical equity and performance timeline."""
    stmt = select(PerformanceRecord)
    if strategy_id:
        stmt = stmt.where(PerformanceRecord.strategy_id == strategy_id)
    stmt = stmt.limit(limit).order_by(PerformanceRecord.timestamp.desc())
    res = await db.execute(stmt)
    return res.scalars().all()
