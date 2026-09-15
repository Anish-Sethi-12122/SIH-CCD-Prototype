"""
Generate a synthetic test video with moving objects for demo purposes.
Creates a 60-second video at 25fps with simulated human/vehicle silhouettes.
"""
import cv2
import numpy as np
import os
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "videos"
OUTPUT_PATH = OUTPUT_DIR / "demo_surveillance.mp4"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1280, 720
FPS = 25
DURATION = 90  # seconds
TOTAL_FRAMES = FPS * DURATION


def draw_person(frame, x, y, w=40, h=80, color=(0, 200, 100)):
    """Draw a simple human silhouette."""
    # Body
    cv2.rectangle(frame, (x - w//4, y - h//2), (x + w//4, y + h//4), color, -1)
    # Head
    cv2.circle(frame, (x, y - h//2 - 15), 15, color, -1)
    # Legs
    cv2.line(frame, (x, y + h//4), (x - 10, y + h//2), color, 4)
    cv2.line(frame, (x, y + h//4), (x + 10, y + h//2), color, 4)
    # Arms
    cv2.line(frame, (x, y - h//4), (x - w//2, y), color, 3)
    cv2.line(frame, (x, y - h//4), (x + w//2, y), color, 3)


def draw_car(frame, x, y, w=100, h=50, color=(200, 150, 0)):
    """Draw a simple car shape."""
    # Body
    cv2.rectangle(frame, (x - w//2, y - h//2), (x + w//2, y + h//2), color, -1)
    # Roof
    cv2.rectangle(frame, (x - w//3, y - h), (x + w//3, y - h//2), color, -1)
    # Windows
    cv2.rectangle(frame, (x - w//3 + 5, y - h + 5), (x - 5, y - h//2 - 2), (50, 50, 150), -1)
    cv2.rectangle(frame, (x + 5, y - h + 5), (x + w//3 - 5, y - h//2 - 2), (50, 50, 150), -1)
    # Wheels
    cv2.circle(frame, (x - w//3, y + h//2), 12, (30, 30, 30), -1)
    cv2.circle(frame, (x + w//3, y + h//2), 12, (30, 30, 30), -1)


def generate_background():
    """Generate a realistic-looking outdoor scene background."""
    bg = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    
    # Sky gradient
    for y in range(HEIGHT // 3):
        intensity = int(20 + y * 0.5)
        bg[y, :] = [intensity + 10, intensity + 5, intensity]
    
    # Ground
    bg[HEIGHT//3:, :] = [25, 30, 25]  # Dark gray ground
    
    # Road
    road_y1, road_y2 = HEIGHT // 2, HEIGHT
    bg[road_y1:road_y2, WIDTH//4:3*WIDTH//4] = [40, 40, 40]
    
    # Road markings
    for x in range(WIDTH//4, 3*WIDTH//4, 60):
        cv2.line(bg, (x, HEIGHT//2 + HEIGHT//8), (x + 30, HEIGHT//2 + HEIGHT//8), (150, 150, 150), 3)
    
    # Buildings in background
    buildings = [(100, 200, 80, HEIGHT//3), (220, 150, 90, HEIGHT//3), 
                 (700, 180, 70, HEIGHT//3), (1100, 160, 100, HEIGHT//3),
                 (950, 200, 60, HEIGHT//3)]
    for bx, by, bw, bh in buildings:
        color = tuple(np.random.randint(30, 60, 3).tolist())
        cv2.rectangle(bg, (bx, by), (bx + bw, by + bh), color, -1)
        # Windows
        for wy in range(by + 10, by + bh - 10, 20):
            for wx in range(bx + 5, bx + bw - 5, 15):
                if np.random.random() > 0.4:
                    cv2.rectangle(bg, (wx, wy), (wx + 8, wy + 12), (180, 180, 100), -1)
    
    # Add some noise for texture
    noise = np.random.randint(-10, 10, bg.shape, dtype=np.int16)
    bg = np.clip(bg.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    return bg


print(f"Generating {DURATION}s synthetic surveillance video...")
print(f"Output: {OUTPUT_PATH}")

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
writer = cv2.VideoWriter(str(OUTPUT_PATH), fourcc, FPS, (WIDTH, HEIGHT))

bg = generate_background()

# Define moving objects
objects = [
    # Person 1: walks left to right across the frame
    {"type": "person", "start": (100, 500), "end": (1100, 500), "color": (100, 220, 100), "speed": 3},
    # Person 2: enters from right, moves to center
    {"type": "person", "start": (1200, 450), "end": (400, 480), "color": (200, 200, 100), "speed": 2},
    # Car 1: moves across bottom
    {"type": "car", "start": (0, 600), "end": (1400, 600), "color": (180, 120, 50), "speed": 8},
    # Car 2: opposite direction
    {"type": "car", "start": (1300, 550), "end": (-100, 550), "color": (100, 100, 200), "speed": 6},
    # Person 3: loiters in center (will trigger dwell alert if zone drawn)
    {"type": "person", "start": (600, 380), "end": (650, 400), "color": (220, 100, 100), "speed": 0.5},
]

for frame_num in range(TOTAL_FRAMES):
    frame = bg.copy()
    t = frame_num / FPS  # Time in seconds
    progress = frame_num / TOTAL_FRAMES
    
    # Draw each object at its current position
    for obj in objects:
        sx, sy = obj["start"]
        ex, ey = obj["end"]
        spd = obj["speed"]
        
        # Calculate position based on time
        max_dist = ((ex - sx)**2 + (ey - sy)**2)**0.5
        if max_dist > 0:
            total_time = max_dist / (spd * FPS)
            t_mod = (t % (total_time * 2))
            if t_mod < total_time:
                p = t_mod / total_time
            else:
                p = 1 - (t_mod - total_time) / total_time
        else:
            p = 0.5 + 0.1 * np.sin(t * 2)
        
        x = int(sx + (ex - sx) * p)
        y = int(sy + (ey - sy) * p)
        
        # Add small oscillation for realism
        x += int(3 * np.sin(t * 1.5 + obj["start"][0]))
        y += int(2 * np.cos(t * 1.2 + obj["start"][1]))
        
        if obj["type"] == "person":
            draw_person(frame, x, y, color=obj["color"])
        else:
            draw_car(frame, x, y, color=obj["color"])
    
    # Overlay UI elements
    ts = f"CAM-01 | {int(t // 3600):02d}:{int((t % 3600) // 60):02d}:{int(t % 60):02d}"
    cv2.putText(frame, ts, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1, cv2.LINE_AA)
    cv2.putText(frame, "SYNTHETIC TEST VIDEO - FOR DEMO USE", (WIDTH//2 - 180, HEIGHT - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1, cv2.LINE_AA)
    
    # Corner brackets
    for cx, cy, dx, dy in [(20, 20, 1, 1), (WIDTH-20, 20, -1, 1), (20, HEIGHT-20, 1, -1), (WIDTH-20, HEIGHT-20, -1, -1)]:
        cv2.line(frame, (cx, cy), (cx + dx*20, cy), (0, 200, 255), 1)
        cv2.line(frame, (cx, cy), (cx, cy + dy*20), (0, 200, 255), 1)
    
    writer.write(frame)
    
    if frame_num % (FPS * 10) == 0:
        print(f"  Generated {frame_num // FPS}s / {DURATION}s...")

writer.release()
print(f"\nDone! Video saved: {OUTPUT_PATH}")
print(f"Size: {OUTPUT_PATH.stat().st_size / 1024 / 1024:.1f} MB")
print("\nNote: This is a synthetic test video.")
print("For best results, replace with a real CCTV video containing humans and vehicles.")
