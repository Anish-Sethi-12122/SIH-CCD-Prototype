from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import uuid

def new_id() -> str:
    return str(uuid.uuid4())

class Camera(Base):
    __tablename__ = "cameras"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)  # file path or rtsp url
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Zone(Base):
    __tablename__ = "zones"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    camera_id: Mapped[str] = mapped_column(String, ForeignKey("cameras.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    polygon_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON [[x,y],...]
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Track(Base):
    __tablename__ = "tracks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    track_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    track_uid: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    camera_id: Mapped[str] = mapped_column(String, ForeignKey("cameras.id"))
    object_type: Mapped[str] = mapped_column(String, nullable=False)  # human | vehicle
    object_class: Mapped[str] = mapped_column(String, nullable=False)  # person | car | truck...
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    in_frame: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String, default="IN_FRAME")
    # Mock identity fields
    mock_name: Mapped[str | None] = mapped_column(String, nullable=True)
    mock_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mock_id_doc: Mapped[str | None] = mapped_column(String, nullable=True)
    mock_vehicle_color: Mapped[str | None] = mapped_column(String, nullable=True)
    mock_plate: Mapped[str | None] = mapped_column(String, nullable=True)
    identity_state: Mapped[str] = mapped_column(String, default="NO_MATCH")
    identity_match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    anpr_state: Mapped[str] = mapped_column(String, default="UNAVAILABLE")
    anpr_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    @property
    def internal_id(self) -> str:
        """Explicit API name for the persistent identifier; not operator chrome."""
        return self.id

class Event(Base):
    __tablename__ = "events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, default="info")  # info|warning|critical
    camera_id: Mapped[str] = mapped_column(String, nullable=True)
    track_db_id: Mapped[str | None] = mapped_column(String, ForeignKey("tracks.id"), nullable=True)
    track_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    detail_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # extra JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    event_id: Mapped[str] = mapped_column(String, ForeignKey("events.id"))
    event_type: Mapped[str | None] = mapped_column(String, nullable=True)
    rule_id: Mapped[str | None] = mapped_column(String, nullable=True)
    rule_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String, default="warning")
    camera_id: Mapped[str | None] = mapped_column(String, nullable=True)
    track_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    track_uid: Mapped[str | None] = mapped_column(String, nullable=True)
    object_type: Mapped[str | None] = mapped_column(String, nullable=True)
    camera_code: Mapped[str | None] = mapped_column(String, nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")  # active|acknowledged|false_positive
    operator_note: Mapped[str | None] = mapped_column(String, nullable=True)
    operator_correction_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    @property
    def internal_id(self) -> str:
        """Explicit API name for the persistent identifier; not operator chrome."""
        return self.id

    @property
    def operator_correction(self) -> dict | None:
        import json
        return json.loads(self.operator_correction_json) if self.operator_correction_json else None
