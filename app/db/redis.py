import redis.asyncio as redis
from app.core.config import settings


redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    decode_responses=True
)

async def delete_pattern(pattern: str):
    keys = await redis_client.keys(pattern)

    if keys:
        await redis_client.delete(*keys)