# 🧪 Testing Guide — Mafi (Part 2)
> **Branch:** `feat/folder-structure` | Backend: `http://localhost:8000` | Frontend: `http://localhost:3000`
> Pick up where Samri left off — reuse their accounts and running system.

---

## 🔑 Accounts from Samri (already created)

| Role | Email | Password |
|---|---|---|
| Organizer | organizer@test.com | Test1234! |
| Team Member | team@test.com | Test1234! |

**Create these new ones:**

| Role | Email | Password |
|---|---|---|
| Vendor | vendor@test.com | Test1234! |
| Attendee | attendee@test.com | Test1234! |

---

## BLOCK 5 — Notifications System

### 5.1 Notification Bell Shows Unread Count
1. Login as organizer → look at the top-right header
2. **Expected:** Bell icon with a badge number if any notifications exist
3. Click the bell → dropdown or navigate to `/notifications`
4. **Expected:** list of notification cards with type badges and timestamps

### 5.2 Notification Marked as Read
1. On `/notifications` → click any **unread** card (darker background)
2. **Expected:** card turns white/light, unread badge count decreases by 1

### 5.3 Filter Unread Only
1. On `/notifications` → click **Unread only** toggle
2. **Expected:** only unread notifications shown
3. Click **Mark all read**
4. **Expected:** all cards become read, badge disappears

