import asyncio, sys
sys.path.insert(0, r'C:\Users\binig\Desktop\global-connect-ethiopia\backend')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

EVENT_ID = '6a14a25a37e5e6c30f886c87'

async def main():
    c  = AsyncIOMotorClient('mongodb+srv://bini_yam:kS0yezvbAPj8TWor@globalconnectcluster.m4yhahs.mongodb.net/')
    db = c['global_connect_db']

    ev = await db['events'].find_one({'_id': ObjectId(EVENT_ID)})
    print('--- Full booking-relevant fields ---')
    for k in ['title', 'status', 'booking_required', 'booking_status',
              'capacity', 'booked_count', 'booking_opens_at', 'booking_closes_at']:
        print(f'  {k:22s}: {ev.get(k)!r}')
    c.close()

asyncio.run(main())
