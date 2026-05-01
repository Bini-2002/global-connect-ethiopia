# Global Connect Ethiopia - End-to-End System Test Plan

This document breaks down the entire developed system into testable components across Phase 1 and Phase 2. It is designed to help you verify all functionalities from start to end over your 3-day finalization period.

---

## Phase 1: Core Event Lifecycle & Multi-Authority Approvals

### 1. Authentication & Role Management
**Functionalities:**
- [ ] Organizer registration and login.
- [ ] OTP-based email verification for Organizers.
- [ ] Direct login for Government Roles (Ministry, Municipal, Police) without email verification.
- [ ] Admin login and dashboard routing.
- [ ] Vendor registration and login.

**Expected Errors / Edge Cases:**
- `401 Unauthorized`: Entering incorrect passwords or expired tokens.
- `400 Bad Request`: Organizer attempting to log in before verifying OTP.
- `422 Unprocessable Entity`: Using a standard organizer endpoint for a ministry role (Role mismatch).

### 2. Proposal Submission & Approval Pipeline
**Functionalities:**
- [ ] **Organizer**: Create a new event proposal and upload supporting documents.
- [ ] **Ministry**: View pending proposals in the queue, review documents, and 'Approve' or 'Reject' with feedback notes.
- [ ] **Municipal**: View ministry-approved proposals, add their approval.
- [ ] **Police**: Receive automated notifications for approved events to handle security assignments.
- [ ] **Organizer**: View the status of their proposal changing from `Draft` -> `Pending` -> `Approved`.
- [ ] **Event Conversion**: Once fully approved, the proposal successfully generates a live `Event Workspace` with a permit number.

**Expected Errors / Edge Cases:**
- Uploading unsupported document formats for permits.
- A lower-tier authority (e.g., Municipal) trying to approve before the Ministry.

### 3. Event Workspace & Operations
**Functionalities:**
- [ ] **Overview**: View event details, visibility status, and progress metrics.
- [ ] **Budget**: Add budget items, compare estimated costs vs. actual costs.
- [ ] **Schedule (Manual)**: Add sessions manually with start/end times and locations.
- [ ] **Team Setup**: Invite team members via email, assign them roles, and accept invitations.
- [ ] **Tasks Tracker**: Create, assign, and update statuses of operational tasks.
- [ ] **Booking Settings**: Configure public booking links, capacities, and required fields.
- [ ] **Ticketing & QR Codes**: Register an attendee and verify that a QR code pass is generated.
- [ ] **Operations (Check-In & Incidents)**:
  - [ ] Scan/simulate QR check-in to update attendee status.
  - [ ] Log an incident (e.g., Medical, Security) with a severity level.
- [ ] **Announcements**: Draft and send in-app or email announcements to attendees.
- [ ] **Wrap-Up**: Complete final event reports and view post-event feedback surveys.

**Expected Errors / Edge Cases:**
- `Capacity Exceeded`: Attempting to book a ticket when `remaining_slots` is 0.
- Scheduling a session that ends before it starts.
- Attempting to check-in an invalid or already used QR code.

---

## Phase 2: Marketplace, Venue Reservations & AI

### 4. Venue Reservation Handshake
**Functionalities:**
- [ ] **Vendor**: Create and manage venue listings (capacity, location, deposit required).
- [ ] **Organizer**: Search for venues in the designated city and initiate a reservation request.
- [ ] **Vendor**: Review the incoming request, either `Accept` or `Offer Alternative` (dates/pricing).
- [ ] **Organizer**: Review the vendor's response and officially `Confirm` the reservation.
- [ ] **System**: Track the payment milestone (e.g., `deposit_pending` -> `deposit_funded`).

**Expected Errors / Edge Cases:**
- Requesting dates that conflict with an already confirmed booking.
- Missing confirmation notes when completing the handshake.

### 5. Marketplace Opportunities & Contracts
**Functionalities:**
- [ ] **Organizer**: Post an open Opportunity (e.g., looking for Catering for 500 people).
- [ ] **Vendor**: Browse active opportunities and submit a bid/proposal with a price estimate.
- [ ] **Organizer**: Review incoming vendor bids, select a winner, and generate a Contract.
- [ ] **Vendor/Organizer**: Track contract status and basic wallet/transaction workflows for milestone payouts.

**Expected Errors / Edge Cases:**
- Vendor bidding on an opportunity that is past its deadline or already closed.

### 6. Artificial Intelligence Integrations
**Functionalities:**
- [ ] **Schedule AI Assistant**:
  - [ ] Navigate to the Schedule tab in the Event Workspace.
  - [ ] Input parameters (Event Type, Duration, Start Time) and generate an AI schedule draft.
  - [ ] Review the drafted items, make manual edits if necessary.
  - [ ] Click "Apply to Calendar" and verify items are committed to the live schedule.
- [ ] **Licensing & Regulations Chatbot**:
  - [ ] Open the floating Chatbot in the corner of the Organizer dashboard.
  - [ ] Ask a regulatory question (e.g., "Do I need a permit for 200 people?").
  - [ ] Verify the bot returns an answer with citations from the backend regulatory rules.
  - [ ] Test a fallback trigger (e.g., asking an unsupported question to trigger a `mailto` or `FAQ` link).
- [ ] **AI Fallback Pages**:
  - [ ] Navigate to `/faq` and ensure static fallback questions render properly for offline modes.
