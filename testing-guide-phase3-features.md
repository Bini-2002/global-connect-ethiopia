# 🧪 Targeted Test Plan: Phase 3 Features
> **Focus:** Validating the specific features outlined in `plan-phase3NotificationsAnalyticsTeamHubAndVipHotels.prompt.md`.

This guide isolates the exact features requested in the Phase 3 prompt to ensure all requirements (Notifications, Analytics, Team Hub, VIP Hotels, and Event Cloning) are fully functional.

---

## 1️⃣ Phase 1 & 5: Notifications System
**Objective:** Ensure global notifications are generated, stored, and marked as read correctly across roles.

### Test 1: Triggering a Notification
1. **Action:** As a Team Member, submit a task for approval.
2. **Action:** Log in as the Organizer of that event.
3. **Verify:** Check the top-right navbar. The **Notification Bell** must show an unread badge (e.g., a red dot or number).
4. **Verify:** Click the bell to open the dropdown/page. A notification stating the task requires approval must be visible.

### Test 2: Mark as Read & Persist
1. **Action:** On the notifications page, click the unread notification.
2. **Verify:** The background color changes (indicating it's read) and the badge count decreases.
3. **Action:** Refresh the page.
4. **Verify:** The notification remains in the "read" state, proving the `PATCH /api/v1/notifications/{id}/read` backend endpoint works.

---

## 2️⃣ Phase 1 & 5: Analytics Dashboard & Payment Filter
**Objective:** Validate UC-25 server-side revenue aggregation and the Revenue vs. Budget graph.

### Test 3: Revenue Analytics Graph Rendering
1. **Action:** Log in as Organizer → Event Workspace → **Analytics** tab.
2. **Verify:** The page must render a **Revenue vs. Budget** bar chart showing Bookings (or ticket-derived revenue), Vendor Fees, Sponsorships, and Total.
3. **Verify:** The "Last updated: [Timestamp]" label is visible and shows when the data was fetched.

### Test 4: Payment Method Filter
1. **Action:** On the Analytics tab, change the "Payment Method" dropdown from "All" to "chapa".
2. **Verify:** The numbers and chart dynamically update.
3. **Action:** Click the "Refresh Now" button.
4. **Verify:** A syncing warning/spinner appears briefly, and the timestamp updates to "just now".

---

## 3️⃣ Phase 2: Team Member Hub & Task Payouts
**Objective:** Verify the isolated team dashboard and the automated Chapa/Wallet payout loop.

### Test 5: Team Dashboard Isolation
1. **Action:** Log in as a Team Member and navigate to `/team/dashboard`.
2. **Verify:** The interface is restricted to Tasks and Wallet (they cannot see the Organizer budget, analytics, etc.).
3. **Action:** Manually type `/organizer/dashboard` in the URL bar.
4. **Verify:** You are redirected away, confirming route-level security.

### Test 6: Task Completion & Automated Payout
1. **Action:** As Organizer, assign a task with a `500 ETB` payout to the Team Member.
2. **Action:** As Team Member, click "Submit for Approval".
3. **Action:** As Organizer, click "Approve & Pay Out" on the task.
4. **Verify:** The Organizer's wallet balance decreases by 500 ETB.
5. **Verify:** The Team Member's wallet balance increases by 500 ETB.

---

## 4️⃣ Phase 3: Public Event Listing & Private Registration
**Objective:** Test homepage capacity restrictions and manual attendee QR generation.

### Test 7: Homepage Slot Counter & Full Events
1. **Action:** As Organizer, create an event with a capacity of `1`. 
2. **Action:** Log out and view the Homepage (`/`).
3. **Verify:** The event shows an orange "1 slot remaining" indicator.
4. **Action:** Book the single slot as an Attendee.
5. **Action:** Refresh the Homepage.
6. **Verify:** The event is hidden from the "Available Events" list, or the "Reserve Event" button is entirely disabled/removed.

### Test 8: Manual Attendee Registration
1. **Action:** As Organizer → Event Workspace → **Attendees** tab.
2. **Action:** Manually register a user (e.g., Name: Test, Email: test@manual.com).
3. **Verify:** The system displays a success state containing the Booking Reference and a QR Code string.
4. **Verify:** (Backend) Check the terminal logs to ensure `EmailService.send_generic_email` attempted to send the ticket to `test@manual.com`.

---

## 5️⃣ Phase 4: VIP Hotel Reservations & Event Cloning
**Objective:** Confirm VIP offline reservations and event template cloning logic.

### Test 9: VIP Hotel Reservations
1. **Action:** As Organizer → Event Workspace → **VIP Hotels** tab.
2. **Action:** Add a reservation (VIP Name, Hotel Name, Check-in/out dates, Room Type).
3. **Verify:** The reservation appears instantly in the list below.
4. **Verify:** (Backend) The terminal logs show a generic email dispatch attempt to the VIP's email address containing the hotel details.

### Test 10: Event Cloning (Empty Categories)
1. **Action:** As Organizer, ensure your current event has Budget items (e.g., Venue: 50,000 ETB) and Schedule sessions.
2. **Action:** Click **Clone Event** from the Event Overview page.
3. **Verify:** You are redirected to a new Draft event.
4. **Verify:** Go to the Budget tab of the *new* event. The "Venue" category must exist, but the estimated cost should be reset to `0` (as per the prompt's safety recommendation).
5. **Verify:** Go to the Schedule tab. The sessions should exist but without assigned speakers.

---

## 🛠️ Quick Database Verifications
If UI tests fail, run these in `mongosh` to verify the backend data exists:

```javascript
use globalconnect

// Check if notifications are saving
db.notifications.find().sort({created_at: -1}).limit(2)

// Check if manual attendee booking exists
db.bookings.find({registration_type: "manual"}).limit(1)

// Check if VIP reservation saved
db.vip_hotel_reservations.find().limit(1)

// Check if cloned event was created properly
db.events.find({cloned_from_event_id: {$exists: true}}).limit(1)
```
