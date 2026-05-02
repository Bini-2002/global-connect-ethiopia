# Global Connect Ethiopia - End-to-End System Testing Guide (GC Project)

> **Important Note:** This is the final evaluation phase of the Global Connect (GC) project. It is crucial to take this seriously, ensure all edge cases are tested, and report any UI/UX or functional bugs before Monday. 
> 
> The testing is split sequentially. **Samri** must complete Phase 1 by **Tomorrow Night** because **Mafi's** testing (Phase 2, due **Sunday Night**) depends entirely on the live data and events Samri creates.

---

## Shared Credentials Strategy

Since Mafi needs to continue working on Samri's created data, you must establish shared accounts. 

**Recommendation:**
- **Organizer Email:** (Samri, use your real email address so you can receive the OTP for verification)
- **Organizer Password:** `SamriGC2026!`
- **Vendor Email:** (Mafi, use your real email address so you can test vendor notifications/roles)
- **Vendor Password:** `MafiGC2026!`
- **Government Roles:** You will need to create or log in to government accounts to approve the event. You can use fake emails for these if the system allows government roles to bypass OTP (e.g., `ministry@gc.com`, `municipal@gc.com`, `police@gc.com` with password `GovPass2026!`).

*Make sure to communicate the exact Organizer email and password to Mafi once Phase 1 is done.*

---

## PART 1: Samri's Tasks (Deadline: Tomorrow Night)

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

---

## PART 2: Mafi's Tasks (Deadline: Sunday Night)

### The Core Logic (Real-Life Example)
Now that Samri got the event legally approved, it's time to do the actual heavy lifting.
1. **Venue Reservation:** You need a physical place for the conference. You search for a venue, ask to book it, the owner accepts, and you confirm. 
2. **Marketplace Contracts:** You need food for 500 people. You post an "Opportunity" on the marketplace. Catering companies submit bids with their prices. You pick the best one and sign a contract.
3. **AI Scheduling & Chatbot:** Planning 3 days of speakers is exhausting, so you ask the AI to generate a draft schedule. Later, you forget if you need a specific permit for drones, so you ask the AI Chatbot.

### What to Test Deeply & Expected Outputs
- **Handshake Logic (Venue & Contracts):** Two users are interacting. You must test the back-and-forth communication. When the Organizer requests a venue, the Vendor's dashboard MUST update to show a pending request. (Expected Output: Contract/Venue status changes to `Confirmed` and reflects on both screens).
- **AI Integration Stability:** The AI should take parameters (Duration, Type) and return structured sessions. The chatbot should return answers with actual **citations** (references to Ethiopian law/rules).
- **AI Fallbacks:** If the AI is down or doesn't know the answer, it should gracefully offer a link to the `/faq` page.

### Step-by-Step Follow Up
- [ ] **Step 1:** Go to `/register`. Register a **Vendor** account using your real email.
- [ ] **Step 2:** Log into the Vendor dashboard. Go to `Venue Listings` and create a new venue (e.g., "Millennium Hall"). Set the capacity and deposit price.
- [ ] **Step 3:** Open an Incognito Window (or different browser) and log in using **Samri's Organizer account**. 
- [ ] **Step 4:** In the Organizer account, go to the Event Workspace -> `Venue` tab. Search for "Millennium Hall" and click **Request Booking**.
- [ ] **Step 5:** Back in the Vendor browser, go to `Requests`, review Samri's request, and click **Accept**.
- [ ] **Step 6:** Back in the Organizer browser, click **Confirm Reservation**. Verify the status says Confirmed.
- [ ] **Step 7 (Marketplace):** In the Organizer browser, go to `Opportunities` and post a request for "Catering Services". 
- [ ] **Step 8:** In the Vendor browser, browse opportunities, find the catering request, and submit a bid with a price.
- [ ] **Step 9:** In the Organizer browser, review the bid and click **Award Contract**. Check the `Contracts` tab to ensure it's generated.
- [ ] **Step 10 (AI):** In the Organizer browser, navigate to the `Schedule` tab inside the Event Workspace. Enter details (e.g., Tech Conference, 2 days, 09:00 start) and click **Generate AI Draft**. Click **Apply to Calendar** and verify the timeline populates.
- [ ] **Step 11 (Chatbot):** Open the floating Chatbot in the corner. Ask: *"Do I need a police permit for an event with 500 people?"*. Verify it answers with citations.
- [ ] **Step 12:** Click a fallback link in the chatbot or navigate to `/faq` directly to ensure the static fallback page works perfectly.

> **Handover:** Report all findings, UI glitches, or broken logic to the group chat by Sunday night so the final fixes can begin on Monday!
