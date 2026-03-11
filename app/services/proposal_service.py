from datetime import datetime, timezone
from typing import List

from app.models.proposal_states import ProposalStatus
from app.repositories.proposal_repository import ProposalRepository
from app.schemas.proposals import ProposalCreate, ProposalUpdate


class ProposalService:


    @staticmethod
    async def create_proposal(
        proposal_in: ProposalCreate,
        organizer_id: str
    ):

        now = datetime.now(timezone.utc)

        proposal_data = {
            "title": proposal_in.title,
            "organizer_id": organizer_id,
            "status": ProposalStatus.DRAFT,

            "created_at": now,
            "updated_at": now,

            "event_type": None,
            "start_date": None,
            "end_date": None,
            "location": None,
            "expected_attendees": None,
            "budget_estimate": None,
            "new_event_description": None,
            "new_event_file_url": None
        }

        return await ProposalRepository.create(proposal_data)


    @staticmethod
    async def update_proposal(
        proposal_id: str,
        organizer_id: str,
        proposal_update: ProposalUpdate
    ):

        proposal = await ProposalRepository.get_by_id(proposal_id)

        if not proposal:
            raise ValueError("Proposal not found")

        if proposal["organizer_id"] != organizer_id:
            raise PermissionError("Not authorized")

        if proposal["status"] != ProposalStatus.DRAFT:
            raise ValueError("Only draft proposals can be updated")

        update_data = proposal_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)

        return await ProposalRepository.update(proposal_id, update_data)


    @staticmethod
    async def submit_proposal(
        proposal_id: str,
        organizer_id: str
    ):

        proposal = await ProposalRepository.get_by_id(proposal_id)

        if not proposal:
            raise ValueError("Proposal not found")

        if proposal["organizer_id"] != organizer_id:
            raise PermissionError("Not authorized")
        
        if proposal["status"] != ProposalStatus.DRAFT:
            raise ValueError("Only draft proposals can be submitted")

        required_fields = [
            "event_type",
            "start_date",
            "end_date",
            "location",
            "expected_attendees",
            "budget_estimate"
        ]

        missing_fields = []

        for field in required_fields:
            value = proposal.get(field)

            if value is None:
                missing_fields.append(field)

        if missing_fields:
            raise ValueError(
                f"Missing required fields: {missing_fields}"
            )

        await ProposalRepository.update_status(
            proposal_id,
            ProposalStatus.SUBMITTED,
            datetime.now(timezone.utc)
        )

        updated = await ProposalRepository.get_by_id(proposal_id)

        return updated


    @staticmethod
    async def list_my_proposals(
        organizer_id: str,
        page: int,
        limit: int
    ) -> List[dict]:

        skip = (page - 1) * limit

        return await ProposalRepository.list_by_organizer(
            organizer_id,
            skip,
            limit
        )