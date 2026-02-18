import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def main() -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await client.admin.command("ping")
    print("MongoDB Atlas connected")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
