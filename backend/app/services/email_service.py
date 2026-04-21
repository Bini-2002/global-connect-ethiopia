from __future__ import annotations

import json
import logging
from typing import Optional
from urllib import error, request

from app.core.config import settings

logger = logging.getLogger(__name__)


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
            logger.info("OTP email sending skipped because Resend is disabled for %s", recipient_email)
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
            logger.info("Sending OTP email via Resend to %s", recipient_email)
            with request.urlopen(req, timeout=10) as response:
                body = response.read().decode("utf-8")
                response_json = json.loads(body) if body else {}
                logger.info(
                    "Resend accepted OTP email for %s with id=%s",
                    recipient_email,
                    response_json.get("id"),
                )
                return response_json.get("id")
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            logger.error(
                "Resend HTTP error while sending OTP to %s: %s",
                recipient_email,
                details,
            )
            raise EmailDeliveryError(
                f"Resend API error ({exc.code}): {details}"
            ) from exc
        except (error.URLError, TimeoutError) as exc:
            logger.error("Resend request failed for %s: %s", recipient_email, exc)
            raise EmailDeliveryError(f"Resend request failed: {exc}") from exc
