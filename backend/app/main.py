from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.services.marketplace_indexes import ensure_marketplace_indexes

app = FastAPI(title="Global Connect Ethiopia")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include all v1 endpoints (auth, users, vendors, etc.)
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event() -> None:
    await ensure_marketplace_indexes()

@app.get("/")
def read_root():
    return {"message": "Server is running!"}
