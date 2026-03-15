from __future__ import annotations

import sys
from datetime import datetime

from app.core.config import settings
from app.services.object_storage import ObjectStorageService


def _delete_gridfs_file(storage_key: str) -> None:
    if not storage_key.startswith("gridfs:"):
        return

    try:
        from bson import ObjectId
        import gridfs
        from pymongo import MongoClient
    except Exception:
        return

    file_id = storage_key.split(":", 1)[1]
    db_name = settings.GRIDFS_DATABASE_NAME or settings.DATABASE_NAME
    client = MongoClient(settings.MONGODB_URL)
    try:
        fs = gridfs.GridFS(client[db_name], collection=settings.GRIDFS_BUCKET_NAME)
        fs.delete(ObjectId(file_id))
    finally:
        client.close()


def main() -> int:
    storage = ObjectStorageService()

    payload = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n"
        b"trailer\n<< /Root 1 0 R >>\n%%EOF"
    )

    stored = storage.upload_verification_document(
        content=payload,
        filename=f"license-smoke-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf",
        folder="smoke-tests/verification",
        content_type="application/pdf",
    )

    print(f"Storage provider used: {stored.storage_provider}")
    print(f"Storage key: {stored.storage_key}")

    if stored.storage_provider != "gridfs":
        print("Expected PDF upload to use GridFS. Check PDF_STORAGE_PROVIDER in .env")
        return 1

    loaded = storage.read_bytes(stored.storage_key)
    if loaded != payload:
        print("Round-trip content mismatch from GridFS read")
        return 1

    _delete_gridfs_file(stored.storage_key)
    print("GridFS smoke test passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
