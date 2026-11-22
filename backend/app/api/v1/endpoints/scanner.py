from typing import Any, List
from fastapi import APIRouter, Query, HTTPException, status
from backend.app.schemas.scanner import (
    MarketScanResponse,
    ScannerTimeframe,
    AddPairRequest,
)
from backend.app.services.market_scanner import market_scanner, VALID_TIMEFRAMES
from backend.app.services.exchange_service import exchange_service

router = APIRouter()

@router.get("/markets", response_model=MarketScanResponse)
async def scan_markets(
    timeframe: ScannerTimeframe = Query("1h", description="Candle timeframe: 5m, 15m, 1h, 4h, 1d")
) -> Any:
    """
    Live Cryptocurrency Market Scanner.
    Collects real-time prices, 24h & timeframe price changes, volume, high/low,
    calculates trend indicators, and returns last successful data update time.
    """
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timeframe '{timeframe}'. Must be one of: {VALID_TIMEFRAMES}"
        )
    return await market_scanner.scan_markets(timeframe=timeframe)

@router.get("/pairs")
async def get_monitored_pairs() -> Any:
    """List monitored trading pairs and popular additions."""
    return {
        "monitored": market_scanner.get_monitored_pairs(),
        "popular": await exchange_service.get_popular_pairs(),
    }

@router.post("/pairs", status_code=status.HTTP_201_CREATED)
async def add_monitored_pair(req: AddPairRequest) -> Any:
    """Add a new cryptocurrency pair to the live scanner."""
    try:
        await market_scanner.add_pair(req.symbol)
        # Also sync exchange_service monitored list
        await exchange_service.add_monitored_pair(req.symbol)
        return {
            "message": f"Successfully added {req.symbol.upper()} to market scanner",
            "monitored": market_scanner.get_monitored_pairs()
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/pairs/{symbol:path}")
def remove_monitored_pair(symbol: str) -> Any:
    """Remove a cryptocurrency pair from the market scanner."""
    clean = symbol.replace("%2F", "/").replace("-", "/").upper()
    try:
        success = market_scanner.remove_pair(clean)
        exchange_service.remove_monitored_pair(clean)
        if not success:
            raise HTTPException(status_code=404, detail=f"Pair '{clean}' is not being monitored")
        return {
            "message": f"Successfully removed {clean} from market scanner",
            "monitored": market_scanner.get_monitored_pairs()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
