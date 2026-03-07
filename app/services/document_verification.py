from __future__ import annotations

import re
import importlib
from dataclasses import dataclass
from io import BytesIO
from typing import Any

from app.core.config import settings

def _try_import(module_name: str):
    try:
        return importlib.import_module(module_name)
    except Exception:
        return None


AUTH_KEYWORDS = [
    "authorize",
    "authorization",
    "represent",
    "organization",
    "official",
    "delegate",
]


@dataclass
class DetectionResult:
    signature_detected: bool
    stamp_detected: bool
    colored_ink_detected: bool


class DocumentVerificationService:
    def extract_structured_data(self, content: bytes, content_type: str, document_type: str) -> dict[str, Any]:
        text = self.extract_text(content=content, content_type=content_type)
        text_lower = text.lower()

        return {
            "document_type": document_type,
            "raw_text": text,
            "name": self._extract_name(text),
            "organization": self._extract_organization(text),
            "id_number": self._extract_id_number(text),
            "issue_date": self._extract_date_by_label(text, "issue"),
            "expiry_date": self._extract_date_by_label(text, "expiry"),
            "keywords": [k for k in AUTH_KEYWORDS if k in text_lower],
            "ocr_success": len(text.strip()) > 20,
            "ocr_confidence": self._estimate_ocr_confidence(text),
        }

    def extract_text(self, content: bytes, content_type: str) -> str:
        pypdf_module = _try_import("pypdf")
        if "pdf" in content_type and pypdf_module is not None:
            try:
                pdf_reader_cls = getattr(pypdf_module, "PdfReader")
                reader = pdf_reader_cls(BytesIO(content))
                pages = [page.extract_text() or "" for page in reader.pages]
                combined = "\n".join(pages).strip()
                if combined:
                    return combined
            except Exception:
                pass

        pil_module = _try_import("PIL.Image")
        pytesseract_module = _try_import("pytesseract")
        if pil_module is not None and pytesseract_module is not None:
            try:
                image = pil_module.open(BytesIO(content))
                return pytesseract_module.image_to_string(image)
            except Exception:
                return ""

        return ""

    def detect_signature_and_stamp(self, content: bytes, content_type: str) -> DetectionResult:
        if not content_type.startswith("image/"):
            return DetectionResult(False, False, False)
        cv2 = _try_import("cv2")
        np = _try_import("numpy")
        if cv2 is None or np is None:
            return DetectionResult(False, False, False)

        image = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            return DetectionResult(False, False, False)

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 80, 160)
        contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        signature_detected = any(cv2.contourArea(c) > 1000 for c in contours)

        circles = cv2.HoughCircles(
            gray,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=40,
            param1=80,
            param2=20,
            minRadius=20,
            maxRadius=200,
        )
        stamp_detected = circles is not None

        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        saturation = hsv[:, :, 1]
        colored_pixels = int((saturation > 90).sum())
        total_pixels = saturation.shape[0] * saturation.shape[1]
        colored_ink_detected = total_pixels > 0 and (colored_pixels / total_pixels) > 0.02

        return DetectionResult(
            signature_detected=signature_detected,
            stamp_detected=stamp_detected,
            colored_ink_detected=colored_ink_detected,
        )

    def score_application(
        self,
        representative_ocr: dict[str, Any],
        authorization_ocr: dict[str, Any],
        license_ocr: dict[str, Any],
        representative_detection: DetectionResult,
        authorization_detection: DetectionResult,
    ) -> dict[str, Any]:
        checks: list[dict[str, Any]] = []
        score = 0

        if representative_ocr.get("ocr_success"):
            score += 30
            checks.append({"check": "ID OCR successful", "score": 30, "passed": True})
        else:
            checks.append({"check": "ID OCR successful", "score": 30, "passed": False})

        names_match = self._normalized(representative_ocr.get("name")) == self._normalized(
            authorization_ocr.get("name")
        )
        if names_match:
            score += 25
        checks.append({"check": "Name matches across documents", "score": 25, "passed": names_match})

        org_match = self._normalized(authorization_ocr.get("organization")) == self._normalized(
            license_ocr.get("organization")
        )
        if org_match:
            score += 20
        checks.append({"check": "Organization matches", "score": 20, "passed": org_match})

        signature_detected = representative_detection.signature_detected or authorization_detection.signature_detected
        if signature_detected:
            score += 10
        checks.append({"check": "Signature detected", "score": 10, "passed": signature_detected})

        stamp_detected = representative_detection.stamp_detected or authorization_detection.stamp_detected
        if stamp_detected:
            score += 10
        checks.append({"check": "Stamp detected", "score": 10, "passed": stamp_detected})

        low_quality = (
            (representative_ocr.get("ocr_confidence", 0) < 0.40)
            or (authorization_ocr.get("ocr_confidence", 0) < 0.40)
            or (license_ocr.get("ocr_confidence", 0) < 0.40)
        )
        if low_quality:
            score -= 20
        checks.append({"check": "Low image quality", "score": -20, "passed": low_quality})

        missing_keywords = len(authorization_ocr.get("keywords", [])) < 2
        if missing_keywords:
            score -= 30
        checks.append({"check": "Missing authorization keywords", "score": -30, "passed": missing_keywords})

        if score >= settings.AUTO_APPROVE_SCORE:
            decision = "auto_approved"
            status = "approved"
        elif score >= settings.MANUAL_REVIEW_MIN_SCORE:
            decision = "manual_review"
            status = "manual_review"
        else:
            decision = "rejected"
            status = "rejected"

        return {
            "score": score,
            "decision": decision,
            "verification_status": status,
            "checks": checks,
            "cross_verification": {
                "representative_name_match": names_match,
                "organization_match": org_match,
            },
        }

    @staticmethod
    def _estimate_ocr_confidence(text: str) -> float:
        if not text:
            return 0.0
        alpha = sum(1 for c in text if c.isalpha())
        digit = sum(1 for c in text if c.isdigit())
        ratio = (alpha + digit) / max(len(text), 1)
        return min(max(ratio, 0.0), 1.0)

    @staticmethod
    def _extract_name(text: str) -> str | None:
        patterns = [
            r"(?:name|full name)\s*[:\-]\s*([A-Za-z][A-Za-z\s.'-]{2,})",
        ]
        return DocumentVerificationService._first_match(text, patterns)

    @staticmethod
    def _extract_organization(text: str) -> str | None:
        patterns = [
            r"(?:organization|company|institution)\s*(?:name)?\s*[:\-]\s*([A-Za-z0-9][A-Za-z0-9\s&.,'\-]{2,})",
        ]
        return DocumentVerificationService._first_match(text, patterns)

    @staticmethod
    def _extract_id_number(text: str) -> str | None:
        patterns = [
            r"(?:id\s*(?:no|number)?|passport\s*(?:no|number)?)\s*[:\-]\s*([A-Za-z0-9\-]{5,})",
            r"\b[A-Z]{0,3}\-?\d{5,}\b",
        ]
        return DocumentVerificationService._first_match(text, patterns)

    @staticmethod
    def _extract_date_by_label(text: str, label: str) -> str | None:
        patterns = [
            rf"{label}\s*(?:date)?\s*[:\-]\s*(\d{{4}}[-/]\d{{2}}[-/]\d{{2}})",
            rf"{label}\s*(?:date)?\s*[:\-]\s*(\d{{2}}[-/]\d{{2}}[-/]\d{{4}})",
        ]
        return DocumentVerificationService._first_match(text, patterns)

    @staticmethod
    def _first_match(text: str, patterns: list[str]) -> str | None:
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    @staticmethod
    def _normalized(value: str | None) -> str:
        if not value:
            return ""
        return re.sub(r"\s+", " ", value.strip().lower())
