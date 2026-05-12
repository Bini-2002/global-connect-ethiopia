from __future__ import annotations

import json
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from urllib import error, request
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    """Raised when OTP email delivery fails or is misconfigured."""


class SMTPEmailService:
    """Sends emails via SMTP (e.g. Gmail). Used when Resend is disabled or fails."""

    @staticmethod
    def _is_configured() -> bool:
        return bool(
            settings.SMTP_ENABLED
            and settings.SMTP_HOST
            and settings.SMTP_USERNAME
            and settings.SMTP_PASSWORD
        )

    @classmethod
    def send_otp_email(cls, recipient_email: str, otp_code: str, expiry_minutes: int) -> None:
        if not cls._is_configured():
            raise EmailDeliveryError(
                "SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD."
            )

        subject = settings.RESEND_OTP_SUBJECT
        body_text = (
            f"Your verification code is {otp_code}. "
            f"It expires in {expiry_minutes} minutes."
        )
        body_html = (
            f"<p>Your verification code is <strong>{otp_code}</strong>.</p>"
            f"<p>This code expires in {expiry_minutes} minutes.</p>"
        )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USERNAME
        msg["To"] = recipient_email
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        try:
            logger.info("Sending OTP email via SMTP to %s", recipient_email)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USERNAME, recipient_email, msg.as_string())
            logger.info("SMTP OTP email sent successfully to %s", recipient_email)
        except smtplib.SMTPException as exc:
            logger.error("SMTP error sending OTP to %s: %s", recipient_email, exc)
            raise EmailDeliveryError(f"SMTP error: {exc}") from exc


class ResendEmailService:
    API_URL = "https://api.resend.com/emails"

    @staticmethod
    def _is_configured() -> bool:
        return bool(settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)

    @classmethod
    def send_otp_email(cls, recipient_email: str, otp_code: str, expiry_minutes: int) -> Optional[str]:

        # --- Resend path ---
        if settings.RESEND_ENABLED:
            if not cls._is_configured():
                logger.warning("Resend enabled but not configured. Falling back.")
            else:
                payload = {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [recipient_email],
                    "subject": settings.RESEND_OTP_SUBJECT,
                    "text": f"Your verification code is {otp_code}. It expires in {expiry_minutes} minutes.",
                    "html": f"<p>Your verification code is <strong>{otp_code}</strong>.</p><p>Expires in {expiry_minutes} minutes.</p>",
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


class SmtpEmailService:
    @staticmethod
    def _is_configured() -> bool:
        return bool(settings.SMTP_USERNAME and settings.SMTP_PASSWORD)

    @classmethod
    def send_otp_email(cls, recipient_email: str, otp_code: str, expiry_minutes: int) -> Optional[str]:
        if not cls._is_configured():
            raise EmailDeliveryError("SMTP is enabled but SMTP_USERNAME or SMTP_PASSWORD is missing")

        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_USERNAME
        msg['To'] = recipient_email
        msg['Subject'] = settings.RESEND_OTP_SUBJECT

        html = f"""
        <p>Your verification code is <strong>{otp_code}</strong>.</p>
        <p>This code expires in {expiry_minutes} minutes.</p>
        """
        msg.attach(MIMEText(html, 'html'))

        try:
            logger.info("Sending OTP email via SMTP to %s", recipient_email)
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD) # type: ignore
            server.send_message(msg)
            server.quit()
            logger.info("SMTP accepted OTP email for %s", recipient_email)
            return "smtp-sent"
        except Exception as exc:
            logger.error("SMTP delivery failed for %s: %s", recipient_email, exc)
            raise EmailDeliveryError(f"SMTP delivery failed: {exc}") from exc


class EmailService:
    @classmethod
    def send_otp_email(cls, recipient_email: str, otp_code: str, expiry_minutes: int) -> Optional[str]:
        if settings.SMTP_ENABLED:
            return SmtpEmailService.send_otp_email(recipient_email, otp_code, expiry_minutes)
        elif settings.RESEND_ENABLED:
            return ResendEmailService.send_otp_email(recipient_email, otp_code, expiry_minutes)
        else:
            logger.info("Both SMTP and Resend are disabled. OTP email sending skipped for %s", recipient_email)
            return None

    @classmethod
    def send_generic_email(cls, recipient_email: str, subject: str, body: str) -> Optional[str]:
        """Send a plain-text email to any recipient (manual attendee, VIP guest, etc.)."""
        if settings.SMTP_ENABLED and SmtpEmailService._is_configured():
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USERNAME
            msg['To'] = recipient_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            try:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)  # type: ignore
                server.send_message(msg)
                server.quit()
                logger.info("Generic email sent via SMTP to %s", recipient_email)
                return "smtp-sent"
            except Exception as exc:
                logger.error("SMTP generic email failed for %s: %s", recipient_email, exc)
                raise EmailDeliveryError(f"SMTP delivery failed: {exc}") from exc

        elif settings.RESEND_ENABLED and ResendEmailService._is_configured():
            payload = {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [recipient_email],
                "subject": subject,
                "text": body,
            }
            req = request.Request(
                ResendEmailService.API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            try:
                with request.urlopen(req, timeout=10) as resp:
                    response_json = json.loads(resp.read().decode("utf-8"))
                    logger.info("Generic email sent via Resend to %s: %s", recipient_email, response_json.get("id"))
                    return response_json.get("id")
            except error.HTTPError as exc:
                details = exc.read().decode("utf-8", errors="replace")
                logger.error("Resend generic email error for %s: %s", recipient_email, details)
                raise EmailDeliveryError(f"Resend API error ({exc.code}): {details}") from exc
            except (error.URLError, TimeoutError) as exc:
                logger.error("Resend request failed for %s: %s", recipient_email, exc)
                raise EmailDeliveryError(f"Resend request failed: {exc}") from exc
        else:
            logger.info("Email delivery disabled. Skipping generic email to %s | Subject: %s", recipient_email, subject)
            return None
