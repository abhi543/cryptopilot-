from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.logging import setup_logging, logger
from backend.app.db.session import init_db
from backend.app.api.v1.router import api_router
from backend.app.api.websockets.live_feed import ws_router
from backend.app.services.market_data import market_broadcaster
from backend.app.services.market_scanner import market_scanner
from backend.app.services.exchange_service import exchange_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup structured logger
    setup_logging()
    logger.info(f"Starting {settings.PROJECT_NAME} in '{settings.ENVIRONMENT}' mode...")

    # Initialize database tables
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

    # Only start persistent background socket/scanner loops when not running serverless on Vercel
    import os
    if not os.environ.get("VERCEL"):
        # Start live market broadcaster task
        await market_broadcaster.start_broadcasting()

        # Restore and warm up active strategies from database
        from backend.app.strategies.registry import strategy_manager
        await strategy_manager.restore_active_from_db()

        # Start live market scanner (Exchange WebSocket + REST fallback)
        await market_scanner.start()

    yield

    # Clean up resources
    logger.info("Shutting down CryptoPilot backend...")
    import os
    if not os.environ.get("VERCEL"):
        try:
            await market_scanner.stop()
            await market_broadcaster.stop_broadcasting()
        except Exception:
            pass
    try:
        await exchange_service.close()
    except Exception:
        pass
    logger.info("Cleanup completed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Professional multi-strategy cryptocurrency trading platform backend.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred.", "error": str(exc) if settings.DEBUG else None}
    )

# Include Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "trading_mode": settings.TRADING_MODE,
        "live_trading_allowed": settings.ALLOW_LIVE_TRADING
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health"
    }
