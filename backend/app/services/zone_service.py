import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.orm import Zone
from app.models.schemas import ZoneCreate
from app.core.logging import get_logger
from datetime import datetime
import uuid

logger = get_logger(__name__)

def point_in_polygon(px: float, py: float, polygon: list[list[float]]) -> bool:
    """Ray casting algorithm. Polygon points are normalized [0,1]."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside

async def create_zone(db: AsyncSession, data: ZoneCreate) -> Zone:
    zone = Zone(
        id=str(uuid.uuid4()),
        camera_id=data.camera_id,
        name=data.name,
        polygon_json=json.dumps(data.polygon),
        active=True,
        created_at=datetime.utcnow()
    )
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    logger.info(f"Zone created: {zone.id} ({zone.name})")
    return zone

async def get_active_zones(db: AsyncSession, camera_id: str) -> list[Zone]:
    result = await db.execute(select(Zone).where(Zone.camera_id == camera_id, Zone.active == True))
    return list(result.scalars().all())

async def delete_zone(db: AsyncSession, zone_id: str) -> bool:
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if zone:
        await db.delete(zone)
        await db.commit()
        return True
    return False

async def toggle_zone(db: AsyncSession, zone_id: str, active: bool) -> Zone | None:
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if zone:
        zone.active = active
        await db.commit()
        await db.refresh(zone)
    return zone
