from motor.motor_asyncio import AsyncIOMotorClient

# local MongoDB Compass
MONGODB_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGODB_URL)

# database name 'global_connect' 
db = client.global_connect 

# users collection
user_collection = db.users