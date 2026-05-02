# Global Connect Ethiopia - Testing Guide (Mafi's Phase)

> **Important Note:** This is the final evaluation phase of the Global Connect (GC) project. It is crucial to take this seriously, ensure all edge cases are tested, and report any UI/UX or functional bugs before Monday. 
> 
> **Your Deadline:** Sunday Night. You will be building upon the live data and events that Samri created in Phase 1.

## Your Credentials Strategy
You will need your own Vendor account, plus access to Samri's Organizer account.
- **Vendor Email:** (Use your real email address so you can test vendor notifications/roles)
- **Vendor Password:** `MafiGC2026!`
- **Organizer Login:** Ask Samri for the exact email and password she used for the Organizer account.

## Your Tasks: Phase 2

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
