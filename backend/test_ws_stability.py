"""Manual smoke test: track messages must not go empty between inference frames."""
import asyncio
import json

import websockets


async def test() -> None:
    updates = nonempty = empty_after_first_track = 0
    states: set[str] = set()
    async with websockets.connect("ws://127.0.0.1:8000/ws", max_size=None) as ws:
        while updates < 40:
            message = json.loads(await ws.recv())
            if message["type"] != "tracks":
                continue
            updates += 1
            tracks = message["payload"]["tracks"]
            if tracks:
                nonempty += 1
            elif nonempty:
                empty_after_first_track += 1
            states.update(track.get("state", "missing") for track in tracks)

    print({
        "track_updates": updates,
        "nonempty_updates": nonempty,
        "empty_after_first_track": empty_after_first_track,
        "states": sorted(states),
    })


asyncio.run(test())
