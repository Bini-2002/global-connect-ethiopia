from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId

from app.api.v1.deps import allow_admin
from app.schemas.support import SupportCreate, SupportResponse, SupportInDB
from app.db.mongodb import support_collection

router = APIRouter()


@router.post("", response_model=SupportResponse, status_code=status.HTTP_201_CREATED)
async def create_support_request(data: SupportCreate):
    doc = SupportInDB(**data.model_dump())
    await support_collection.insert_one(doc.model_dump(by_alias=False))
    return SupportResponse(
        id=doc.id,
        name=doc.name,
        email=doc.email,
        subject=doc.subject,
        message=doc.message,
        created_at=doc.created_at,
    )


@router.get("", response_model=List[SupportResponse])
async def list_support_requests(current_user: dict = Depends(allow_admin)):
    docs = await support_collection.find().sort("created_at", -1).to_list(100)
    return [
        SupportResponse(
            id=str(doc["id"]),
            name=doc["name"],
            email=doc["email"],
            subject=doc["subject"],
            message=doc["message"],
            created_at=doc["created_at"],
        )
        for doc in docs
    ]


@router.get("/{request_id}", response_model=SupportResponse)
async def get_support_request(request_id: str, current_user: dict = Depends(allow_admin)):
    doc = await support_collection.find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support request not found")
    return SupportResponse(
        id=doc["id"],
        name=doc["name"],
        email=doc["email"],
        subject=doc["subject"],
        message=doc["message"],
        created_at=doc["created_at"],
    )


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_support_request(request_id: str, current_user: dict = Depends(allow_admin)):
    result = await support_collection.delete_one({"id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support request not found")
