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