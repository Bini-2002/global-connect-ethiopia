from fastapi import FastAPI
from app.api.v1.api import api_router

app = FastAPI(title="Global Connect Ethiopia")

# all URLs in auth.py will now start with /api/v1/auth
app.include_router(api_router, prefix="/api/v1", tags=["API Version 1"])

@app.get("/")
def read_root():
    return {"message": "Server is running!"}