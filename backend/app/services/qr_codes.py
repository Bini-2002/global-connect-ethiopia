from __future__ import annotations

from datetime import datetime
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def generate_qr_png_bytes(value: str, *, scale: int = 10, border_modules: int = 3) -> bytes:
    params = cv2.QRCodeEncoder_Params()
    encoder = cv2.QRCodeEncoder_create(params)
    matrix = encoder.encode(value)

    if matrix is None:
        raise ValueError("QR generation failed")

    if len(matrix.shape) == 3:
        matrix = cv2.cvtColor(matrix, cv2.COLOR_BGR2GRAY)

    if matrix.dtype != np.uint8:
        matrix = matrix.astype(np.uint8)

    if int(matrix.max()) <= 1:
        matrix = matrix * 255

    resized = cv2.resize(matrix, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    border = border_modules * scale
    padded = cv2.copyMakeBorder(
        resized,
        border,
        border,
        border,
        border,
        cv2.BORDER_CONSTANT,
        value=255,
    )

    ok, buffer = cv2.imencode(".png", padded)
    if not ok:
        raise ValueError("QR encoding failed")
    return buffer.tobytes()


def generate_booking_pass_png_bytes(
    *,
    qr_value: str,
    event_title: str,
    event_location: str | None,
    event_start_date: datetime | None,
    attendee_name: str | None,
    booking_reference: str,
) -> bytes:
    qr_image = Image.open(BytesIO(generate_qr_png_bytes(qr_value, scale=12, border_modules=2))).convert("RGB")

    width, height = 1200, 700
    card = Image.new("RGB", (width, height), "#F5F7F6")
    draw = ImageDraw.Draw(card)
    title_font = ImageFont.load_default()
    body_font = ImageFont.load_default()

    draw.rounded_rectangle((40, 40, width - 40, height - 40), radius=32, fill="white", outline="#D7E0DC", width=3)
    draw.rounded_rectangle((40, 40, width - 40, 170), radius=32, fill="#062E22")

    draw.text((80, 75), "Global Connect Ethiopia", fill="white", font=title_font)
    draw.text((80, 110), "Check-In Pass", fill="#DCEFE6", font=body_font)

    draw.text((80, 220), "Event", fill="#64748B", font=body_font)
    draw.text((80, 245), event_title or "Professional Event", fill="#062E22", font=title_font)

    draw.text((80, 315), "Attendee", fill="#64748B", font=body_font)
    draw.text((80, 340), attendee_name or "Registered attendee", fill="#062E22", font=title_font)

    draw.text((80, 410), "Location", fill="#64748B", font=body_font)
    draw.text((80, 435), event_location or "Venue to be confirmed", fill="#062E22", font=title_font)

    draw.text((80, 505), "Date", fill="#64748B", font=body_font)
    date_label = event_start_date.strftime("%b %d, %Y %I:%M %p") if event_start_date else "Date pending"
    draw.text((80, 530), date_label, fill="#062E22", font=title_font)

    draw.text((80, 600), "Booking Reference", fill="#64748B", font=body_font)
    draw.text((80, 625), booking_reference, fill="#062E22", font=title_font)

    qr_size = 330
    qr_image = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    qr_x = width - qr_size - 120
    qr_y = 220
    card.paste(qr_image, (qr_x, qr_y))

    draw.rounded_rectangle((qr_x - 20, qr_y - 20, qr_x + qr_size + 20, qr_y + qr_size + 20), radius=24, outline="#D7E0DC", width=2)
    draw.text((qr_x - 5, qr_y + qr_size + 40), "Present this QR at event check-in", fill="#475569", font=body_font)

    output = BytesIO()
    card.save(output, format="PNG")
    return output.getvalue()
