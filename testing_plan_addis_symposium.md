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
