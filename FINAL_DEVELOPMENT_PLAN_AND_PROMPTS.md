# Global Connect Ethiopia - Final Development Plan and Prompt Pack

Date: April 19, 2026  
Target: Demo-ready in 8 hours  
Scope mode: Document-aligned but MVP-focused

## 1) Final Goal
Deliver a stable demo for three roles and five must-have flows:

1. Organizer event creation flow
2. Vendor negotiation with organizer
3. Vendor marketplace flow
4. Attendee booking/reservation flow
5. Booking QR flow

Deferred for now:

1. Payments
2. Accommodation
3. Advanced AI
4. Non-core endpoints not needed for demo

## 2) Phase Plan (8 Hours)

## Phase 1 (Hour 0-2) - Stability and Auth Lockdown
Objective: Remove integration blockers and prevent session/auth regressions.

### Backend tasks
1. Ensure critical list endpoints support both with-slash and without-slash routes to prevent 307 redirect auth drops.
2. Verify session + token fallback behavior in auth dependency.
3. Re-validate role guards for organizer, vendor, attendee.

### Frontend tasks
1. Confirm all core service calls use centralized API client with credentials included.
2. Confirm no core flow calls bypass shared auth handling.
3. Ensure logout and session cleanup are consistent.

### Validation checks
1. Login as organizer, vendor, attendee and hit users/me successfully.
2. No Not authenticated errors on initial load for core pages.
3. Core list pages load without redirect-induced auth drops.

## Phase 2 (Hour 2-6) - Complete Must-Have Demo Flows
Objective: End-to-end flow completion for the presentation path.

### A) Organizer flow
Target: Register/Login -> Proposal approved -> Create event -> View/manage event.

Key frontend surfaces:
1. frontend/app/organizer/dashboard/page.tsx
2. frontend/app/organizer/proposals/page.tsx
3. frontend/app/organizer/proposals/[id]/page.tsx
4. frontend/app/organizer/create-event/page.tsx
5. frontend/app/organizer/events/page.tsx

Key backend surfaces:
1. backend/app/api/v1/endpoints/proposals.py
2. backend/app/api/v1/endpoints/ministry_proposals.py
3. backend/app/api/v1/endpoints/municipal_proposals.py
4. backend/app/api/v1/endpoints/events.py

Acceptance:
1. Organizer can create/manage event from approved proposal.
2. No blocking auth or missing-data errors.

### B) Vendor negotiation + marketplace flow
Target: Vendor verified -> Receives organizer request -> Negotiates -> Contract state progresses.

Key frontend surfaces:
1. frontend/app/vendor/verification/page.tsx
2. frontend/app/vendor/requests/page.tsx
3. frontend/app/vendor/requests/[id]/page.tsx
4. frontend/app/vendor/contracts/page.tsx
5. frontend/app/vendor/contracts/[id]/page.tsx
6. frontend/app/vendor/dashboard/page.tsx

Key backend surfaces:
1. backend/app/api/v1/endpoints/vendors.py
2. backend/app/api/v1/endpoints/vendors_services.py
3. backend/app/api/v1/endpoints/market_requests.py
4. backend/app/api/v1/endpoints/market_contracts.py
5. backend/app/api/v1/endpoints/catalog.py

Acceptance:
1. Vendor request appears in vendor portal.
2. Vendor can respond and move negotiation forward.
3. Contract details are visible and state transitions are reflected.

### C) Attendee booking + QR flow
Target: Attendee discovers event -> books open event -> receives booking confirmation and QR artifact.

Key frontend surfaces:
1. frontend/app/page.tsx
2. frontend/app/events/[id]/page.tsx
3. Any attendee booking UI components under frontend/components

Key backend surfaces:
1. backend/app/api/v1/endpoints/events.py (publish/live/booking/QR/check-in endpoints)
2. backend/app/schemas/event.py
3. backend/app/models/event_states.py

Acceptance:
1. Published event is discoverable by attendee.
2. Booking succeeds when event is open.
3. QR endpoint returns valid image/content.

## Phase 3 (Hour 6-8) - Demo Hardening and Runbook
Objective: Make demo repeatable and safe for live presentation.

### Hardening tasks
1. Seed deterministic demo data for organizer, vendor, attendee scenarios.
2. Add fallback-safe demo behavior only where critical integrations are risky.
3. Freeze known-good demo sequence and role-switch order.
4. Prepare issue fallback steps for each role.

