# Global Connect Ethiopia - Testing Guide (Samri's Phase)

> **Important Note:** This is the final evaluation phase of the Global Connect (GC) project. It is crucial to take this seriously, ensure all edge cases are tested, and report any UI/UX or functional bugs before Monday. 
> 
> **Your Deadline:** Tomorrow Night. Your testing sets up the foundational data that Mafi needs to continue his phase on Sunday.

## Your Credentials Strategy
- **Organizer Email:** (Use your real email address so you can receive the OTP for verification)
- **Organizer Password:** `SamriGC2026!`
- **Government Roles:** You will need to create or log in to government accounts to approve the event. You can use fake emails for these if the system allows government roles to bypass OTP (e.g., `ministry@gc.com`, `municipal@gc.com`, `police@gc.com` with password `GovPass2026!`).

*Make sure to communicate your exact Organizer email and password to Mafi once your phase is done.*

## Your Tasks: Phase 1

### The Core Logic (Real-Life Example)
Imagine you are an event promoter trying to host a massive Tech Conference in Addis Ababa. 
1. **Authentication:** First, you have to register your company and verify your identity via email. 
2. **Approvals:** You can't just host 5,000 people legally without permission. You submit a detailed "Proposal" to the Ministry. The Ministry reviews it and says "Yes". Then the City Municipality reviews it and says "Yes". The Police are notified to prepare security. 
3. **Workspace:** Once legally approved, you get the "Keys" to your event workspace where you start setting up your budget, team members, and the public ticket booking page.

### What to Test Deeply & Expected Outputs
- **OTP Delivery:** Does the email arrive? Does entering the wrong OTP gracefully show an error? (Expected Output: Successful redirection to Organizer Dashboard upon correct OTP).
- **Multi-Authority Pipeline:** Test the state change of a proposal. It should go from `Draft` -> `Pending` -> `Ministry Approved` -> `Fully Approved`. (Expected Output: A "Permit Number" is generated and the proposal converts into a live `Event Workspace`).
- **Workspace Settings:** Test if adding a budget calculates correctly, and if creating a booking link works.

### Step-by-Step Follow Up
- [ ] **Step 1:** Go to `/register`. Register an Organizer account using your real email.
- [ ] **Step 2:** Check your inbox, get the OTP, go to `/verify-email`, and log in.
- [ ] **Step 3:** Navigate to "Proposals" and create a new event proposal (e.g., "Addis Tech Summit 2026"). Submit it.
- [ ] **Step 4:** Log out. Register/Login as a `Ministry` user. Find the proposal in the queue, add a review note, and click **Approve**.
- [ ] **Step 5:** Log out. Register/Login as a `Municipal` user. Find the proposal and click **Approve**.
- [ ] **Step 6:** Log out. Register/Login as a `Police` user. Verify that the event is listed in the security dashboard.
- [ ] **Step 7:** Log back in as the Organizer. See that your proposal is approved. Click **Open Event Workspace**.
- [ ] **Step 8:** Inside the workspace, go to the `Team` tab and invite Mafi's email.
- [ ] **Step 9:** Go to the `Budget` tab and add 2 estimated expenses.
- [ ] **Step 10:** Go to the `Booking` tab, configure tickets, and "Publish" the event.

> **Handover:** Text Mafi and say "The Addis Tech Summit is approved and published. You can now log in and take over!" Provide Mafi with your Organizer credentials.
