# Organizer Post-Approval Backend Spec

This document converts the post-approval organizer workflow from the project documentation into a backend-ready implementation guide.

## Source Scope

Prepared from:
- Chapter 3: Proposed System
- Chapter 4: System Design
- Existing backend structure in this repository

Key use cases from the document:
- `UC-04` Create & Publish Event
- `UC-05` Reserve Venue
- `UC-08` Vendor List Service & Quote Request
- `UC-09` Create & Sign Contract
- `UC-10` Publish Ticketed Event & Configure Inventory
- `UC-15` Generate QR Check-in and Badge
- `UC-16` On-site Incident Report
- `UC-17` Send Post-Event Survey & Collect Feedback
- `UC-18` Publish Final Event Roadmap & Lessons Learned
- `UC-19` Generate Event Schedule via AI
- `UC-21` Invite Team Member
- `UC-22` Assign Tasks to Team
- `UC-23` Broadcast Event Announcement
- `UC-24` Create/Edit Event Budget

---

## Short Answer

After officials allow the event, the organizer should begin from:

- `UC-04 Create & Publish Event`

That is the first organizer action after all authority approvals are complete.

The organizer should finalize the full lifecycle through:

1. Create and publish event
2. Reserve venue
3. Build schedule and event structure
4. Invite team and assign tasks
5. Engage vendors and sign contracts
6. Configure ticketing and inventory
7. Broadcast announcements
8. Run check-in, badges, and incident handling during the event
9. Send post-event survey and collect feedback
10. Publish final event roadmap and lessons learned

---

## Preconditions

Before the organizer can start post-approval execution, the backend should guarantee:

- Proposal status is `approved`
- Municipal approval is complete
- Required permit exists and is valid when the event type requires it
- Organizer is authenticated and owns the approved proposal

Recommended validation rule:

- Block event publication if:
  - proposal is not `approved`
  - permit is required but missing
  - permit is rejected, expired, or revoked

---

## End-to-End Organizer Flow

## Phase 1: Convert Approved Proposal Into Event

### Step 1: Create event from approved proposal

Document basis:
- `UC-04 Create & Publish Event`
- Chapter 4 `Event Management Subsystem`

Backend responsibility:
- Create an `event` record derived from an approved proposal
- Copy reusable fields from proposal:
  - title
  - description
  - event type
  - location
  - start/end date
  - expected attendees
  - office approvals
  - permit reference

Recommended endpoint:
- `POST /events/from-proposal/{proposal_id}`

Suggested response:
- create event in `draft` status
- link `proposal_id`
- return event id and editable event payload

Recommended guardrails:
- proposal must belong to current organizer
- proposal must be `approved`
- one approved proposal should not create multiple active events unless explicitly allowed

### Step 2: Complete event metadata

Document basis:
- `UC-04`

Required fields from the document:
- title
- description
- capacity
- approved location
- program schedule
- VIP list
- ticketing mode

Recommended endpoint:
- `PATCH /events/{event_id}`

---

## Phase 2: Publish Event

### Step 3: Publish event

Document basis:
- `UC-04`

Backend responsibility:
- Validate event is ready
- Validate approvals/permit status
- Publish as:
  - public event, or
  - private invite-only event

Recommended endpoint:
- `POST /events/{event_id}/publish`

Suggested payload:
- `visibility`: `public` | `private`
- `publish_to_calendar`: `true/false`

Publish validation checklist:
- event metadata complete
- approved location present
- permit valid if required
- schedule exists or organizer explicitly confirms later scheduling

Suggested event status transition:
- `draft -> published`
- `draft -> private_published`

---

## Phase 3: Venue and Schedule

### Step 4: Reserve venue

Document basis:
- `UC-05 Reserve Venue`

Backend responsibility:
- search venue availability
- submit reservation request
- confirm reservation
- link reservation to event

Recommended endpoints:
- `GET /venues?date_from=&date_to=&city=`
- `POST /events/{event_id}/venue-reservations`
- `POST /events/{event_id}/venue-reservations/{reservation_id}/confirm`

Recommended reservation states:
- `pending`
- `offered_alternative`
- `confirmed`
- `declined`
- `cancelled`

### Step 5: Build schedule

Document basis:
- `UC-04`
- `UC-19 Generate Event Schedule via AI`
- Chapter 4 `EventSchedules Collection`

Backend responsibility:
- support manual schedule creation
- support AI-assisted schedule draft generation
- store final session schedule linked to event

