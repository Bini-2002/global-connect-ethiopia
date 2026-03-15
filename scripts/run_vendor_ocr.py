"""
scripts/run_vendor_ocr.py
─────────────────────────────────────────────────────────────────────────────
Manual OCR trigger for a vendor record — no Redis required.

Usage (from the project root):
    python scripts/run_vendor_ocr.py <vendor_id>

Example:
    python scripts/run_vendor_ocr.py 69b3b0af95cfa4b6498f995f

What it does:
  1. Looks up the vendor by ID in MongoDB
  2. Finds (or creates) the verification job record
  3. Runs the OCR + scoring pipeline synchronously
  4. Saves the result back to the vendor document

After running, call:
  GET /api/v1/vendors/admin/{vendor_id}
to see the updated ocr_score, ocr_tier and recommendation.
"""

import asyncio
import sys
from bson import ObjectId
from datetime import datetime, timezone


async def main(vendor_id_str: str) -> None:
    # Import here so MONGODB_URL is read from .env before anything connects
    from app.db.mongodb import vendor_collection, verification_job_collection
    from app.workers.verification_tasks import _run_vendor_verification_job

    try:
        oid = ObjectId(vendor_id_str)
    except Exception:
        print(f"[ERROR] '{vendor_id_str}' is not a valid ObjectId.")
        sys.exit(1)

    vendor = await vendor_collection.find_one({"_id": oid})
    if not vendor:
        print(f"[ERROR] No vendor found with id={vendor_id_str}")
        sys.exit(1)

    print(f"[INFO] Vendor found: {vendor_id_str}")
    print(f"[INFO] Current status : {vendor.get('status')}")
    print(f"[INFO] Current ocr_score: {vendor.get('verification_score')}")

    # Find the most recent job for this vendor
    job = await verification_job_collection.find_one(
        {"entity_id": oid, "job_type": "vendor"},
        sort=[("submitted_at", -1)],
    )

    if not job:
        # Create a job record from the vendor's stored documents
        step_2 = vendor.get("step_2")
        if not step_2:
            print("[ERROR] Vendor has no step_2 data (documents not uploaded yet).")
            sys.exit(1)

        docs = step_2.get("required_documents", {})
        business_doc = docs.get("business_license_or_registration_certificate")
        gov_doc = docs.get("government_issued_id")

        if not business_doc or not gov_doc:
            print("[ERROR] Required documents are missing from the vendor record.")
            sys.exit(1)

        now = datetime.now(timezone.utc)
        job_payload = {
            "job_type": "vendor",
            "entity_id": vendor["_id"],
            "user_id": vendor["user_id"],
            "status": "queued",
            "verification_status": "pending_for_review",
            "documents": {
                "business_document": {
                    "storage_key": business_doc["storage_key"],
                    "content_type": business_doc.get("content_type", "application/octet-stream"),
                },
                "government_issued_id": {
                    "storage_key": gov_doc["storage_key"],
                    "content_type": gov_doc.get("content_type", "application/octet-stream"),
                },
            },
            "submitted_data": {
                "business_name": step_2["business_details"]["business_name"],
            },
            "submitted_at": now,
        }
        result = await verification_job_collection.insert_one(job_payload)
        job_id = str(result.inserted_id)
        print(f"[INFO] Created new verification job: {job_id}")
    else:
        job_id = str(job["_id"])
        print(f"[INFO] Found existing verification job: {job_id} (status={job.get('status')})")

    print("[INFO] Running OCR pipeline ...")
    try:
        await _run_vendor_verification_job(job_id)
    except Exception as exc:
        print(f"[ERROR] OCR pipeline failed: {exc}")
        sys.exit(1)

    # Print the results
    updated = await vendor_collection.find_one({"_id": oid})
    score = updated.get("verification_score")
    decision = updated.get("verification_decision")

    def ocr_tier(s):
        if s is None:
            return "pending"
        if s >= 75:
            return "passed (≥75)"
        if s >= 50:
            return "needs_review (50-74)"
        return "rejected (<50)"

    print()
    print("─── OCR Result ────────────────────────────")
    print(f"  ocr_score    : {score}")
    print(f"  ocr_tier     : {ocr_tier(score)}")
    print(f"  recommendation: {decision}")
    print(f"  vendor status : {updated.get('status')}")
    print("────────────────────────────────────────────")
    print("[DONE] Refresh GET /api/v1/vendors/admin/{vendor_id} in Swagger to see results.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/run_vendor_ocr.py <vendor_id>")
        sys.exit(1)

    asyncio.run(main(sys.argv[1]))
