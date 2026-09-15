import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.core.config import settings
    print("Config OK:", settings.APP_NAME)
    
    from app.core.logging import setup_logging, get_logger
    setup_logging()
    print("Logging OK")
    
    from app.models import orm
    print("ORM OK")
    
    from app.models.schemas import AlertSchema, TrackSchema, ZoneSchema
    print("Schemas OK")
    
    from app.events.bus import bus
    print("EventBus OK")
    
    from app.services.zone_service import point_in_polygon
    print("ZoneService OK")
    
    from app.services.alert_service import create_event_and_alert
    print("AlertService OK")
    
    from app.services.track_service import get_or_create_track
    print("TrackService OK")
    
    from app.vision.tracker import Tracker
    print("Tracker OK")
    
    from app.video.pipeline import pipeline
    print("Pipeline OK")
    
    from app.api.routes import router
    print("Routes OK")
    
    from app.api.ws import router as ws_router
    print("WS OK")
    
    from app.main import app
    print("App OK:", app.title)
    
    print("\n=== ALL IMPORTS SUCCESSFUL ===")

except Exception as e:
    import traceback
    print(f"IMPORT ERROR: {e}")
    traceback.print_exc()
    sys.exit(1)
