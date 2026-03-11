from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

# users collection
user_collection = db.users
profile_collection = db.profiles
vendor_collection = db.vendors
organizer_collection = db.organizers
document_collection = db.documents
permit_collection = db.permits
verification_job_collection = db.verification_jobs
verification_result_collection = db.verification_results

# proposals collection
proposal_collection = db.proposals

# Database Indexes
async def create_indexes():
    await proposal_collection.create_index("organizer_id")
    await proposal_collection.create_index(
        [("status", 1), ("created_at", 1)]
    )

    await proposal_collection.create_index("title")