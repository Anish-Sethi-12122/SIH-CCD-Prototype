import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.models.schemas import (
    ZoneCreate, ZoneSchema, AlertSchema, AlertFeedback, TrackSchema, CameraSchema
)
from app.models.orm import Camera, Zone
from app.services.zone_service import create_zone, delete_zone, toggle_zone
from app.services.alert_service import get_alerts, get_alert, update_alert_feedback, count_alerts
from app.services.track_service import get_tracks
from app.video.pipeline import pipeline
from app.events.bus import bus
from app.core.logging import get_logger
from sqlalchemy import select
import uuid
from datetime import datetime

logger = get_logger(__name__)
router = APIRouter(prefix="/api")

VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov"}


def discover_videos() -> list[dict]:
    """Expose stable, frontend-safe video identifiers without file paths."""
    paths = sorted(
        (p for p in settings.VIDEO_DIR.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS),
        key=lambda p: p.name.lower(),
    ) if settings.VIDEO_DIR.exists() else []
    return [
        {
            "id": f"camera-{index:02d}",
            "name": f"CAM {index:02d}",
            "camera_code": f"CAM-{index:02d}",
            "filename": path.name,
            "path": path,
        }
        for index, path in enumerate(paths, start=1)
    ]

# ── Health ──────────────────────────────────────────────────────────────────
@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    return {
        "status": "ok",
        "pipeline_active": pipeline.active,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }

@router.get("/status")
async def status(db: AsyncSession = Depends(get_db)):
    active_alerts = await count_alerts(db, status="active", session_id=pipeline.session_id)
    return {
        "pipeline": {
            "active": pipeline.active,
            "camera_id": pipeline.camera_id,
            "session_id": pipeline.session_id,
            "frame_count": pipeline.frame_count,
            "current_frame": pipeline.current_frame,
            "total_frames": pipeline.total_frames,
            "fps": pipeline.fps,
            "is_live": pipeline.is_live,
            "detection_enabled": pipeline.detection_enabled,
            "tracking_enabled": pipeline.tracking_enabled,
            "fencing_enabled": pipeline.fencing_enabled,
            "camera_code": pipeline.camera_code,
        },
        "alerts": {"active": active_alerts},
        "active_tracks": len(pipeline._active_tracks),
        "telemetry": pipeline.telemetry(),
    }

# ── Cameras ──────────────────────────────────────────────────────────────────
@router.get("/cameras", response_model=list[CameraSchema])
async def list_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera))
    return [CameraSchema(id=c.id, name=c.name, active=c.active) for c in result.scalars().all()]

@router.get("/videos")
async def list_videos():
    return [{key: value for key, value in video.items() if key != "path"} for video in discover_videos()]

from pydantic import BaseModel

class CameraStartRequest(BaseModel):
    video_id: str

@router.post("/cameras/start")
async def start_camera(req: CameraStartRequest, db: AsyncSession = Depends(get_db)):
    import asyncio
    videos = discover_videos()
    if not videos:
        raise HTTPException(404, "No video files found in data/videos/")

    selected_video = next((video for video in videos if video["id"] == req.video_id), None)
    if selected_video is None:
        raise HTTPException(404, "Selected camera feed is no longer available")

    # The resolved path never leaves this backend process; clients use video_id only.
    video_path = str(selected_video["path"])

    # Get or create camera
    result = await db.execute(select(Camera).where(Camera.source == selected_video["filename"]))
    cam = result.scalar_one_or_none()
    if not cam:
        cam = Camera(id=str(uuid.uuid4()), name=selected_video["name"],
                     source=selected_video["filename"], active=True, created_at=datetime.utcnow())
        db.add(cam)
        await db.commit()

    if pipeline.active:
        pipeline.stop()

    loop = asyncio.get_event_loop()
    new_session_id = uuid.uuid4().hex
    pipeline.start(cam.id, video_path, loop, new_session_id, selected_video["camera_code"])
    return {
        "status": "started",
        "camera_id": cam.id,
        "video": selected_video["filename"],
        "camera_code": selected_video["camera_code"],
        "session_id": new_session_id,
    }

