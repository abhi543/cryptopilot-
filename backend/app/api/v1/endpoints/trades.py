from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.trade import Trade
from backend.app.models.strategy import Strategy
from backend.app.schemas.trade import TradeCreate, TradeResponse, ManualTradeRequest
from backend.app.schemas.market import Position, ClosePositionRequest
from backend.app.services.exchange_service import exchange_service
from backend.app.services.auto_trader import auto_trader
from backend.app.core.logging import logger

router = APIRouter()

@router.post("/manual", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
async def execute_manual_trade(
    trade_in: ManualTradeRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Execute a human discretionary paper Futures trade from the manual terminal."""
    price = trade_in.price
    if not price or price <= 0:
        ticker = await exchange_service.fetch_ticker(trade_in.symbol)
        price = ticker.last_price
    if not price or price <= 0:
        raise HTTPException(status_code=400, detail=f"Could not retrieve live price for {trade_in.symbol}")

    pos_side = trade_in.position_side or ("SHORT" if trade_in.side.upper() in ["SELL", "SHORT"] else "LONG")
    leverage = trade_in.leverage or 10

    try:
        sim_result = exchange_service.execute_paper_order(
            symbol=trade_in.symbol,
            side=trade_in.side,
            amount=trade_in.amount,
            price=price,
            position_side=pos_side,
            leverage=leverage,
            source="manual"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    db_trade = Trade(
        strategy_id=None,
        signal_id=None,
        symbol=trade_in.symbol,
        side=trade_in.side,
        position_side=pos_side,
        leverage=leverage,
        margin=sim_result.get("margin", 0.0),
        liquidation_price=sim_result.get("liquidation_price"),
        order_type=trade_in.order_type,
        price=price,
        amount=trade_in.amount,
        cost=sim_result["cost"],
        fee=sim_result["fee"],
        fee_currency=sim_result["fee_currency"],
        realized_pnl=sim_result.get("realized_pnl", 0.0),
        status="FILLED",
        exchange="bybit",
        source="manual",
        is_paper=True
    )
    db.add(db_trade)
    await db.commit()
    await db.refresh(db_trade)
    logger.info(f"Recorded manual FUTURES trade {db_trade.id}: {pos_side} {trade_in.amount} {trade_in.symbol} (Lev: {leverage}x)")
    return db_trade

@router.get("/auto-trading")
def get_auto_trading_status() -> Any:
    """Check continuous auto-trading status."""
    return {
        "enabled": auto_trader.enabled,
        "cooldown_sec": auto_trader.cooldown_sec,
        "total_auto_trades": auto_trader.total_auto_trades,
    }

@router.post("/auto-trading/toggle")
def toggle_auto_trading(enable: Optional[bool] = None) -> Any:
    """Toggle continuous auto-trading ON or OFF."""
    if enable is not None:
        auto_trader.enabled = enable
    else:
        auto_trader.enabled = not auto_trader.enabled
    logger.info(f"AutoTrader continuous mode is now {'ENABLED' if auto_trader.enabled else 'DISABLED'}")
    return {
        "enabled": auto_trader.enabled,
        "message": f"Continuous auto-trading is now {'ACTIVE' if auto_trader.enabled else 'PAUSED'}"
    }

@router.get("/positions", response_model=List[Position])
async def list_open_positions(source: Optional[str] = None) -> Any:
    """Retrieve all active open futures positions with live mark-to-market prices, ROE and liquidation prices."""
    return await exchange_service.get_positions(source=source)

@router.post("/positions/close")
async def close_position_endpoint(
    req: ClosePositionRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Close/liquidate an open futures position at the current market price."""
    try:
        sim_result = await exchange_service.close_position(
            symbol=req.symbol,
            position_side=req.position_side,
            source=req.source
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    pos_side = sim_result.get("side", "LONG")
    close_side = "SELL" if pos_side == "LONG" else "BUY"

    db_trade = Trade(
        strategy_id=None,
        symbol=req.symbol,
        side=close_side,
        position_side=pos_side,
        leverage=sim_result.get("leverage", 10),
        margin=sim_result.get("margin", 0.0),
        liquidation_price=sim_result.get("liquidation_price"),
        order_type="MARKET",
        price=sim_result["price"],
        amount=sim_result["amount"],
        cost=sim_result["cost"],
        fee=sim_result["fee"],
        fee_currency=sim_result["fee_currency"],
        realized_pnl=sim_result["realized_pnl"],
        status="FILLED",
        exchange="bybit",
        source=req.source or "manual",
        is_paper=True
    )
    db.add(db_trade)
    await db.commit()
    await db.refresh(db_trade)
    return {"message": f"Closed {pos_side} position for {req.symbol}", "trade": db_trade}

@router.get("/", response_model=List[TradeResponse])
async def list_trades(
    strategy_id: Optional[str] = None,
    symbol: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve trades with optional strategy or symbol filter."""
    stmt = select(Trade)
    if strategy_id:
        stmt = stmt.where(Trade.strategy_id == strategy_id)
    if symbol:
        stmt = stmt.where(Trade.symbol == symbol)
    stmt = stmt.offset(skip).limit(limit).order_by(Trade.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/paper", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
async def execute_paper_trade(
    trade_in: TradeCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Execute a paper simulated trade.
    Updates paper balance and stores trade record in database.
    """
    # Verify strategy exists
    strat_stmt = select(Strategy).where(Strategy.id == trade_in.strategy_id)
    strat_res = await db.execute(strat_stmt)
    strategy = strat_res.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    try:
        sim_result = exchange_service.execute_paper_order(
            symbol=trade_in.symbol,
            side=trade_in.side,
            amount=trade_in.amount,
            price=trade_in.price
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    db_trade = Trade(
        strategy_id=trade_in.strategy_id,
        signal_id=trade_in.signal_id,
        symbol=trade_in.symbol,
        side=trade_in.side,
        order_type=trade_in.order_type,
        price=trade_in.price,
        amount=trade_in.amount,
        cost=sim_result["cost"],
        fee=sim_result["fee"],
        fee_currency=sim_result["fee_currency"],
        status=sim_result["status"],
        exchange=trade_in.exchange,
        is_paper=True
    )
    db.add(db_trade)
    await db.commit()
    await db.refresh(db_trade)
    logger.info(f"Recorded paper trade {db_trade.id} for {trade_in.symbol}")
    return db_trade
