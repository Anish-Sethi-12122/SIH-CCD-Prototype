"""Persist one alert for each pipeline-generated intrusion transition."""
import asyncio
from collections import deque

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.events.bus import bus
from app.services.alert_service import create_event_and_alert

logger = get_logger(__name__)

# The event bus is in-process.  This small guard makes a retry harmless without
# turning the prototype into a durable job system.
_seen_intrusion_ids: set[str] = set()
_seen_order: deque[str] = deque(maxlen=1024)


async def persist_intrusion(payload: dict) -> None:
    """Write an intrusion exactly once, then broadcast its resulting alert."""
    intrusion_id = payload.get("intrusion_id")
    if intrusion_id and intrusion_id in _seen_intrusion_ids:
        return
    if intrusion_id:
        if len(_seen_order) == _seen_order.maxlen:
            _seen_intrusion_ids.discard(_seen_order.popleft())
        _seen_order.append(intrusion_id)
        _seen_intrusion_ids.add(intrusion_id)

    try:
        async with AsyncSessionLocal() as db:
            camera_id = payload.get("camera_id", "")
            session_id = payload.get("session_id")
            track_id = payload.get("track_id")
            zone_id = payload.get("zone_id")
            object_type = payload.get("object_type", "human")
            event_type = payload.get("event_type", "zone_intrusion")
            confidence = payload.get("confidence", 1.0)

            is_suspicious = event_type == "suspicious_activity"
            reason = payload.get("reason", "Restricted-zone activity")
            event, alert = await create_event_and_alert(
                db=db,
                event_type=event_type,
                severity=payload.get("severity", "critical"),
                title="Suspicious Activity" if is_suspicious else "⚠ Zone Intrusion Detected",
                message=(f"{object_type.upper()} · {payload.get('track_uid', f'T-{track_id}')} — {reason}"
                         if is_suspicious else
                         f"{object_type.upper()} · {payload.get('track_uid', f'T-{track_id}')} entered restricted zone '{payload.get('zone_name', zone_id)}'"),
                camera_id=camera_id,
                session_id=session_id,
                track_id=track_id,
                track_uid=payload.get("track_uid"),
                object_type=object_type,
                camera_code=payload.get("camera_code"),
                zone_id=zone_id,
                confidence=confidence,
                detail=payload,
            )

        await bus.publish({
            "type": "alert",
            "payload": {
                "id": alert.id,
                "event_id": event.id,
                "title": alert.title,
                "message": alert.message,
                "severity": alert.severity,
                    "camera_id": alert.camera_id,
                    "camera_code": alert.camera_code,
                    "session_id": alert.session_id,
                    "track_id": alert.track_id,
                    "track_uid": alert.track_uid,
                    "object_type": alert.object_type,
                "zone_id": alert.zone_id,
                "status": alert.status,
                "operator_note": alert.operator_note,
                "created_at": alert.created_at.isoformat(),
                "acknowledged_at": None,
            },
        })
    except Exception:
        logger.exception("Error persisting intrusion")


async def consume_intrusions() -> None:
    """The sole consumer that converts internal intrusion events into alerts."""
    queue = bus.subscribe()
    try:
        while True:
            message = await queue.get()
            if message.get("type") in {"intrusion_event", "suspicious_activity"}:
                await persist_intrusion(message["payload"])
    except asyncio.CancelledError:
        raise
    finally:
        bus.unsubscribe(queue)


async def consume_track_registry() -> None:
    """Persist track lifecycle records independently from browser clients."""
    from app.services.track_service import sync_tracks

    queue = bus.subscribe()
    try:
        while True:
            message = await queue.get()
            if message.get("type") != "track_registry":
                continue
            payload = message["payload"]
            async with AsyncSessionLocal() as db:
                await sync_tracks(
                    db,
                    session_id=payload["session_id"],
                    camera_id=payload["camera_id"],
                    tracks=payload["tracks"],
                    alerted_track_ids=payload.get("alerted_track_ids", []),
                )
    except asyncio.CancelledError:
        raise
    finally:
        bus.unsubscribe(queue)
