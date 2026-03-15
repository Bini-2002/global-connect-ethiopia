from app.core.config import settings

import importlib


def get_verification_queue():
    try:
        redis_module = importlib.import_module("redis")
        rq_module = importlib.import_module("rq")
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("redis and rq packages are required for queue support") from exc

    if not settings.REDIS_URL:
        raise RuntimeError("REDIS_URL is not configured")

    connection = redis_module.Redis.from_url(settings.REDIS_URL)
    return rq_module.Queue(settings.VERIFICATION_QUEUE_NAME, connection=connection)
