from fastapi import APIRouter
from backend.app.api.v1.endpoints import strategies, trades, signals, performance, market, auth, scanner

api_router = APIRouter()

api_router.include_router(strategies.router, prefix="/strategies", tags=["Strategies"])
api_router.include_router(trades.router, prefix="/trades", tags=["Trades"])
api_router.include_router(signals.router, prefix="/signals", tags=["Signals"])
api_router.include_router(performance.router, prefix="/performance", tags=["Performance"])
api_router.include_router(market.router, prefix="/market", tags=["Market Data"])
api_router.include_router(scanner.router, prefix="/scanner", tags=["Market Scanner"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

