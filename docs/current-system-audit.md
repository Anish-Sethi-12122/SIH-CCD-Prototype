# System Audit: SIH Surveillance Prototype

This document provides a current audit of the backend and vision pipeline, outlining working functionality and current architecture.

## Architecture & Data Flow
The current system architecture functions precisely as designed, implementing a fully real-time backend vision pipeline that streams events and frames to a React frontend.

1. **Video Processing**: A dedicated background thread (`VideoPipeline` in `backend/app/video/pipeline.py`) continuously reads video frames using OpenCV.
2. **YOLO Detection**: Bounding boxes and confidence scores are generated per-frame via Ultralytics YOLOv8 (`Detector` in `backend/app/vision/detector.py`).
3. **Tracking**: Ultralytics built-in ByteTrack (`Tracker` in `backend/app/vision/tracker.py`) assigns stable tracking IDs across frames.
4. **Transport**: Frames (base64 encoded JPEG), track telemetry, and events are pushed to an async event bus (`backend/app/events/bus.py`).
5. **Event Generation**: The pipeline checks if any tracks intersect with defined polygon zones (`_check_intrusions` in `pipeline.py`).
6. **Persistence & Alerts**: `ws.py` intercepts raw intrusion events, writes them to the SQLite database via SQLAlchemy (`create_event_and_alert`), and broadcasts the enriched `alert` over WebSocket to the frontend.
7. **Frontend Sync**: The React frontend connects via WebSocket (`ws.py`) to receive frames, tracks, alerts, and system state updates in real-time.

## Capabilities Audit

**1. Does video processing actually run?**
Yes. A background thread processes OpenCV frames iteratively (`pipeline.py`).

**2. Does YOLO produce real detections?**
Yes. It uses the `yolov8n.pt` model directly via the `ultralytics` library.

**3. Does ByteTrack produce stable IDs?**
Yes. It leverages the integrated `tracker="bytetrack.yaml"` mechanism within Ultralytics YOLO to maintain ID persistence.

**4. How are detections transported to the frontend?**
A WebSocket connection receives `frame` (with base64 image data) and `tracks` JSON payloads.

**5. How are alerts generated?**
Intrusion logic runs iteratively in `pipeline.py` checking if track centroids are inside bounded polygons (zones). Entries and prolonged dwells fire `intrusion_event`.

**6. How are alerts persisted?**
The `intrusion_event` is caught by `_persist_intrusion` in `ws.py` which saves it to the SQLite DB and emits an `alert` WebSocket message.

**7. Does an intrusion actually cause a real backend event?**
Yes, real bounding boxes intersecting a polygon will trigger the event.

**8. Does WebSocket push that alert to the browser?**
Yes. Alerts are broadcasted via `bus.publish({ "type": "alert", ... })`.

**9. Which features are currently UI-only?**
Certain enrichments like Identity (ANPR, Facial recognition mock matches) and some operator controls/feedbacks (e.g., "MOCK", "SIMULATED" labels) are either simulated or mock data on the frontend to demonstrate capability.

**10. Which features are backend-functional?**
Real-time object detection (humans, vehicles), ByteTrack object tracking, spatial zone checking, DB persistence of alerts, live WebSocket streaming, and playback controls (pause/resume/seek).

**11. What is currently fragile or broken?**
The bundled synthetic video might not contain recognizable human/vehicle subjects for YOLO to consistently track. Hardcoded fallbacks might mask this during a demo.

**12. What is the highest-priority blocker for a convincing live demo?**
The lack of a realistic MP4 video feed (with clear humans/vehicles) that YOLO can detect. We need to make the video source configurable to easily drop in real footage into `data/videos/`.

## Conclusion
The backend is completely functional and solid. The vertical slice is intact. The priority now is entirely frontend UI/UX redesign and ensuring a realistic MP4 is loaded.
