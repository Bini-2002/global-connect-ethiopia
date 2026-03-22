from __future__ import annotations

import json
from typing import Optional
from urllib import error, request

from app.core.config import settings


class EmailDeliveryError(RuntimeError):
    """Raised when OTP email delivery fails or is misconfigured."""


class ResendEmailService:
    API_URL = "https://api.resend.com/emails"

    @staticmethod
    def _is_configured() -> bool:
        return bool(settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)

    @classmethod
    def send_otp_email(cls, recipient_email: str, otp_code: str, expiry_minutes: int) -> Optional[str]:
        if not settings.RESEND_ENABLED:
            return None

        if not cls._is_configured():
            raise EmailDeliveryError(
                "Resend is enabled but RESEND_API_KEY or RESEND_FROM_EMAIL is missing"
            )

        payload = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [recipient_email],
            "subject": settings.RESEND_OTP_SUBJECT,
            "text": (
                "Your verification code is "
                f"{otp_code}. It expires in {expiry_minutes} minutes."
            ),
            "html": (
                "<p>Your verification code is "
                f"<strong>{otp_code}</strong>.</p>"
                f"<p>This code expires in {expiry_minutes} minutes.</p>"
            ),
        }

        req = request.Request(
            cls.API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=10) as response:
                body = response.read().decode("utf-8")
                response_json = json.loads(body) if body else {}
                return response_json.get("id")
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            raise EmailDeliveryError(
                f"Resend API error ({exc.code}): {details}"
            ) from exc
        except (error.URLError, TimeoutError) as exc:
            raise EmailDeliveryError(f"Resend request failed: {exc}") from exc
