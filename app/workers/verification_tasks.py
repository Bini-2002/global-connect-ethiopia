from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.db.mongodb import organizer_collection, verification_job_collection, verification_result_collection
from app.db.mongodb import vendor_collection
from app.services.document_verification import DocumentVerificationService
from app.services.object_storage import ObjectStorageService

PENDING_ADMIN_REVIEW = "pending_admin_review"


async def _run_verification_job(job_id: str) -> None:
    storage = ObjectStorageService()
    verifier = DocumentVerificationService()

    job = await verification_job_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        return

    await verification_job_collection.update_one(
        {"_id": job["_id"]},
        {"$set": {"status": "processing", "started_at": datetime.now(timezone.utc)}},
    )

    try:
        docs = job["documents"]

        id_doc_bytes = storage.read_bytes(docs["government_id_document"]["storage_key"])
        auth_doc_bytes = storage.read_bytes(docs["authorization_letter"]["storage_key"])
        license_bytes = storage.read_bytes(docs["business_license"]["storage_key"])

        id_ocr = verifier.extract_structured_data(
            content=id_doc_bytes,
            content_type=docs["government_id_document"]["content_type"],
            document_type="representative_id",
        )
        auth_ocr = verifier.extract_structured_data(
            content=auth_doc_bytes,
            content_type=docs["authorization_letter"]["content_type"],
            document_type="authorization_letter",
        )
        license_ocr = verifier.extract_structured_data(
            content=license_bytes,
            content_type=docs["business_license"]["content_type"],
            document_type="business_license",
        )

        id_detection = verifier.detect_signature_and_stamp(
            content=id_doc_bytes,
            content_type=docs["government_id_document"]["content_type"],
        )
        auth_detection = verifier.detect_signature_and_stamp(
            content=auth_doc_bytes,
            content_type=docs["authorization_letter"]["content_type"],
        )

        scoring = verifier.score_application(
            representative_ocr=id_ocr,
            authorization_ocr=auth_ocr,
            license_ocr=license_ocr,
            representative_detection=id_detection,
            authorization_detection=auth_detection,
        )

        now = datetime.now(timezone.utc)
        result_payload: dict[str, Any] = {
            "job_id": job["_id"],
            "user_id": job["user_id"],
            "organizer_id": job["organizer_id"],
            "ocr": {
                "representative_id": id_ocr,
                "authorization_letter": auth_ocr,
                "business_license": license_ocr,
            },
            "detection": {
                "representative_id": {
                    "signature_detected": id_detection.signature_detected,
                    "stamp_detected": id_detection.stamp_detected,
                    "colored_ink_detected": id_detection.colored_ink_detected,
                },
                "authorization_letter": {
                    "signature_detected": auth_detection.signature_detected,
                    "stamp_detected": auth_detection.stamp_detected,
                    "colored_ink_detected": auth_detection.colored_ink_detected,
                },
            },
            "score": scoring["score"],
            "decision": scoring["decision"],
            "verification_status": scoring["verification_status"],
            "checks": scoring["checks"],
            "cross_verification": scoring["cross_verification"],
            "created_at": now,
        }

        await verification_result_collection.insert_one(result_payload)

        await verification_job_collection.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": now,
                    "verification_status": scoring["verification_status"],
                    "verification_score": scoring["score"],
                    "decision": scoring["decision"],
                }
            },
        )

        await organizer_collection.update_one(
            {"_id": job["organizer_id"]},
            {
                "$set": {
                    "verification_score": scoring["score"],
                    "verification_status": scoring["verification_status"],
                    "verification_decision": scoring["decision"],
                    "verification_job_id": str(job["_id"]),
                    "review_required": scoring["decision"] == "manual_review",
                    "reviewed_at": now if scoring["decision"] != "manual_review" else None,
                    "updated_at": now,
                }
            },
        )

    except Exception as exc:
        await verification_job_collection.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "status": "failed",
                    "error": str(exc),
                    "failed_at": datetime.now(timezone.utc),
                }
            },
        )
        await organizer_collection.update_one(
            {"_id": job["organizer_id"]},
            {
                "$set": {
                    "verification_status": "manual_review",
                    "review_required": True,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )


def run_organizer_verification_job(job_id: str) -> None:
    asyncio.run(_run_verification_job(job_id))


async def _run_vendor_verification_job(job_id: str) -> None:
    storage = ObjectStorageService()
    verifier = DocumentVerificationService()

    job = await verification_job_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        return

    await verification_job_collection.update_one(
        {"_id": job["_id"]},
        {"$set": {"status": "processing", "started_at": datetime.now(timezone.utc)}},
    )

    try:
        docs = job["documents"]

        business_doc_bytes = storage.read_bytes(docs["business_document"]["storage_key"])
        government_id_bytes = storage.read_bytes(docs["government_issued_id"]["storage_key"])

        business_doc_ocr = verifier.extract_structured_data(
            content=business_doc_bytes,
            content_type=docs["business_document"]["content_type"],
            document_type="vendor_business_document",
        )
        government_id_ocr = verifier.extract_structured_data(
            content=government_id_bytes,
            content_type=docs["government_issued_id"]["content_type"],
            document_type="vendor_government_id",
        )

        business_doc_detection = verifier.detect_signature_and_stamp(
            content=business_doc_bytes,
            content_type=docs["business_document"]["content_type"],
        )
        government_id_detection = verifier.detect_signature_and_stamp(
            content=government_id_bytes,
            content_type=docs["government_issued_id"]["content_type"],
        )

        submitted_business_name = (job.get("submitted_data") or {}).get("business_name")
        scoring = verifier.score_vendor_application(
            government_id_ocr=government_id_ocr,
            business_document_ocr=business_doc_ocr,
            business_document_detection=business_doc_detection,
            government_id_detection=government_id_detection,
            submitted_business_name=submitted_business_name,
        )

        now = datetime.now(timezone.utc)
        result_payload: dict[str, Any] = {
            "job_id": job["_id"],
            "job_type": "vendor",
            "user_id": job["user_id"],
            "entity_id": job["entity_id"],
            "ocr": {
                "business_document": business_doc_ocr,
                "government_issued_id": government_id_ocr,
            },
            "detection": {
                "business_document": {
                    "signature_detected": business_doc_detection.signature_detected,
                    "stamp_detected": business_doc_detection.stamp_detected,
                    "colored_ink_detected": business_doc_detection.colored_ink_detected,
                },
                "government_issued_id": {
                    "signature_detected": government_id_detection.signature_detected,
                    "stamp_detected": government_id_detection.stamp_detected,
                    "colored_ink_detected": government_id_detection.colored_ink_detected,
                },
            },
            "score": scoring["score"],
            "decision": scoring["decision"],
            "verification_status": scoring["verification_status"],
            "checks": scoring["checks"],
            "cross_verification": scoring["cross_verification"],
            "created_at": now,
        }

        await verification_result_collection.insert_one(result_payload)

        await verification_job_collection.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": now,
                    "verification_status": scoring["verification_status"],
                    "verification_score": scoring["score"],
                    "decision": scoring["decision"],
                }
            },
        )

        await vendor_collection.update_one(
            {"_id": job["entity_id"]},
            {
                "$set": {
                    "verification_score": scoring["score"],
                    # Keep admin-facing state stable; expose system recommendation separately.
                    "verification_status": PENDING_ADMIN_REVIEW,
                    "verification_decision": scoring["decision"],
                    "recommended_status": scoring.get("verification_status"),
                    "verification_job_id": str(job["_id"]),
                    "review_required": True,
                    "reviewed_at": None,
                    "status": PENDING_ADMIN_REVIEW,
                    "updated_at": now,
                }
            },
        )

    except Exception as exc:
        await verification_job_collection.update_one(
            {"_id": job["_id"]},
            {
                "$set": {
                    "status": "failed",
                    "error": str(exc),
                    "failed_at": datetime.now(timezone.utc),
                }
            },
        )
        await vendor_collection.update_one(
            {"_id": job["entity_id"]},
            {
                "$set": {
                    "verification_status": PENDING_ADMIN_REVIEW,
                    "status": PENDING_ADMIN_REVIEW,
                    "review_required": True,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )


def run_vendor_verification_job(job_id: str) -> None:
    asyncio.run(_run_vendor_verification_job(job_id))
