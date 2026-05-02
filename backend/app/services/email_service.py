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

                try:
                    logger.info("Sending OTP email via Resend to %s", recipient_email)
                    with request.urlopen(req, timeout=10) as response:
                        body = response.read().decode("utf-8")
                        response_json = json.loads(body) if body else {}
                        return response_json.get("id")
                except Exception as exc:
                    logger.error("Resend failed: %s. Trying SMTP fallback...", exc)
                    # Do not raise error here, let it fall through to SMTP below

        # --- SMTP fallback path ---
        if settings.SMTP_ENABLED:
            logger.info("Using SMTP (Gmail) to send OTP to %s", recipient_email)
            SMTPEmailService.send_otp_email(recipient_email, otp_code, expiry_minutes)
            return "smtp_sent"

        logger.info("No email service available for %s", recipient_email)
        return None

    @classmethod
    def send_team_invitation_email(
        cls, recipient_email: str, event_name: str, inviter_name: str, invite_link: str
    ) -> Optional[str]:
        subject = f"You have been invited to join the team for {event_name}"
        body_text = f"{inviter_name} has invited you to join the team for '{event_name}'.\n\nPlease click the following link to accept your invitation: {invite_link}"
        body_html = f"<p><strong>{inviter_name}</strong> has invited you to join the team for <strong>{event_name}</strong>.</p><p><a href='{invite_link}'>Click here to accept your invitation</a></p>"

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
                    logger.info("Sending team invite via Resend to %s", recipient_email)
                    with request.urlopen(req, timeout=10) as response:
                        body = response.read().decode("utf-8")
                        response_json = json.loads(body) if body else {}
                        return response_json.get("id")
                except Exception as exc:
                    logger.error("Resend failed: %s. Trying SMTP fallback...", exc)

        # --- SMTP fallback path ---
        if settings.SMTP_ENABLED:
            logger.info("Using SMTP to send team invite to %s", recipient_email)
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
                logger.error("SMTP error sending invite to %s: %s", recipient_email, exc)
                return None

        return None