### Final smoke test
Run in this exact order:

1. Organizer login -> open approved proposal -> create/view event
2. Vendor login -> receive request -> negotiate response -> view contract
3. Attendee view published event -> book -> fetch QR
4. Quick role switch sanity check (logout/login for each role)

## 3) Task Checklist (Execution Order)

## Step 1 - Integration stability
- [ ] Verify auth/session for organizer/vendor/attendee
- [ ] Ensure no slash-route redirect auth failures on core APIs
- [ ] Re-test API service wrappers and credentials usage

## Step 2 - Organizer completion
- [ ] Approved proposal to event creation is clean
- [ ] Organizer events list/details are stable
- [ ] Event status transitions needed for demo are working

## Step 3 - Vendor completion
- [ ] Vendor verification status path confirmed
- [ ] Request and negotiation flow connected
- [ ] Contract details and progression visible

## Step 4 - Attendee completion
- [ ] Published/open events visible to attendee
- [ ] Booking/reservation succeeds
- [ ] QR retrieval/check-in artifact works

## Step 5 - Demo readiness
- [ ] Seed data refresh
- [ ] End-to-end smoke test pass
- [ ] Final demo script and backup plan

## 4) Prompt Pack
Use these prompts exactly with a coding assistant.

## Prompt A - Stability pass
You are my senior full-stack engineer for this repository. Perform a stability pass for organizer, vendor, and attendee core flows. Remove auth/session regressions and route inconsistencies that can cause intermittent 401 errors. Validate each fix by running targeted endpoint checks and return changed files plus proof of pass/fail.

## Prompt B - Organizer completion
Implement and verify organizer end-to-end flow: proposal approval to event creation to event management visibility. Use existing backend routes first; patch only minimal missing logic. Return acceptance-test results and any remaining blockers.

## Prompt C - Vendor completion
Implement and verify vendor end-to-end flow: verification to marketplace request visibility to negotiation/contract progression. Ensure frontend and backend states are synchronized and visible in UI.

## Prompt D - Attendee booking and QR completion
Implement and verify attendee flow: discover published/open events, create booking, and retrieve booking QR artifact. Return endpoint list used, UI paths validated, and final smoke-test results.

## Prompt E - Demo hardening
Prepare deterministic demo data and a presentation runbook. Keep only presentation-safe mocks where required, but prefer real auth and real database behavior. Output a role-by-role 10-minute demo script and fallback actions.

## 5) Endpoint and UI Verification Matrix

## Organizer
1. Auth and profile
- GET /api/v1/users/me

2. Proposals and event creation
- GET /api/v1/proposals
- GET /api/v1/proposals/{id}
- POST /api/v1/events/from-proposal/{proposal_id}
- GET /api/v1/events

## Vendor
1. Verification and dashboard
- GET /api/v1/vendors/verification/status

2. Marketplace and negotiation
- GET /api/v1/requests
- GET /api/v1/requests/{id}
- GET /api/v1/contracts
- GET /api/v1/contracts/{id}

## Attendee
1. Event discovery
- GET /api/v1/events
- GET /api/v1/events/{id}

2. Booking and QR
- POST /api/v1/events/{event_id}/bookings
- GET /api/v1/events/{event_id}/bookings/{booking_id}/qr-code

## 6) Presentation Runbook (10 Minutes)

1. Minute 1-2: Organizer login and approved proposal to event creation
2. Minute 3-5: Organizer confirms event visibility and basic management state
3. Minute 6-7: Vendor login, request visibility, negotiation update, contract view
4. Minute 8-9: Attendee discovers event, books seat, QR shown
5. Minute 10: Summary of integrated role handoff (organizer -> vendor -> attendee)

Backup if any step fails:

1. Re-login affected role and rerun users/me
2. Refresh seeded demo data state
3. Continue from next prepared step with known-good record IDs

## 7) Final Delivery Output Template
At the end of implementation, produce:

1. Roadmap status
- Completed
- In progress
- Deferred

2. Prompt execution summary
- Which prompt was run
- What changed
- Validation result

3. Execution order completed
- Step-by-step status

4. Known issues and mitigations
- Blocker
- Impact
- Workaround

5. Demo readiness verdict
- Go / No-go
- Conditions to go
