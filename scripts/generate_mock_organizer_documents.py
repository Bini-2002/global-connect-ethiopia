from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = Path("test_assets/organizer_docs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH = 1600
HEIGHT = 1100


@dataclass(frozen=True)
class OrganizerSample:
    company_name: str
    rep_name: str
    rep_position: str
    issue_date: str
    expiry_date: str
    license_number: str
    authorization_ref: str


SAMPLES = [
    OrganizerSample(
        company_name="Blue Nile Events PLC",
        rep_name="Lulit Demissie",
        rep_position="Program Manager",
        issue_date="2025/01/14",
        expiry_date="2028/01/13",
        license_number="ORG-BL-2025-10021",
        authorization_ref="AUTH-2025-3110",
    ),
    OrganizerSample(
        company_name="Selam Horizon Conferences PLC",
        rep_name="Nahom Fikru",
        rep_position="Operations Lead",
        issue_date="2024/09/05",
        expiry_date="2027/09/04",
        license_number="ORG-BL-2024-07198",
        authorization_ref="AUTH-2024-9422",
    ),
    OrganizerSample(
        company_name="Addis Summit Organizers PLC",
        rep_name="Meklit Girma",
        rep_position="Registration Coordinator",
        issue_date="2025/03/09",
        expiry_date="2028/03/08",
        license_number="ORG-BL-2025-11477",
        authorization_ref="AUTH-2025-5381",
    ),
    OrganizerSample(
        company_name="Unity Expo and Convention PLC",
        rep_name="Samuel Ayele",
        rep_position="Senior Organizer",
        issue_date="2024/11/22",
        expiry_date="2027/11/21",
        license_number="ORG-BL-2024-08804",
        authorization_ref="AUTH-2024-8844",
    ),
    OrganizerSample(
        company_name="Ethio Connect Event Solutions PLC",
        rep_name="Rahel Abebe",
        rep_position="Field Operations Officer",
        issue_date="2025/06/18",
        expiry_date="2028/06/17",
        license_number="ORG-BL-2025-13002",
        authorization_ref="AUTH-2025-6190",
    ),
]


def _font(size: int) -> ImageFont.ImageFont:
    for font_name in ("arial.ttf", "calibri.ttf", "times.ttf"):
        try:
            return ImageFont.truetype(font_name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _draw_header(draw: ImageDraw.ImageDraw, title: str, subtitle: str, palette: dict[str, tuple[int, int, int]]) -> None:
    draw.rectangle((22, 22, WIDTH - 22, HEIGHT - 22), outline=palette["border"], width=4)
    draw.rectangle((22, 22, WIDTH - 22, 158), fill=palette["header_bg"])
    draw.text((58, 54), "FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA", fill=palette["header_text"], font=_font(36))
    draw.text((58, 102), title, fill=palette["title_text"], font=_font(30))
    draw.text((58, 138), subtitle, fill=palette["title_text"], font=_font(22))


def _draw_stamp(draw: ImageDraw.ImageDraw, x: int, y: int, color: tuple[int, int, int], serial: str) -> None:
    draw.ellipse((x, y, x + 220, y + 220), outline=color, width=7)
    draw.ellipse((x + 18, y + 18, x + 202, y + 202), outline=color, width=3)
    draw.text((x + 36, y + 82), "OFFICIAL", fill=color, font=_font(27))
    draw.text((x + 64, y + 118), "SEAL", fill=color, font=_font(30))
    draw.text((x + 44, y + 162), serial, fill=color, font=_font(18))


def _draw_signature(draw: ImageDraw.ImageDraw, x: int, y: int, ink: tuple[int, int, int], seed_value: int) -> None:
    rng = random.Random(seed_value)
    points = []
    px, py = x, y
    for _ in range(52):
        px += rng.randint(7, 18)
        py += rng.randint(-11, 11)
        points.append((px, py))
    draw.line(points, fill=ink, width=3)


def _draw_watermark(draw: ImageDraw.ImageDraw, text: str, color: tuple[int, int, int], y: int) -> None:
    draw.text((170, y), text, fill=color, font=_font(44))


def _draw_license_document(sample: OrganizerSample, index: int, palette: dict[str, tuple[int, int, int]], stamp_serial: str, signature_seed: int, texture: bool) -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), color=palette["paper"])
    draw = ImageDraw.Draw(img)

    _draw_header(
        draw,
        title="ORGANIZATION BUSINESS LICENCE",
        subtitle="Business Licence / Registration Certificate",
        palette=palette,
    )

    y = 220
    gap = 62
    fields = [
        f"Organization Name: {sample.company_name}",
        f"Licence Number: {sample.license_number}",
        f"Registration Type: Private Limited Company",
        f"Issue Date: {sample.issue_date}",
        f"Expiry Date: {sample.expiry_date}",
        "Business Activity: Event Planning and Conference Services",
        "Registered Address: Addis Ababa, Ethiopia",
        "Status: ACTIVE",
    ]

    for row in fields:
        draw.text((84, y), row, fill=palette["body_text"], font=_font(34))
        y += gap

    draw.text((84, y + 12), "Authorized by Trade and Regional Integration Office", fill=palette["accent"], font=_font(28))

    _draw_watermark(draw, "TEST COPY - NOT FOR LEGAL USE", palette["watermark"], y=468)

    _draw_stamp(draw, 1180, 690, palette["stamp"], stamp_serial)
    draw.text((980, 912), "CEO Signature:", fill=palette["body_text"], font=_font(24))
    _draw_signature(draw, 970, 968, palette["signature"], signature_seed)

    draw.text((84, 1010), f"Sample Set: {index:02d}", fill=palette["accent"], font=_font(20))

    if texture:
        img = img.filter(ImageFilter.GaussianBlur(radius=0.6))

    return img


