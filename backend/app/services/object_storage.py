from __future__ import annotations

import os
import importlib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import settings


@dataclass
class StoredFile:
    document_url: str
    storage_key: str
    size_bytes: int
    storage_provider: str


class ObjectStorageService:
    def __init__(self) -> None:
        self.provider = settings.STORAGE_PROVIDER.lower().strip()

    def upload_bytes(
        self,
        content: bytes,
        filename: str,
        folder: str,
        content_type: str | None = None,
        provider_override: str | None = None,
    ) -> StoredFile:
        provider = (provider_override or self.provider).lower().strip()
        if provider == "s3":
            return self._upload_to_s3(
                content=content,
                filename=filename,
                folder=folder,
                content_type=content_type,
            )
        if provider == "gridfs":
            return self._upload_to_gridfs(
                content=content,
                filename=filename,
                folder=folder,
                content_type=content_type,
            )
        return self._upload_to_local(content=content, filename=filename, folder=folder)

    def upload_verification_document(
        self,
        content: bytes,
        filename: str,
        folder: str,
        content_type: str | None = None,
    ) -> StoredFile:
        provider_override = None
        pdf_provider = (settings.PDF_STORAGE_PROVIDER or "").strip().lower()
        if pdf_provider and self._is_pdf_document(filename=filename, content_type=content_type):
            provider_override = pdf_provider

        return self.upload_bytes(
            content=content,
            filename=filename,
            folder=folder,
            content_type=content_type,
            provider_override=provider_override,
        )

    def read_bytes(self, storage_key: str) -> bytes:
        if storage_key.startswith("gridfs:"):
            return self._read_from_gridfs(storage_key)
        if self.provider == "s3":
            return self._read_from_s3(storage_key)
        return self._read_from_local(storage_key)

    def _upload_to_s3(
        self,
        content: bytes,
        filename: str,
        folder: str,
        content_type: str | None = None,
    ) -> StoredFile:
        try:
            boto3 = importlib.import_module("boto3")
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("boto3 is required for S3 storage provider") from exc
        if not settings.S3_BUCKET_NAME:
            raise RuntimeError("S3_BUCKET_NAME is required when STORAGE_PROVIDER=s3")

        key = self._build_storage_key(folder=folder, filename=filename)
        client = boto3.client(
            "s3",
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL,
        )
        payload = {"Bucket": settings.S3_BUCKET_NAME, "Key": key, "Body": content}
        if content_type:
            payload["ContentType"] = content_type
        client.put_object(**payload)

        if settings.S3_ENDPOINT_URL:
            base = settings.S3_ENDPOINT_URL.rstrip("/")
            url = f"{base}/{settings.S3_BUCKET_NAME}/{key}"
        else:
            region = settings.S3_REGION or "us-east-1"
            url = f"https://{settings.S3_BUCKET_NAME}.s3.{region}.amazonaws.com/{key}"

        return StoredFile(
            document_url=url,
            storage_key=key,
            size_bytes=len(content),
            storage_provider="s3",
        )

    def _read_from_s3(self, storage_key: str) -> bytes:
        try:
            boto3 = importlib.import_module("boto3")
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("boto3 is required for S3 storage provider") from exc
        if not settings.S3_BUCKET_NAME:
            raise RuntimeError("S3_BUCKET_NAME is required when STORAGE_PROVIDER=s3")

        client = boto3.client(
            "s3",
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL,
        )
        response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=storage_key)
        return response["Body"].read()

    _sync_mongo_client = None

    @classmethod
    def _get_sync_mongo_client(cls):
        if cls._sync_mongo_client is None:
            import pymongo
            cls._sync_mongo_client = pymongo.MongoClient(settings.MONGODB_URL)
        return cls._sync_mongo_client

    def _upload_to_gridfs(
        self,
        content: bytes,
        filename: str,
        folder: str,
        content_type: str | None = None,
    ) -> StoredFile:
        try:
            pymongo = importlib.import_module("pymongo")
            gridfs = importlib.import_module("gridfs")
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("pymongo/gridfs are required for GridFS storage provider") from exc

        db_name = settings.GRIDFS_DATABASE_NAME or settings.DATABASE_NAME
        client = self._get_sync_mongo_client()
        db = client[db_name]
        fs = gridfs.GridFS(db, collection=settings.GRIDFS_BUCKET_NAME)
        safe_name = os.path.basename(filename or "document")
        file_id = fs.put(
            content,
            filename=safe_name,
            content_type=content_type or "application/octet-stream",
            metadata={"folder": folder, "uploaded_at": datetime.now(timezone.utc)},
        )

        id_str = str(file_id)
        return StoredFile(
            document_url=f"gridfs://{db_name}/{settings.GRIDFS_BUCKET_NAME}/{id_str}",
            storage_key=f"gridfs:{id_str}",
            size_bytes=len(content),
            storage_provider="gridfs",
        )

    def _read_from_gridfs(self, storage_key: str) -> bytes:
        try:
            pymongo = importlib.import_module("pymongo")
            gridfs = importlib.import_module("gridfs")
            bson = importlib.import_module("bson")
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("pymongo/gridfs are required for GridFS storage provider") from exc

        file_id_str = storage_key.split(":", 1)[1]
        db_name = settings.GRIDFS_DATABASE_NAME or settings.DATABASE_NAME
        client = self._get_sync_mongo_client()
        db = client[db_name]
        fs = gridfs.GridFS(db, collection=settings.GRIDFS_BUCKET_NAME)
        grid_out = fs.get(bson.ObjectId(file_id_str))
        return grid_out.read()

    def _upload_to_local(self, content: bytes, filename: str, folder: str) -> StoredFile:
        storage_root = Path(settings.LOCAL_STORAGE_PATH)
        file_key = self._build_storage_key(folder=folder, filename=filename)
        file_path = storage_root / file_key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)

        return StoredFile(
            document_url=str(file_path.resolve()),
            storage_key=file_key,
            size_bytes=len(content),
            storage_provider="local",
        )

    def _read_from_local(self, storage_key: str) -> bytes:
        storage_root = Path(settings.LOCAL_STORAGE_PATH)
        return (storage_root / storage_key).read_bytes()

    @staticmethod
    def _build_storage_key(folder: str, filename: str) -> str:
        safe_name = os.path.basename(filename or "document")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        return f"{folder}/{timestamp}_{uuid4().hex}_{safe_name}"

    @staticmethod
    def _is_pdf_document(filename: str, content_type: str | None) -> bool:
        ext = os.path.splitext(filename or "")[1].lower()
        if ext == ".pdf":
            return True
        return (content_type or "").lower() == "application/pdf"