@router.post("/cameras/stop")
async def stop_camera():
    pipeline.stop()
    return {"status": "stopped"}

@router.post("/cameras/pause")
async def pause_camera():
    pipeline.pause()
    await bus.publish({"type": "status", "payload": {"feed": "paused", "camera_id": pipeline.camera_id}})
    return {"status": "paused"}

@router.post("/cameras/resume")
async def resume_camera():
    pipeline.resume()
    await bus.publish({"type": "status", "payload": {"feed": "live", "camera_id": pipeline.camera_id}})
    return {"status": "resumed"}

@router.post("/cameras/golive")
async def go_live():
    pipeline.go_live()
    await bus.publish({"type": "status", "payload": {"feed": "live", "camera_id": pipeline.camera_id}})
    return {"status": "live"}

@router.post("/cameras/restart")
async def restart_camera():
    pipeline.restart()
    await bus.publish({"type": "status", "payload": {"feed": "live", "camera_id": pipeline.camera_id}})
    return {"status": "restarted"}

@router.post("/cameras/simulate-failure")
async def simulate_failure():
    pipeline.pause()
    await bus.publish({"type": "status", "payload": {"feed": "unavailable", "camera_id": pipeline.camera_id}})
    return {"status": "failure_simulated"}

@router.post("/cameras/recover")
async def recover_camera():
    pipeline.resume()
    await bus.publish({"type": "status", "payload": {"feed": "live", "camera_id": pipeline.camera_id}})
    return {"status": "recovered"}

# ── Pipeline controls ────────────────────────────────────────────────────────
@router.post("/pipeline/settings")
async def update_pipeline_settings(settings_update: dict):
    if "detection_enabled" in settings_update:
        pipeline.detection_enabled = bool(settings_update["detection_enabled"])
    if "tracking_enabled" in settings_update:
        pipeline.tracking_enabled = bool(settings_update["tracking_enabled"])
    if "fencing_enabled" in settings_update:
        pipeline.fencing_enabled = bool(settings_update["fencing_enabled"])
    if "backend_drawing_enabled" in settings_update:
        pipeline.backend_drawing_enabled = bool(settings_update["backend_drawing_enabled"])
    return {"status": "updated"}

# ── Zones ────────────────────────────────────────────────────────────────────
@router.get("/zones", response_model=list[ZoneSchema])
async def list_zones(camera_id: str | None = None, db: AsyncSession = Depends(get_db)):
    # Zones are deliberately runtime-scoped.  Older persisted zone records are
    # not loaded into a new operator session.
    zones = pipeline.zones if pipeline.active and (not camera_id or camera_id == pipeline.camera_id) else []
    return [
        ZoneSchema(
            id=z["id"], camera_id=pipeline.camera_id, name=z["name"],
            polygon=z["polygon"], active=z["active"],
            created_at=z["created_at"]
        )
        for z in zones
    ]

@router.post("/zones", response_model=ZoneSchema)
async def create_zone_endpoint(data: ZoneCreate, db: AsyncSession = Depends(get_db)):
    if not pipeline.active or data.camera_id != pipeline.camera_id:
        raise HTTPException(409, "Start a camera session before creating a zone")
    zone = await create_zone(db, data)
    zone_dict = {
        "id": zone.id,
        "name": zone.name,
        "polygon": json.loads(zone.polygon_json),
        "active": zone.active,
        "created_at": zone.created_at,
    }
    pipeline.update_zone(zone_dict)
    await bus.publish({"type": "zone_update", "payload": {
        "action": "created", "zone": zone_dict, "session_id": pipeline.session_id
    }})
    return ZoneSchema(
        id=zone.id, camera_id=zone.camera_id, name=zone.name,
        polygon=json.loads(zone.polygon_json), active=zone.active,
        created_at=zone.created_at
    )

