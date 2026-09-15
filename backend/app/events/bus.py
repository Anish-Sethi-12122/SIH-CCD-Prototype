"""In-process async event bus using asyncio queues."""
import asyncio
from typing import Callable, Awaitable
from app.core.logging import get_logger

logger = get_logger(__name__)

class EventBus:
    def __init__(self):
        self._subscribers: list[asyncio.Queue] = []

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    async def publish(self, event: dict) -> None:
        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("EventBus: subscriber queue full, dropping message")
            except Exception as e:
                logger.error(f"EventBus publish error: {e}")
                dead.append(q)
        for q in dead:
            self.unsubscribe(q)

# Singleton
bus = EventBus()
