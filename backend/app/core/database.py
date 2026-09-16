from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db() -> None:
    from app.models import orm  # noqa: import triggers model registration
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight additive migration for prototype SQLite databases already
        # created before session-scoped operator identifiers were introduced.
        await conn.exec_driver_sql("ALTER TABLE tracks ADD COLUMN track_uid VARCHAR") if not await _has_column(conn, "tracks", "track_uid") else None
        await conn.exec_driver_sql("ALTER TABLE tracks ADD COLUMN status VARCHAR DEFAULT 'IN_FRAME'") if not await _has_column(conn, "tracks", "status") else None
        await conn.exec_driver_sql("ALTER TABLE alerts ADD COLUMN track_uid VARCHAR") if not await _has_column(conn, "alerts", "track_uid") else None
        await conn.exec_driver_sql("ALTER TABLE alerts ADD COLUMN object_type VARCHAR") if not await _has_column(conn, "alerts", "object_type") else None
        await conn.exec_driver_sql("ALTER TABLE alerts ADD COLUMN camera_code VARCHAR") if not await _has_column(conn, "alerts", "camera_code") else None
        await conn.exec_driver_sql("ALTER TABLE tracks ADD COLUMN identity_state VARCHAR DEFAULT 'NO_MATCH'") if not await _has_column(conn, "tracks", "identity_state") else None
        await conn.exec_driver_sql("ALTER TABLE tracks ADD COLUMN identity_match_score FLOAT") if not await _has_column(conn, "tracks", "identity_match_score") else None
        await conn.exec_driver_sql("ALTER TABLE tracks ADD COLUMN anpr_state VARCHAR DEFAULT 'UNAVAILABLE'") if not await _has_column(conn, "tracks", "anpr_state") else None
        await conn.exec_driver_sql("ALTER TABLE tracks ADD COLUMN anpr_reason VARCHAR") if not await _has_column(conn, "tracks", "anpr_reason") else None
        await conn.exec_driver_sql("ALTER TABLE alerts ADD COLUMN operator_correction_json TEXT") if not await _has_column(conn, "alerts", "operator_correction_json") else None
        await conn.exec_driver_sql("ALTER TABLE alerts ADD COLUMN event_type VARCHAR") if not await _has_column(conn, "alerts", "event_type") else None
        await conn.exec_driver_sql("ALTER TABLE alerts ADD COLUMN rule_id VARCHAR") if not await _has_column(conn, "alerts", "rule_id") else None
        await conn.exec_driver_sql("ALTER TABLE alerts ADD COLUMN rule_reason VARCHAR") if not await _has_column(conn, "alerts", "rule_reason") else None
    logger.info("Database initialized")


async def _has_column(conn, table: str, column: str) -> bool:
    result = await conn.exec_driver_sql(f"PRAGMA table_info({table})")
    return column in {row[1] for row in result.fetchall()}
