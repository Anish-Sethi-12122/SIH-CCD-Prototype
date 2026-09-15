"""Main video processing pipeline. Runs in a background thread."""
import asyncio
import base64
import threading
import time
import uuid
from collections import deque
from datetime import datetime

import cv2
import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.events.bus import bus
from app.vision.detector import get_detector
from app.vision.tracker import Tracker

logger = get_logger(__name__)

COLORS = {
    "human": (0, 255, 120),    # green
    "vehicle": (255, 165, 0),  # orange
    "alert": (0, 0, 255),      # red (intrusion)
}

class VideoPipeline:
    def __init__(self):
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._run_generation = 0
        self._paused = threading.Event()
        self._loop: asyncio.AbstractEventLoop | None = None

        self.camera_id: str = ""
        self.video_path: str = ""
        self.active: bool = False
        self.frame_count: int = 0
        self.fps: float = 25.0
        self.total_frames: int = 0
        self.current_frame: int = 0
        self.is_live: bool = True
        self.paused_at_frame: int = 0

        # Intrusion state is intentionally runtime/session scoped.
        self._in_zone: set[tuple[int, str]] = set()

        # Latest ByteTrack positions remain available between sparse inference
        # calls.  A missed inference result does not erase a visual track.
        self._active_tracks: list[dict] = []
        self._track_registry: dict[int, dict] = {}
        self._track_uids: dict[int, str] = {}
        self._human_uid_sequence = 0
        self._vehicle_uid_sequence = 0
        self._pending_exits: list[dict] = []
        self._alerted_track_ids: set[int] = set()
        self._zone_entered_at: dict[tuple[int, str], float] = {}
        self._entry_history: dict[tuple[int, str], list[float]] = {}
        self._rule_fired: set[tuple[str, int, str]] = set()

        # Active zones (polygon, id)
        self._zones: list[dict] = []  # [{id, name, polygon[[x,y]normalized]},...]

        # Controls
        self.detection_enabled: bool = True
        self.tracking_enabled: bool = True
        self.fencing_enabled: bool = True
        self.session_id: str | None = None
        self.camera_code: str = ""
        self._frame_durations_ms: deque[float] = deque(maxlen=120)
        self._inference_durations_ms: deque[float] = deque(maxlen=60)
        self._event_latencies_ms: deque[float] = deque(maxlen=60)
        self.source_resolution: tuple[int, int] | None = None

    def set_zones(self, zones: list[dict]):
        self._zones = [dict(zone) for zone in zones]
        logger.info(f"Pipeline: {len(zones)} zone(s) active")

    @property
    def zones(self) -> list[dict]:
        """A copy of only the active operator session's zones."""
        return [dict(zone) for zone in self._zones]

    def has_zone(self, zone_id: str) -> bool:
        return any(zone["id"] == zone_id for zone in self._zones)

    def update_zone(self, zone: dict):
        self._zones = [z for z in self._zones if z["id"] != zone["id"]]
        if zone.get("active", True):
            self._zones.append(dict(zone))

    def pause(self):
        self._paused.set()
        self.paused_at_frame = self.current_frame
        self.is_live = False
        logger.info("Pipeline paused")

    def resume(self):
        self._paused.clear()
        logger.info("Pipeline resumed")

    def go_live(self):
        self._paused.clear()
        self.is_live = True
        # Signal seek to end
        self._seek_live = True
        logger.info("Pipeline: go live")

    def restart(self):
        self._seek_start = True
        self._paused.clear()
        self.is_live = False
        logger.info("Pipeline: restart")

    def start(self, camera_id: str, video_path: str, loop: asyncio.AbstractEventLoop, session_id: str, camera_code: str):
        # A start is a hard operator-session boundary.  Do not reuse tracker,
        # zone, alert, or intrusion state from any prior selected feed.
        self._reset_runtime_state()
        self._run_generation += 1
        generation = self._run_generation
        self.camera_id = camera_id
        self.video_path = video_path
        self._loop = loop
        self.session_id = session_id
        self.camera_code = camera_code
        self._stop_event.clear()
        self._paused.clear()
        self._seek_live = False
        self._seek_start = False
        self.active = True
        self._tracker = Tracker()
        self._thread = threading.Thread(
            target=self._run,
            args=(generation, camera_id, video_path, session_id),
            daemon=True,
            name="VideoPipeline",
        )
        self._thread.start()
        logger.info(f"Pipeline started: {video_path} session: {session_id}")

    def _reset_runtime_state(self):
        self._in_zone.clear()
        self._active_tracks = []
        self._track_registry = {}
        self._track_uids = {}
        self._human_uid_sequence = 0
        self._vehicle_uid_sequence = 0
        self._pending_exits = []
        self._alerted_track_ids.clear()
        self._zone_entered_at = {}
        self._entry_history = {}
        self._rule_fired = set()
        self._zones = []
        self.frame_count = 0
        self.current_frame = 0
        self.total_frames = 0
        self._frame_durations_ms.clear()
        self._inference_durations_ms.clear()
        self._event_latencies_ms.clear()
        self.source_resolution = None

    def telemetry(self) -> dict:
        average_frame_ms = sum(self._frame_durations_ms) / len(self._frame_durations_ms) if self._frame_durations_ms else 0
        average_inference_ms = sum(self._inference_durations_ms) / len(self._inference_durations_ms) if self._inference_durations_ms else 0
        average_event_ms = sum(self._event_latencies_ms) / len(self._event_latencies_ms) if self._event_latencies_ms else 0
        return {
            "model": settings.MODEL_PATH,
            "inference_image_size": settings.INFERENCE_IMAGE_SIZE,
            "confidence_threshold": settings.DETECTION_CONFIDENCE,
            "detection_classes": settings.DETECTION_CLASSES,
            "tracker": "ByteTrack (ultralytics bytetrack.yaml, persist=True)",
            "source_resolution": list(self.source_resolution) if self.source_resolution else None,
            "source_fps": self.fps,
            "processed_fps": round(1000 / average_frame_ms, 2) if average_frame_ms else 0,
            "inference_fps": round(1000 / average_inference_ms, 2) if average_inference_ms else 0,
            "average_inference_ms": round(average_inference_ms, 1),
            "approx_event_latency_ms": round(average_event_ms, 1),
            "frame_skip": settings.FRAME_SKIP,
            "track_missed_updates": settings.TRACK_MISSED_UPDATES,
            "active_tracks": len(self._active_tracks),
        }

    def stop(self):
        self._stop_event.set()
        self.active = False
        if self._thread:
            # A new operator session must not share a tracker or event producer
            # with the previous one.  Wait for its current inference call to
            # finish before allowing the caller to start the next session.
            self._thread.join()
            self._thread = None
        logger.info("Pipeline stopped")

    def _publish(self, msg: dict, generation: int | None = None):
        if generation is not None and generation != self._run_generation:
            return
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(bus.publish(msg), self._loop)
        else:
            logger.error("Pipeline _publish failed: loop is not running or None!")

    def _run(self, generation: int, camera_id: str, video_path: str, session_id: str):
        detector = None
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Cannot open video: {video_path}")
            self._publish({"type": "status", "payload": {
                "feed": "unavailable", "camera_id": camera_id, "session_id": session_id,
            }}, generation)
            return

        self.fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        self.total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.source_resolution = (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
        frame_delay = 1.0 / self.fps
        frame_num = 0

        self._publish({"type": "status", "payload": {
            "feed": "live", "camera_id": camera_id, "fps": self.fps,
            "session_id": session_id,
        }}, generation)

        while not self._stop_event.is_set() and generation == self._run_generation:
            # Handle controls
            if hasattr(self, '_seek_live') and self._seek_live:
                cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, self.total_frames - 10))
                self._seek_live = False
                self.is_live = True

            if hasattr(self, '_seek_start') and self._seek_start:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                self._seek_start = False
                frame_num = 0
                self._in_zone.clear()
                self._alerted_track_ids.clear()
                self._zone_entered_at = {}
                self._entry_history = {}
                self._rule_fired = set()
                self._track_registry = {}
                self._pending_exits = []
                self._tracker.reset()

            if self._paused.is_set():
                time.sleep(0.1)
                continue

            t0 = time.time()
            ret, frame = cap.read()
            if not ret:
                # Loop video
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_num = 0
                self._in_zone.clear()
                self._alerted_track_ids.clear()
                self._zone_entered_at = {}
                self._entry_history = {}
                self._rule_fired = set()
                self._track_registry = {}
                self._pending_exits = []
                self._tracker.reset()
                continue

            frame_num += 1
            self.current_frame = frame_num
            self.frame_count += 1

            detections: list[dict] = []
            inference_ran = self.detection_enabled and frame_num % settings.FRAME_SKIP == 0
            if inference_ran:
                inference_started = time.perf_counter()
                if self.tracking_enabled:
                    # Tracker runs YOLO + ByteTrack in a single call
                    detections = self._tracker.track(frame)
                else:
                    # Detection only, sequential IDs
                    if detector is None:
                        detector = get_detector()
                    raw_detections = detector.detect(frame)
                    h, w = frame.shape[:2]
                    for i, d in enumerate(raw_detections):
                        bbox = d["bbox"]
                        cx = (bbox[0] + bbox[2]) / 2 / w
                        cy = (bbox[1] + bbox[3]) / 2 / h
                        detections.append({
                            "track_id": i + 1,
                            "bbox": bbox,
                            "bbox_norm": [bbox[0]/w, bbox[1]/h, bbox[2]/w, bbox[3]/h],
                            "centroid_norm": [cx, cy],
                            "confidence": d["confidence"],
                            "class_id": d["class_id"],
                            "object_type": d["object_type"],
                            "object_class": d["object_class"],
                        })
                self._inference_durations_ms.append((time.perf_counter() - inference_started) * 1000)

            tracked_objects = self._update_track_states(detections, inference_ran)

            # Intrusion check
            intrusion_events = []
            if self.fencing_enabled and self._zones:
                intrusion_events = self._check_intrusions(tracked_objects)
                for event in intrusion_events:
                    event["event_latency_ms"] = round((time.time() - t0) * 1000, 1)
                    self._event_latencies_ms.append(event["event_latency_ms"])

            # Draw overlays on frame
            if getattr(self, 'backend_drawing_enabled', False):
                annotated = self._draw(frame, tracked_objects)
            else:
                annotated = frame.copy()

            # Encode frame
            _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, settings.JPEG_QUALITY])
            b64 = base64.b64encode(buf.tobytes()).decode()

            # Update active tracks snapshot
            self._active_tracks = [track for track in tracked_objects if track["state"] == "active"]

            # Publish
            behind_live = 0
            if not self.is_live and self.total_frames > 0:
                behind_live = max(0, int((self.total_frames - self.current_frame) / self.fps))

            self._publish({
                "type": "frame",
                "payload": {
                    "image": b64,
                    "frame_num": frame_num,
                    "total_frames": self.total_frames,
                    "fps": self.fps,
                    "is_live": self.is_live,
                    "behind_live_seconds": behind_live,
                    "camera_id": camera_id,
                    "camera_code": self.camera_code,
                    "session_id": session_id,
                    "frame_w": frame.shape[1],
                    "frame_h": frame.shape[0],
                }
            }, generation)

            self._publish({
                "type": "tracks",
                "payload": {
                    "tracks": tracked_objects + self._pending_exits,
                    "camera_id": camera_id,
                    "camera_code": self.camera_code,
                    "session_id": session_id,
                    "alerted_track_ids": list(self._alerted_track_ids),
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }, generation)

            if inference_ran or self._pending_exits:
                self._publish({
                    "type": "track_registry",
                    "payload": {
                        "tracks": tracked_objects + self._pending_exits,
                        "camera_id": camera_id,
                        "camera_code": self.camera_code,
                        "session_id": session_id,
                        "alerted_track_ids": list(self._alerted_track_ids),
                    },
                }, generation)

            for ev in intrusion_events:
                self._publish({"type": "intrusion_event", "payload": ev}, generation)

            # An EXITED state is a one-update signal to the frontend.  The next
            # update omits it after the UI has been told to remove the box.
            self._pending_exits = []

            elapsed = time.time() - t0
            self._frame_durations_ms.append(elapsed * 1000)
            sleep_time = max(0, frame_delay - elapsed)
            time.sleep(sleep_time)

        cap.release()
        logger.info("Pipeline thread exiting")

    def _update_track_states(self, detections: list[dict], inference_ran: bool) -> list[dict]:
        """Keep boxes stable between inference frames and expire them deliberately."""
        if not inference_ran:
            return [dict(track) for track in self._track_registry.values()]

        seen_ids = set()
        for detection in detections:
            track_id = detection["track_id"]
            seen_ids.add(track_id)
            track = dict(detection)
            track["track_uid"] = self._track_uids.get(track_id) or self._new_track_uid(track["object_type"])
            self._track_uids[track_id] = track["track_uid"]
            track["state"] = "active"
            track["missed_updates"] = 0
            self._track_registry[track_id] = track

        for track_id, previous in list(self._track_registry.items()):
            if track_id in seen_ids:
                continue
            missed = int(previous.get("missed_updates", 0)) + 1
            if missed >= settings.TRACK_MISSED_UPDATES:
                exited = dict(previous)
                exited["state"] = "exited"
                exited["missed_updates"] = missed
                self._pending_exits.append(exited)
                del self._track_registry[track_id]
            else:
                previous["state"] = "temporarily_missed"
                previous["missed_updates"] = missed

        return [dict(track) for track in self._track_registry.values()]

    def _new_track_uid(self, object_type: str) -> str:
        if object_type == "human":
            self._human_uid_sequence += 1
            return f"H-{self._human_uid_sequence:04d}"
        self._vehicle_uid_sequence += 1
        return f"V-{self._vehicle_uid_sequence:04d}"

    def _check_intrusions(self, tracked_objects: list[dict]) -> list[dict]:
        events = []
        # Only an *observed* position outside a polygon ends an intrusion.  A
        # detector/tracker gap is unknown, not an exit; treating it as an exit
        # was allowing the same ByteTrack ID to re-enter and raise duplicates.
        observed_outside: set[tuple[int, str]] = set()

        now = time.time()
        for obj in tracked_objects:
            # Temporarily missed tracks retain their last position so a single
            # detector miss cannot manufacture an EXIT followed by a duplicate
            # ENTER event.  EXITED tracks are not present in this list.
            cx, cy = obj["centroid_norm"]
            tid = obj["track_id"]
            for zone in self._zones:
                zid = zone["id"]
                poly = zone["polygon"]
                if len(poly) < 3:
                    continue
                from app.services.zone_service import point_in_polygon
                inside = point_in_polygon(cx, cy, poly)
                key = (tid, zid)
                if inside:
                    if key not in self._in_zone:
                        # Entry event
                        self._in_zone.add(key)
                        self._zone_entered_at[key] = now
                        history = [t for t in self._entry_history.get(key, []) if now - t <= settings.REPEATED_ENTRY_WINDOW_SECONDS]
                        history.append(now)
                        self._entry_history[key] = history
                        self._alerted_track_ids.add(tid)
                        events.append({
                            "intrusion_id": uuid.uuid4().hex,
                            "event_type": "zone_intrusion",
                            "severity": "critical",
                            "track_id": tid,
                            "track_uid": obj["track_uid"],
                            "zone_id": zid,
                            "zone_name": zone["name"],
                            "object_type": obj["object_type"],
                            "camera_id": self.camera_id,
                            "camera_code": self.camera_code,
                            "session_id": self.session_id,
                            "confidence": obj["confidence"],
                            "timestamp": datetime.utcnow().isoformat(),
                        })
                        if len(history) >= settings.REPEATED_ENTRY_COUNT and ("SA-03", tid, zid) not in self._rule_fired:
                            self._rule_fired.add(("SA-03", tid, zid))
                            events.append(self._suspicious_event(obj, zone, "SA-03", "Repeated restricted-zone entry", "warning"))
                    elif now - self._zone_entered_at.get(key, now) >= settings.SUSPICIOUS_DWELL_SECONDS and ("SA-02", tid, zid) not in self._rule_fired:
                        self._rule_fired.add(("SA-02", tid, zid))
                        events.append(self._suspicious_event(obj, zone, "SA-02", "Restricted-zone dwell exceeded", "warning"))
                else:
                    observed_outside.add(key)

        # An observed polygon exit clears the per-session / track / zone state
        # and permits exactly one legitimate later re-entry alert.
        exited = self._in_zone & observed_outside
        for key in exited:
            self._in_zone.discard(key)
            self._zone_entered_at.pop(key, None)
            self._rule_fired.discard(("SA-02", key[0], key[1]))
            track_id, _ = key
            if not any(active_track == track_id for active_track, _ in self._in_zone):
                self._alerted_track_ids.discard(track_id)

        return events

    def _suspicious_event(self, obj: dict, zone: dict, rule_id: str, reason: str, severity: str) -> dict:
        """One deterministic rule event; persistence remains on the existing bus."""
        return {
            "intrusion_id": uuid.uuid4().hex, "event_type": "suspicious_activity",
            "rule_id": rule_id, "reason": reason, "severity": severity,
            "track_id": obj["track_id"], "track_uid": obj["track_uid"],
            "zone_id": zone["id"], "zone_name": zone["name"],
            "object_type": obj["object_type"], "camera_id": self.camera_id,
            "camera_code": self.camera_code, "session_id": self.session_id,
            "confidence": obj["confidence"], "timestamp": datetime.utcnow().isoformat(),
        }

    def _draw(self, frame: np.ndarray, tracked_objects: list[dict]) -> np.ndarray:
        out = frame.copy()
        h, w = out.shape[:2]

        # Draw zones
        for zone in self._zones:
            poly = zone["polygon"]
            if len(poly) >= 3:
                pts = np.array([[int(p[0]*w), int(p[1]*h)] for p in poly], dtype=np.int32)
                overlay = out.copy()
                cv2.fillPoly(overlay, [pts], (255, 50, 50))
                cv2.addWeighted(overlay, 0.25, out, 0.75, 0, out)
                cv2.polylines(out, [pts], True, (0, 0, 255), 2)
                label = zone.get("name", "Restricted Zone")
                cx_z = int(np.mean(pts[:, 0]))
                cy_z = int(np.mean(pts[:, 1]))
                cv2.putText(out, f"[RESTRICTED] {label}", (cx_z - 60, cy_z),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 80, 80), 1, cv2.LINE_AA)

        # Draw tracks
        for obj in tracked_objects:
            x1, y1, x2, y2 = [int(v) for v in obj["bbox"]]
            tid = obj["track_id"]
            otype = obj["object_type"]
            conf = obj["confidence"]

            is_alerted = tid in self._alerted_track_ids
            color = (0, 0, 255) if is_alerted else COLORS.get(otype, (200, 200, 200))
            thickness = 2

            cv2.rectangle(out, (x1, y1), (x2, y2), color, thickness)

            prefix = "H" if otype == "human" else "V"
            label = f"{obj.get('track_uid', f'{prefix}-{tid:04d}')} {obj['object_class']} {conf:.2f}"
            lw, lh = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
            cv2.rectangle(out, (x1, y1 - lh - 6), (x1 + lw + 4, y1), color, -1)
            cv2.putText(out, label, (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        # Timestamp
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        cv2.putText(out, ts, (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)
        cv2.putText(out, "OPERATOR DASHBOARD [PROTOTYPE]", (10, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 220, 100), 1, cv2.LINE_AA)

        return out

# Singleton pipeline
pipeline = VideoPipeline()
