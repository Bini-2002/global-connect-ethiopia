from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.proposal import Proposal
from app.models.proposal_states import ProposalStatus
from app.schemas.proposal import ProposalCreate, ProposalUpdate, ProposalResponse

router = APIRouter(prefix="/proposals", tags=["Proposals"])


# Create proposal
@router.post("/", response_model=ProposalResponse)
def create_proposal(
    proposal: ProposalCreate,
    organizer_id: int,  # normally comes from auth
    db: Session = Depends(get_db)
):
    new_proposal = Proposal(
        title=proposal.title,
        description=proposal.description,
        organizer_id=organizer_id,
        status=ProposalStatus.DRAFT
    )

    db.add(new_proposal)
    db.commit()
    db.refresh(new_proposal)

    return new_proposal


# Get all proposals
@router.get("/", response_model=list[ProposalResponse])
def list_proposals(db: Session = Depends(get_db)):
    return db.query(Proposal).all()


# Get proposal by id
@router.get("/{proposal_id}", response_model=ProposalResponse)
def get_proposal(proposal_id: int, db: Session = Depends(get_db)):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    return proposal


# Update proposal
@router.put("/{proposal_id}", response_model=ProposalResponse)
def update_proposal(
    proposal_id: int,
    proposal_update: ProposalUpdate,
    db: Session = Depends(get_db)
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal_update.title is not None:
        proposal.title = proposal_update.title

    if proposal_update.description is not None:
        proposal.description = proposal_update.description

    db.commit()
    db.refresh(proposal)

    return proposal


# Submit proposal
@router.post("/{proposal_id}/submit", response_model=ProposalResponse)
def submit_proposal(proposal_id: int, db: Session = Depends(get_db)):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.status != ProposalStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft proposals can be submitted")

    proposal.status = ProposalStatus.SUBMITTED

    db.commit()
    db.refresh(proposal)

    return proposal