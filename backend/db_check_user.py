import asyncio
from app.db.mongodb import user_collection

async def main():
    user = await user_collection.find_one(sort=[("updated_at", -1)])
    if user:
        print(f"User: {user.get('email')}, Role: {user.get('role')}")
    else:
        print("No users found.")

if __name__ == "__main__":
    asyncio.run(main())