Recommended endpoints:
- `GET /events/{event_id}/schedule`
- `POST /events/{event_id}/schedule`
- `PATCH /events/{event_id}/schedule/{schedule_item_id}`
- `POST /events/{event_id}/schedule/ai-draft`
- `POST /events/{event_id}/schedule/apply-ai-draft`

---

## Phase 4: Team and Internal Coordination

### Step 6: Invite team members

Document basis:
- `UC-21 Invite Team Member`

Recommended endpoints:
- `POST /events/{event_id}/team/invitations`
- `POST /events/{event_id}/team/invitations/{invitation_id}/revoke`
- `POST /events/{event_id}/team/invitations/{token}/accept`

### Step 7: Assign tasks

Document basis:
- `UC-22 Assign Tasks to Team`

Recommended endpoints:
- `POST /events/{event_id}/tasks`
- `PATCH /events/{event_id}/tasks/{task_id}`
- `GET /events/{event_id}/tasks`

Suggested task fields:
- title
- description
- assignee_user_id
- due_date
- priority
- status

---

## Phase 5: Vendor Procurement

### Step 8: Request vendor quotes

Document basis:
- `UC-08 Vendor List Service & Quote Request`

This aligns with backend code already present for:
- catalog
- vendor requests
- contracts
- payments

Recommended flow:
1. organizer browses approved vendor services
2. organizer submits quote request with event context
3. vendor responds
4. organizer accepts one quote

Existing backend areas:
- `/catalog`
- `/requests`
- `/contracts`
- `/payments`
- `/wallet`

Recommended enhancement:
- ensure every request can be linked to:
  - `event_id`
  - `proposal_id`
  - target date
  - guest count

### Step 9: Create and sign contract

Document basis:
- `UC-09 Create & Sign Contract`

Existing backend support already exists for:
- contract creation
- organizer/vendor signatures

Existing area:
- `/contracts`

Recommended contract states:
- `draft`
- `pending_signature`
- `active`
- `cancelled`
- `completed`

---

## Phase 6: Ticketing and Sales

### Step 10: Configure ticketing

Document basis:
- `UC-10 Publish Ticketed Event & Configure Inventory`

Backend responsibility:
- define ticket types
- configure quantity
- configure pricing
- configure payment options
- activate sales

Recommended endpoints:
- `POST /events/{event_id}/ticket-types`
- `PATCH /events/{event_id}/ticket-types/{ticket_type_id}`
- `POST /events/{event_id}/ticketing/activate`
- `POST /events/{event_id}/ticketing/deactivate`

Suggested ticketing fields:
- name
- price
- quantity
- reserved_quantity
- sales_start
- sales_end
- seat_mode
- visibility

### Step 11: Enforce inventory and prevent overbooking

Document basis:
- `UC-12 Prevent Overbooking`

Backend requirement:
- atomic decrement on successful purchase
- release stock on payment failure
- optional short reservation hold

Recommended purchase endpoints:
- `POST /events/{event_id}/tickets/checkout`
- `POST /events/{event_id}/tickets/confirm-payment`

---

## Phase 7: Communication

### Step 12: Broadcast announcements

Document basis:
- `UC-23 Broadcast Event Announcement`

Recommended endpoints:
- `POST /events/{event_id}/announcements`
- `GET /events/{event_id}/announcements`

Suggested fields:
- audience_segment
- subject
- body
- channel
- send_at
- status

---

## Phase 8: Live Event Operations

### Step 13: Generate badges and check-in support

Document basis:
- `UC-15 Generate QR Check-in and Badge`

Backend responsibility:
- export attendee list
- generate QR check-in data
- generate printable badge payloads

Recommended endpoints:
- `GET /events/{event_id}/attendees/export`
- `POST /events/{event_id}/badges/generate`
- `POST /events/{event_id}/check-in/scan`

### Step 14: Incident reporting

Document basis:
- `UC-16 On-site Incident Report`

Recommended endpoints:
- `POST /events/{event_id}/incidents`
- `GET /events/{event_id}/incidents`
- `PATCH /events/{event_id}/incidents/{incident_id}`

Suggested incident fields:
- type
- severity
- time
- description
- photos
- escalation_status
- resolved_at

---

## Phase 9: Post-Event Finalization

### Step 15: Send surveys and collect feedback

Document basis:
- `UC-17 Send Post-Event Survey & Collect Feedback`

Recommended endpoints:
- `POST /events/{event_id}/feedback/send`
- `GET /events/{event_id}/feedback/responses`
- `GET /events/{event_id}/feedback/summary`

### Step 16: Publish final roadmap and lessons learned

