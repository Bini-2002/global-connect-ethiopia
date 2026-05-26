"""
Finds a verified, active organizer user in MongoDB and prints their email.
Run from backend/ directory.
"""
import asyncio
import sys
sys.path.insert(0, r"C:\Users\binig\Desktop\global-connect-ethiopia\backend")

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb+srv://bini_yam:kS0yezvbAPj8TWor@globalconnectcluster.m4yhahs.mongodb.net/"
DB_NAME = "global_connect_db"

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    users = db["users"]

    # Find verified active organizers
    cursor = users.find(
        {"email_verified": True, "is_active": True},
        {"email": 1, "role": 1, "full_name": 1}
    ).limit(10)

    docs = await cursor.to_list(length=10)
    if not docs:
        print("No verified active users found.")
        return

    print(f"Found {len(docs)} verified active user(s):")
    for u in docs:
        print(f"  role={u.get('role','?'):20s}  email={u.get('email')}  name={u.get('full_name','')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())