- [ ] **Mock Mode**:
  - [ ] Toggle AI mock mode via API endpoints to test offline demonstration stability.

**Expected Errors / Edge Cases:**
- Gemini API timeout or API Key invalid: The system should cleanly gracefully degrade and offer the `fallback_action` to visit the FAQ or contact the Ministry.

---

## Testing Strategy for the Next 3 Days

1. **Day 1 (Friday): The Happy Path (Phase 1)**
   - Register an Organizer -> Submit Proposal -> Login as Ministry/Municipal to Approve -> Open Event Workspace.
   - Run through the basic workspace tools (Add a budget, invite a team member, set up a manual schedule).

2. **Day 2 (Saturday): Advanced Operations & Phase 2 Setup**
   - Register a Vendor -> Add a Venue Listing.
   - Go back to Organizer -> Search Venue -> Complete the Reservation Handshake.
   - Test Bookings (Simulate an attendee registering) and Operations (Scan check-in, log an incident).

3. **Day 3 (Sunday): AI, Edge Cases & Wrap Up**
   - Test the AI Schedule Draft generation and applying it to the calendar.
   - Chat with the Licensing Bot.
   - Intentionally trigger errors (wrong passwords, overbooking capacity, invalid flow steps) to ensure the UI handles them gracefully.

---

## Detailed Test Cases

### Test Case 1: Phase 1 - Authentication & Role Management
**Objective:** Verify that all users can authenticate based on their specific flows.
**Steps:**
1. Navigate to `/register/organizer`. Fill out the form and submit.
2. Check the local email logs (or UI mockup) for the OTP.
3. Navigate to `/verify-email` and input the OTP. Verify successful redirection to the organizer dashboard.
4. Log out.
5. Navigate to `/login/ministry` (or use the main login with a Ministry role). Login without OTP and verify successful dashboard access.
6. Attempt to use an Organizer credential on the Ministry login page and ensure a `401 Unauthorized` or `422 Unprocessable Entity` is returned.

### Test Case 2: Phase 1 - Proposal & Approval Pipeline
**Objective:** Verify the multi-authority approval pipeline creates a live event.
**Steps:**
1. As an Organizer, go to `Proposals` and click `Create Proposal`. Fill details and submit.
2. Log out and log in as `Ministry`. Go to the review queue.
3. Open the pending proposal, add a review note, and click `Approve`.
4. Log out and log in as `Municipal`. Find the ministry-approved proposal and `Approve` it.
5. Log out and log in as `Police`. Verify the approved event appears in the security dashboard.
6. Log in as `Organizer`. Verify the proposal status is `Approved` and click `Open Event Workspace`.

### Test Case 3: Phase 1 - Event Workspace & Operations
**Objective:** Verify that organizers can manage their event post-approval.
**Steps:**
1. In the Event Workspace, navigate to the `Team` tab. Invite a new user and assign a role.
2. Navigate to the `Budget` tab. Add an estimated expense and an actual expense.
3. Navigate to the `Tasks` tab. Create a new task and move it from `To Do` to `In Progress`.
4. Navigate to `Booking` and copy the public booking link. Open it in a new window and register as an attendee.
5. In the `Operations` tab, simulate checking in the attendee using their generated QR code string.
6. Still in `Operations`, log a "Medical" incident and ensure it appears in the incident log.

### Test Case 4: Phase 2 - Venue Reservation
**Objective:** Verify the venue handshake between Vendors and Organizers.
**Steps:**
1. Log in as a `Vendor`. Navigate to `Venue Listings` and create a new venue with a set capacity and deposit price.
2. Log in as an `Organizer`. Go to the Event Workspace `Venue` tab and search for the venue. Click `Request Booking`.
3. Switch back to the `Vendor`. Go to `Requests`, review the incoming reservation, and click `Accept`.
4. Switch back to the `Organizer`. Go to the `Venue` tab and click `Confirm Reservation`.

### Test Case 5: Phase 2 - Marketplace Contracts
**Objective:** Verify that organizers can post opportunities and award contracts to vendors.
**Steps:**
1. As an Organizer, go to `Opportunities` and create a request (e.g., Catering).
2. As a Vendor, browse opportunities, find the request, and submit a bid with pricing.
3. As the Organizer, view the incoming bids, select the Vendor's bid, and click `Award Contract`.
4. Navigate to the `Contracts` tab (both Organizer and Vendor) and verify the contract status reflects the agreement.

### Test Case 6: Phase 2 - AI Integrations
**Objective:** Verify all AI features and fallbacks operate correctly.
**Steps:**
1. Navigate to the `Schedule` tab in an Event Workspace. 
2. Enter "Tech Conference", Duration "2", and Start Time "09:00". Click `Generate AI Draft`.
3. Review the returned schedule items in the review box. Click `Apply to Calendar` and verify they populate the timeline as "AI Suggestion".
4. Click `Mark Reviewed` on one of the items.
5. Open the floating `Chatbot` in the corner of the Organizer Dashboard.
6. Ask: "Do I need a police permit for an event with 500 people?". Verify it returns a citation-backed answer.
7. Trigger a mock failure (or ask a completely unrelated question) and click the provided `/faq` link in the chatbot response. Verify the FAQ page loads successfully.
8. Send a POST request to `/api/v1/mock-mode/enable` and verify that the AI endpoints return stable mocked responses.
