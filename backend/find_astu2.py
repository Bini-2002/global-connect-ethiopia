
import asyncio, sys, os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.abspath('.'))
from app.db.mongodb import client, settings
async def main():
    db = client[settings.DATABASE_NAME]
    colls = await db.list_collection_names()
    for c in colls:
        docs = await db[c].find({}).to_list(100)
        for d in docs:
            d_str = str(d).lower()
            if 'astu' in d_str:
                print(f'FOUND IN {c}: {d}')
if __name__ == '__main__': asyncio.run(main())
