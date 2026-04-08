
import asyncio, sys, os
sys.path.append(os.path.abspath('backend'))
from backend.app.db.mongodb import client, settings
async def main():
    colls = await client[settings.DATABASE_NAME].list_collection_names()
    print([c for c in colls])
    for c in colls:
        count = await client[settings.DATABASE_NAME][c].count_documents({})
        if count > 0:
            print(f'{c}: {count}')
            docs = await client[settings.DATABASE_NAME][c].find({}).to_list(1)
            print(docs)

if __name__ == '__main__': asyncio.run(main())
