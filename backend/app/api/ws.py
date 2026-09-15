"""WebSocket endpoint for already-processed runtime events."""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.events.bus import bus
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    q = bus.subscribe()
    logger.info("WebSocket client connected")
    try:
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=5.0)
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                try:
                    await websocket.send_text(json.dumps({"type": "heartbeat", "payload": {}}))
                except Exception:
                    break
                continue

            # Intrusions are persisted by the single lifespan consumer, not by
            # each connected browser.  Never forward the internal event itself.
            if msg["type"] == "intrusion_event":
                continue

            await websocket.send_text(json.dumps(msg, default=str))

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        bus.unsubscribe(q)
