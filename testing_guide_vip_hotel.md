# VIP Hotel Reservation Testing & Resilience Guide

This document outlines the testing strategy for the newly integrated VIP Hotel Reservation feature (Phase 4). It covers the standard "Happy Path" as well as specific edge cases, expected system failures, and the solution methods implemented to handle them gracefully.

---

## 1. Prerequisites for Testing
Before beginning the test, ensure the following conditions are met:
1. **Organizer Account:** You are logged in as an Organizer and have created at least one event.
2. **Organizer Wallet:** The Organizer has a wallet balance (e.g., ETB 50,000). You can add funds via the database or the wallet mock endpoint if needed.
3. **Vendor Account:** You have a Vendor account registered with the `business_category` set exactly to `"hotel_accommodation"`, and its `verification_status` is `"approved"`.
4. **Platform Wallet:** The system must have a platform wallet initialized to receive the 10% commission.

---

## 2. Normal Flow (Happy Path)

**Step 1: Organizer Creates Reservation**
- Go to **Organizer Hub -> My Events -> [Select Event] -> VIP**.
- Select the verified Hotel Vendor from the dropdown.
- Fill out Check-in, Check-out dates, and Total Amount (e.g., 10,000).
- Add details for 2 rooms (VIP names, emails, preferences).
- **Submit**. 
- *Expected Result:* The reservation is created with status `pending_hotel_review` and payment status `escrowed`. The `total_amount` is immediately deducted from the organizer's `balance` and added to `locked_balance`.

**Step 2: Hotel Vendor Assigns Rooms**
- Log in as the Hotel Vendor and navigate to **Vendor Portal -> Hotel VIP Rooms**.
- You should see the incoming reservation request.
- Expand the card and assign room numbers (e.g., "412", "501") to the respective VIPs.
- Add an optional response note and **Confirm**.
- *Expected Result:* The reservation status changes to `confirmed`.

**Step 3: Organizer Releases Payment**
- Log back in as the Organizer and return to the event's VIP tab.
- The reservation now shows the assigned room numbers and a **Release Payment** button.
- Click **Release Payment**.
- *Expected Result:* The `locked_balance` is deducted. 90% goes to the Vendor's wallet, and 10% goes to the Platform wallet. The reservation payment status changes to `released`.

**Step 4: Receipt Download**
- Click the **Receipt** button that appears.
- *Expected Result:* A clean HTML receipt downloads containing all transaction details and room assignments.

---

## 3. Expected Failures & Solution Methods

The system is designed to handle errors robustly to protect financial integrity. Here is how to test the failure scenarios:

### Scenario A: Insufficient Wallet Balance (Organizer Side)
* **Test:** Try to book rooms with a `Total Amount` that exceeds your current wallet `balance`.
* **Expected System Failure:** The frontend will block submission, and the backend will return a `400 Bad Request` with the message: `"Insufficient wallet balance. Required: ETB [X], Available: ETB [Y]"`.
* **Solution Method:** The transaction is aborted *before* the reservation document is created. No funds are locked. The organizer must top up their wallet to proceed.

### Scenario B: No Approved Hotel Vendors Available
* **Test:** Ensure there are no approved vendors with the `"hotel_accommodation"` category in the database. Go to the VIP booking page.
* **Expected System Failure:** The vendor selection dropdown will be replaced by a warning message indicating no hotel vendors are available. 
* **Solution Method:** The UI gracefully degrades. The organizer cannot submit the form. An admin must approve a hotel vendor first.

### Scenario C: Partial / Empty Room Assignments (Vendor Side)
* **Test:** As the hotel vendor, open a pending request. Leave the room assignment input blank and click "Confirm Room Assignments".
* **Expected System Failure:** The UI will block the submission and show an error: `"Please enter at least one room number before submitting."`
* **Solution Method:** The vendor is forced to input data. If they somehow bypass the UI, the backend will return a `400 Bad Request` (`"Provide at least one room assignment"`), protecting the `confirmed` status integrity.

### Scenario D: Premature Payment Release Attempt
* **Test:** Through an API client (like Postman) or by modifying the frontend code, try to call the `/release-payment` endpoint while the reservation is still `pending_hotel_review`.
* **Expected System Failure:** The backend returns a `400 Bad Request`: `"Payment can only be released for confirmed reservations"`.
* **Solution Method:** The escrow logic ensures that organizers cannot accidentally release funds before the hotel has committed to specific room numbers.

### Scenario E: Double Release / Idempotency Check
* **Test:** Rapidly click the "Release Payment" button multiple times, or send parallel API requests to the `/release-payment` endpoint for an already released reservation.
* **Expected System Failure:** The first request succeeds. All subsequent requests fail with `400 Bad Request`: `"Payment has already been released or is not in escrow"`.
* **Solution Method:** The backend strictly checks `payment_status == "escrowed"` before initiating the wallet transfer. Furthermore, the `update_one` query for deducting the `locked_balance` includes a condition (`"locked_balance": {"$gte": amount}`) to ensure atomic concurrency control at the database level.

### Scenario F: Vendor Wallet Missing During Release
* **Test:** Manually delete the vendor's wallet document directly in the MongoDB database, then try to release payment as the organizer.
* **Expected System Failure:** The backend will attempt to credit the vendor wallet and fail. It will then trigger a rollback.
* **Solution Method:** The backend code checks if the `credit_result.modified_count != 1`. If the credit fails, it executes a rollback query: `{"$inc": {"locked_balance": amount}}` returning the funds to the organizer's locked escrow, and throws a `409 Conflict: Vendor wallet credit failed`. This prevents funds from vanishing into the void.
