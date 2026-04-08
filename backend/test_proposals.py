
import asyncio, sys, os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.abspath('.'))
from app.db.mongodb import proposal_collection

async def main():
    docs = await proposal_collection.find({}).to_list(100)
    print('Total proposals:', len(docs))
    for d in docs:
        print('Title:', d.get('title'), 'Status:', d.get('status'), 'Offices:', d.get('office_assignments'))

if __name__ == '__main__':
    asyncio.run(main())

