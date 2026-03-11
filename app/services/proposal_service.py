from datetime import datetime, timezone
from app.models.proposal_states import ProposalStatus
from app.repositories.proposal_repository import ProposalRepository


class ProposalService:

    @staticmethod
    async def create_proposal(title: str, organizer_id: str):

        proposal = {
            "title": title,
            "organizer_id": organizer_id,
            "status": ProposalStatus.DRAFT,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "event_type": None,
            "start_date": None,
            "end_date": None,
            "location": None,
            "expected_attendees": None,
            "budget_estimate": None,
            "new_event_description": None,
            "new_event_file_url": None
        }

        return await ProposalRepository.create(proposal)