from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.v1.deps import get_current_user, get_current_user_allow_inactive
from app.core.config import settings
from app.core.queue import get_verification_queue
from starlette.concurrency import run_in_threadpool
from app.db.mongodb import (
    contract_collection,
    request_collection,
    vendor_collection,
    vendor_service_collection,
    verification_job_collection,
    vip_hotel_room_reservation_collection,
)
from app.models.roles import UserRole
from app.schemas.marketplace_mvp import VendorMarketplaceResponse
from app.schemas.vendor import (
    VendorPortalSummaryResponse,
    VendorReviewSummaryResponse,
    VendorStatusResponse,
    VendorVerificationResponse,
)
from app.services.marketplace import parse_object_id
from app.services.marketplace_mvp import get_vendor_detail, list_verified_vendors
from app.services.object_storage import ObjectStorageService

router = APIRouter()
# Trigger reload again

# ─── Constants ────────────────────────────────────────────────────────────────

PENDING_FOR_REVIEW = "pending_for_review"

BUSINESS_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ID_DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _get_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[1].lower()


def _is_valid_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def _require_vendor(current_user: dict) -> None:
    from app.models.roles import normalize_role
    current_role = normalize_role(current_user.get("role"))
    if current_role != UserRole.VENDOR.value:
        raise HTTPException(status_code=403, detail=f"Only vendors can submit this form. Your current role is: {current_role}. Email: {current_user.get('email')}")


def _to_response(document: dict) -> dict:
    document["id"] = str(document["_id"])
    document["user_id"] = str(document["user_id"])
    return document


def _status_history_entry(*, status: str, source: str, note: str | None = None, actor_id: str | None = None) -> dict:
    return {
        "status": status,
        "source": source,
        "note": note,
        "actor_id": actor_id,
        "changed_at": datetime.now(timezone.utc),
    }


async def _store_upload_file(file: UploadFile, folder: str, allowed_extensions: set[str]) -> dict:
    extension = _get_file_extension(file.filename or "")
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format. Allowed: {', '.join(sorted(allowed_extensions))}",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    storage = ObjectStorageService()
    stored = await run_in_threadpool(
        storage.upload_verification_document,
        content=content,
        filename=file.filename or "document",
        folder=folder,
        content_type=file.content_type,
    )

    return {
        "filename": file.filename or "",
        "content_type": file.content_type or "application/octet-stream",
        "size_bytes": stored.size_bytes,
        "document_url": stored.document_url,
        "storage_key": stored.storage_key,
        "storage_provider": stored.storage_provider,
        "uploaded_at": datetime.now(timezone.utc),
    }


# ─── Vendor Registration Endpoints ────────────────────────────────────────────


@router.post("/verification/step-2", response_model=VendorVerificationResponse)
async def create_or_update_vendor_business_details(
    business_name: str = Form(...),
    business_category: str = Form(...),
    business_address: str = Form(...),
    registration_number: str | None = Form(None),
    years_of_operation: int = Form(...),
    website_url: str | None = Form(None),
    category_metadata: str | None = Form(None),
    business_license_or_registration_certificate: UploadFile = File(...),
    government_issued_id: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_allow_inactive),
):
    _require_vendor(current_user)

    if not business_name.strip():
        raise HTTPException(status_code=400, detail="Business name is required")
    if not business_category.strip():
        raise HTTPException(status_code=400, detail="Business category is required")
    if not business_address.strip():
        raise HTTPException(status_code=400, detail="Business address is required")
    if years_of_operation < 0:
        raise HTTPException(status_code=400, detail="years_of_operation must be >= 0")

    if website_url and not _is_valid_url(website_url):
        raise HTTPException(status_code=400, detail="website_url must start with http:// or https://")

    business_doc_metadata = await _store_upload_file(
        file=business_license_or_registration_certificate,
        folder="vendors/verification/business_document",
        allowed_extensions=BUSINESS_DOCUMENT_EXTENSIONS,
    )
    government_id_metadata = await _store_upload_file(
        file=government_issued_id,
        folder="vendors/verification/government_id",
        allowed_extensions=ID_DOCUMENT_EXTENSIONS,
    )

    import json
    metadata_dict = {}
    if category_metadata:
        try:
            metadata_dict = json.loads(category_metadata)
        except Exception:
            pass

    now = datetime.now(timezone.utc)
    step_2_payload = {
        "business_details": {
            "business_name": business_name.strip(),
            "business_category": business_category.strip(),
            "business_address": business_address.strip(),
            "registration_number": registration_number,
            "years_of_operation": years_of_operation,
            "website_url": website_url,
            "category_metadata": metadata_dict,
        },
        "required_documents": {
            "business_license_or_registration_certificate": business_doc_metadata,
            "government_issued_id": government_id_metadata,
        },
    }

    user_oid = parse_object_id(current_user["id"], field_name="user id")
    existing = await vendor_collection.find_one({
        "$or": [{"user_id": user_oid}, {"user_id": str(user_oid)}]
    })

    if existing:
        await vendor_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "step_2": step_2_payload,
                    "status": "draft",
                    "verification_status": "not_started",
                    "updated_at": now,
                },
                "$push": {
                    "status_history": _status_history_entry(
                        status="draft",
                        source="vendor_step_2",
                        note="Vendor updated business details and documents",
                        actor_id=current_user["id"],
                    )
                },
            },
        )
        vendor = await vendor_collection.find_one({"_id": existing["_id"]})
    else:
        payload = {
            "user_id": user_oid,
            "step_2": step_2_payload,
            "status": "draft",
            "verification_status": "not_started",
            "review_required": False,
            "status_history": [
                _status_history_entry(
                    status="draft",
                    source="vendor_step_2",
                    note="Vendor created registration record",
                    actor_id=current_user["id"],
                )
            ],
            "created_at": now,
            "updated_at": now,
        }
        result = await vendor_collection.insert_one(payload)
        vendor = await vendor_collection.find_one({"_id": result.inserted_id})

    return _to_response(vendor)