def _draw_authorization_document(sample: OrganizerSample, index: int, palette: dict[str, tuple[int, int, int]], stamp_serial: str, signature_seed: int, textured: bool) -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), color=palette["paper"])
    draw = ImageDraw.Draw(img)

    _draw_header(
        draw,
        title="AUTHORIZATION PROOF",
        subtitle="Representative Authorization Letter",
        palette=palette,
    )

    paragraphs = [
        f"Organization: {sample.company_name}",
        f"Authorization Ref: {sample.authorization_ref}",
        f"Registration Representative: {sample.rep_name}",
        f"Representative Position: {sample.rep_position}",
        "Purpose: Authorized to complete organizer registration and related submissions.",
        f"Effective Date: {sample.issue_date}",
        f"Valid Until: {sample.expiry_date}",
        "This authorization is issued by the board and executive office of the organization.",
    ]

    y = 230
    for row in paragraphs:
        draw.text((88, y), row, fill=palette["body_text"], font=_font(32))
        y += 66

    draw.text((88, y + 18), "Confirmed by: Chief Executive Officer", fill=palette["accent"], font=_font(28))

    _draw_watermark(draw, "SAMPLE DOCUMENT - VERIFICATION TEST", palette["watermark"], y=486)

    # Same style stamp + same CEO signature seed to keep both docs visually linked.
    _draw_stamp(draw, 1178, 686, palette["stamp"], stamp_serial)
    draw.text((980, 908), "CEO Signature:", fill=palette["body_text"], font=_font(24))
    _draw_signature(draw, 970, 964, palette["signature"], signature_seed)

    draw.text((88, 1010), f"Sample Set: {index:02d}", fill=palette["accent"], font=_font(20))

    if textured:
        img = img.filter(ImageFilter.GaussianBlur(radius=0.8))

    return img


def generate_organizer_document_test_set() -> None:
    palettes = [
        {
            "paper": (248, 251, 250),
            "header_bg": (223, 239, 236),
            "header_text": (13, 44, 40),
            "title_text": (13, 84, 62),
            "body_text": (24, 29, 34),
            "accent": (8, 96, 61),
            "stamp": (18, 102, 181),
            "signature": (10, 10, 10),
            "border": (27, 83, 72),
            "watermark": (205, 66, 66),
        },
        {
            "paper": (250, 248, 244),
            "header_bg": (238, 229, 212),
            "header_text": (55, 42, 24),
            "title_text": (94, 62, 28),
            "body_text": (40, 36, 30),
            "accent": (98, 65, 23),
            "stamp": (31, 95, 161),
            "signature": (18, 17, 16),
            "border": (92, 72, 35),
            "watermark": (185, 76, 58),
        },
        {
            "paper": (246, 249, 252),
            "header_bg": (222, 233, 246),
            "header_text": (19, 43, 70),
            "title_text": (28, 66, 113),
            "body_text": (21, 31, 43),
            "accent": (28, 74, 132),
            "stamp": (24, 106, 172),
            "signature": (9, 9, 9),
            "border": (36, 79, 126),
            "watermark": (180, 70, 70),
        },
    ]

    for i, sample in enumerate(SAMPLES, start=1):
        palette = palettes[(i - 1) % len(palettes)]
        stamp_serial = f"ECA-{i:03d}"
        signature_seed = 5100 + i

        business_img = _draw_license_document(
            sample=sample,
            index=i,
            palette=palette,
            stamp_serial=stamp_serial,
            signature_seed=signature_seed,
            texture=i % 2 == 0,
        )
        auth_img = _draw_authorization_document(
            sample=sample,
            index=i,
            palette=palette,
            stamp_serial=stamp_serial,
            signature_seed=signature_seed,
            textured=i % 2 == 1,
        )

        business_png = OUT_DIR / f"organizer_{i:02d}_business_licence.png"
        auth_png = OUT_DIR / f"organizer_{i:02d}_authorization_proof.png"

        business_img.save(business_png)
        auth_img.save(auth_png)

        # Extra format variety for upload tests.
        if i == 1:
            business_img.convert("RGB").save(OUT_DIR / "organizer_01_business_licence.pdf", "PDF", resolution=110.0)
        if i == 2:
            auth_img.save(OUT_DIR / "organizer_02_authorization_proof.webp", "WEBP", quality=90)


