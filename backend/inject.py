import asyncio, sys, os, datetime, bson
from dotenv import load_dotenv
sys.path.append(os.path.abspath('.'))
load_dotenv()
from app.db.mongodb import proposal_collection, user_collection
async def main():
    orgs = await user_collection.find({'role': 'organizer'}).to_list(10)
    organizer = orgs[-1] if orgs else None
    minis = await user_collection.find_one({'email': 'innovation.ministry@gce.local'})
    muni = await user_collection.find_one({'email': 'adama.municipal@gce.local'})
    pol = await user_collection.find_one({'email': 'adama.police@gce.local'})
    proposal = {
        'organizer_id': str(organizer['_id']) if organizer else '',
        'title': 'ASTU Tech Meetup', 'description': 'A tech meetup for 30 attendees',
        'status': 'submitted', 'review_stage': 'ministry',
        'office_assignments': {'ministry': str(minis['_id']), 'municipal': str(muni['_id']), 'police': str(pol['_id'])},
        'review_decisions': [], 'created_at': datetime.datetime.now(datetime.timezone.utc), 'updated_at': datetime.datetime.now(datetime.timezone.utc)
    }
    r = await proposal_collection.insert_one(proposal)
    print('Inserted proposal', r.inserted_id)
if __name__ == '__main__': asyncio.run(main())
