from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random

OUT_DIR = Path("test_assets/vendor_docs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH = 1400
HEIGHT = 1000


def _font(size: int):
    # Fall back to default font if truetype is not available.
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def _draw_watermark(draw: ImageDraw.ImageDraw) -> None:
    wm = "SAMPLE - TEST ONLY - NOT VALID"
    font = _font(52)
    draw.text((170, 450), wm, fill=(220, 60, 60), font=font)


def _draw_stamp(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    # Circular stamp-like mark (presence check only)
    draw.ellipse((x, y, x + 180, y + 180), outline=(20, 110, 200), width=6)
    draw.ellipse((x + 14, y + 14, x + 166, y + 166), outline=(20, 110, 200), width=2)
    draw.text((x + 40, y + 78), "STAMP", fill=(20, 110, 200), font=_font(24))


def _draw_signature(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    points = []
    px, py = x, y
    for _ in range(40):
        px += random.randint(6, 18)
        py += random.randint(-10, 10)
        points.append((px, py))
    draw.line(points, fill=(10, 10, 10), width=3)


def _base_license(
    file_path: Path,
    business_name: str,
    owner_name: str,
    include_keywords: bool,
    include_stamp: bool,
    include_signature: bool,
    low_quality: bool,
) -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(248, 251, 252))
    draw = ImageDraw.Draw(img)

    # Border and heading
    draw.rectangle((20, 20, WIDTH - 20, HEIGHT - 20), outline=(30, 80, 90), width=4)
    draw.rectangle((20, 20, WIDTH - 20, 130), fill=(224, 240, 242))
    draw.text((40, 52), "FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA", fill=(12, 40, 44), font=_font(34))
    draw.text((40, 94), "BUSINESS LICENSE / REGISTRATION CERTIFICATE", fill=(12, 80, 60), font=_font(28))

    # Main fields crafted for OCR extractors in your backend.
    y = 190
    gap = 56
    fields = [
        f"Organization Name: {business_name}",
        f"Name: {owner_name}",
        "ID Number: ET-9876543",
        "License Number: BL-2026-004912",
        "Issue Date: 2024/05/12",
        "Expiry Date: 2027/05/11",
        "Business Address: Addis Ababa, Ethiopia",
    ]

    for row in fields:
        draw.text((70, y), row, fill=(20, 25, 30), font=_font(34))
        y += gap

    if include_keywords:
        draw.text((70, y + 20), "Official Registration - Authorized Business Entity", fill=(0, 70, 35), font=_font(30))
    else:
        draw.text((70, y + 20), "Issued for internal records only", fill=(80, 80, 80), font=_font(30))

    _draw_watermark(draw)

    if include_stamp:
        _draw_stamp(draw, 1010, 640)

    if include_signature:
        draw.text((950, 830), "Authorized Signature:", fill=(25, 25, 25), font=_font(24))
        _draw_signature(draw, 940, 885)

    if low_quality:
        img = img.filter(ImageFilter.GaussianBlur(radius=1.9))

    img.save(file_path)


def create_vendor_license_test_set() -> None:
    # 1) Happy path: should score high
    _base_license(
        file_path=OUT_DIR / "business_license_valid.png",
        business_name="Addis Event Group",
        owner_name="Biniyam Getachew Asrat",
        include_keywords=True,
        include_stamp=True,
        include_signature=True,
        low_quality=False,
    )

    # 2) Name mismatch case (for cross-check fail against Gov ID)
    _base_license(
        file_path=OUT_DIR / "business_license_name_mismatch.png",
        business_name="Addis Event Group",
        owner_name="Different Person",
        include_keywords=True,
        include_stamp=True,
        include_signature=True,
        low_quality=False,
    )

    # 3) Missing stamp/signature case
    _base_license(
        file_path=OUT_DIR / "business_license_no_stamp_signature.png",
        business_name="Addis Event Group",
        owner_name="Biniyam Getachew Asrat",
        include_keywords=True,
        include_stamp=False,
        include_signature=False,
        low_quality=False,
    )

    # 4) Missing keywords case
    _base_license(
        file_path=OUT_DIR / "business_license_missing_keywords.png",
        business_name="Addis Event Group",
        owner_name="Biniyam Getachew Asrat",
        include_keywords=False,
        include_stamp=True,
        include_signature=True,
        low_quality=False,
    )

    # 5) Low quality case
    _base_license(
        file_path=OUT_DIR / "business_license_low_quality.png",
        business_name="Addis Event Group",
        owner_name="Biniyam Getachew Asrat",
        include_keywords=True,
        include_stamp=True,
        include_signature=True,
        low_quality=True,
    )

    # Optional PDF variant for upload format testing.
    img = Image.open(OUT_DIR / "business_license_valid.png").convert("RGB")
    img.save(OUT_DIR / "business_license_valid.pdf", "PDF", resolution=100.0)


if __name__ == "__main__":
    create_vendor_license_test_set()
    print(f"Mock test licenses generated at: {OUT_DIR.resolve()}")
