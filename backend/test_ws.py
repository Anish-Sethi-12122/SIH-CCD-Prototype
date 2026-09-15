import asyncio
import websockets
import json

async def test():
    async with websockets.connect('ws://localhost:8000/ws', max_size=None) as ws:
        frame_count = 0
        empty_count = 0
        for _ in range(200):
            m = json.loads(await ws.recv())
            if m['type'] == 'frame':
                frame_count += 1
                img = m['payload'].get('image')
                if not img:
                    empty_count += 1
        print(f"Total frames: {frame_count}, Empty images: {empty_count}")

asyncio.run(test())