@router.get("/verification/review-summary", response_model=VendorReviewSummaryResponse)
async def get_vendor_review_summary(current_user: dict = Depends(get_current_user_allow_inactive)):
    _require_vendor(current_user)

    user_oid = parse_object_id(current_user["id"], field_name="user id")
    vendor = await vendor_collection.find_one({
        "$or": [{"user_id": user_oid}, {"user_id": str(user_oid)}]
    })
    if not vendor or not vendor.get("step_2"):
        raise HTTPException(status_code=404, detail="Vendor business details not found")

    details = vendor["step_2"]["business_details"]
    docs = vendor["step_2"]["required_documents"]

    return {
        "business_name": details["business_name"],
        "business_category": details["business_category"],
        "business_address": details["business_address"],
        "website_url": details.get("website_url"),
        "years_of_operation": details["years_of_operation"],
        "registration_number": details.get("registration_number"),
        "business_document_filename": docs["business_license_or_registration_certificate"]["filename"],
        "government_id_filename": docs["government_issued_id"]["filename"],
        "verification_status": vendor.get("verification_status", "not_started"),
    }


@router.post("/verification/step-3/submit", response_model=VendorVerificationResponse)
async def submit_vendor_for_verification(
    confirm_information_is_accurate: bool = Form(...),
    agree_terms_and_privacy: bool = Form(...),
    current_user: dict = Depends(get_current_user_allow_inactive),
):
    _require_vendor(current_user)

    if not (confirm_information_is_accurate and agree_terms_and_privacy):
        raise HTTPException(
            status_code=400,
            detail="Both declarations must be accepted before submission",
        )

    user_oid = parse_object_id(current_user["id"], field_name="user id")
    vendor = await vendor_collection.find_one({
        "$or": [{"user_id": user_oid}, {"user_id": str(user_oid)}]
    })
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor record not found")

    step_2 = vendor.get("step_2")
    if not step_2:
        raise HTTPException(status_code=400, detail="Complete vendor verification step 2 first")

    business_doc = step_2.get("required_documents", {}).get("business_license_or_registration_certificate")
    government_doc = step_2.get("required_documents", {}).get("government_issued_id")

    if not business_doc or not business_doc.get("storage_key"):
        raise HTTPException(status_code=400, detail="Business document is required")

    if not government_doc or not government_doc.get("storage_key"):
        raise HTTPException(status_code=400, detail="Government issued ID is required")

    now = datetime.now(timezone.utc)
    await vendor_collection.update_one(
        {"_id": vendor["_id"]},
        {
            "$set": {
                "step_3_declaration": {
                    "confirm_information_is_accurate": confirm_information_is_accurate,
                    "agree_terms_and_privacy": agree_terms_and_privacy,
                },
                "status": PENDING_FOR_REVIEW,
                "verification_status": PENDING_FOR_REVIEW,
                "updated_at": now,
            },
            "$push": {
                "status_history": _status_history_entry(
                    status=PENDING_FOR_REVIEW,
                    source="vendor_step_3_submit",
                    note="Vendor submitted registration for admin review",
                    actor_id=current_user["id"],
                )
            },
        },
    )

    job_payload = {
        "job_type": "vendor",
        "entity_id": vendor["_id"],
        "user_id": vendor["user_id"],
        "status": "queued",
        "verification_status": PENDING_FOR_REVIEW,
        "documents": {
            "business_document": {
                "storage_key": business_doc["storage_key"],
                "content_type": business_doc.get("content_type", "application/octet-stream"),
            },
            "government_issued_id": {
                "storage_key": government_doc["storage_key"],
                "content_type": government_doc.get("content_type", "application/octet-stream"),
            },
        },
        "submitted_data": {
            "business_name": step_2["business_details"]["business_name"],
        },
        "submitted_at": now,
    }
    job_result = await verification_job_collection.insert_one(job_payload)

    queue_enqueued = True
    try:
        queue = get_verification_queue()
        queue.enqueue("app.workers.verification_tasks.run_vendor_verification_job", str(job_result.inserted_id))
    except Exception:
        queue_enqueued = False
        await verification_job_collection.update_one(
            {"_id": job_result.inserted_id},
            {"$set": {"status": "queued_no_worker", "updated_at": datetime.now(timezone.utc)}},
        )
        # ── Sync fallback: Redis not available — run OCR inline immediately ──
        try:
            from app.workers.verification_tasks import _run_vendor_verification_job
            await _run_vendor_verification_job(str(job_result.inserted_id))
            queue_enqueued = True  # treat as completed
        except Exception:
            pass  # OCR failed; admin can re-trigger via /admin/run-ocr/{vendor_id}

    await vendor_collection.update_one(
        {"_id": vendor["_id"]},
        {
            "$set": {
                "verification_job_id": str(job_result.inserted_id),
                "queue_status": "queued" if queue_enqueued else "queued_no_worker",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    vendor = await vendor_collection.find_one({"_id": vendor["_id"]})
    return _to_response(vendor)


@router.get("/verification/status", response_model=VendorStatusResponse)
async def get_vendor_verification_status(current_user: dict = Depends(get_current_user_allow_inactive)):
    _require_vendor(current_user)

    user_oid = parse_object_id(current_user["id"], field_name="user id")
    vendor = await vendor_collection.find_one({
        "$or": [{"user_id": user_oid}, {"user_id": str(user_oid)}]
    })

    # Brand-new vendor: no record yet — return not_started so the frontend
    # can route them to the registration/verification flow correctly.
    if not vendor:
        return {
            "verification_status": "not_started",
            "verification_score": None,
            "ocr_tier": "pending",
            "verification_decision": None,
            "review_required": False,
            "verification_job_id": None,
            "queue_status": None,
            "status": "draft",
        }

    score = vendor.get("verification_score")
    if score is None:
        ocr_tier = "pending"
    elif score >= settings.AUTO_APPROVE_SCORE:
        ocr_tier = "passed"
    elif score >= settings.MANUAL_REVIEW_MIN_SCORE:
        ocr_tier = "needs_review"
    else:
        ocr_tier = "rejected"
    return {
        "verification_status": vendor.get("verification_status", "not_started"),
        "verification_score": score,
        "ocr_tier": ocr_tier,
        "verification_decision": vendor.get("verification_decision"),
        "review_required": vendor.get("review_required", False),
        "verification_job_id": vendor.get("verification_job_id"),
        "queue_status": vendor.get("queue_status"),
        "status": vendor.get("status", "draft"),
    }


@router.get("/portal/summary", response_model=VendorPortalSummaryResponse)
async def get_vendor_portal_summary(current_user: dict = Depends(get_current_user)):
    user_oid = parse_object_id(current_user["id"], field_name="user id")
    vendor = await vendor_collection.find_one({
        "$or": [{"user_id": user_oid}, {"user_id": str(user_oid)}]
    })
    _require_vendor(current_user)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor record not found")
    if vendor.get("verification_status") != "approved":
        raise HTTPException(status_code=403, detail="Vendor must be approved before accessing the portal")

    services = await vendor_service_collection.find(
        {"vendor_user_id": current_user["id"]},
        sort=[("created_at", -1)],
    ).to_list(length=5)
    request_query = {"$or": [{"vendor_user_id": current_user["id"]}, {"vendor_id": vendor["_id"]}]}
    requests = await request_collection.find(
        request_query,
        sort=[("created_at", -1)],
    ).to_list(length=5)
    contract_query = {"$or": [{"vendor_user_id": current_user["id"]}, {"vendor_id": vendor["_id"]}]}
    contracts = await contract_collection.find(
        contract_query,
        sort=[("created_at", -1)],
    ).to_list(length=5)

    details = (vendor.get("step_2") or {}).get("business_details") or {}
    return {
        "vendor_id": str(vendor["_id"]),
        "vendor_user_id": current_user["id"],
        "business_name": details.get("business_name"),
        "business_category": details.get("business_category"),
        "verification_status": vendor.get("verification_status", "not_started"),
        "services_count": await vendor_service_collection.count_documents({"vendor_user_id": current_user["id"]}),
        "pending_requests_count": await request_collection.count_documents(
            {
                "$and": [
                    request_query,
                    {"status": {"$in": ["pending", "REQUESTED", "QUOTED", "NEGOTIATING"]}},
                ]
            }
        ),
        "accepted_requests_count": await request_collection.count_documents(
            {
                "$and": [
                    request_query,
                    {"status": {"$in": ["accepted", "ACCEPTED"]}},
                ]
            }
        ),
        "active_contracts_count": await contract_collection.count_documents(
            {
                "$and": [
                    contract_query,
                    {"status": {"$in": ["active", "AGREED", "FUNDED", "COMPLETED"]}},
                ]
            }
        ),
        "recent_services": [
            {
                "id": str(item["_id"]),
                "title": item.get("title"),
                "category": item.get("category"),
                "is_active": bool(item.get("is_active", True)),
                "created_at": item.get("created_at"),
            }
            for item in services
        ],
        "recent_requests": [
            {
                "id": str(item["_id"]),
                "event_id": str(item["event_id"]) if item.get("event_id") else None,
                "service_title": item.get("service_title"),
                "status": item.get("status"),
                "proposed_amount": item.get("proposed_amount") or item.get("current_amount"),
                "created_at": item.get("created_at"),
            }
            for item in requests
        ],
        "recent_contracts": [
            {
                "id": str(item["_id"]),
                "event_id": str(item["event_id"]) if item.get("event_id") else None,
                "title": item.get("title"),
                "status": item.get("status"),
                "amount": float(item.get("amount", item.get("price", 0.0))),
                "created_at": item.get("created_at"),
            }
            for item in contracts
        ],
    }


@router.get("", response_model=list[VendorMarketplaceResponse])
@router.get("/", response_model=list[VendorMarketplaceResponse])
async def list_marketplace_vendors():
    return await list_verified_vendors()


@router.get("/{vendor_id}", response_model=VendorMarketplaceResponse)
async def get_marketplace_vendor(vendor_id: str):
    return await get_vendor_detail(vendor_id)


# ─── Hotel Vendor: Room Reservation Management ────────────────────────────────

_HOTEL_CATEGORY = "Hotel"


async def _get_hotel_vendor_or_403(current_user: dict) -> dict:
    """Return the vendor record only if the caller is an approved hotel vendor."""
    from app.models.roles import normalize_role
    if normalize_role(current_user.get("role")) != UserRole.VENDOR.value:
        raise HTTPException(status_code=403, detail="Vendor access only")
    from app.services.marketplace import parse_object_id
    user_oid = parse_object_id(current_user["id"], field_name="user id")
    vendor = await vendor_collection.find_one({
        "$or": [{"user_id": user_oid}, {"user_id": str(user_oid)}]
    })
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    if vendor.get("verification_status") != "approved":
        raise HTTPException(status_code=403, detail="Vendor must be approved first")
    biz_cat = (vendor.get("step_2") or {}).get("business_details", {}).get("business_category", "")
    if biz_cat != _HOTEL_CATEGORY:
        raise HTTPException(
            status_code=403,
            detail="This section is only available to hotel vendors",
        )
    return vendor


def _serialize_hotel_reservation_for_vendor(doc: dict) -> dict:
    rooms = doc.get("rooms", [])
    return {
        "id": str(doc["_id"]),
        "event_id": doc.get("event_id", ""),
        "hotel_name": doc.get("hotel_name", ""),
        "check_in_date": doc.get("check_in_date", ""),
        "check_out_date": doc.get("check_out_date", ""),
        "number_of_nights": doc.get("number_of_nights", 1),
        "total_amount": float(doc.get("total_amount", 0)),
        "status": doc.get("status", "pending_hotel_review"),
        "payment_status": doc.get("payment_status", "escrowed"),
        "hotel_response_note": doc.get("hotel_response_note"),
        "rooms": [
            {
                "room_index": r.get("room_index", i),
                "vip_name": r.get("vip_name", ""),
                "vip_email": r.get("vip_email", ""),
                "room_type": r.get("room_type", "single"),
                "bed_preference": r.get("bed_preference", "no_preference"),
                "floor_preference": r.get("floor_preference", "no_preference"),
                "smoking_preference": r.get("smoking_preference", "non_smoking"),
                "meal_plan": r.get("meal_plan", "room_only"),
                "special_requests": r.get("special_requests", []),
                "notes": r.get("notes"),
                "assigned_room_number": r.get("assigned_room_number"),
            }
            for i, r in enumerate(rooms)
        ],
        "created_at": str(doc.get("created_at", "")),
        "confirmed_at": str(doc["confirmed_at"]) if doc.get("confirmed_at") else None,
    }


@router.get("/hotel-room-reservations/incoming")
async def list_incoming_hotel_reservations(
    current_user: dict = Depends(get_current_user),
):
    """Hotel vendor: list all incoming VIP room reservation requests."""
    vendor = await _get_hotel_vendor_or_403(current_user)
    docs = await vip_hotel_room_reservation_collection.find(
        {"vendor_id": str(vendor["_id"])},
        sort=[("created_at", -1)],
    ).to_list(length=200)
    return [_serialize_hotel_reservation_for_vendor(d) for d in docs]


@router.patch("/hotel-room-reservations/{reservation_id}/respond")
async def respond_to_hotel_reservation(
    reservation_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """Hotel vendor: assign room numbers and confirm the reservation.

    Payload:
        room_assignments: list of {"room_index": int, "assigned_room_number": str}
        hotel_response_note: optional note
    """
    vendor = await _get_hotel_vendor_or_403(current_user)
    from app.services.marketplace import parse_object_id
    from datetime import datetime, timezone

    oid = parse_object_id(reservation_id, field_name="reservation id")
    reservation = await vip_hotel_room_reservation_collection.find_one({
        "_id": oid,
        "vendor_id": str(vendor["_id"]),
    })
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.get("status") == "payment_released":
        raise HTTPException(status_code=400, detail="This reservation is already completed")

    room_assignments: list[dict] = payload.get("room_assignments", [])
    hotel_response_note: str | None = payload.get("hotel_response_note")

    if not room_assignments:
        raise HTTPException(status_code=400, detail="Provide at least one room assignment")

    # Apply assignments to the rooms array
    updated_rooms = list(reservation.get("rooms", []))
    assignment_map = {int(a["room_index"]): str(a["assigned_room_number"]).strip() for a in room_assignments}
    for room in updated_rooms:
        idx = room.get("room_index", 0)
        if idx in assignment_map:
            room["assigned_room_number"] = assignment_map[idx]

    # All rooms must be assigned to move to confirmed
    all_assigned = all(r.get("assigned_room_number") for r in updated_rooms)
    new_status = "confirmed" if all_assigned else "pending_hotel_review"
    now = datetime.now(timezone.utc)

    await vip_hotel_room_reservation_collection.update_one(
        {"_id": oid},
        {
            "$set": {
                "rooms": updated_rooms,
                "hotel_response_note": hotel_response_note,
                "status": new_status,
                "confirmed_at": now if new_status == "confirmed" else reservation.get("confirmed_at"),
                "updated_at": now,
            }
        },
    )

    # Notify organizer
    try:
        from app.services.notification_service import push_notification
        status_msg = "confirmed! Room numbers have been assigned." if all_assigned else "partially updated — some rooms are still pending."
        await push_notification(
            user_id=reservation["organizer_id"],
            title="VIP Room Assignment Update",
            message=f"Your reservation at {reservation['hotel_name']} has been {status_msg}",
            notification_type="vip_hotel_confirmed",
            reference_id=reservation_id,
        )
    except Exception:
        pass

    # Email VIPs their room number
    if all_assigned:
        try:
            from app.services.email_service import EmailService
            for room in updated_rooms:
                EmailService.send_generic_email(
                    recipient_email=room["vip_email"],
                    subject=f"Your VIP Room is Confirmed – {reservation['hotel_name']}",
                    body=(
                        f"Dear {room['vip_name']},\n\n"
                        f"Your room at {reservation['hotel_name']} has been confirmed.\n"
                        f"Room Number: {room.get('assigned_room_number', '—')}\n"
                        f"Room Type: {room['room_type'].title()}\n"
                        f"Check-in: {reservation['check_in_date']}\nCheck-out: {reservation['check_out_date']}\n\n"
                        "We look forward to welcoming you.\n\nGlobal Connect Ethiopia"
                    ),
                )
        except Exception:
            pass

    updated = await vip_hotel_room_reservation_collection.find_one({"_id": oid})
    return _serialize_hotel_reservation_for_vendor(updated)
