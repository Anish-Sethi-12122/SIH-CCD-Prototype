from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

BASE_DIR = Path(__file__).parent.parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    APP_NAME: str = "Operator Dashboard"
    APP_VERSION: str = "1.0.0-prototype"
    DEBUG: bool = True
    
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/data/surveillance.db"
    VIDEO_DIR: Path = BASE_DIR / "data" / "videos"
    MODEL_PATH: str = "yolov8n.pt"
    
    DETECTION_CONFIDENCE: float = 0.4
    INFERENCE_IMAGE_SIZE: int = 640
    DETECTION_CLASSES: list[int] = [0, 1, 2, 3, 5, 7]  # person, bicycle, car, motorbike, bus, truck
    FRAME_SKIP: int = 2
    # Number of inference updates a ByteTrack object can miss before it is exited.
    # Frames between inference updates keep the latest known track position.
    TRACK_MISSED_UPDATES: int = 3
    JPEG_QUALITY: int = 75
    
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    WS_HEARTBEAT_INTERVAL: int = 5
    
    DWELL_ALERT_SECONDS: int = 10
    # Deterministic suspicious-activity policy (session scoped in the pipeline).
    SUSPICIOUS_DWELL_SECONDS: int = 30
    REPEATED_ENTRY_COUNT: int = 3
    REPEATED_ENTRY_WINDOW_SECONDS: int = 120
    VEHICLE_DWELL_SECONDS: int = 30
    
settings = Settings()
