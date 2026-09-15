"""
Object tracker using ultralytics built-in ByteTrack.

ultralytics model.track() uses ByteTrack internally and returns stable
tracker_id for each detection across frames. This is the most reliable
approach since ByteTracker is tightly integrated with YOLO's architecture.
"""
import numpy as np
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

CLASS_TO_TYPE = {
    0: ("human", "person"),
    1: ("vehicle", "bicycle"),
    2: ("vehicle", "car"),
    3: ("vehicle", "motorcycle"),
    5: ("vehicle", "bus"),
    7: ("vehicle", "truck"),
}


class Tracker:
    def __init__(self):
        self._model = None  # Lazy-loaded (shares detector model)
        self._frame_count = 0
        logger.info("Tracker initialized (ultralytics ByteTrack)")

    def _get_model(self):
        if self._model is None:
            from ultralytics import YOLO
            self._model = YOLO(settings.MODEL_PATH)
            logger.info("Tracker YOLO model loaded")
        return self._model

    def track(self, frame: np.ndarray) -> list[dict]:
        """Run YOLO + ByteTrack on frame, return tracked object dicts."""
        model = self._get_model()
        h, w = frame.shape[:2]

        try:
            results = model.track(
                frame,
                conf=settings.DETECTION_CONFIDENCE,
                imgsz=settings.INFERENCE_IMAGE_SIZE,
                classes=settings.DETECTION_CLASSES,
                persist=True,       # Keep tracker state across calls
                tracker="bytetrack.yaml",
                verbose=False,
            )
        except Exception as e:
            logger.warning(f"model.track() failed: {e}, falling back to detect()")
            return self._detect_only(frame)

        tracked = []
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                # Get tracker ID — may be None if track not yet confirmed
                tid_tensor = boxes.id
                if tid_tensor is None:
                    tid = i + 1  # Fallback sequential ID
                else:
                    tid = int(tid_tensor[i].item())

                cls_id = int(boxes.cls[i].item())
                conf = float(boxes.conf[i].item())
                xyxy = boxes.xyxy[i].cpu().numpy().tolist()

                obj_type, obj_class = CLASS_TO_TYPE.get(cls_id, ("unknown", "unknown"))
                cx = (xyxy[0] + xyxy[2]) / 2 / w
                cy = (xyxy[1] + xyxy[3]) / 2 / h

                tracked.append({
                    "track_id": tid,
                    "bbox": xyxy,
                    "bbox_norm": [xyxy[0]/w, xyxy[1]/h, xyxy[2]/w, xyxy[3]/h],
                    "centroid_norm": [cx, cy],
                    "confidence": round(conf, 3),
                    "class_id": cls_id,
                    "object_type": obj_type,
                    "object_class": obj_class,
                })

        self._frame_count += 1
        return tracked

    def _detect_only(self, frame: np.ndarray) -> list[dict]:
        """Fallback: detect without tracking (sequential IDs)."""
        model = self._get_model()
        h, w = frame.shape[:2]
        results = model(
            frame,
            conf=settings.DETECTION_CONFIDENCE,
            classes=settings.DETECTION_CLASSES,
            verbose=False,
        )
        tracked = []
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf = float(boxes.conf[i].item())
                xyxy = boxes.xyxy[i].cpu().numpy().tolist()
                obj_type, obj_class = CLASS_TO_TYPE.get(cls_id, ("unknown", "unknown"))
                cx = (xyxy[0] + xyxy[2]) / 2 / w
                cy = (xyxy[1] + xyxy[3]) / 2 / h
                tracked.append({
                    "track_id": i + 1,
                    "bbox": xyxy,
                    "bbox_norm": [xyxy[0]/w, xyxy[1]/h, xyxy[2]/w, xyxy[3]/h],
                    "centroid_norm": [cx, cy],
                    "confidence": round(conf, 3),
                    "class_id": cls_id,
                    "object_type": obj_type,
                    "object_class": obj_class,
                })
        return tracked

    def reset(self):
        """Discard the model/predictor tracker state for a fresh playback run."""
        # Ultralytics keeps ByteTrack state on the predictor.  A new lazy model
        # instance is the documented-safe way to ensure no IDs cross a reset.
        self._model = None
        self._frame_count = 0
        logger.info("Tracker reset")
