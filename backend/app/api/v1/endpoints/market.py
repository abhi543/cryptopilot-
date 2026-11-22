from typing import List, Any, Dict
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel
from backend.app.services.exchange_service import exchange_service
from backend.app.services.auto_trader import auto_trader
from backend.app.schemas.market import Ticker, OHLCV, MarketOverview
from backend.app.core.config import settings

class AddPairRequest(BaseModel):
    symbol: str

router = APIRouter()

@router.get("/pairs")
async def get_trading_pairs() -> Any:
    """Return currently monitored pairs and popular available pairs."""
    return {
        "monitored": exchange_service.get_monitored_pairs(),
        "popular": await exchange_service.get_popular_pairs(),
    }

@router.post("/pairs", status_code=status.HTTP_201_CREATED)
async def add_trading_pair(req: AddPairRequest) -> Any:
    """Add a new cryptocurrency trading pair to live scanner and continuous bots."""
    try:
        await exchange_service.add_monitored_pair(req.symbol)
        return {
            "message": f"Successfully added {req.symbol.upper()} to monitored pairs",
            "monitored": exchange_service.get_monitored_pairs()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/pairs/{symbol:path}")
def remove_trading_pair(symbol: str) -> Any:
    """Remove a trading pair from live monitoring."""
    try:
        # URL decode if needed
        clean_symbol = symbol.replace("%2F", "/").replace("-", "/").upper()
        success = exchange_service.remove_monitored_pair(clean_symbol)
        if not success:
            raise HTTPException(status_code=404, detail=f"Pair '{clean_symbol}' not found in monitored pairs")
        return {
            "message": f"Removed {clean_symbol}",
            "monitored": exchange_service.get_monitored_pairs()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tickers", response_model=List[Ticker])
async def get_tickers(symbols: str = Query(None, description="Comma-separated symbols, e.g. BTC/USDT,ETH/USDT")) -> Any:
    """Fetch current tickers for requested or default crypto symbols."""
    target_symbols = [s.strip() for s in symbols.split(",")] if symbols else settings.DEFAULT_TICKERS
    tickers = await exchange_service.fetch_tickers(target_symbols)

    # Drive the autonomous trading engine on ticker fetches (ensures active trading across all environments)
    if auto_trader.enabled:
        for t in tickers:
            try:
                import asyncio
                asyncio.create_task(auto_trader.evaluate_ticker(t.model_dump()))
            except Exception:
                pass

    return tickers

@router.get("/ohlcv", response_model=List[OHLCV])
async def get_ohlcv(
    symbol: str = Query("BTC/USDT", description="Crypto symbol, e.g. BTC/USDT"),
    timeframe: str = Query("1h", description="Candle timeframe e.g. 1m, 5m, 1h, 1d"),
    limit: int = Query(60, ge=10, le=500)
) -> Any:
    """Fetch candlestick OHLCV data for TradingView charts."""
    candles = await exchange_service.fetch_ohlcv(symbol=symbol, timeframe=timeframe, limit=limit)
    return candles

@router.get("/overview", response_model=MarketOverview)
async def get_market_overview() -> Any:
    """Overview of market tickers, paper balance and active strategy count."""
    tickers = []
    for s in settings.DEFAULT_TICKERS:
        t = await exchange_service.fetch_ticker(s)
        tickers.append(t)
    
    balances = exchange_service.get_paper_balances()
    usdt_val = balances.get("USDT", 0.0)

    return MarketOverview(
        exchange=settings.DEFAULT_EXCHANGE,
        tickers=tickers,
        active_strategies_count=0,
        total_paper_balance=usdt_val,
        total_unrealized_pnl=0.0
    )
