from app.core.config import settings
import importlib

def run() -> None:
    if not settings.REDIS_URL:
        raise RuntimeError("REDIS_URL is required to run the verification worker")

    try:
        redis_module = importlib.import_module("redis")
        rq_module = importlib.import_module("rq")
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Install redis and rq to run verification worker") from exc

    redis_conn = redis_module.Redis.from_url(settings.REDIS_URL)
    with rq_module.Connection(redis_conn):
        worker = rq_module.Worker([settings.VERIFICATION_QUEUE_NAME])
        worker.work(with_scheduler=True)


if __name__ == "__main__":
    run()
