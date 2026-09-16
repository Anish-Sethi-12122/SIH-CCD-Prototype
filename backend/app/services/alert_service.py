import json
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.orm import Alert, Event
from app.models.schemas import AlertFeedback
from app.core.logging import get_logger
import uuid

logger = get_logger(__name__)

async def create_event_and_alert(
    db: AsyncSession,
    event_type: str,
    severity: str,
    title: str,
    message: str,
    session_id: str | None = None,
    camera_id: str | None = None,
    track_db_id: str | None = None,
    track_id: int | None = None,
    track_uid: str | None = None,
    object_type: str | None = None,
    camera_code: str | None = None,
    zone_id: str | None = None,
    confidence: float = 1.0,
    detail: dict | None = None,
) -> tuple[Event, Alert]:
    now = datetime.utcnow()
    event = Event(
        id=str(uuid.uuid4()),
        session_id=session_id,
        event_type=event_type,
        rule_id=(detail or {}).get("rule_id"),
        rule_reason=(detail or {}).get("reason"),
        severity=severity,
        camera_id=camera_id,
        track_db_id=track_db_id,
        track_id=track_id,
        zone_id=zone_id,
        confidence=confidence,
        detail_json=json.dumps(detail) if detail else None,
        created_at=now,
    )
    db.add(event)
    await db.flush()

    alert = Alert(
        id=str(uuid.uuid4()),
        session_id=session_id,
        event_id=event.id,
        event_type=event_type,
        title=title,
        message=message,
        severity=severity,
        camera_id=camera_id,
        track_id=track_id,
        track_uid=track_uid,
        object_type=object_type,
        camera_code=camera_code,
        zone_id=zone_id,
        status="active",
        created_at=now,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    logger.info(f"Alert created: {alert.id} [{severity}] {title}")
    return event, alert

async def get_alerts(db: AsyncSession, limit: int = 50, offset: int = 0, session_id: str | None = None) -> list[Alert]:
    q = select(Alert).order_by(desc(Alert.created_at)).limit(limit).offset(offset)
    if session_id:
        q = q.where(Alert.session_id == session_id)
    result = await db.execute(q)
    return list(result.scalars().all())

async def get_alert(db: AsyncSession, alert_id: str) -> Alert | None:
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    return result.scalar_one_or_none()

async def update_alert_feedback(db: AsyncSession, alert_id: str, feedback: AlertFeedback) -> Alert | None:
    alert = await get_alert(db, alert_id)
    if alert:
        alert.status = feedback.status
        alert.operator_note = feedback.operator_note
        if feedback.operator_correction is not None:
            # Preserve the machine event/alert fields; this remains explicitly
            # operator-provided correction, never automatic verification.
            alert.operator_correction_json = json.dumps({
                "operator_disposition": feedback.status,
                "values": feedback.operator_correction,
                "operator_note": feedback.operator_note,
                "recorded_at": datetime.utcnow().isoformat(),
            })
        if feedback.status == "acknowledged":
            alert.acknowledged_at = datetime.utcnow()
        await db.commit()
        await db.refresh(alert)
    return alert

async def count_alerts(db: AsyncSession, status: str | None = None, session_id: str | None = None) -> int:
    from sqlalchemy import func
    q = select(func.count(Alert.id))
    if status:
        q = q.where(Alert.status == status)
    if session_id:
        q = q.where(Alert.session_id == session_id)
    result = await db.execute(q)
    return result.scalar_one()
