from __future__ import annotations

from app.repositories import OpportunityProposalRepository, OpportunityRepository


class OpportunityService:
   
    

    def __init__(
        self,
        *,
        opportunity_repository: OpportunityRepository | None = None,
        proposal_repository: OpportunityProposalRepository | None = None,
    ) -> None:
        self.opportunity_repository = opportunity_repository or OpportunityRepository()
        self.proposal_repository = proposal_repository or OpportunityProposalRepository()
