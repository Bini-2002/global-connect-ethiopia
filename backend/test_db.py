
import asyncio, sys, os
from dotenv import load_dotenv
load_dotenv()
from app.db.mongodb import client, settings
async def main():
    db = client[settings.DATABASE_NAME]
    cols = await db.list_collection_names()
    print('Collections:', cols)
    for c in cols:
        count = await db[c].count_documents({})
        print(f' - {c}: {count} docs')
if __name__ == '__main__':
    asyncio.run(main())

