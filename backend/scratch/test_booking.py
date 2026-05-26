"""
Step 1: Clean up any prior bookings for the test attendee, then
Step 2: POST a new booking and confirm it works end-to-end.
"""
import asyncio, json, sys, time
import urllib.request, urllib.error

sys.path.insert(0, r'C:\Users\binig\Desktop\global-connect-ethiopia\backend')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

EVENT_ID    = '6a14a25a37e5e6c30f886c87'
ATTENDEE_ID = '6a13798ef8c4885d42fc9f48'
TOKEN       = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    '.eyJzdWIiOiI2YTEzNzk4ZWY4YzQ4ODVkNDJmYzlmNDgiLCJyb2xlIjoiYXR0ZW5kZWUiLCJleHAiOjE3Nzk3NTk2MDR9'
    '.DQqpslIcC67808CPH_AwqM0GugcHcOpfr0uB8g91Rec'
)
BASE = 'http://localhost:8000/api/v1'


async def cleanup():
    c  = AsyncIOMotorClient('mongodb+srv://bini_yam:kS0yezvbAPj8TWor@globalconnectcluster.m4yhahs.mongodb.net/')
    db = c['global_connect_db']
    res = await db['ticket_purchases'].delete_many(
        {'event_id': EVENT_ID, 'attendee_id': ATTENDEE_ID}
    )
    print(f'[cleanup] Deleted {res.deleted_count} prior booking(s)')
    ev = await db['events'].find_one({'_id': ObjectId(EVENT_ID)}, {'booked_count': 1, 'capacity': 1, 'booking_required': 1})
    print(f'[state]   capacity={ev.get("capacity")}, booked_count={ev.get("booked_count")}, booking_required={ev.get("booking_required")}')
    c.close()


def post_booking():
    body = json.dumps({
        'slots_requested': 1,
        'attendee_name':   'Samrawit Alemu',
        'attendee_email':  'samrawit.alemu@astu.edu.et',
        'attendee_profile': {
            'name':  'Samrawit Alemu',
            'phone': '+251911000001',
        },
    }).encode()
    req = urllib.request.Request(f'{BASE}/events/{EVENT_ID}/bookings', data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {TOKEN}')
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, {'error': e.read().decode()}


def main():
    print('=== STEP 1: Clean up prior bookings ===')
    asyncio.run(cleanup())

    print()
    print('=== STEP 2: Waiting 3s for server hot-reload ===')
    time.sleep(3)

    print()
    print('=== STEP 3: POST /events/{id}/bookings ===')
    status, data = post_booking()

    if status == 201:
        print('[OK] Booking created successfully!')
        print(f'  booking_reference : {data.get("booking_reference")}')
        print(f'  booking_status    : {data.get("booking_status")}')
        print(f'  qr_code           : {data.get("qr_code")}')
        print(f'  slots_requested   : {data.get("slots_requested")}')
        print(f'  attendee_name     : {data.get("attendee_name")}')
        print(f'  event_title       : {data.get("event_title")}')
    else:
        print(f'[FAIL] HTTP {status}')
        print(f'  {data}')


if __name__ == '__main__':
    main()
