from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.services.market_data import market_broadcaster
from backend.app.core.logging import logger

ws_router = APIRouter()

@ws_router.websocket("/ws/feed")
async def websocket_live_feed(websocket: WebSocket):
    """
    WebSocket endpoint for real-time market data ticks and strategy signals.
    """
    await market_broadcaster.connect(websocket)
    try:
        while True:
            # Keep connection alive & handle incoming pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        market_broadcaster.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        market_broadcaster.disconnect(websocket)
