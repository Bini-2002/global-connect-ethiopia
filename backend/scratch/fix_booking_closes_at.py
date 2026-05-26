import asyncio, sys
from datetime import datetime
sys.path.insert(0, r'C:\Users\binig\Desktop\global-connect-ethiopia\backend')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

EVENT_ID = '6a14a25a37e5e6c30f886c87'

async def main():
    c  = AsyncIOMotorClient('mongodb+srv://bini_yam:kS0yezvbAPj8TWor@globalconnectcluster.m4yhahs.mongodb.net/')
    db = c['global_connect_db']

    new_closes_at = datetime(2026, 6, 30, 23, 59, 0)
    result = await db['events'].update_one(
        {'_id': ObjectId(EVENT_ID)},
        {'$set': {
            'booking_closes_at': new_closes_at,
            'updated_at': datetime.utcnow(),
        }}
    )
    print('Modified count:', result.modified_count)

    ev = await db['events'].find_one(
        {'_id': ObjectId(EVENT_ID)},
        {'title': 1, 'booking_opens_at': 1, 'booking_closes_at': 1, 'status': 1}
    )
    print('Event  :', ev.get('title'))
    print('Opens  :', ev.get('booking_opens_at'))
    print('Closes :', ev.get('booking_closes_at'))
    print('Status :', ev.get('status'))
    c.close()

asyncio.run(main())
