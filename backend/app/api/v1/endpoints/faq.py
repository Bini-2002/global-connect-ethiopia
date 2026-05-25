from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
import uuid

from app.api.v1.deps import get_current_user, allow_admin
from app.schemas.faq import (
    FaqCreate, FaqUpdate, FaqResponse, FaqInDB,
    FaqAskRequest, FaqAskResponse, FaqQuestionResponse, FaqAnswerRequest,
)

router = APIRouter()

DEFAULT_FAQS = [
    {"question": "Do I need a police permit?", "answer": "Yes, for events over 500 people. You must apply at least 14 days before the event date through the permit system."},
    {"question": "How long does approval take?", "answer": "Typically 3-5 business days for standard events. Large-scale events may require additional review time."},
    {"question": "What documents are required for event registration?", "answer": "You will need a valid ID, event proposal, venue contract, and any relevant permits depending on your event type."},
    {"question": "Can I cancel my event booking?", "answer": "Yes, cancellations are allowed up to 7 days before the event. Refunds are processed based on the cancellation policy."},
    {"question": "How do I register as a vendor?", "answer": "Navigate to the Vendor Marketplace, click 'Register as Vendor', fill in your business details, and submit for review."},
]

async def seed_faqs_if_empty():
    from app.db.mongodb import faq_collection
    count = await faq_collection.count_documents({})
    if count == 0:
        for item in DEFAULT_FAQS:
            faq = FaqInDB(**item)
            await faq_collection.insert_one(faq.model_dump(by_alias=False))

@router.get("", response_model=List[FaqResponse])
async def get_faqs():
    from app.db.mongodb import faq_collection
    await seed_faqs_if_empty()
    faqs = await faq_collection.find({"active": True}).sort("created_at", -1).to_list(100)
    return [
        FaqResponse(
            id=str(faq["_id"]),
            question=faq["question"],
            answer=faq["answer"],
            active=faq["active"],
            created_at=faq["created_at"],
            updated_at=faq["updated_at"],
        )
        for faq in faqs
    ]

@router.post("", response_model=FaqResponse, status_code=status.HTTP_201_CREATED)
async def create_faq(data: FaqCreate, current_user: dict = Depends(get_current_user)):
    from app.db.mongodb import faq_collection
    faq = FaqInDB(**data.model_dump())
    await faq_collection.insert_one(faq.model_dump(by_alias=False))
    return FaqResponse(
        id=faq.id,
        question=faq.question,
        answer=faq.answer,
        active=faq.active,
        created_at=faq.created_at,
        updated_at=faq.updated_at,
    )

@router.post("/ask", response_model=FaqAskResponse)
async def ask_faq(data: FaqAskRequest):
    from app.db.mongodb import faq_question_collection
    record = {
        "id": str(uuid.uuid4()),
        "question": data.question,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    await faq_question_collection.insert_one(record)
    return FaqAskResponse(message="Your question has been submitted. We will get back to you soon.")

@router.get("/questions", response_model=List[FaqQuestionResponse])
async def get_faq_questions(current_user: dict = Depends(allow_admin)):
    from app.db.mongodb import faq_question_collection
    questions = await faq_question_collection.find().sort("created_at", -1).to_list(100)
    return [
        FaqQuestionResponse(
            id=q["id"],
            question=q["question"],
            status=q.get("status", "pending"),
            created_at=q["created_at"],
        )
        for q in questions
    ]

@router.post("/questions/{question_id}/answer", response_model=FaqResponse)
async def answer_faq_question(question_id: str, data: FaqAnswerRequest, current_user: dict = Depends(allow_admin)):
    from app.db.mongodb import faq_question_collection, faq_collection
    question_doc = await faq_question_collection.find_one({"id": question_id})
    if not question_doc:
        raise HTTPException(status_code=404, detail="Question not found")
    faq = FaqInDB(question=question_doc["question"], answer=data.answer)
    await faq_collection.insert_one(faq.model_dump(by_alias=False))
    await faq_question_collection.update_one(
        {"id": question_id},
        {"$set": {"status": "answered", "answered_at": datetime.utcnow(), "answer": data.answer}}
    )
    return FaqResponse(
        id=faq.id,
        question=faq.question,
        answer=faq.answer,
        active=faq.active,
        created_at=faq.created_at,
        updated_at=faq.updated_at,
    )
