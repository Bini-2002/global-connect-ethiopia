# End-to-End Testing Plan: ADDIS NETWORK SYMPOSIUM

This document outlines a structured, two-part testing plan to fully evaluate the Global Connect Ethiopia platform before deployment. The test focuses on a massive, complex event—the **Addis Network Symposium**—to verify all core features, including the newly added mock Chapa integration and the 10% platform transaction fee tracking.

---

## Part 1: Samri's Tasks (The Setup & Vendor Side)

**Objective:** Set up the event, approve the necessary vendors, and submit quotes.

### 1. Vendor & Venue Setup (Vendor Role)
- **Action:** Register as a Vendor (e.g., "Samri Catering & Venues"). Complete the multi-step verification.
- **Action:** Go to the Venue Listings page. Create a listing for "Millennium Hall" (Set category to Venue) with a deposit amount of 50,000 ETB.
- **Action:** Add services like "Premium Catering" and "A/V Equipment" to your vendor catalog.

### 2. Admin Approval (Admin Role)
- **Action:** Log in as an Admin.
- **Action:** Go to the Vendors approval tab and **approve** Samri's vendor profile.

### 3. Event Creation (Organizer Role)
- **Action:** Register an Organizer account (e.g., "Addis Events Co.").
- **Action:** Submit an event proposal for **Addis Network Symposium**.
  - **Details:** 5,000 attendees, duration 3 days, high profile networking event.
- **Action:** Wait for Ministry and Municipal approval (Admin/Ministry role must approve).
- **Action:** Once approved, convert the proposal into a live Event.

### 4. Bidding on Opportunities (Vendor Role)
- **Action:** Log back in as the Vendor.
- **Action:** The Organizer will have created an Opportunity for "Catering for 5,000 people". Submit a proposal/quote for this opportunity (e.g., 500,000 ETB).

---

## Part 2: Your Tasks (The Execution, Team & Finance Side)

**Objective:** Manage contracts, execute Chapa deposits/withdrawals, manage team tasks, and verify the 10% admin commission cuts.

### 1. Contract & Escrow (Organizer Role)
- **Action:** Log in as the Organizer ("Addis Events Co.").
- **Action:** Go to the Wallet tab. Click **"Top Up via Chapa"** and deposit 1,000,000 ETB. 
  - *Verify:* The new Mock Chapa Popup should appear. Confirm the transaction and verify your wallet balance updates.
- **Action:** Go to Marketplace Opportunities. Accept Samri's 500,000 ETB catering quote. This auto-generates a contract.
- **Action:** Sign the contract and **Fund the Escrow** from your newly topped-up wallet.
  - *Verify:* Your available balance should decrease, and the locked balance should increase.

### 2. Team Member Tasks (Organizer & Team Role)
- **Action:** Go to the Event Dashboard -> Team tab. Invite a team member (yourself with a different email).
- **Action:** Log in as the Team Member. You will automatically be added to the event.
- **Action:** The Organizer assigns you a task: "Setup VIP Lounge" with a payout of 5,000 ETB.
- **Action:** As the Team Member, mark the task as `in_progress`, then `pending_approval`.
- **Action:** As the Organizer, approve the task.
- **Action:** As the Team Member, go to your Team Dashboard Wallet, click **"Withdraw Funds"**.
  - *Verify:* The Chapa Mock Popup should appear. Confirm withdrawal and verify funds are deducted.

### 3. Contract Completion & Vendor Withdrawal (Vendor Role)
- **Action:** As the Organizer, mark the Catering contract as **Completed**.
  - *Note:* This triggers the 10% platform commission logic.
- **Action:** Log in as the Vendor (Samri).
- **Action:** Go to the Vendor Wallet. You should see 450,000 ETB in available balance (500,000 - 10% platform fee).
- **Action:** Click **"Request Withdrawal"**.
  - *Verify:* The Chapa Mock Popup should appear. Confirm the withdrawal and verify the balance updates and the withdrawal appears in the history table.

### 4. Admin Commission Verification (Admin Role)
- **Action:** Log in as Admin.
- **Action:** Go to the **Admin Analytics** page.
- **Action:** Scroll down to the **Platform Fee Receipts** table.
  - *Verify:* You should see a new row for the "Addis Network Symposium" catering contract. The table should show the 500,000 ETB contract amount, the 50,000 ETB (10% cut) commission received, and the transaction ID.

---

## Expected Errors & Troubleshooting Guide

During testing, you may encounter edge cases. Here's how to fix them:

**1. "Insufficient Funds" when funding Escrow**
- *Cause:* You accepted a contract but haven't deposited enough money into the Organizer Wallet.
- *Fix:* Go to the Organizer Wallet and use the "Top Up via Chapa" button to simulate a deposit. Ensure you deposit enough to cover the full contract amount.

**2. "Contract not signed by both parties"**
- *Cause:* You are trying to fund the escrow, but the vendor hasn't digitally signed the contract yet.
- *Fix:* Ensure Samri logs in, goes to her `Vendor -> Contracts` page, and clicks "Sign Contract". Both organizer and vendor must sign before escrow can be funded.

**3. Tasks not appearing in the Team Dashboard**
- *Cause:* The team member was invited but hasn't logged out and logged back in, or the task wasn't assigned to their specific user ID.
- *Fix:* Re-login as the team member. Check the Event Task assignment dropdown as the Organizer to ensure the correct team member is selected.

**4. Admin Analytics Table shows empty or missing 10% cut**
- *Cause:* The organizer didn't explicitly click "Mark as Completed" on the contract. The 10% cut is *only* taken and sent to the admin when the contract is officially completed and funds are released from escrow.
- *Fix:* Go to the Organizer Contract dashboard, view the active contract, and click the "Mark Completed" button.

**5. Chapa Mock Popup not closing**
- *Cause:* The network simulation timer takes ~2.5 seconds. If you click away or refresh during this time, state might get stuck.
- *Fix:* Simply wait 3 seconds for the green checkmark and auto-redirect. If stuck, refresh the page. Your balance is updated safely via the backend regardless of UI state.