Document basis:
- `UC-18 Publish Final Event Roadmap & Lessons Learned`

This is the final closure step for the organizer.

Recommended endpoints:
- `POST /events/{event_id}/final-report`
- `PATCH /events/{event_id}/final-report`
- `POST /events/{event_id}/archive`

Suggested final report fields:
- timeline summary
- total costs
- vendors used
- lessons learned
- stakeholder visibility
- benchmark metadata

Suggested final event state:
- `completed -> archived`

---

## Recommended Event State Model

Keep proposal state separate from event state.

### Proposal state

Already mostly covered by existing backend:
- `draft`
- `submitted`
- `ministry_review`
- `ministry_approved`
- `municipal_review`
- `approved`
- `rejected`
- `changes_requested`

### Event state

Recommended new state machine:
- `draft`
- `ready_to_publish`
- `published`
- `private_published`
- `live`
- `completed`
- `archived`
- `cancelled`

### Supporting sub-statuses

Keep these as separate fields instead of overloading event status:

- `venue_status`
  - `not_started`
  - `pending`
  - `confirmed`
  - `declined`

- `ticketing_status`
  - `disabled`
  - `configured`
  - `sales_live`
  - `sales_closed`

- `survey_status`
  - `not_sent`
  - `scheduled`
  - `sent`
  - `closed`

- `final_report_status`
  - `not_started`
  - `draft`
  - `published`
  - `archived`

---

## Collections to Build or Finalize

Chapter 4 already suggests several persistent entities. For backend implementation, the minimum practical set is:

- `events`
- `event_schedules`
- `venue_reservations`
- `event_team_members`
- `event_tasks`
- `ticket_types`
- `ticket_purchases`
- `announcements`
- `incidents`
- `feedback_surveys`
- `feedback_responses`
- `event_final_reports`

Already aligned or partially aligned with current backend/domain:

- `event_proposals`
- `vendors`
- `vendor_services`
- `contracts`
- `payments`

---

## What Already Exists in the Current Backend

These areas already exist and can be reused:

- organizer registration and verification
- vendor registration and approval
- proposal submission and review workflow
- ministry review
- municipal review
- police approved-events portal
- permit generation and retrieval
- vendor marketplace catalog
- vendor request flow
- contract creation and signing
- escrow-style payment flow
- vendor wallet

Current backend routes already cover much of the pre-event governance and vendor-contract/payment flow.

---

## What Is Still Missing for Full Post-Approval Backend Coverage

These areas should still be built or expanded:

- event creation from approved proposal
- event publish/unpublish flow
- event schedule CRUD and AI draft support
- venue reservation workflow
- event team invitations
- event task assignment
- ticket type and inventory management
- attendee purchase and ticket issuance flow
- announcement broadcast module
- badge generation and QR check-in endpoints
- incident reporting module
- survey dispatch and feedback aggregation
- final roadmap / lessons learned archive flow

---

## Recommended Build Order

To build this backend efficiently, use this order:

1. `Events` core module
   - create from approved proposal
   - update metadata
   - publish
   - archive

2. `Schedules` module
   - manual CRUD
   - AI draft hook

3. `Venue reservations` module

4. `Team and tasks` module

5. Reuse and tighten `catalog -> requests -> contracts -> payments`
   - add stronger `event_id` linkage everywhere

6. `Ticketing` module
   - ticket types
   - inventory
   - purchases
   - QR issuance

7. `Announcements` module

8. `Live ops` module
   - check-in
   - badges
   - incidents

9. `Feedback and final report` module

---

## Final End-to-End Backend Flow

This is the full organizer execution chain after authority approval:

1. Approved proposal exists
2. Permit exists if required
3. Organizer creates event from proposal
4. Organizer fills metadata
5. Organizer publishes event
6. Organizer reserves venue
7. Organizer builds schedule
8. Organizer invites team
9. Organizer assigns tasks
10. Organizer requests vendor quotes
11. Organizer accepts quote
12. Organizer creates and signs contract
13. Organizer configures ticketing
14. System sells and validates tickets
15. Organizer sends announcements
16. Organizer runs check-in and badge issuance
17. Staff log incidents during live event
18. System sends post-event surveys
19. Organizer reviews feedback summary
20. Organizer publishes final roadmap and lessons learned
21. Event is archived

---

## Implementation Note

For backend design, keep:
- `proposal approval lifecycle`
- `event operational lifecycle`
- `vendor contract/payment lifecycle`

as separate but linked state machines.

That separation will make the system much easier to maintain than forcing everything into one status field.
