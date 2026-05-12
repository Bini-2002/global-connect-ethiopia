# 🧪 Testing Guide — Samri (Part 1)
> **Branch:** `feat/folder-structure` | Backend: `http://localhost:8000` | Frontend: `http://localhost:3000`

---

## ⚡ Boot the System

```bash
# Terminal 1 — Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

Verify: open `http://localhost:8000/docs` → Swagger UI should load.

---

## 🔑 Test Accounts to Create First

| Role | Email | Password |
|---|---|---|
| Organizer | organizer@test.com | Test1234! |
| Ministry | ministry@test.com | Test1234! |
| Team Member | team@test.com | Test1234! |

---

## BLOCK 1 — Authentication

### 1.1 Organizer Registration + OTP
1. Go to `/register` → fill Name, Email, Password, Role = **Organizer** → Submit
2. OTP appears in backend terminal log: `OTP for organizer@test.com: 123456`
3. Enter it → **Expected:** redirected to `/organizer/dashboard`

### 1.2 Login Redirect
1. Go to `/login` → email + password → **Expected:** auto-redirect to dashboard

### 1.3 Role Guard
1. While logged in as organizer, visit `/team/dashboard` → **Expected:** redirected back to `/organizer/dashboard`
2. Log out → visit `/organizer/dashboard` → **Expected:** redirected to `/login`

### 🔴 Auth Fixes
**"OTP expired" immediately:**
```bash
# Resend OTP via API:
curl -X POST http://localhost:8000/api/v1/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@test.com"}'
```

**Login succeeds but redirects to /login again:**
- DevTools → Application → LocalStorage — check `token` and `role` exist
- If `role` is null: check `backend/app/api/v1/endpoints/auth.py` — `create_access_token()` must include `role`

**500 on /auth/register:**
- MongoDB not running → Windows: `net start MongoDB` or check services.msc

**CORS error in browser:**
- `backend/app/core/config.py` → `CORS_ORIGINS` must include `"http://localhost:3000"` → restart uvicorn

---

## BLOCK 2 — Proposals & Government Approval

### 2.1 Submit Proposal (Organizer)
1. Login as organizer → `/organizer/proposals/new`
2. Fill: Title = **Tech Summit 2026**, Type = Conference, Location = Addis Ababa, Date = any future
3. Submit → **Expected:** shows in `/organizer/proposals` with status **Pending**

### 2.2 Ministry Approves
1. Register ministry account → login → `/ministry/proposals`
2. Find Tech Summit 2026 → **Review** → **Approve** → enter permit `PERMIT-2026-001`
3. **Expected:** status → **Approved**

### 2.3 Create Event from Proposal
1. As organizer → `/organizer/proposals` → find approved proposal → **Create Event**
2. **Expected:** opens event workspace at `/organizer/events/{id}` with all tabs visible

### 🔴 Proposal/Event Fixes
**Ministry panel shows nothing:**
```bash
mongosh
use globalconnect
db.users.updateOne(
  {email:"ministry@test.com"},
  {$set:{is_active:true, email_verified:true}}
)
```

**"Create Event" button missing:**
```bash
# Check proposal status — must be "approved" (lowercase)
db.proposals.findOne({title:"Tech Summit 2026"})
# Fix if wrong:
db.proposals.updateOne(
  {title:"Tech Summit 2026"},
  {$set:{status:"approved"}}
)
```

**Event workspace shows 404:**
```bash
# Verify the event was actually created
db.events.find({}).pretty()
```

---

## BLOCK 3 — Event Workspace

### 3.1 Budget
1. Workspace → **Budget** tab → add items: Venue ETB 50k, Catering ETB 30k
2. Save → **Expected:** total = ETB 80,000, persists on refresh

### 3.2 Schedule Builder
1. **Schedule** tab → **Add Session**: Opening Keynote, 09:00–10:00
2. **Expected:** session appears in timeline
3. (Optional) Try **AI Draft** → fill event type + duration → Apply

### 3.3 Venue Reservation
1. **Venue** tab → **Search Venues** → select one → **Request Reservation**
2. Login as Vendor → accept reservation
3. Back as organizer → confirm → **Expected:** venue status = "confirmed"

### 🔴 Workspace Fixes
**Budget 422 error:**
- Check Network tab → request payload — `estimated_cost` must be a number not string
- `frontend/app/organizer/events/[id]/budget/page.tsx` → ensure `parseFloat()` wraps input

**AI Schedule 500 / "unavailable":**
```bash
# Check .env for:
GOOGLE_GEMINI_API_KEY=your_key_here
# Restart uvicorn after adding it
```

**Venue search empty:**
- Must create venue listings first: Login as Vendor → `/vendor/venue-listings` → Add venue → retry search

---

## BLOCK 4 — Team Member & Task Payout

### 4.1 Team Member Registration
1. Go to `/team/register`
2. Name, Phone `+251911000001`, Password → Next
3. OTP shown on screen (debug mode) → enter it
4. **Expected:** `/team/dashboard` with wallet and task panels

### 4.2 Organizer Creates Task with Payout
1. Organizer → event workspace → **Tasks** tab → **Add Task**
2. Title: Set up desk, Assign: team@test.com, Payout: ETB 500 → Save
3. **Expected:** task shown with payout badge

### 4.3 Team Member Submits
1. Login as team member → `/team/dashboard` → find task → **Submit for Approval**
2. **Expected:** status = "pending_approval"

### 4.4 Organizer Approves & Wallet Updates
1. As organizer → Tasks → find "Awaiting Approval" task → **Approve & Pay Out**
2. **Expected:** task = "done", team member wallet += ETB 500
3. Verify: login as team member → wallet balance shows ETB 500

### 🔴 Task/Payout Fixes
**Submit button not visible:**
```bash
# Task assignee_user_id must match team member's actual _id
db.event_tasks.findOne({title:"Set up desk"})
db.users.findOne({email:"team@test.com"})
# If mismatch, fix:
db.event_tasks.updateOne(
  {title:"Set up desk"},
  {$set:{assignee_user_id:"TEAM_MEMBER_ID_HERE"}}
)
```

**"Approve & Pay Out" → Insufficient balance:**
```bash
# Add test funds to organizer wallet
db.wallets.updateOne(
  {user_id: ObjectId("ORGANIZER_USER_ID")},
  {$set:{balance:10000}}
)
```

**Phone OTP not shown:**
- DevTools → Network → find `/auth/team/phone-otp` response → copy `debug_otp` value

---

## ✅ Samri's Checklist

| # | Test | Done |
|---|---|---|
| 1.1 | Organizer registration + OTP | ☐ |
| 1.2 | Login redirect | ☐ |
| 1.3 | Role guard | ☐ |
| 2.1 | Proposal submission | ☐ |
| 2.2 | Ministry approval | ☐ |
| 2.3 | Create event | ☐ |
| 3.1 | Budget | ☐ |
| 3.2 | Schedule | ☐ |
| 3.3 | Venue reservation | ☐ |
| 4.1 | Team member register | ☐ |
| 4.2 | Task with payout | ☐ |
| 4.3 | Task submit | ☐ |
| 4.4 | Approve & payout | ☐ |

> Hand off to **Mafi** when done — share the running system and your test accounts.

---

## 🛠️ Quick Debug Commands

```bash
# Live backend logs
uvicorn app.main:app --reload --log-level debug

# MongoDB shell
mongosh
use globalconnect
db.users.find({}).pretty()
db.events.find({}).pretty()
db.wallets.find({}).pretty()

# Get auth token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@test.com","password":"Test1234!"}'
```
