from fastapi import FastAPI
from app.api.v1.api import api_router

app = FastAPI(title="Global Connect Ethiopia")

# include all v1 endpoints (auth, users, vendors, etc.)
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Server is running!"}