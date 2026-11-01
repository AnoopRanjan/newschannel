import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.seed_json import init_json_data
from app.verifier import run_stream_verification
from app.routers import channels, news, users, admin

logger = logging.getLogger("main")
logging.basicConfig(level=logging.INFO)

# Seed JSON data if not already present
init_json_data()

scheduler = AsyncIOScheduler()

async def scheduled_verifier_task():
    logger.info("Running scheduled stream verification...")
    try:
        await run_stream_verification()
        logger.info("Scheduled stream verification completed successfully.")
    except Exception as e:
        logger.error(f"Scheduled stream verification failed: {e}")

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

# Enable CORS
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
if not os.path.exists(STATIC_DIR):
    alt_dir = os.path.join(os.getcwd(), "static")
    if os.path.exists(alt_dir):
        STATIC_DIR = alt_dir
try:
    os.makedirs(STATIC_DIR, exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)
    os.makedirs(os.path.join(STATIC_DIR, "img"), exist_ok=True)
except Exception:
    pass

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "storage": "JSON File Storage",
        "version": settings.VERSION
    }

@app.get("/", response_class=FileResponse, tags=["Frontend"])
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>BharatStream Frontend is building...</h1>")

@app.get("/ads.txt", response_class=PlainTextResponse, tags=["Monetization"])
def serve_ads_txt():
    """
    Official Google AdSense ads.txt authorization record.
    Required by Google Mediapartners crawler to authenticate publisher ID.
    """
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "adsense_config.json")
    pub_id = "pub-9847120394857102"
    if os.path.exists(config_path):
        try:
            import json
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                raw_id = data.get("publisher_id", "ca-pub-9847120394857102")
                pub_id = raw_id.replace("ca-", "")
        except Exception:
            pass
    return f"google.com, {pub_id}, DIRECT, f08c47fec0942fa0\n"

@app.get("/api/admin/adsense", tags=["Monetization"])
def get_adsense_config():
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "adsense_config.json")
    if os.path.exists(config_path):
        import json
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "account_email": "anoopranjan.1983@gmail.com",
        "publisher_id": "ca-pub-9847120394857102",
        "is_adsense_enabled": True,
        "auto_ads_enabled": True
    }

@app.get("/admin", response_class=FileResponse, tags=["Frontend"])
async def serve_admin():
    admin_path = os.path.join(STATIC_DIR, "admin.html")
    if os.path.exists(admin_path):
        return FileResponse(admin_path)
    return HTMLResponse("<h1>BharatStream Admin Portal is loading...</h1>")
