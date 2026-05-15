from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.db.mongodb import session_collection, notification_collection
from app.services.marketplace_indexes import ensure_marketplace_indexes
from app.services.review_offices import ensure_mock_office_accounts

app = FastAPI(title="Global Connect Ethiopia")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include all v1 endpoints (auth, users, vendors, etc.)
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event() -> None:
    await session_collection.create_index("expires_at", expireAfterSeconds=0)
    await ensure_marketplace_indexes()
    await ensure_mock_office_accounts()
    # Notifications indexes
    await notification_collection.create_index([("recipient_id", 1), ("created_at", -1)])
    await notification_collection.create_index([("recipient_id", 1), ("read_status", 1)])

@app.get("/")
def read_root():
    return {"message": "Server is running!"}
