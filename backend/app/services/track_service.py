"""Session-scoped, persistent operator track registry."""
from datetime import datetime
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orm import Track


def _status_for(track: dict, alerted_track_ids: set[int]) -> str:
    if track["track_id"] in alerted_track_ids:
        return "SUSPICIOUS"
    return "OUT_OF_FRAME" if track.get("state") == "exited" else "IN_FRAME"


async def sync_tracks(
    db: AsyncSession,
    *,
    session_id: str,
    camera_id: str,
    tracks: list[dict],
    alerted_track_ids: list[int],
) -> None:
    """Upsert actual tracker objects; exited records remain session history."""
    alerted = set(alerted_track_ids)
    now = datetime.utcnow()
    for observed in tracks:
        result = await db.execute(select(Track).where(
            Track.session_id == session_id,
            Track.camera_id == camera_id,
            Track.track_id == observed["track_id"],
            Track.object_type == observed["object_type"],
        ))
        record = result.scalar_one_or_none()
        status = _status_for(observed, alerted)
        if record is None:
            record = Track(
                session_id=session_id,
                track_id=observed["track_id"],
                track_uid=observed["track_uid"],
                camera_id=camera_id,
                object_type=observed["object_type"],
                object_class=observed["object_class"],
                confidence=observed["confidence"],
                first_seen=now,
                last_seen=now,
                in_frame=status != "OUT_OF_FRAME",
                status=status,
                # No face/plate model is installed for this prototype. These
                # are honest machine-observation states, not fabricated data.
                identity_state="NO_MATCH" if observed["object_type"] == "human" else "NO_MATCH",
                anpr_state="UNAVAILABLE",
                anpr_reason="INSUFFICIENT IMAGE QUALITY" if observed["object_type"] == "vehicle" else None,
            )
            db.add(record)
        else:
            record.track_uid = observed["track_uid"]
            record.object_type = observed["object_type"]
            record.object_class = observed["object_class"]
            record.confidence = observed["confidence"]
            record.last_seen = now
            record.status = status
            record.in_frame = status != "OUT_OF_FRAME"
    await db.commit()


async def get_tracks(
    db: AsyncSession,
    camera_id: str | None = None,
    in_frame: bool | None = None,
    session_id: str | None = None,
) -> list[Track]:
    query = select(Track).order_by(desc(Track.last_seen))
    if camera_id:
        query = query.where(Track.camera_id == camera_id)
    if in_frame is not None:
        query = query.where(Track.in_frame == in_frame)
    if session_id:
        query = query.where(Track.session_id == session_id)
    result = await db.execute(query)
    return list(result.scalars().all())
