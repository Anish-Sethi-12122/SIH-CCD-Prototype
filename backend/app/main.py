import asyncio
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.database import init_db
from app.api.routes import router
from app.api.ws import router as ws_router
from pathlib import Path
from app.services.intrusion_service import consume_intrusions, consume_track_registry

setup_logging()
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} {settings.APP_VERSION}")
    # Ensure data dirs exist
    settings.VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    Path("data").mkdir(exist_ok=True)
    await init_db()
    intrusion_consumer = asyncio.create_task(consume_intrusions(), name="intrusion-consumer")
    track_registry_consumer = asyncio.create_task(consume_track_registry(), name="track-registry-consumer")
    try:
        yield
    finally:
        intrusion_consumer.cancel()
        track_registry_consumer.cancel()
        with suppress(asyncio.CancelledError):
            await intrusion_consumer
        with suppress(asyncio.CancelledError):
            await track_registry_consumer
        logger.info("Shutting down")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(ws_router)

@app.get("/")
async def root():
    return {"message": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}
