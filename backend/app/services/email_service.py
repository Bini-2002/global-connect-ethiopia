from __future__ import annotations

import json
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from urllib import error, request

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    """Raised when OTP email delivery fails or is misconfigured."""


class SMTPEmailService:
    """Sends emails via SMTP (e.g. Gmail). Used when Resend is disabled or fails."""

    @staticmethod
    def _is_configured() -> bool:
        return bool(
            settings.SMTP_HOST
            and settings.SMTP_USERNAME
            and settings.SMTP_PASSWORD
        )

    @classmethod
    def send_otp_email(cls, recipient_email: str, otp_code: str, expiry_minutes: int) -> None:
        if not cls._is_configured():
            raise EmailDeliveryError(
                "SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD."
            )

        subject = settings.OTP_EMAIL_SUBJECT
        sender_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
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
        msg["From"] = sender_email
        msg["To"] = recipient_email
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        try:
            logger.info("Sending OTP email via SMTP to %s", recipient_email)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(sender_email, recipient_email, msg.as_string())
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
                try:
                    with request.urlopen(req, timeout=10) as resp:
                        response_json = json.loads(resp.read().decode("utf-8"))
                        logger.info("OTP email sent via Resend to %s: %s", recipient_email, response_json.get("id"))
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
        return SMTPEmailService._is_configured()

    @classmethod
    def send_otp_email(cls, recipient_email: str, otp_code: str, expiry_minutes: int) -> Optional[str]:
        return SMTPEmailService.send_otp_email(recipient_email, otp_code, expiry_minutes)


class EmailService(ResendEmailService):
    @classmethod
    def send_generic_email(
        cls, recipient_email: str, subject: str, body: str, body_html: str = None
    ) -> Optional[str]:
        if not body_html:
            body_html = "<p>" + body.replace('\n', '<br>') + "</p>"

        # --- Resend path ---
        if settings.RESEND_ENABLED:
            if not cls._is_configured():
                logger.warning("Resend enabled but not configured. Falling back.")
            else:
                payload = {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [recipient_email],
                    "subject": subject,
                    "text": body,
                    "html": body_html,
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
                    logger.info("Sending generic email via Resend to %s", recipient_email)
                    with request.urlopen(req, timeout=10) as response:
                        resp_body = response.read().decode("utf-8")
                        response_json = json.loads(resp_body) if resp_body else {}
                        return response_json.get("id")
                except Exception as exc:
                    logger.error("Resend failed: %s. Trying SMTP fallback...", exc)

        # --- SMTP fallback path ---
        if SMTPEmailService._is_configured():
            logger.info("Using SMTP to send generic email to %s", recipient_email)
            sender_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender_email
            msg["To"] = recipient_email
            msg.attach(MIMEText(body, "plain"))
            msg.attach(MIMEText(body_html, "html"))
            try:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.sendmail(sender_email, recipient_email, msg.as_string())
                return "smtp_sent"
            except Exception as exc:
                logger.error("SMTP error sending generic email to %s: %s", recipient_email, exc)
                return None

        return None

    @classmethod
    def send_otp_email(cls, recipient_email: str, otp_code: str, expiry_minutes: int) -> Optional[str]:
        if SMTPEmailService._is_configured():
            return SMTPEmailService.send_otp_email(recipient_email, otp_code, expiry_minutes)
        if settings.RESEND_ENABLED:
            return ResendEmailService.send_otp_email(recipient_email, otp_code, expiry_minutes)

        logger.warning("Neither SMTP nor Resend is configured. OTP email sending skipped for %s", recipient_email)
        print(f"\n==============================================")
        print(f" [MOCK EMAIL] To: {recipient_email}")
        print(f" [MOCK EMAIL] OTP Code: {otp_code}")
        print(f"==============================================\n")
        return None

    @classmethod
    def send_vip_reservation_email(
        cls, recipient_email: str, vip_name: str, hotel_name: str, event_name: str, notes: str = None
    ) -> Optional[str]:
        subject = f"Your Hotel Reservation for {event_name}"
        body_text = f"Dear {vip_name},\n\nWe are pleased to confirm your hotel reservation at {hotel_name} for the upcoming event '{event_name}'.\n\n"
        if notes:
            body_text += f"Additional details:\n{notes}\n\n"
        body_text += "We look forward to welcoming you.\n\nBest regards,\nThe Global Connect Ethiopia Team"

        body_html = f"""
        <p>Dear <strong>{vip_name}</strong>,</p>
        <p>We are pleased to confirm your hotel reservation at <strong>{hotel_name}</strong> for the upcoming event <strong>'{event_name}'</strong>.</p>
        """
        if notes:
            body_html += f"<p><strong>Additional details:</strong><br>{notes}</p>"
        body_html += "<p>We look forward to welcoming you.</p><p>Best regards,<br>The Global Connect Ethiopia Team</p>"

        # --- Resend path ---
        if settings.RESEND_ENABLED:
            if not cls._is_configured():
                logger.warning("Resend enabled but not configured. Falling back.")
            else:
                payload = {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [recipient_email],
                    "subject": subject,
                    "text": body_text,
                    "html": body_html,
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
                    logger.info("Sending VIP reservation via Resend to %s", recipient_email)
                    with request.urlopen(req, timeout=10) as response:
                        body = response.read().decode("utf-8")
                        response_json = json.loads(body) if body else {}
                        return response_json.get("id")
                except Exception as exc:
                    logger.error("Resend failed: %s. Trying SMTP fallback...", exc)

        # --- SMTP fallback path ---
        if settings.SMTP_ENABLED:
            logger.info("Using SMTP to send VIP reservation to %s", recipient_email)
            if not SMTPEmailService._is_configured():
                logger.error("SMTP is not configured for fallback.")
                return None
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_USERNAME
            msg["To"] = recipient_email
            msg.attach(MIMEText(body_text, "plain"))
            msg.attach(MIMEText(body_html, "html"))
            try:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    server.ehlo()
                    server.starttls()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_USERNAME, recipient_email, msg.as_string())
                return "smtp_sent"
            except Exception as exc:
                logger.error("SMTP error sending VIP reservation to %s: %s", recipient_email, exc)
                return None

        return None