def generate_organizer_negative_test_set() -> None:
    # Base palette for negative samples.
    palette = {
        "paper": (248, 251, 250),
        "header_bg": (223, 239, 236),
        "header_text": (13, 44, 40),
        "title_text": (13, 84, 62),
        "body_text": (24, 29, 34),
        "accent": (8, 96, 61),
        "stamp": (18, 102, 181),
        "signature": (10, 10, 10),
        "border": (27, 83, 72),
        "watermark": (205, 66, 66),
    }

    sample = SAMPLES[0]

    # 1) Representative name mismatch between metadata and authorization proof.
    mismatch_auth = OrganizerSample(
        company_name=sample.company_name,
        rep_name="Wrong Representative Name",
        rep_position=sample.rep_position,
        issue_date=sample.issue_date,
        expiry_date=sample.expiry_date,
        license_number=sample.license_number,
        authorization_ref=sample.authorization_ref,
    )

    business_ok = _draw_license_document(
        sample=sample,
        index=91,
        palette=palette,
        stamp_serial="NEG-091",
        signature_seed=9011,
        texture=False,
    )
    auth_mismatch = _draw_authorization_document(
        sample=mismatch_auth,
        index=91,
        palette=palette,
        stamp_serial="NEG-091",
        signature_seed=9011,
        textured=False,
    )
    business_ok.save(OUT_DIR / "organizer_neg_01_business_licence_valid.png")
    auth_mismatch.save(OUT_DIR / "organizer_neg_01_authorization_rep_name_mismatch.png")

    # 2) Missing stamp and signature on both docs.
    no_mark_business = _draw_license_document(
        sample=sample,
        index=92,
        palette=palette,
        stamp_serial="NEG-092",
        signature_seed=9012,
        texture=False,
    )
    no_mark_auth = _draw_authorization_document(
        sample=sample,
        index=92,
        palette=palette,
        stamp_serial="NEG-092",
        signature_seed=9012,
        textured=False,
    )
    draw_b = ImageDraw.Draw(no_mark_business)
    draw_a = ImageDraw.Draw(no_mark_auth)
    # Paint over stamp and signature areas to remove both indicators.
    draw_b.rectangle((930, 650, 1450, 1040), fill=palette["paper"])
    draw_a.rectangle((930, 650, 1450, 1040), fill=palette["paper"])
    no_mark_business.save(OUT_DIR / "organizer_neg_02_business_licence_no_stamp_signature.png")
    no_mark_auth.save(OUT_DIR / "organizer_neg_02_authorization_no_stamp_signature.png")

    # 3) Low quality pair for OCR stress testing.
    lowq_business = _draw_license_document(
        sample=sample,
        index=93,
        palette=palette,
        stamp_serial="NEG-093",
        signature_seed=9013,
        texture=True,
    ).filter(ImageFilter.GaussianBlur(radius=1.8))
    lowq_auth = _draw_authorization_document(
        sample=sample,
        index=93,
        palette=palette,
        stamp_serial="NEG-093",
        signature_seed=9013,
        textured=True,
    ).filter(ImageFilter.GaussianBlur(radius=1.8))
    lowq_business.save(OUT_DIR / "organizer_neg_03_business_licence_low_quality.png")
    lowq_auth.save(OUT_DIR / "organizer_neg_03_authorization_low_quality.png")


def main() -> None:
    generate_organizer_document_test_set()
    generate_organizer_negative_test_set()
    print(f"Mock organizer registration documents generated at: {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
