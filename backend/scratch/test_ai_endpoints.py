"""
Generates a test JWT for a verified organizer user, then runs all AI endpoint tests.
No need to know the plaintext password.
"""
import asyncio
import json
import sys
import urllib.request
import urllib.error

sys.path.insert(0, r"C:\Users\binig\Desktop\global-connect-ethiopia\backend")

from motor.motor_asyncio import AsyncIOMotorClient
from app.core import security

MONGO_URI = "mongodb+srv://bini_yam:kS0yezvbAPj8TWor@globalconnectcluster.m4yhahs.mongodb.net/"
DB_NAME   = "global_connect_db"
BASE      = "http://localhost:8000/api/v1"
OK   = "[OK]"
ERR  = "[FAIL]"
WARN = "[WARN]"


# ─── Network helpers ──────────────────────────────────────────────────────────
def http_post(url, body, token=None):
    data = json.dumps(body).encode()
    req  = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()[:500]}

def http_get(url, token=None):
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()[:500]}

def sep(title=""):
    print("=" * 62)
    if title:
        print(title)
        print("=" * 62)


# ─── Main ─────────────────────────────────────────────────────────────────────
async def main():
    # 1. Connect to DB and find the organizer user
    sep("STEP 1: Fetch organizer user from DB and mint JWT")
    client = AsyncIOMotorClient(MONGO_URI)
    db     = client[DB_NAME]
    user   = await db["users"].find_one(
        {"role": "organizer", "email_verified": True, "is_active": True}
    )
    if not user:
        print(f"  {ERR} No verified organizer found in DB.")
        client.close()
        return

    user_id = str(user["_id"])
    role    = user.get("role", "organizer")
    email   = user.get("email", "")
    print(f"  {OK} Found organizer: {email} (id={user_id})")
    client.close()

    # 2. Mint a JWT directly
    token = security.create_access_token(subject=user_id, role=role)
    print(f"  {OK} JWT minted successfully.")

    # 3. AI Provider status check
    print()
    sep("STEP 2: AI provider status")
    status_res = http_get(f"{BASE}/ai/providers/status", token=token)
    gemini_ok  = status_res.get("gemini_configured", False)
    mock_mode  = status_res.get("mock_mode", True)
    print(f"  Gemini configured : {gemini_ok}")
    print(f"  Mock mode         : {mock_mode}")
    if gemini_ok and not mock_mode:
        print(f"  {OK} Live Gemini mode active.")
    else:
        print(f"  {WARN} Running in mock mode or Gemini not configured.")

    # 4. Chatbot tests
    chatbot_cases = [
        ("STEP 3: Ministry approval workflow",
         "What is the event proposal and ministry approval workflow?"),
        ("STEP 4: Ticket overbooking prevention",
         "How does the platform prevent ticket overbooking?"),
        ("STEP 5: VIP hotel booking for special guests",
         "How does VIP hotel booking work for special guests?"),
        ("STEP 6: Platform commission and task escrow",
         "What is the platform commission fee and how does task escrow work?"),
        ("STEP 7: Team member role-based access",
         "How does role-based access control work for team members?"),
        ("STEP 8: Attendee registration and check-in",
         "How does attendee registration and on-site check-in work?"),
    ]

    passed = 0
    failed = 0
    for title, query in chatbot_cases:
        print()
        sep(title)
        res = http_post(f"{BASE}/ai/chatbot/licensing",
                        {"query": query, "session_id": None},
                        token=token)
        if "answer" in res:
            answer = res["answer"]
            print(f"  {OK} Answer ({len(answer)} chars):")
            print(f"     {answer[:350]}")
            if len(answer) > 350:
                print("     ...")
            citations = res.get("citations", [])
            if citations:
                print(f"     Citations: {citations[:3]}")
            passed += 1
        else:
            print(f"  {ERR} Error: {res}")
            failed += 1

    # 5. Get an event for scheduler test
    print()
    sep("STEP 9: Get event for scheduler test")
    events = http_get(f"{BASE}/events?limit=3", token=token)
    event_id = None
    if isinstance(events, list) and len(events) > 0:
        first    = events[0]
        event_id = first.get("id") or first.get("_id")
        print(f"  {OK} Event: '{first.get('title')}' (id={event_id})")
    elif isinstance(events, dict):
        items = events.get("events") or events.get("items") or []
        if items:
            first    = items[0]
            event_id = first.get("id") or first.get("_id")
            print(f"  {OK} Event: '{first.get('title')}' (id={event_id})")
        else:
            print(f"  {WARN} Events response structure: {list(events.keys())}")
    else:
        print(f"  {WARN} Unexpected response: {events}")

    if event_id:
        print()
        sep("STEP 10: AI Scheduler -- Conference, 1 day")
        sched = http_post(
            f"{BASE}/events/{event_id}/schedule/ai-draft",
            {"event_type": "conference", "duration_days": 1, "start_time": "08:00"},
            token=token,
        )
        if "generated_items" in sched:
            items     = sched["generated_items"]
            cats_seen = {i.get("category") for i in items}
            print(f"  {OK} Generated {len(items)} items, categories: {cats_seen}")
            for item in items:
                print(f"     [{item.get('category','?'):12s}] {item.get('title')} "
                      f"({item.get('start_time')}-{item.get('end_time')})")
            required = {"Logistics", "Security", "Evaluation"}
            missing  = required - cats_seen
            if missing:
                print(f"  {WARN} Missing expected categories: {missing}")
            else:
                print(f"  {OK} All required categories present.")
            passed += 1
        else:
            print(f"  {ERR} Scheduler error: {sched}")
            failed += 1
    else:
        print(f"  {WARN} Skipping scheduler -- no event found.")

    # 6. Cleanup check
    print()
    sep("STEP 11: Confirm /temp-read-docx returns 404")
    check = http_get("http://localhost:8000/temp-read-docx")
    if check.get("error") == 404:
        print(f"  {OK} /temp-read-docx correctly returns 404.")
        passed += 1
    else:
        print(f"  {ERR} Unexpected: {check}")
        failed += 1

    # Summary
    print()
    sep("VERIFICATION SUMMARY")
    print(f"  Passed : {passed}")
    print(f"  Failed : {failed}")
    if failed == 0:
        print(f"  {OK} ALL CHECKS PASSED")
    else:
        print(f"  {WARN} {failed} check(s) need attention.")
    sep()


if __name__ == "__main__":
    asyncio.run(main())
