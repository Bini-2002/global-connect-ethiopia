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


class ObjectStorageService:
    def __init__(self) -> None:
        self.provider = settings.STORAGE_PROVIDER.lower().strip()

    def upload_bytes(self, content: bytes, filename: str, folder: str) -> StoredFile:
        if self.provider == "s3":
            return self._upload_to_s3(content=content, filename=filename, folder=folder)
        return self._upload_to_local(content=content, filename=filename, folder=folder)

    def read_bytes(self, storage_key: str) -> bytes:
        if self.provider == "s3":
            return self._read_from_s3(storage_key)
        return self._read_from_local(storage_key)

    def _upload_to_s3(self, content: bytes, filename: str, folder: str) -> StoredFile:
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
        client.put_object(Bucket=settings.S3_BUCKET_NAME, Key=key, Body=content)

        if settings.S3_ENDPOINT_URL:
            base = settings.S3_ENDPOINT_URL.rstrip("/")
            url = f"{base}/{settings.S3_BUCKET_NAME}/{key}"
        else:
            region = settings.S3_REGION or "us-east-1"
            url = f"https://{settings.S3_BUCKET_NAME}.s3.{region}.amazonaws.com/{key}"

        return StoredFile(document_url=url, storage_key=key, size_bytes=len(content))

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
        )

    def _read_from_local(self, storage_key: str) -> bytes:
        storage_root = Path(settings.LOCAL_STORAGE_PATH)
        return (storage_root / storage_key).read_bytes()

    @staticmethod
    def _build_storage_key(folder: str, filename: str) -> str:
        safe_name = os.path.basename(filename or "document")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        return f"{folder}/{timestamp}_{uuid4().hex}_{safe_name}"
