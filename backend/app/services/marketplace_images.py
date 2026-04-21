from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import time
import urllib.error
import urllib.request
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.services.object_storage import ObjectStorageService


class MarketplaceImageStorageService:
    def __init__(self) -> None:
        self.storage = ObjectStorageService()

    async def upload_images(self, images: list[UploadFile], *, folder: str) -> list[dict]:
        uploaded: list[dict] = []
        for image in images:
            if not image.filename:
                continue
            content = await image.read()
            if not content:
                continue
            max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            if len(content) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image {image.filename} exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB upload limit.",
                )
            uploaded.append(self._upload_single_image(content=content, filename=image.filename, folder=folder, content_type=image.content_type))
        return uploaded

    def _upload_single_image(self, *, content: bytes, filename: str, folder: str, content_type: str | None) -> dict:
        if self._cloudinary_enabled():
            return self._upload_to_cloudinary(content=content, filename=filename, folder=folder, content_type=content_type)

        stored = self.storage.upload_bytes(
            content=content,
            filename=filename,
            folder=folder,
            content_type=content_type,
        )
        return {
            "url": stored.document_url,
            "storage_key": stored.storage_key,
            "storage_provider": stored.storage_provider,
            "content_type": content_type or "application/octet-stream",
            "size_bytes": stored.size_bytes,
        }

    def _cloudinary_enabled(self) -> bool:
        return bool(
            settings.CLOUDINARY_CLOUD_NAME
            and settings.CLOUDINARY_API_KEY
            and settings.CLOUDINARY_API_SECRET
        )

    def _upload_to_cloudinary(self, *, content: bytes, filename: str, folder: str, content_type: str | None) -> dict:
        timestamp = str(int(time.time()))
        params = {
            "folder": folder,
            "timestamp": timestamp,
        }
        signature = self._cloudinary_signature(params)
        boundary = f"----CodexBoundary{uuid4().hex}"
        body = self._build_multipart_body(
            boundary=boundary,
            file_content=content,
            filename=filename,
            content_type=content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream",
            fields={
                "api_key": settings.CLOUDINARY_API_KEY or "",
                "timestamp": timestamp,
                "folder": folder,
                "signature": signature,
            },
        )

        url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/auto/upload"
        request = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise HTTPException(status_code=502, detail=f"Cloudinary upload failed: {detail or exc.reason}") from exc
        except urllib.error.URLError as exc:
            raise HTTPException(status_code=502, detail=f"Cloudinary upload failed: {exc.reason}") from exc

        return {
            "url": payload.get("secure_url") or payload.get("url"),
            "storage_key": payload.get("public_id"),
            "storage_provider": "cloudinary",
            "content_type": content_type or "application/octet-stream",
            "size_bytes": payload.get("bytes"),
        }

    def _cloudinary_signature(self, params: dict[str, str]) -> str:
        raw = "&".join(f"{key}={value}" for key, value in sorted(params.items()))
        signature_payload = f"{raw}{settings.CLOUDINARY_API_SECRET or ''}"
        return hashlib.sha1(signature_payload.encode("utf-8")).hexdigest()

    def _build_multipart_body(
        self,
        *,
        boundary: str,
        file_content: bytes,
        filename: str,
        content_type: str,
        fields: dict[str, str],
    ) -> bytes:
        body = bytearray()
        for key, value in fields.items():
            body.extend(f"--{boundary}\r\n".encode("utf-8"))
            body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"))
            body.extend(f"{value}\r\n".encode("utf-8"))

        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        safe_name = os.path.basename(filename or "image")
        body.extend(
            (
                f'Content-Disposition: form-data; name="file"; filename="{safe_name}"\r\n'
                f"Content-Type: {content_type}\r\n\r\n"
            ).encode("utf-8")
        )
        body.extend(file_content)
        body.extend(b"\r\n")
        body.extend(f"--{boundary}--\r\n".encode("utf-8"))
        return bytes(body)
