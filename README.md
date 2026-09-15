# Operator Dashboard — AI CCTV Surveillance Prototype

> **SIH 2024 Internal Round Prototype**  
> An AI-powered CCTV operator console with YOLO detection, ByteTrack tracking,
> restricted-zone rules, persistent operator review, and real-time WebSocket updates.

---

## Quick Start

### Prerequisites
- Python 3.11
- Node.js 18+ / npm 9+
- A `.mp4` video file with humans or vehicles (placed in `data/videos/`)

### 1. Install Backend Dependencies

Create a virtual environment, then install the project dependencies used by the
backend. The existing local `backend/.venv` is ignored by Git.

### 2. Run the Backend

```bash
cd backend
.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend starts at **http://localhost:8000** — API docs at `/docs`.

### 3. Install & Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at **http://localhost:5173**.

### 4. Add a Video File

Place any `.mp4` file in:
```
data/videos/
```

On launch, select the discovered camera feed and click **"[ ENTER ]"**. The
backend remains idle until this action creates a fresh demo session.

---

## Demo Flow

1. **Start** → Select a camera feed and click "[ ENTER ]" — pipeline launches, YOLO model loads
2. **Detection** → Bounding boxes appear around humans and vehicles
3. **Tracking** → Each object gets a backend-issued session UID (`H-0001`, `V-0001`, etc.)
4. **Draw Zone** → Click "Draw Zone" in the right panel, click on video to draw polygon, Save
5. **Intrusion** → When a tracked object enters the zone → box turns red → alert fires instantly
6. **Alert Detail** → Click an alert for operator-facing details and internal IDs
7. **Feedback** → Acknowledge, or mark false positive and save an operator correction
8. **Pause** → Click Pause → see "Xs behind live" indicator
9. **Go Live** → Click "GO LIVE" → jumps to current position
10. **Failure** → Click "Simulate Failure" → feed shows "VIDEO FEED NOT FOUND"
11. **Recover** → Click "Recover" → feed resumes
12. **Pages** → Navigate to Humans, Vehicles, Notifications for full entity/event history

---

## What is Real vs Simulated

### ✅ REAL (Live Computer Vision)
| Feature | Technology |
|---------|-----------|
| Video playback | OpenCV |
| Human detection | YOLOv8n (Ultralytics) |
| Vehicle detection | YOLOv8n (classes: car, truck, bus, motorcycle) |
| Stable track IDs | Ultralytics ByteTrack (`persist=True`) |
| Virtual fence | Point-in-polygon (normalized coords) |
| Intrusion detection | Real centroid-vs-polygon check per frame |
| Suspicious activity | Deterministic SA-01 zone entry, SA-02 dwell, and SA-03 repeated-entry rules |
| Alert generation | Real events persisted to SQLite |
| Alert persistence | SQLite (survives page refresh) |
| Real-time updates | WebSocket push to all clients |
| Playback controls | Pause / Resume / Restart / Go Live |
| Feed failure state | VIDEO FEED NOT FOUND UI |

### 🟡 SIMULATED (Demo/Prototype)
| Feature | Label in UI |
|---------|------------|
| Human identity enrichment | `NO MATCH` unless controlled enrichment data exists; never auto-verified |
| Vehicle ANPR | `UNAVAILABLE` when no plate OCR result is available; no plate is fabricated |
| Operator correction | Operator-provided data, persisted separately from the machine observation |
| Suspicious activity | Rule-based operational hypothesis, not behavioural ML or proof of intent |
| External notifications | Not implemented |
| Night vision | Visual filter only |

---

## Project Structure

```
SIH Prototype/
├── backend/
│   ├── app/
│   │   ├── api/          # REST routes + WebSocket
│   │   ├── core/         # Config, logging, database
│   │   ├── events/       # In-process async event bus
│   │   ├── models/       # SQLAlchemy ORM + Pydantic schemas
│   │   ├── services/     # Alert, track, zone business logic
│   │   ├── video/        # VideoPipeline (OpenCV processing thread)
│   │   └── vision/       # YOLO detector, ByteTrack wrapper
│   └── main.py
├── frontend/
│   └── src/
│       ├── components/   # VideoFeed, AlertPanel, TrackOverlay, etc.
│       ├── hooks/        # useWebSocket
│       ├── pages/        # CommandCenter, Notifications, Humans, Vehicles, Config
│       ├── services/     # api.ts, ws.ts
│       ├── store/        # Zustand global state
│       └── types/        # TypeScript interfaces
├── data/
│   └── videos/           # ← Drop your .mp4 here
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/status` | Pipeline + alert status |
| POST | `/api/cameras/start` | Start video pipeline |
| POST | `/api/cameras/pause` | Pause feed |
| POST | `/api/cameras/resume` | Resume feed |
| POST | `/api/cameras/golive` | Jump to live position |
| POST | `/api/cameras/restart` | Restart from beginning |
| POST | `/api/cameras/simulate-failure` | Simulate camera failure |
| POST | `/api/cameras/recover` | Recover from failure |
| GET | `/api/zones` | List zones |
| POST | `/api/zones` | Create restricted zone |
| DELETE | `/api/zones/{id}` | Delete zone |
| GET | `/api/alerts` | List alerts (paginated) |
| GET | `/api/alerts/{id}` | Get alert detail |
| PATCH | `/api/alerts/{id}/feedback` | Operator feedback |
| GET | `/api/tracks` | List tracked entities |
| WS | `/ws` | Real-time event stream |

---

## Configuration

Key settings in `backend/app/core/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `DETECTION_CONFIDENCE` | 0.4 | YOLO confidence threshold |
| `FRAME_SKIP` | 2 | Run YOLO + ByteTrack every second frame; retained track state is broadcast between updates |
| `TRACK_MISSED_UPDATES` | 3 | Inference updates retained before a missing ByteTrack object is marked exited |
| `JPEG_QUALITY` | 75 | Video stream quality |
| `SUSPICIOUS_DWELL_SECONDS` | 30 | SA-02 continuous restricted-zone dwell threshold |
| `REPEATED_ENTRY_COUNT` | 3 | SA-03 zone entry count threshold |
| `REPEATED_ENTRY_WINDOW_SECONDS` | 120 | SA-03 rolling-window duration |

---

## Runtime data and documentation

- Place local demo footage in `data/videos/`; video files are intentionally
  ignored by Git.
- SQLite runtime state is stored locally under `data/` and is ignored by Git.
- Review [demo metrics](docs/demo-metrics.md) for measured runtime observations.
- Review the [suspicious-activity policy](docs/suspicious-activity-policy.md)
  for deterministic rules, thresholds, review semantics, and limitations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 + FastAPI + Uvicorn |
| Vision | YOLOv8n (Ultralytics) + ByteTrack (supervision) |
| Video | OpenCV |
| Persistence | SQLite + SQLAlchemy async |
| Real-time | WebSocket |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS (command-center dark theme) |
| State | Zustand |

---

*Prototype built for SIH 2024 internal round. Not for production deployment.*
