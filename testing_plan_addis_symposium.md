# Master End-to-End Testing Roadmap: ADDIS NETWORK SYMPOSIUM

This document outlines a massive, comprehensive end-to-end testing protocol for the Global Connect Ethiopia platform. This roadmap is designed to stress-test every major module, interaction, and API endpoint by simulating a full-scale, high-profile event: the **Addis Network Symposium**. 

This plan is divided into two distinct phases for two developers to execute sequentially.

---

## PART 1: The Setup, Approvals & Vendor Ecosystem (Samri)

**Primary Goals:** Platform setup, rigorous government approval flows, vendor registration, and initial catalog creation.

### 1. Vendor Onboarding & Profile Creation
- [ ] **Action:** Register a new user as a **Vendor** ("Samri's Logistics & Hospitality"). Verify the email via the OTP flow.
- [ ] **Action:** Complete the 3-step Vendor Verification process (uploading sample business documents for OCR processing).
- [ ] **Action:** Wait for Admin approval (Admin must approve from the `/admin/vendors` dashboard).
- [ ] **Action:** Add services to the marketplace catalog (e.g., "Premium Event Catering", "A/V Equipment", and "Stage Setup").
- [ ] **Action:** Navigate to **Venue Listings**. Create a listing for **"Millennium Hall"** (Category: Venue).
- [ ] **Action:** Create a second listing for **"Symposium VIP Hotel"** (Category: Hotel). This tests the hotel reservation capabilities.

### 2. Event Proposal & Government Approvals
- [ ] **Action:** Register a new user as an **Organizer** ("Addis Events Co.").
- [ ] **Action:** Submit an event proposal for the **"Addis Network Symposium"**. Add details: 5,000 capacity, 3-day duration, VIP requirements. Upload a sample proposal PDF.
- [ ] **Action (Ministry):** Log in as `ministry@admin.com`. Review the proposal, set status to `In Review`, and ultimately **Approve** it.
- [ ] **Action (Municipal):** Log in as `municipal@admin.com`. Approve the location logic and generate the system **Permit**.
- [ ] **Action (Police):** Log in as `police@admin.com`. Go to the Police Portal, review the event details, and click **Acknowledge** to complete security clearance.

### 3. Event Creation & Configuration
- [ ] **Action:** Back as the Organizer, convert the approved proposal into an active **Event**.
- [ ] **Action:** Navigate to the **Schedule Tab**. Use the **AI Scheduler** to auto-generate a 3-day itinerary based on the event description. Apply the drafted AI schedule to the live event.

### 4. Marketplace Interaction: Opportunities & Bidding
- [ ] **Action:** The Organizer needs catering. Use the **AI Vendor Recommendation** engine on the Vendors tab to find matches.
- [ ] **Action:** Create an **Opportunity** broadcast for "Catering for 5,000 attendees".
- [ ] **Action:** Switch to the Vendor account ("Samri's Logistics"). Navigate to the **Opportunities** tab and submit a **Proposal/Quote** for 500,000 ETB.

---

## PART 2: Execution, Operations, AI & Finance

**Primary Goals:** Contract lifecycles, team management, booking logic, financial escrow flows, AI interactions, and post-event analytics.

### 1. Contract Signing & Escrow Funding
- [ ] **Action:** Log in as the Organizer. Review Samri's Catering Quote and click **Accept**. This generates a smart contract.
- [ ] **Action:** Click **Sign Contract**.
- [ ] **Action:** Log in as the Vendor, go to the Contracts dashboard, and **Sign Contract**.
- [ ] **Action:** Log back in as the Organizer. Navigate to the **Wallet**. Click **Top Up via Chapa**. Use the Mock Popup to deposit 1,500,000 ETB.
- [ ] **Action:** Return to the signed contract and click **Fund Escrow**. Verify the 500,000 ETB moves from your Available Balance to your Locked Escrow Balance.()

### 2. Team Management & Task Delegation
- [ ] **Action:** As the Organizer, go to the **Team** tab. Invite a new email as a Team Member.
- [ ] **Action:** Create an account for the invited Team Member. They should automatically see the Symposium in their Team Portal.
- [ ] **Action:** The Organizer assigns a task: "Setup VIP Lounge" with a payout of 5,000 ETB.
- [ ] **Action:** Team Member logs in, moves the task to **In Progress**, then **Submit for Approval**.
- [ ] **Action:** Organizer approves the task. 
- [ ] **Action:** Team Member goes to their wallet, requests a withdrawal of 5,000 ETB using the **Mock Chapa Popup**.

