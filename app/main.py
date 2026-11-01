import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.verifier import run_stream_verification
from app.routers import channels, news, users, admin

logger = logging.getLogger("main")
logging.basicConfig(level=logging.INFO)

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Seed database if not populated
db = SessionLocal()
try:
    seed_database(db)
finally:
    db.close()

scheduler = AsyncIOScheduler()

async def scheduled_verifier_task():
    logger.info("Running scheduled stream verification...")
    db_session = SessionLocal()
    try:
        await run_stream_verification(db=db_session)
        logger.info("Scheduled stream verification completed successfully.")
    except Exception as e:
        logger.error(f"Scheduled stream verification failed: {e}")
    finally:
        db_session.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Only start background scheduler if explicitly enabled
    if settings.ENABLE_BACKGROUND_VERIFIER:
        try:
            scheduler.add_job(
                scheduled_verifier_task,
                'interval',
                hours=settings.VERIFIER_INTERVAL_HOURS,
                id="stream_verifier_job",
                replace_existing=True
            )
            scheduler.start()
            logger.info(f"Stream Verifier Scheduler started (every {settings.VERIFIER_INTERVAL_HOURS} hours)")
        except Exception as ex:
            logger.warning(f"Scheduler initialization skipped: {ex}")

    yield

    # Shutdown
    try:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("Scheduler shutdown.")
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Enable CORS for cross-origin or local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(channels.router, prefix=settings.API_PREFIX)
app.include_router(news.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)

# Ensure static directories exist
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "img"), exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.get("/", response_class=FileResponse, tags=["Frontend"])
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>BharatStream Frontend is building...</h1>")

@app.get("/admin", response_class=FileResponse, tags=["Frontend"])
async def serve_admin():
    admin_path = os.path.join(STATIC_DIR, "admin.html")
    if os.path.exists(admin_path):
        return FileResponse(admin_path)
    return HTMLResponse("<h1>BharatStream Admin Portal is loading...</h1>")
