import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def check_db():
    load_dotenv()
    mongodb_url = os.getenv("MONGODB_URL")
    db_name = os.getenv("DATABASE_NAME")
    print(f"Connecting to: {mongodb_url}")
    print(f"Database: {db_name}")
    
    client = AsyncIOMotorClient(mongodb_url)
    db = client[db_name]
    
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")
    
    for coll_name in ["users", "organizers", "vendors", "requests", "events"]:
        if coll_name in collections:
            count = await db[coll_name].count_documents({})
            print(f"Collection '{coll_name}' has {count} documents.")
            if count > 0:
                sample = await db[coll_name].find_one({})
                print(f"Sample from '{coll_name}': {sample.get('_id')} {sample.get('email') or sample.get('title') or ''}")
        else:
            print(f"Collection '{coll_name}' NOT FOUND.")

if __name__ == "__main__":
    asyncio.run(check_db())