### 3. Attendee Registration & Hotel Reservations
- [ ] **Action:** As the Organizer, use the attendee registration section to add a VIP attendee record (e.g., "Abebe Kebede"). This should create the attendee profile without relying on ticket inventory.
- [ ] **Action (Hotel Booking):** Navigate to the **Hotel Reservations** tab. Book a VIP room at the "Symposium VIP Hotel" (created by Samri in Part 1) for your VIP guest.
- [ ] **Action (Badges):** Generate a QR Check-in badge for Abebe Kebede. (the QR may not display or download in all environments)

### 4. Event Operations: Announcements & Notifications
- [ ] **Action:** As the Organizer, go to the **Announcements** tab. Create an urgent broadcast: "Keynote moved to Main Hall".
- [ ] **Action:** Log in as the Team Member (and check the Attendee profile if testing email delivery). Check the **In-App Notifications** bell icon. Mark the notification as Read.


(we can't create announcement from team members
- no notification bell icon on the team member)


### 5. AI Chatbot Testing
- [ ] **Action:** Navigate to the global Chatbot UI (bottom right or `/faq` page). 
- [ ] **Action:** Ask the bot: "What are the licensing rules for hosting a 5,000 person event?" Ensure the Gemini API accurately retrieves knowledge based on the Ministry/Municipal workflows.

### 6. Contract Completion & Vendor Payouts
- [ ] **Action:** As the Organizer, mark the Catering Contract as **Completed**. This releases the escrow.
- [ ] **Action:** Log in as the Vendor. Check your Wallet. Verify that you received the funds minus the 10% platform transaction fee (should receive 450,000 ETB).
- [ ] **Action:** Initiate a **Withdrawal** from the Vendor Wallet using the Mock Chapa Popup.

### 7. Event Postponement & Cancellation
- [ ] **Action (Postpone):** As the Organizer, navigate to the **Event Overview** page. Click the **Postpone** button and set new future dates. Verify that an automated postponement announcement is queued for the registered VIP attendee.
- [ ] **Action (Cancel):** Back on the **Event Overview** page, click **Cancel Event**, provide a reason, and submit. Verify that the event status updates to `CANCELLED` and any active venue reservations are automatically released.

(- send postpone and cancel emails please : closed and open event as catch the event type form the backend)

### 8. Global Analytics & Admin Receipts
- [ ] **Action (Organizer Analytics):** As the Organizer, go to the Event Analytics dashboard. Verify the revenue charts show escrow locks, vendor payments, and team payouts accurately.
- [ ] **Action (Admin Analytics):** Log in as the Admin. Navigate to **Admin Analytics**. Verify the global revenue metrics.
- [ ] **Action (Platform Fees):** Scroll to the **Platform Fee Receipts** table. Confirm the exact 10% cut (50,000 ETB) from the catering contract is logged with its timestamp and transaction ID.

---

## 🛠️ Expected Errors & Resolution Guide

| Module | Potential Issue | How to Fix |
|--------|-----------------|------------|
| **Escrow/Contracts** | "Cannot fund escrow - insufficient funds" | Ensure the Organizer Wallet has been topped up using the Chapa Mock feature before funding. |
| **Escrow/Contracts** | "Contract requires both signatures" | Both the Organizer and Vendor must explicitly click "Sign Contract" from their respective dashboards. |
| **Team Workflow** | "Team member cannot see tasks" | Ensure the team member registered with the EXACT email used for the invitation, and that the Organizer specifically assigned the task to them in the dropdown. |
| **Analytics** | Admin receipt table is empty | The 10% fee is strictly triggered when a contract is marked **Completed**. Merely funding it is not enough. The Organizer must finalize it. |
| **AI Features** | "Failed to generate schedule / recommendations" | Check Render logs. Gemini API requests might time out on free tier. If it fails, click "Retry". |
| **Notifications** | Socket connection failed / Notification not appearing | Refresh the page. The app falls back to polling `/api/v1/notifications` every 30 seconds if real-time sockets fail. |
| **Mock Chapa** | Modal hangs on loading spinner | The mock simulates a 2.5s network delay. Do not click outside the modal until the green success checkmark appears and auto-closes. |
| **Event Status** | "Event is already cancelled" or "Cannot postpone" HTTP 400 Error | State transitions are one-way. You cannot postpone or cancel an event that is already cancelled or archived. If you hit a dead-end during testing, use the **Clone Event** button to spin up a fresh copy of the event. |

---

## Google Meet Demo Script — 3 Person Showcase (12–15 minutes)

Purpose: A tight, scripted walkthrough to showcase organizer flows, team workflows with submit-for-approval, escrow/payout, and AI-assisted scheduling. Use this runbook for a live demo to stakeholders.

