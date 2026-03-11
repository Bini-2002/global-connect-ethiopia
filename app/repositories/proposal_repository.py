from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from app.db.mongodb import proposal_collection


class ProposalRepository:

    @staticmethod
    async def create(proposal_data: dict) -> dict:

        result = await proposal_collection.insert_one(proposal_data)

        proposal_data["id"] = str(result.inserted_id)

        return proposal_data


    @staticmethod
    async def get_by_id(proposal_id: str) -> Optional[dict]:

        proposal = await proposal_collection.find_one(
            {"_id": ObjectId(proposal_id)}
        )

        if proposal:
            proposal["id"] = str(proposal["_id"])

        return proposal


    @staticmethod
    async def update(proposal_id: str, update_data: dict) -> Optional[dict]:

        await proposal_collection.update_one(
            {"_id": ObjectId(proposal_id)},
            {"$set": update_data}
        )

        return await ProposalRepository.get_by_id(proposal_id)


    @staticmethod
    async def list_by_organizer(
        organizer_id: str,
        skip: int,
        limit: int
    ) -> List[dict]:

        cursor = proposal_collection.find(
            {"organizer_id": organizer_id}
        ).skip(skip).limit(limit)

        proposals = await cursor.to_list(length=limit)

        for proposal in proposals:
            proposal["id"] = str(proposal["_id"])

        return proposals


    @staticmethod
    async def update_status(
        proposal_id: str,
        status: str,
        updated_at: datetime
    ):

        await proposal_collection.update_one(
            {"_id": ObjectId(proposal_id)},
            {
                "$set": {
                    "status": status,
                    "updated_at": updated_at
                }
            }
        )