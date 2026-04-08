
import asyncio, sys, os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.abspath('.'))
from app.db.mongodb import client, settings
async def main():
    db = client[settings.DATABASE_NAME]
    colls = await db.list_collection_names()
    for c in colls:
        docs = await db[c].find({'': [{'title': {'': 'ASTU', '': 'i'}}, {'organization_name': {'': 'ASTU', '': 'i'}}]}).to_list(10)
        for d in docs: print(f'FOUND IN {c}: {d}')
if __name__ == '__main__': asyncio.run(main())
