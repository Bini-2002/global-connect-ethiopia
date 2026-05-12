## Plan: Phase 3 - Notifications, Analytics, Team Hub, and VIP Hotels

This plan outlines the frontend and backend implementation for the 7 newly requested features: system-wide notifications, UC-25 revenue analytics, public event reservations, complete team member task & payout workflows, manual attendee registration, event cloning, and VIP hotel reservations.

**Steps**

1. **Phase 1: Notifications & Analytics Foundations (Backend)**
   * Create a global `notifications_collection` to store user-scoped notifications with fields: `recipient_id`, `type`, `message`, `read_status`, `related_entity`.
   * Create endpoints `GET /api/v1/notifications` and `PATCH /api/v1/notifications/{id}/read`.
   * Update the transaction and booking models to explicitly store `payment_method` on all financial movements.
   * Build the Analytics Service: Create `GET /api/v1/analytics/revenue/events/{id}` for organizers/vendors and `GET /api/v1/admin/analytics/revenue` for admins. The service must aggregate booking reserves, vendor fees, and sponsorship funds, and support the `?payment_method=` filter.

2. **Phase 2: Team Member Hub & Wallet (Backend & Frontend)**
   * *depends on Phase 1*
   * Add Phone/OTP schema and verification endpoints for Team Member onboarding.
   * Auto-provision a user Wallet upon Team Member registration to support payouts, and integrate Chapa withdrawals for them.
   * Build the Team Member Dashboard UI (`/team/dashboard`): Ensure they cannot access the full Organizer dashboard. Give them a specific view for their tasks, task completion status, and wallet balance.
   * Build the Task Approval flow: Team member marks "Completed" -> Organizer receives a Notification -> Organizer clicks "Confirm" -> Triggers auto-payout from Organizer budget to Team Member wallet.

3. **Phase 3: Public Event Listing & Private Registration (Frontend & Frontend/Backend)**
   * Update the Homepage (`/`): Ensure the dynamic list of public events hides full events. Add the explicit "Reserve Event" button and remaining slot counter.
   * Add a manual attendee registration endpoint: `POST /api/v1/events/{id}/attendees/manual`.
   * Build the "Register Attendees" dashboard for Organizers: Form for Name/Email -> calls the manual endpoint -> generates the booking and QR code -> integrates with EmailService to send the link.

4. **Phase 4: VIP Hotel Reservations & Event Cloning (Backend & Frontend)**
   * Create the `vip_hotel_reservations_collection`.
   * Build `POST /api/v1/events/{id}/vip-reservations`: Organizer submits hotel details + VIP email -> system saves reservation and triggers a direct email to the VIP with the reservation details (no app check-in needed).
   * Build the Event Clone endpoint (`POST /api/v1/events/{id}/clone`) which copies budget, tasks, and schedule templates into a draft for the same organizer or across a shared template library.
   * Update Final Dashboard UI: Add the public/clonable view summary at the end of the event lifecycle.

5. **Phase 5: Notification & Analytics UI (Frontend)**
   * *parallel with Phase 4*
   * Implement the global Notification bell and dropdown in the navbar for all roles (Organizer, Vendor, Team, Admin, Municipal).
   * Implement the "Analytics Dashboard" UI for Organizers: Feature a real-time graph mapping Revenue vs. Budget, a dropdown for "Payment Method", and a "Last updated: [Timestamp]" syncing warning.

**Relevant files**
- `backend/app/db/mongodb.py` — Register new collections (`notifications_collection`, `vip_reservations_collection`).
- `backend/app/api/v1/endpoints/analytics.py` — New analytics aggregation routes matching UC-25.
- `backend/app/api/v1/endpoints/notifications.py` — New generic notification routes.
- `backend/app/api/v1/endpoints/events.py` — Add manual attendee registration and clone endpoints.
- `backend/app/api/v1/endpoints/team.py` — Expand OTP verification and Organizer-approval task payouts.
- `frontend/app/organizer/analytics/page.tsx` — Revenue Analytics dashboard with the Revenue vs. Budget chart.
- `frontend/app/team/dashboard/page.tsx` — Isolated dashboard for team members containing specific assigned tools + wallet payout UI.
- `frontend/app/organizer/events/[id]/register-attendees/page.tsx` — Form for manual attendee QR-code linkage.
- `frontend/app/(public)/page.tsx` — Tweak homepage visibility mapping for full events.

**Verification**
1. Test UC-25 analytics: generate mock sales via Chapa and verify they render correctly on the organizer graph, filtered by payment method.
2. Complete full team onboarding loop: invite team member via email -> accept -> OTP -> dashboard -> task complete -> organizer approve -> wallet balances update.
3. Test private registration: organizer inserts a dummy email -> check system logs/database to ensure booking is `confirmed` and QR string is generated.
4. Verify VIP hotel mapping: create VIP reservation -> confirm the email service payload is prepared to dispatch.

**Decisions**
- Notifications will be centralized in a generic collection rather than isolated per module to enable a unified User Dashboard.
- Team member permissions will be enforced via frontend routing constraints (`/team/*` vs `/organizer/*`) and backend role confirmation.
- Team payouts will utilize the exact same Chapa/Wallet infrastructure currently applied to Vendors, ensuring no redundant transaction systems are needed.
- Analytics graphs will be calculated server-side (aggregation pipelines) vs client-side to minimize client payload sizes for large events.

**Further Considerations**
1. Do we want to introduce a soft-lock (timeout) on team member task completions so the organizer *must* review within 24 hours, or will it wait indefinitely until explicitly approved?
2. For Event Cloning, should we duplicate event *budget limits* exactly as they were, or just the budget *categories* with empty allocations? I recommend copying categories but leaving the numbers at zero for safety.