@router.delete("/zones/{zone_id}")
async def delete_zone_endpoint(zone_id: str, db: AsyncSession = Depends(get_db)):
    if not pipeline.has_zone(zone_id):
        raise HTTPException(404, "Zone not found in the current session")
    ok = await delete_zone(db, zone_id)
    if not ok:
        raise HTTPException(404, "Zone not found")
    pipeline.update_zone({"id": zone_id, "active": False})
    await bus.publish({"type": "zone_update", "payload": {
        "action": "deleted", "zone_id": zone_id, "session_id": pipeline.session_id
    }})
    return {"deleted": zone_id}

@router.patch("/zones/{zone_id}/toggle")
async def toggle_zone_endpoint(zone_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    if not pipeline.has_zone(zone_id):
        raise HTTPException(404, "Zone not found in the current session")
    active = bool(body.get("active", True))
    zone = await toggle_zone(db, zone_id, active)
    if not zone:
        raise HTTPException(404, "Zone not found")
    zone_dict = {
        "id": zone.id, "name": zone.name, "polygon": json.loads(zone.polygon_json),
        "active": zone.active, "created_at": zone.created_at,
    }
    pipeline.update_zone(zone_dict)
    await bus.publish({"type": "zone_update", "payload": {
        "action": "toggled", "zone": zone_dict, "session_id": pipeline.session_id
    }})
    return ZoneSchema(
        id=zone.id, camera_id=zone.camera_id, name=zone.name,
        polygon=json.loads(zone.polygon_json), active=zone.active,
        created_at=zone.created_at
    )

# ── Alerts ───────────────────────────────────────────────────────────────────
@router.get("/alerts", response_model=list[AlertSchema])
async def list_alerts(limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db)):
    return await get_alerts(db, limit=limit, offset=offset, session_id=pipeline.session_id)

@router.get("/alerts/{alert_id}", response_model=AlertSchema)
async def get_alert_endpoint(alert_id: str, db: AsyncSession = Depends(get_db)):
    alert = await get_alert(db, alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    return alert

@router.patch("/alerts/{alert_id}/feedback", response_model=AlertSchema)
async def alert_feedback(alert_id: str, feedback: AlertFeedback, db: AsyncSession = Depends(get_db)):
    alert = await update_alert_feedback(db, alert_id, feedback)
    if not alert:
        raise HTTPException(404, "Alert not found")
    await bus.publish({"type": "alert_update", "payload": {
        "id": alert.id, "status": alert.status, "operator_note": alert.operator_note
    }})
    return alert

# ── Tracks ───────────────────────────────────────────────────────────────────
@router.get("/tracks", response_model=list[TrackSchema])
async def list_tracks(camera_id: str | None = None, in_frame: bool | None = None, db: AsyncSession = Depends(get_db)):
    tracks = await get_tracks(
        db,
        camera_id=camera_id or pipeline.camera_id or None,
        in_frame=in_frame,
        session_id=pipeline.session_id,
    )
    return [TrackSchema(
        id=track.id, internal_id=track.id, session_id=track.session_id,
        track_uid=track.track_uid or f"T-{track.track_id}", track_id=track.track_id,
        camera_id=track.camera_id, object_type=track.object_type, object_class=track.object_class,
        confidence=track.confidence, first_seen=track.first_seen, last_seen=track.last_seen,
        in_frame=track.in_frame, status=track.status or ("IN_FRAME" if track.in_frame else "OUT_OF_FRAME"),
        mock_name=track.mock_name, mock_age=track.mock_age, mock_id_doc=track.mock_id_doc,
        mock_vehicle_color=track.mock_vehicle_color, mock_plate=track.mock_plate,
        identity_state=track.identity_state or ("CANDIDATE" if track.mock_name else "NO_MATCH"),
        identity_match_score=track.identity_match_score,
        anpr_state=track.anpr_state or "UNAVAILABLE", anpr_reason=track.anpr_reason,
    ) for track in tracks]