Roles:
- Presenter A (Organizer) — leads the product tour and runs the Organizer flows (Event/Proposal → Schedule → Opportunities → Contracts). Host responsibilities: start Meet, share primary browser tab.
- Presenter B (Team Member / Vendor) — demonstrates team tasks, submits work for approval, and as Vendor places a bid and signs contract. Joins with camera on for short interactions.
- Presenter C (Moderator / QA) — observes, shares terminal if needed, reads verification items, asks questions, and handles fallback steps.

Pre-demo checklist (run before join):
- Start backend: `cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000`.
- Start frontend: `cd frontend && npm install && npm run dev` (ensure port 3000). If build errors, open the terminal and paste the error for Presenter C to handle.
- Seed demo data: run any provided seed scripts (e.g., `python scripts/seed_demo_vendors.py`) if needed.
- Have three browser windows/tabs ready and logged in as Organizer, Team Member, and Vendor. Use test accounts noted in the plan.

URLs to keep handy (local):
- Organizer create proposal: http://localhost:3000/organizer/proposals/create
- Organizer opportunities: http://localhost:3000/organizer/opportunities/create
- Event schedule (example): http://localhost:3000/organizer/events/{eventId}/schedule
- Event tasks: http://localhost:3000/organizer/events/{eventId}/tasks
- VIP hotel reservations: http://localhost:3000/organizer/events/{eventId}/vip

Timed script (12–15 minutes):
- 0:00 — 0:45 — (Presenter C) Quick intro and agenda. Confirm all three presenters are visible. Presenter A shares browser tab.
- 0:45 — 2:30 — (Presenter A) Open the approved proposal and click "Create Event". Show the event overview page and the AI Scheduler option. Note: if redirected, open `/organizer/proposals/create` directly.
- 2:30 — 4:00 — (Presenter A) Run AI Scheduler to generate a 3-day itinerary and apply draft. Show one generated session and explain how times and rooms are populated.
- 4:00 — 5:30 — (Presenter A) Open Opportunities → Create Opportunity (submission_deadline + event_date). Explain validation (no past dates). Create a catering opportunity.
- 5:30 — 7:00 — (Presenter B as Vendor) Switch to Vendor tab, find the opportunity, and submit a quote. Show contract creation workflow.
- 7:00 — 8:00 — (Presenter A) Accept the vendor quote and click Sign Contract. Show the Wallet top-up step briefly (mock Chapa). Presenter C can show the terminal logs if payment mock needs verification.
- 8:00 — 9:30 — (Presenter A) Fund Escrow (show balances: Available vs Locked). Explain the escrow and how it appears on the contract.
- 9:30 — 10:30 — (Presenter A) Invite a Team Member, assign a task with a payout and a due_date (use a future date). Presenter B (Team Member) picks task, moves to In Progress, and clicks Submit for Approval.
- 10:30 — 11:30 — (Presenter A) Approve task and (if payout configured) Approve & Pay — demonstrate payout flow. Verify Vendor/Team Member wallet credited.
- 11:30 — 12:30 — (Presenter B/Presenter C) Quick smoke test: VIP hotel reservation flow (book a room), show booking confirmation.
- 12:30 — 13:30 — (Presenter C) Q&A, highlight what to test next and fallback steps if something fails.

Presenter tips and cues:
- When sharing the browser, hide any unrelated tabs with sensitive info. Use a clean profile or incognito session for clarity.
- Keep terminal ready to show backend logs if an API error occurs — this reassures technical audiences.
- If AI features time out, skip to a saved schedule or use the pre-seeded schedule in the event.

Fallback steps (quick recovery):
- If frontend fails to load: refresh, then run `npm run dev` in `frontend` and share the terminal output. Presenter C should paste the first error into the Meet chat.
- If wallet funding simulation fails: explain the mock behavior and manually adjust demo balances with `scripts/seed_demo_vendors.py` or by calling the internal test API endpoint (Presenter C).
- If a date validation blocks a necessary demo action, explain that validation is intentional, change the date to a valid future date, and proceed.

Verification checklist (post-demo):
- Event shows correct AI-scheduled sessions.
- Opportunity created and vendor quote appears with a generated contract.
- Escrow locked and then released appropriately after contract completion.
- Team member task lifecycle: Assigned → In Progress → Submitted → Approved → Payout received.

Recording & assets:
- Record the Meet session (if allowed) and save the recording link in the project notes.
- Attach key screenshots: event overview, schedule, escrow funding, approved task, and wallet receipts.

---

If you'd like, I can also:
- Generate a printable one-page speaker cue card for each presenter.
- Create a small demo checklist script that runs the seed commands and prints the three test accounts and passwords.
