"""YOLO detection wrapper."""
import numpy as np
from ultralytics import YOLO
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

class Detector:
    def __init__(self):
        logger.info(f"Loading YOLO model: {settings.MODEL_PATH}")
        self._model = YOLO(settings.MODEL_PATH)
        self._model.fuse()
        logger.info("YOLO model ready")

    def detect(self, frame: np.ndarray) -> list[dict]:
        """Returns list of detection dicts with keys: bbox, confidence, class_id, object_type, object_class"""
        results = self._model(
            frame,
            conf=settings.DETECTION_CONFIDENCE,
            imgsz=settings.INFERENCE_IMAGE_SIZE,
            classes=settings.DETECTION_CLASSES,
            verbose=False,
        )
        detections = []
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf = float(boxes.conf[i].item())
                xyxy = boxes.xyxy[i].cpu().numpy().tolist()
                obj_type, obj_class = CLASS_TO_TYPE.get(cls_id, ("unknown", "unknown"))
                detections.append({
                    "bbox": xyxy,  # [x1,y1,x2,y2]
                    "confidence": round(conf, 3),
                    "class_id": cls_id,
                    "object_type": obj_type,
                    "object_class": obj_class,
                })
        return detections

# Singleton (lazy-loaded)
_detector: Detector | None = None

def get_detector() -> Detector:
    global _detector
    if _detector is None:
        _detector = Detector()
    return _detector
