from fastapi import FastAPI
from app.api.v1.endpoints import auth 

app = FastAPI(title="Global Connect Ethiopia")

# all URLs in auth.py will now start with /api/v1/auth
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

@app.get("/")
def read_root():
    return {"message": "Server is running!"}