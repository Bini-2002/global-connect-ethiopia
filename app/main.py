from fastapi import FastAPI

app = FastAPI(title="Global Connect Ethiopia API")

@app.get("/")
def read_root():
    return {"message": "Server is running!"}