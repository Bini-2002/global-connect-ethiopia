import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.db.mongodb import client, session_collection, notification_collection
from app.services.marketplace_indexes import ensure_marketplace_indexes
from app.services.review_offices import ensure_mock_office_accounts

logger = logging.getLogger(__name__)

app = FastAPI(title="Global Connect Ethiopia")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_origin_regex=settings.get_allowed_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# include all v1 endpoints (auth, users, vendors, etc.)
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event() -> None:
    # ── 1. Verify MongoDB Atlas connectivity ───────────────────────────────
    try:
        result = await client.admin.command("ping")
        logger.info("✅ MongoDB Atlas connected successfully: %s", result)
    except Exception as exc:
        logger.critical(
            "❌ FAILED to connect to MongoDB Atlas!\n"
            "   URL: %s\n"
            "   Error: %s\n"
            "   Check: (1) Atlas IP whitelist  (2) credentials  (3) cluster not paused\n"
            "   HINT: Log in to https://cloud.mongodb.com → Network Access → Add 0.0.0.0/0",
            settings.MONGODB_URL[:60],
            exc,
        )
        # Don't crash the server — let individual endpoint calls fail with 503
        # so the issue is surfaced clearly per-request

    # ── 2. Ensure indexes ──────────────────────────────────────────────────
    await session_collection.create_index("expires_at", expireAfterSeconds=0)
    await ensure_marketplace_indexes()
    await ensure_mock_office_accounts()
    # Notifications indexes
    await notification_collection.create_index([("recipient_id", 1), ("created_at", -1)])
    await notification_collection.create_index([("recipient_id", 1), ("read_status", 1)])


@app.get("/")
def read_root():
    return {"message": "Server is running!"}



@app.get("/health")
async def health_check():
    """Returns DB connectivity status — useful for diagnosing Atlas issues."""
    try:
        result = await client.admin.command("ping")
        return {
            "status": "ok",
            "database": "connected",
            "mongodb_url": settings.MONGODB_URL[:40] + "...",
            "ping": result,
        }
    except Exception as exc:
        return {
            "status": "error",
            "database": "disconnected",
            "mongodb_url": settings.MONGODB_URL[:40] + "...",
            "error": str(exc),
            "fix": (
                "1. Go to https://cloud.mongodb.com\n"
                "2. Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)\n"
                "3. Check your cluster is not paused\n"
                "4. Verify MONGODB_URL credentials in backend/.env"
            ),
        }
