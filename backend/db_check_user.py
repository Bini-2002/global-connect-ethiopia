import asyncio
from app.db.mongodb import user_collection
from pprint import pprint

async def main():
    user = await user_collection.find_one({"email": "av6hf7y73j@ozsaip.com"})
    print("User details:")
    pprint(user)

if __name__ == "__main__":
    asyncio.run(main())
