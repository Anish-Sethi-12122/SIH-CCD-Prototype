# Operator Dashboard — Demo Metrics

This report separates implementation facts from measurements made on the local
prototype. It deliberately does **not** claim a proprietary detection-accuracy
percentage: no labelled evaluation set was used for this demo.

## A. Implementation facts

| Item | Current implementation |
| --- | --- |
| Model weights | `yolov8n.pt` — YOLOv8 nano variant |
| Vision runtime | Ultralytics 8.4.153; PyTorch 2.14.0+cpu; OpenCV 5.0.0 |
| Detection classes admitted by the pipeline | COCO IDs `0, 1, 2, 3, 5, 7`: person, bicycle, car, motorcycle, bus and truck |
| Confidence threshold | 0.40 |
| Inference input size | 640 px (`imgsz=640`) |
| Sampling cadence | Every second decoded frame (`FRAME_SKIP=2`) |
| Tracker | Ultralytics ByteTrack, `persist=True` |
| ByteTrack configuration | `track_high_thresh=0.25`, `track_low_thresh=0.10`, `new_track_thresh=0.25`, `track_buffer=30`, `match_thresh=0.80` (installed Ultralytics `bytetrack.yaml`) |
| Visual/registry loss policy | Last known state is retained between inference frames; a track is marked `temporarily_missed` before being emitted as `exited` after 3 missed inference updates. |
| Session boundary | Each camera start creates a new session, resets tracker/UID/zone/intrusion runtime state, and scopes alert and registry queries to that session. |

### Identifier note

The long UUID previously shown beside the product name was the persistent
database `Camera.id` (the internal camera entity ID), not an operator camera
label, session ID, event ID, or track identity. It remains exposed as
`internal_id` in the API and in the debug/detail surfaces. Operator chrome now
uses the configured `camera_code` (`CAM-01`), while objects use backend-issued
`H-0001` / `V-0001` UIDs.

## B. Measured demo results

Measurements were read from the running `/api/status` telemetry during a real
run of the bundled CCTV MP4 on this machine (CPU inference). Values are recent
window averages, not a hardware-independent benchmark.

| Observation | Measured result |
| --- | --- |
| Source video | 1280 × 720, 30.0 FPS, 1,482 frames |
| Processed FPS | 63.62–69.94 FPS across the sampled windows |
| Inference FPS | 48.07–53.04 FPS across the sampled windows |
| Average model+tracking call | 18.9–20.8 ms |
| Active tracks at sampled points | 5–6 |
| Fresh-session registry sample | 9 vehicle records: 6 `IN_FRAME`, 3 `OUT_OF_FRAME`; 0 alerts and 0 zones before the controlled test |
| Controlled zone test | 10 intrusion alerts for 10 unique `(track_uid, zone_id)` keys; no duplicate key was observed |
| Controlled zone identities | Vehicles and humans were both observed; examples included `V-0001` and `H-0002` |
| Event-decision latency | 22.4 ms average during the controlled zone test |

The event latency above starts when the pipeline has decoded a frame and ends
when it decides to emit the intrusion event. It does not include browser
WebSocket transport, React rendering, or a human operator's display latency.

## C. Accuracy / quality

### Our demo measurement

The controlled test validates the event transition rule, not detector accuracy:
each observed track entering the full-frame test zone generated one alert, and
continued `INSIDE` observations did not generate another alert for the same
track/zone key. The run also showed persistent `OUT_OF_FRAME` registry rows
after tracks left the live view.

No labelled ground truth was prepared, so precision, recall, mAP and an overall
"accuracy" figure were not calculated. The demo should describe these as
operational observations, not model validation.

### Model benchmark

No model-benchmark value is reported here. `yolov8n.pt` is an Ultralytics
COCO-pretrained weight, but a published benchmark must be cited from the exact
upstream release and evaluation conditions rather than presented as a result of
this prototype. It would not be comparable to this CCTV scene without a
labelled, representative evaluation set.

### Measured limitations

- The run uses CPU inference; the measured throughput is machine-dependent.
- The source segment contained fewer people than vehicles at the sampled
  moments, so it is not a balanced class evaluation.
- ByteTrack can legitimately allocate a new UID after a genuine track
  termination/re-identification failure; UIDs are stable only for the lifetime
  of that tracker track within one surveillance session.
- Event-decision latency excludes browser/network display time.

## Suspicious activity metrics

### A. Configured policy thresholds

- SA-01 restricted-zone entry: immediate, critical.
- SA-02 restricted-zone dwell: 30 seconds, warning.
- SA-03 repeated entry: 3 entries in a 120-second rolling window, warning.
- Rule evaluation runs for each processed video frame using the retained tracker
  state; inference itself is configured for every second decoded frame.

### B. Observed demo results

A controlled full-frame-zone run on 2026-09-16 processed 14 registry tracks and
created 7 SA-01 alerts for distinct entering tracks in the sampled period. A
vehicle false-positive correction was persisted and re-read through the alert
API without changing the original machine alert. This is a controlled
demonstration, not an accuracy evaluation. No 30-second dwell or three-crossing
result is reported because those thresholds have not yet been observed under
controlled timing.

## D. Pitch-ready summary

| Metric | Value | Measurement method |
| --- | --- | --- |
| Model | YOLOv8 nano (`yolov8n.pt`) | Loaded pipeline configuration |
| Tracker | ByteTrack, persistent | Loaded pipeline configuration |
| Input video | 1280 × 720 at 30.0 FPS | OpenCV source metadata reported by `/api/status` |
| Inference input | 640 px | Pipeline configuration |
| Confidence threshold | 0.40 | Pipeline configuration |
| Processed FPS | 63.62–69.94 | Recent-window runtime telemetry during CCTV run |
| Inference FPS | 48.07–53.04 | Recent-window runtime telemetry during CCTV run |
| Average inference time | 18.9–20.8 ms | Recent-window runtime telemetry during CCTV run |
| Event-decision latency | 22.4 ms | Controlled zone test telemetry; decode-to-event only |
| Active tracks | 5–6 | Runtime telemetry at sampled points |
| Zone event de-duplication | 10 alerts / 10 unique track-zone entries | Controlled full-frame zone test |
| Prototype accuracy figure | Not claimed | No labelled evaluation set |
