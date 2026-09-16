from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any
import uuid

class CameraSchema(BaseModel):
    id: str
    name: str
    active: bool
    class Config:
        from_attributes = True

class ZoneCreate(BaseModel):
    camera_id: str
    name: str
    polygon: list[list[float]]  # [[x,y], ...] normalized 0-1

class ZoneSchema(BaseModel):
    id: str
    camera_id: str
    name: str
    polygon: list[list[float]]
    active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class TrackSchema(BaseModel):
    id: str
    internal_id: str
    session_id: str
    track_uid: str
    track_id: int
    camera_id: str
    object_type: str
    object_class: str
    confidence: float
    first_seen: datetime
    last_seen: datetime
    in_frame: bool
    status: str
    mock_name: str | None = None
    mock_age: int | None = None
    mock_id_doc: str | None = None
    mock_vehicle_color: str | None = None
    mock_plate: str | None = None
    identity_state: str = "NO_MATCH"
    identity_match_score: float | None = None
    anpr_state: str = "UNAVAILABLE"
    anpr_reason: str | None = None
    class Config:
        from_attributes = True

class EventSchema(BaseModel):
    id: str
    event_type: str
    severity: str
    camera_id: str | None
    track_id: int | None
    zone_id: str | None
    confidence: float
    detail_json: str | None
    created_at: datetime
    class Config:
        from_attributes = True

class AlertSchema(BaseModel):
    id: str
    internal_id: str
    session_id: str | None
    event_id: str
    event_type: str | None = None
    rule_id: str | None = None
    rule_reason: str | None = None
    title: str
    message: str
    severity: str
    camera_id: str | None
    camera_code: str | None = None
    track_id: int | None
    track_uid: str | None = None
    object_type: str | None = None
    zone_id: str | None
    status: str
    operator_note: str | None
    operator_correction: dict | None = None
    created_at: datetime
    acknowledged_at: datetime | None
    class Config:
        from_attributes = True

class AlertFeedback(BaseModel):
    status: str  # acknowledged | false_positive
    operator_note: str | None = None
    operator_correction: dict | None = None

class WSMessage(BaseModel):
    type: str  # frame | tracks | alert | event | status | zone_update
    payload: Any
