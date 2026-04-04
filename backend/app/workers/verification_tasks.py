from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.db.mongodb import organizer_collection, verification_job_collection, verification_result_collection
from app.db.mongodb import vendor_collection
from app.services.document_verification import DocumentVerificationService
from app.services.object_storage import ObjectStorageService

PENDING_FOR_REVIEW = "pending_for_review"


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
        representative_doc = docs.get("representative_id_document") or docs.get("government_id_document")
        authorization_doc = docs.get("authorization_proof") or docs.get("authorization_letter")
        business_doc = docs.get("business_licence") or docs.get("business_license")
        organizer_id = job.get("entity_id") or job.get("organizer_id")

        if not representative_doc or not authorization_doc or not business_doc or not organizer_id:
            raise KeyError("Organizer verification job is missing required documents")

        id_doc_bytes = storage.read_bytes(representative_doc["storage_key"])
        auth_doc_bytes = storage.read_bytes(authorization_doc["storage_key"])
        license_bytes = storage.read_bytes(business_doc["storage_key"])

        id_ocr = verifier.extract_structured_data(
            content=id_doc_bytes,
            content_type=representative_doc["content_type"],
            document_type="representative_id",
        )
        auth_ocr = verifier.extract_structured_data(
            content=auth_doc_bytes,
            content_type=authorization_doc["content_type"],
            document_type="authorization_letter",
        )
        license_ocr = verifier.extract_structured_data(
            content=license_bytes,
            content_type=business_doc["content_type"],
            document_type="business_license",
        )

        id_detection = verifier.detect_signature_and_stamp(
            content=id_doc_bytes,
            content_type=representative_doc["content_type"],
        )
        auth_detection = verifier.detect_signature_and_stamp(
            content=auth_doc_bytes,
            content_type=authorization_doc["content_type"],
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
            "job_type": job.get("job_type"),
            "user_id": job["user_id"],
            "entity_id": organizer_id,
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
            {"_id": organizer_id},
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
            {"_id": organizer_id},
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
                    # OCR done — status stays pending_for_review so admin can make final decision.
                    "verification_status": PENDING_FOR_REVIEW,
                    "verification_decision": scoring["decision"],
                    "recommended_status": scoring.get("verification_status"),
                    "verification_job_id": str(job["_id"]),
                    "review_required": True,
                    "reviewed_at": None,
                    "status": PENDING_FOR_REVIEW,
                    "updated_at": now,
                },
                "$push": {
                    "status_history": {
                        "status": PENDING_FOR_REVIEW,
                        "source": "system_scoring",
                        "note": f"OCR recommendation: {scoring['decision']}",
                        "actor_id": None,
                        "changed_at": now,
                    }
                },
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
        fail_time = datetime.now(timezone.utc)
        await vendor_collection.update_one(
            {"_id": job["entity_id"]},
            {
                "$set": {
                    "verification_status": PENDING_FOR_REVIEW,
                    "status": PENDING_FOR_REVIEW,
                    "review_required": True,
                    "updated_at": fail_time,
                },
                "$push": {
                    "status_history": {
                        "status": PENDING_FOR_REVIEW,
                        "source": "system_scoring_error",
                        "note": "OCR verification failed; escalated to admin review",
                        "actor_id": None,
                        "changed_at": fail_time,
                    }
                },
            },
        )


def run_vendor_verification_job(job_id: str) -> None:
    asyncio.run(_run_vendor_verification_job(job_id))
