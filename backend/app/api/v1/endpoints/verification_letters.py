from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.api.v1.deps import get_current_user
from app.db.mongodb import verification_letter_collection
from app.models.roles import UserRole
from app.schemas.compliance import VerificationLetterResponse

router = APIRouter()


def _serialize(letter: dict) -> dict:
    return {
        "id": str(letter["_id"]),
        "proposal_id": letter["proposal_id"],
        "event_id": letter.get("event_id"),
        "organizer_id": letter.get("organizer_id"),
        "reference_number": letter["reference_number"],
        "proposal_title": letter.get("proposal_title") or "",
        "organizer_name": letter.get("organizer_name") or "",
        "ministry_office_name": letter.get("ministry_office_name"),
        "municipal_office_name": letter.get("municipal_office_name"),
        "reviewer_name": letter.get("reviewer_name"),
        "approval_timestamp": letter["approval_timestamp"],
        "created_at": letter["created_at"],
        "updated_at": letter["updated_at"],
    }


def _is_government_role(role: str | None) -> bool:
    return role in {
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.MUNICIPAL_GOV,
        UserRole.MINISTRY_GOV,
        UserRole.POLICE,
    }


def _ensure_access(letter: dict, current_user: dict) -> None:
    if _is_government_role(current_user.get("role")):
        return
    current_user_id = str(current_user.get("_id") or current_user.get("id"))
    if letter.get("organizer_id") != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")


@router.get("/{proposal_id}", response_model=VerificationLetterResponse)
async def get_verification_letter(
    proposal_id: str,
    current_user: dict = Depends(get_current_user),
):
    letter = await verification_letter_collection.find_one({"proposal_id": proposal_id})
    if not letter:
        raise HTTPException(status_code=404, detail="Verification letter not found")
    _ensure_access(letter, current_user)
    return _serialize(letter)


@router.get("/{proposal_id}/download")
async def download_verification_letter(
    proposal_id: str,
    current_user: dict = Depends(get_current_user),
):
    letter = await verification_letter_collection.find_one({"proposal_id": proposal_id})
    if not letter:
        raise HTTPException(status_code=404, detail="Verification letter not found")
    _ensure_access(letter, current_user)

    filename = letter.get("file_name") or f"verification-letter-{proposal_id}.pdf"
    return Response(
        content=bytes(letter.get("pdf_bytes") or b""),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