### 5.4 Cross-Role Notifications
1. As organizer, approve a team member task (from Samri's Block 4)
2. Logout → login as **team member**
3. **Expected:** notification bell shows unread count
4. Open `/notifications` → a "payment_sent" or "task approved" notification appears

### 🔴 Notification Fixes

**Bell shows no badge despite activity:**
```bash
# Check notifications exist in DB
mongosh
use globalconnect
db.notifications.find({}).pretty()
# If empty, the push_notification service may not be firing.
# Check backend/app/services/notification_service.py exists and
# that it's imported in events.py near task approval logic.
```

**Notifications page shows wrong sidebar (e.g., organizer sidebar for team member):**
```
Fix: frontend/app/notifications/page.tsx reads the JWT role.
     DevTools → Application → LocalStorage → check 'role' value.
     If it's correct but sidebar is wrong, check the ROLE_MAP in
     frontend/app/notifications/page.tsx — team_member must map to 'team_member'.
```

**"Mark all read" doesn't persist on refresh:**
```bash
# Check the endpoint exists:
curl -X POST http://localhost:8000/api/v1/notifications/read-all \
  -H "Authorization: Bearer YOUR_TOKEN"
# If 404: the endpoint may be missing. Check
# backend/app/api/v1/endpoints/notifications.py for read-all route.
```

---

## BLOCK 6 — Revenue Analytics Dashboard

### 6.1 Open Analytics Tab
1. Login as organizer → event workspace → **Analytics** tab
2. **Expected:** Revenue Analytics page loads with KPI strip and chart

### 6.2 Chart Renders Revenue vs Budget
1. If budget items were added (Samri's Block 3.1), the chart should show bars
2. **Expected:** dark green bars (Revenue) beside teal bars (Budget) for Tickets, Vendor Fees, Sponsorship, Total
3. Hover over a bar → **Expected:** tooltip shows the exact value

### 6.3 Payment Method Filter
1. Use the **Payment Method** dropdown → select **chapa**
2. **Expected:** numbers update (may show 0 if no chapa transactions yet — that's valid)
3. Select **All methods** → numbers return to full totals

### 6.4 Refresh Button
1. Click **Refresh Now** (sidebar) or **Refresh** (top-right)
2. **Expected:** spinner appears briefly, "Last updated: Xs ago" resets to "just now"

### 6.5 Budget Coverage Indicator
1. In the sidebar under **Budget Estimate**, check the indicator
2. If revenue < budget → shows "N ETB short" in amber
3. If revenue >= budget → shows "Revenue covers budget" in green

### 🔴 Analytics Fixes

**Analytics tab shows "No analytics data yet":**
```
This is correct if no bookings or vendor transactions exist.
To generate test data:
1. Create and open booking as attendee (Block 8 below)
2. Then revisit Analytics — ticket revenue should appear.
```

**Chart bars not rendering (blank white box):**
```
Fix: Open DevTools → Console. If you see "Cannot read property of undefined",
     the data.ticket_revenue or data.vendor_fee_revenue may be null.
     Check backend/app/services/analytics_service.py — the aggregation
     must always return a default {total:0, by_payment_method:{}} structure.
```

**Refresh does nothing (data doesn't change):**
```
The useEventRevenueAnalytics hook must have a refresh() that increments reloadKey.
Check frontend/app/hooks/useNotificationsAndAnalytics.ts:
- useEventRevenueAnalytics must return: { data, error, loading, refresh }
- The useEffect dependency array must include reloadKey.
```

**Analytics returns 403:**
```bash
# Only organizers can access event analytics.
# Verify the token role:
# Paste your token at jwt.io and check the 'role' field.
```

---

## BLOCK 7 — Vendor Marketplace & Contracts

### 7.1 Vendor Registration
1. Go to `/register` → Role = **Vendor** → complete registration
2. Login → go to `/vendor/dashboard`
3. Click **Get Verified** → upload a test document
4. **Expected:** verification status shows "Pending"

### 7.2 Vendor Creates Service Listing
1. As vendor → `/vendor/services` → **Add Service**
2. Fill: Name = Photography Package, Price = ETB 15,000, Category = Photography
3. **Expected:** service appears in list

### 7.3 Organizer Sends Vendor Request
1. As organizer → event workspace → **Venue** tab (or from marketplace)
2. Browse vendors → find Photography Package → **Send Request**
3. **Expected:** request appears in organizer's request list

### 7.4 Vendor Accepts + Contract Signed
1. Login as vendor → `/vendor/requests` → find the request → **Accept**
2. Organizer: `/organizer/events/{id}` → requests → **Proceed to Contract**
3. Both parties sign → **Expected:** contract status = "fully_signed"
4. Organizer marks as Complete → **Expected:** payment released from escrow

### 🔴 Vendor/Marketplace Fixes

**Vendor dashboard shows "not verified" and blocks actions:**
```bash
# Manually verify the vendor for testing:
db.vendors.updateOne(
  {user_id: ObjectId("VENDOR_USER_ID")},
  {$set:{verification_status:"verified", is_approved:true}}
)
```

**Contract PDF download blocked by browser (caching issue):**
```
Fix: The contract PDF response must have Cache-Control: no-store header.
     Check backend/app/api/v1/endpoints/contracts.py — the StreamingResponse
     for PDF should include: headers={"Cache-Control": "no-store"}
```

**"Escrow payment failed" on contract completion:**
```bash
# Check organizer wallet balance:
db.wallets.findOne({user_id: ObjectId("ORGANIZER_ID")})
# Add funds if 0:
db.wallets.updateOne(
  {user_id: ObjectId("ORGANIZER_ID")},
  {$set:{balance:100000}}
)
```

---

## BLOCK 8 — Public Event Listing & Attendee Booking

### 8.1 Homepage Shows Published Events (Attendee)
1. Login as attendee → go to `http://localhost:3000`
2. **Expected:** "Available Events" section shows published events
3. Any event with `booking_status = full` must NOT appear

### 8.2 Reserve Event Button
1. Find an event with `booking_status = open` in the list
2. **Expected:** an emerald **Reserve Event** button is visible
3. Slot counter turns **orange** when ≤ 5 slots remaining

### 8.3 Complete a Booking
1. Click **Reserve Event** → event detail page → click **Book Now**
2. Fill attendee info → Confirm
3. **Expected:** booking confirmed, QR code shown or downloadable

### 8.4 Manual Attendee Registration (Organizer)
1. Login as organizer → event workspace → **Attendees** tab
2. Fill: Name = **Test VIP**, Email = `vip@test.com`
3. Click **Register Attendee**
4. **Expected:**
   - Success card shows Booking Ref + QR Code
   - "A confirmation email has been sent" message
   - Attendee appears in the table below

### 🔴 Booking/Attendee Fixes

**"Reserve Event" button missing (event is open but button not shown):**
```
The homepage card only shows "Reserve Event" when booking_status === 'open'.
Check: db.events.findOne({title:"Tech Summit 2026"}).booking_status
If it's "disabled", go to organizer → Booking tab → enable booking.
If it's "scheduled", the booking_opens_at date is in the future — change it.
```

**Booking fails with "Event not found for attendee":**
```bash
# Event must be public + published
db.events.updateOne(
  {title:"Tech Summit 2026"},
  {$set:{visibility:"public", status:"published", booking_required:true,
         booking_status:"open", capacity:100, booked_count:0, remaining_slots:100}}
)
```

**Attendees tab shows 403:**
```
The /events/{id}/bookings endpoint only allows the event organizer.
Verify you are logged in as the organizer who OWNS this event.
db.events.findOne({title:"Tech Summit 2026"}).organizer_id must match your user _id.
```

**Email not received after manual registration:**
```
This is expected in local dev — email delivery is disabled unless
SMTP_ENABLED=true or RESEND_ENABLED=true in backend/.env.
The booking is still created. Check: db.ticket_purchases.find({attendee_email:"vip@test.com"})
```

---

## BLOCK 9 — VIP Hotel Reservations

### 9.1 Create VIP Reservation
1. Login as organizer → event workspace → **VIP Hotels** tab
2. Fill the form:
   - VIP Name: Dr. Abebe Girma
   - VIP Email: `vip-guest@test.com`
   - Hotel: Skylight Hotel
   - Address: Bole Road, Addis
   - Check-in: next Monday, Check-out: next Wednesday
   - Room Type: Executive Suite
3. Click **Confirm Reservation**
4. **Expected:** success toast, card appears in the list below

### 9.2 VIP Card Shows in List
1. After creating, scroll down
2. **Expected:** reservation card shows name, email, hotel, dates, status = "confirmed"

### 9.3 Cancel a Reservation
1. Click the trash icon on any reservation card
2. **Expected:** card disappears, count updates

### 🔴 VIP Fixes

**VIP Hotels tab missing from workspace:**
```
Check frontend/components/organizer/events/EventWorkspaceShell.tsx
The tabConfigs array must have: { id: 'vip', label: 'VIP Hotels', icon: Crown, ... }
If missing, pull the latest code from the branch.
```

**"Confirm Reservation" → 403:**
```
The organizer_id on the event must match the logged-in user.
If you're using a different organizer account than the one who created the event,
re-login with the correct organizer account.
```

**Reservation created but VIP email not sent:**
```
Expected in local dev (email disabled). To verify the reservation was saved:
db.vip_hotel_reservations.find({vip_email:"vip-guest@test.com"}).pretty()
```

---

## BLOCK 10 — Event Cloning

### 10.1 Clone an Event
1. As organizer → open any event workspace → Overview tab
2. Click **Clone Event** button (top-right, next to lifecycle buttons)
3. **Expected:**
   - Loading spinner briefly
   - Auto-redirected to the new cloned event at `/organizer/events/{new_id}`
   - Title shows "Tech Summit 2026 (Copy)"

### 10.2 Verify Cloned Content
1. Check the cloned event's **Budget** tab
   - **Expected:** same categories as original but all `estimated_cost = 0`
2. Check **Schedule** tab
   - **Expected:** same sessions copied (no speaker assigned)
3. Check **Tasks** tab
   - **Expected:** same task titles but `status = open`, no assignee
4. **Expected:** cloned event status = **Draft** (not Published)

### 🔴 Clone Fixes

**Clone button missing:**
```
Check frontend/app/organizer/events/[id]/page.tsx
The handleClone function and the Clone Event button must be in the actions block.
Also verify api utility is imported: import { api } from '@/app/lib/api'
```

**Clone returns 403:**
```
You must own the event. Check db.events.findOne({...}).organizer_id
matches your logged-in user's _id.
```

**Cloned event redirects to 404:**
```bash
# Verify clone was created:
db.events.find({cloned_from_event_id: {$exists:true}}).pretty()
# If empty, the POST /events/{id}/clone endpoint may have an unhandled exception.
# Check backend logs for the traceback.
```

**Budget items not copying:**
```
Check the original event has budget_items:
db.events.findOne({title:"Tech Summit 2026"}).budget_items
If the array is empty, add budget items first (Block 3.1), then clone again.
```

---

## ✅ Mafi's Checklist

| # | Test | Done |
|---|---|---|
| 5.1 | Notification bell + count | ☐ |
| 5.2 | Mark single notification read | ☐ |
| 5.3 | Unread filter + mark all read | ☐ |
| 5.4 | Cross-role notification | ☐ |
| 6.1 | Analytics tab loads | ☐ |
| 6.2 | Revenue vs Budget chart | ☐ |
| 6.3 | Payment method filter | ☐ |
| 6.4 | Refresh button | ☐ |
| 6.5 | Budget coverage indicator | ☐ |
| 7.1 | Vendor registration | ☐ |
| 7.2 | Vendor service listing | ☐ |
| 7.3 | Organizer sends request | ☐ |
| 7.4 | Contract signed + payment | ☐ |
| 8.1 | Homepage attendee view | ☐ |
| 8.2 | Reserve Event button | ☐ |
| 8.3 | Complete booking + QR | ☐ |
| 8.4 | Manual attendee registration | ☐ |
| 9.1 | Create VIP reservation | ☐ |
| 9.2 | VIP card in list | ☐ |
| 9.3 | Cancel reservation | ☐ |
| 10.1 | Clone event + redirect | ☐ |
| 10.2 | Cloned content verified | ☐ |

---

## 🛠️ Quick Debug Commands

```bash
# MongoDB — useful queries
mongosh
use globalconnect
db.events.find({},{title:1,status:1,booking_status:1}).pretty()
db.notifications.find({read_status:false}).pretty()
db.vip_hotel_reservations.find({}).pretty()
db.ticket_purchases.find({registration_type:"manual"}).pretty()

# Test analytics endpoint
curl http://localhost:8000/api/v1/analytics/revenue/events/EVENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test VIP reservation endpoint
curl -X POST http://localhost:8000/api/v1/events/EVENT_ID/vip-reservations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vip_name":"Test VIP","vip_email":"v@test.com","hotel_name":"Skylight","check_in_date":"2026-06-01","check_out_date":"2026-06-03"}'

# Test clone endpoint
curl -X POST http://localhost:8000/api/v1/events/EVENT_ID/clone \
  -H "Authorization: Bearer YOUR_TOKEN"

# Frontend build check (catches TypeScript errors)
cd frontend && npm run build 2>&1 | head -50
```

---

*Guide prepared for: feat/folder-structure branch | May 2026*
