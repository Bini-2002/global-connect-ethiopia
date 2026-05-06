# Frontend Phase 2 Implementation Plan

> **Status:** Backend Phase 2 is complete and tested. This document is the execution prompt for the frontend Phase 2 work. Implement only the scope defined here.

---

## What Changed In The Backend (Phase 2 Summary)

Before building, understand these new backend capabilities you must wire:

### 1. Venue Listings — New Dedicated Entity (vendor-managed)
- Vendors now create and manage `VenueListing` records (not hardcoded static data).
- Endpoint prefix: `GET/POST /api/v1/venue-listings`
- Venue search now returns real listing records from DB.
- The venue reservation flow now requires a `venue_listing_id` (not a free-text venue name).

### 2. Venue Reservation — Full Handshake Workflow
The reservation flow now has a provider-side response step:

```
organizer requests → provider accepts/declines/offers_alternative → organizer confirms
```

New statuses: `requested`, `provider_accepted`, `offered_alternative`, `organizer_confirmed`, `confirmed`, `declined`, `cancelled`

New fields on `VenueReservationResponse`:
- `venue_listing_id`, `vendor_id`, `vendor_user_id`
- `provider_action`, `provider_response_notes`
- `proposed_start/end/cost/deposit_amount`
- `agreed_start/end/cost/agreed_deposit_amount`
- `payment_milestone_status` (not_required → deposit_pending → deposit_funded → satisfied)
- `alternative_suggestions[]` (list of other venue listings when declined)
- `failure_reason`, `failed_at`
- `organizer_confirmed_at`, `provider_responded_at`, `confirmed_at`

New endpoints:
- `POST /api/v1/events/{event_id}/venue-reservations/{reservation_id}/cancel`
- `POST /api/v1/events/{event_id}/venue-reservations/{reservation_id}/deposit`
- `POST /api/v1/venue-listings/reservations/{reservation_id}/respond` (provider side)
- `GET /api/v1/venue-listings/reservations/me` (provider sees incoming requests)

### 3. Contract Signing — Simplified Model
Contracts now use:
- State: `draft` → `pending_signatures` → `active` → `completed` → `cancelled`
- Flags: `signed_by_organizer` (bool), `signed_by_vendor` (bool)
- Timestamps: `signed_by_organizer_at`, `signed_by_vendor_at`

New endpoints on `/api/v1/contracts/{contract_id}`:
- `POST .../sign/organizer` — organizer signs
- `POST .../sign/vendor` — vendor signs
- `GET .../pdf` — download PDF artifact (response: binary PDF)

The old `AGREED/FUNDED/COMPLETED/PAID` status model is now `draft/pending_signatures/active/completed/cancelled`.

---

## TypeScript Type Updates Required

### File: `frontend/app/types/marketplace.ts`

**Replace** the old `ContractStatus`, `EscrowStatus`, `PaymentStatus` union types and `MarketplaceContractRecord` with:

```typescript
// Phase 2 contract states
export type ContractStatus =
  | 'draft'
  | 'pending_signatures'
  | 'active'
  | 'completed'
  | 'cancelled';

export type EscrowStatus = 'NONE' | 'LOCKED' | 'RELEASED';
export type PaymentStatus = 'PENDING' | 'PAID';

export interface MarketplaceContractRecord {
  id: string;
  request_id: string | null;
  opportunity_id: string | null;
  proposal_id: string | null;
  event_id: string | null;
  organizer_id: string;
  vendor_id: string;
  vendor_user_id: string;
  title: string;
  scope: string;
  amount: number;
  currency: string;
  terms: string | null;
  selection_note: string | null;
  status: ContractStatus;
  escrow_status: EscrowStatus;
  payment_status: PaymentStatus;
  signed_by_organizer: boolean;
  signed_by_vendor: boolean;
  signed_by_organizer_at: string | null;
  signed_by_vendor_at: string | null;
  organizer_name: string | null;
  vendor_business_name: string | null;
  start_date: string | null;
  end_date: string | null;
  funded_at: string | null;
  completed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}
```

**Add** venue listing types:

```typescript
export interface VenueListingRecord {
  id: string;
  vendor_id: string;
  vendor_user_id: string;
  venue_name: string;
  city: string;
  location: string | null;
  capacity: number;
  pricing_type: string;
  base_price: number | null;
  deposit_amount: number | null;
  currency: string;
  is_reservable: boolean;
  description: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface VenueListingSearchResult {
  id: string;
  venue_name: string;
  city: string;
  location: string | null;
  capacity: number;
  estimated_cost: number | null;
  deposit_amount: number | null;
  currency: string;
  available: boolean;
  is_reservable: boolean;
  description: string | null;
  notes: string | null;
  vendor: {
    vendor_id: string;
    business_name: string | null;
  } | null;
}

export interface VenueListingCreatePayload {
  venue_name: string;
  city: string;
  location?: string;
  capacity: number;
  pricing_type?: string;
  base_price?: number;
  deposit_amount?: number;
  currency?: string;
  is_reservable?: boolean;
  description?: string;
  notes?: string;
}
```

### File: `frontend/app/types/event.ts`

**Replace** the old `VenueReservationCreatePayload`, `VenueReservationConfirmPayload`, and `VenueReservationRecord` with the Phase 2 schema:

```typescript
export type VenueReservationStatus =
  | 'requested'
  | 'provider_accepted'
  | 'offered_alternative'
  | 'organizer_confirmed'
  | 'confirmed'
  | 'declined'
  | 'cancelled';

export type VenueReservationPaymentStatus =
  | 'not_required'
  | 'deposit_pending'
  | 'deposit_funded'
  | 'satisfied';

export interface VenueReservationCreatePayload {
  venue_listing_id: string;   // CHANGED: now uses ID, not free text
  requested_start: string;
  requested_end: string;
  estimated_cost?: number;
  notes?: string;
}

export interface VenueReservationOrganizerConfirmPayload {
  confirmation_notes?: string;
}

export interface VenueReservationCancelPayload {
  cancellation_notes?: string;
}

export interface VenueReservationDepositUpdatePayload {
  payment_milestone_status: VenueReservationPaymentStatus;
  payment_reference_id?: string;
  notes?: string;
}

export interface VenueListingSearchResponse {
  id: string;
  venue_name: string;
  city: string;
  location: string | null;
  capacity: number;
  estimated_cost: number | null;
  deposit_amount: number | null;
  currency: string;
  available: boolean;
  is_reservable: boolean;
  description: string | null;
  notes: string | null;
  vendor: { vendor_id: string; business_name: string | null } | null;
}

export interface VenueReservationRecord {
  id: string;
  event_id: string;
  venue_listing_id: string;
  vendor_id: string;
  vendor_user_id: string;
  venue_name: string;
  city: string;
  location: string | null;
  requested_start: string;
  requested_end: string;
  requested_capacity: number | null;
  estimated_cost: number | null;
  deposit_amount: number | null;
  currency: string;
  notes: string | null;
  provider_action: string | null;
  provider_response_notes: string | null;
  failure_reason: string | null;
  organizer_confirmation_notes: string | null;
  cancellation_notes: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  proposed_cost: number | null;
  proposed_deposit_amount: number | null;
  agreed_start: string | null;
  agreed_end: string | null;
  agreed_cost: number | null;
  agreed_deposit_amount: number | null;
  status: VenueReservationStatus;
  payment_milestone_status: VenueReservationPaymentStatus;
  payment_reference_id: string | null;
  deposit_funded_at: string | null;
  deposit_satisfied_at: string | null;
  alternative_suggestions: VenueListingSearchResponse[];
  alternative_suggestions_generated_at: string | null;
  created_at: string;
  updated_at: string;
  failed_at: string | null;
  provider_responded_at: string | null;
  organizer_confirmed_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
}
```

---

## Service Updates Required

### `frontend/app/services/eventsService.ts`

Update the venue-related methods:

```typescript
// Replace searchEventVenues - now returns listing objects, not VenueSearchResult
searchEventVenues: async (eventId: string, city?: string): Promise<{ event_id: string; venues: VenueListingSearchResponse[] }> => {
  const query = city?.trim() ? `?city=${encodeURIComponent(city.trim())}` : '';
  return api.get(`/events/${eventId}/venues/search${query}`);
},

// Update createVenueReservation - payload now uses venue_listing_id
createVenueReservation: async (eventId: string, payload: VenueReservationCreatePayload): Promise<VenueReservationRecord> => {
  return api.post(`/events/${eventId}/venue-reservations`, payload);
},

// Update confirmVenueReservation - payload is now VenueReservationOrganizerConfirmPayload
confirmVenueReservation: async (eventId: string, reservationId: string, payload: VenueReservationOrganizerConfirmPayload): Promise<VenueReservationRecord> => {
  return api.post(`/events/${eventId}/venue-reservations/${reservationId}/confirm`, payload);
},

// New: cancel reservation
cancelVenueReservation: async (eventId: string, reservationId: string, payload: VenueReservationCancelPayload): Promise<VenueReservationRecord> => {
  return api.post(`/events/${eventId}/venue-reservations/${reservationId}/cancel`, payload);
},

// New: update deposit milestone
updateVenueReservationDeposit: async (eventId: string, reservationId: string, payload: VenueReservationDepositUpdatePayload): Promise<VenueReservationRecord> => {
  return api.post(`/events/${eventId}/venue-reservations/${reservationId}/deposit`, payload);
},
```

### `frontend/app/services/marketplaceService.ts`

Add contract signing and PDF download:

```typescript
// New Phase 2 contract actions
signContractAsOrganizer: async (contractId: string): Promise<MarketplaceContractRecord> => {
  return api.post(`/contracts/${contractId}/sign/organizer`);
},

signContractAsVendor: async (contractId: string): Promise<MarketplaceContractRecord> => {
  return api.post(`/contracts/${contractId}/sign/vendor`);
},

downloadContractPdf: (contractId: string): string => {
  // Returns URL that can be used as href for anchor download
  return `${process.env.NEXT_PUBLIC_API_URL}/api/v1/contracts/${contractId}/pdf`;
},
```

Add venue listing service methods (or create a new `venueListingService.ts`):

```typescript
// Venue listings (vendor-managed, accessible to organizers for search)
searchVenueListings: async (params?: { city?: string; min_capacity?: number; max_base_price?: number; q?: string }): Promise<VenueListingSearchResult[]> => {
  const query = new URLSearchParams();
  if (params?.city) query.set('city', params.city);
  if (params?.min_capacity) query.set('min_capacity', String(params.min_capacity));
  if (params?.max_base_price) query.set('max_base_price', String(params.max_base_price));
  if (params?.q) query.set('q', params.q);
  const qs = query.toString();
  return api.get(`/venue-listings/search${qs ? '?' + qs : ''}`);
},

// Vendor: list their own listings
listMyVenueListings: async (): Promise<VenueListingRecord[]> => {
  return api.get('/venue-listings/me');
},

// Vendor: create listing
createVenueListing: async (payload: VenueListingCreatePayload): Promise<VenueListingRecord> => {
  return api.post('/venue-listings', payload);
},

// Vendor: update listing
updateVenueListing: async (id: string, payload: Partial<VenueListingCreatePayload>): Promise<VenueListingRecord> => {
  return api.put(`/venue-listings/${id}`, payload);
},

// Vendor: see reservation requests for their listings
listProviderReservations: async (): Promise<VenueReservationRecord[]> => {
  return api.get('/venue-listings/reservations/me');
},

// Vendor: respond to a reservation (accept / decline / offer_alternative)
respondToReservation: async (reservationId: string, payload: VenueReservationProviderResponsePayload): Promise<VenueReservationRecord> => {
  return api.post(`/venue-listings/reservations/${reservationId}/respond`, payload);
},
```

---

## Pages To Build / Update

### Priority Order (build in this sequence)

1. **Update venue page** (organizer) — use listing search, `venue_listing_id` in creation, show full handshake status
2. **Update contract detail page** (organizer) — add signature UI and PDF download
3. **Add venue listing management** (vendor portal) — vendors manage their listings
4. **Add vendor reservation inbox** (vendor portal) — provider responds to reservation requests
5. **Update contract detail page** (vendor) — same signature pattern
6. **Upgrade marketplace types** — ContractStatus enum and new fields

---

## Task 1: Update Organizer Venue Page

**File:** `frontend/app/organizer/events/[id]/venue/page.tsx`

**What's broken now:**
- `VenueReservationCreatePayload` previously had `venue_name`, `city` as free text. Now backend requires `venue_listing_id`.
- Venue search now returns `VenueListingSearchResponse[]` objects with an `id` field.
- Reservation record has many new fields (handshake status, provider response, alternative suggestions).
- `confirmVenueReservation` payload changed.

**What to build:**

**Section 1 — Venue Search (updated):**
- Search still uses `GET /events/{event_id}/venues/search?city=...`
- Results now include `id`, `capacity`, `deposit_amount`, `description`
- Show richer venue cards: name, city, capacity, price, deposit amount, description snippet
- "Use This Venue" should now store the selected listing's `id` for the reservation form

**Section 2 — Create Reservation (updated):**
- Form fields needed: `venue_listing_id` (hidden, set from search selection), `requested_start`, `requested_end`, `notes`, optional `estimated_cost`
- Show the selected venue name from the search result above the form
- Remove free-text `venue_name`, `city`, `location` inputs — these come from the listing now

**Section 3 — Reservation Timeline (heavily updated):**

Show the full handshake state for each reservation:

| Status | What to show |
|--------|-------------|
| `requested` | "Awaiting provider response" badge; show cancel button |
| `provider_accepted` | Green "Provider Accepted" badge; show Confirm button |
| `offered_alternative` | Amber "Alternative Offered" badge; show proposed dates/cost; Confirm or Cancel |
| `organizer_confirmed` | Teal "You Confirmed" badge; show deposit milestone section |
| `confirmed` | Green "Confirmed" badge; show agreed terms |
| `declined` | Red "Declined" badge; show failure reason; show alternative suggestions if any |
| `cancelled` | Grey "Cancelled" badge |

**Deposit milestone section** (show when status is `organizer_confirmed` or `confirmed`):
- Show `payment_milestone_status` (not_required / deposit_pending / deposit_funded / satisfied)
- If `deposit_pending`: show "Mark Deposit Paid" button → calls `POST .../deposit` with `{ payment_milestone_status: 'deposit_funded' }`
- If `deposit_funded`: show "Mark Deposit Satisfied" button

**Alternative suggestions section** (show when `declined` or `offered_alternative`):
- List `alternative_suggestions[]` venue listings with name, city, capacity, estimated cost
- Clicking one selects it for a new reservation request

---

## Task 2: Update Organizer Contract Detail Page

**File:** `frontend/app/organizer/contracts/[id]/page.tsx`

**What's broken now:**
- Status values are now `draft/pending_signatures/active/completed/cancelled` (not `AGREED/FUNDED/COMPLETED/PAID`).
- Contract now has `signed_by_organizer`, `signed_by_vendor` fields.
- No PDF download button exists.
- No signing action exists.

**What to update:**

**Status display:**
- Replace lifecycle steps `['AGREED', 'FUNDED', 'COMPLETED', 'PAID']` with `['draft', 'pending_signatures', 'active', 'completed']`
- Update status badge colors: `draft`=grey, `pending_signatures`=amber, `active`=green, `completed`=slate, `cancelled`=red

**Contract detail card — add new fields:**
- `title` (large heading instead of vendor name)
- `scope` (contract description)
- `signed_by_organizer` — show ✅ or ⬜ with timestamp if signed
- `signed_by_vendor` — show ✅ or ⬜ with timestamp if signed
- `start_date`, `end_date` if present

**Signature actions section:**
- If `signed_by_organizer === false` and status is `draft` or `pending_signatures`: show **"Sign as Organizer"** button → calls `POST /contracts/{id}/sign/organizer`
- After signing, refresh contract

**PDF download:**
- Add **"Download PDF"** button/anchor: `href={apiBase + '/api/v1/contracts/' + contractId + '/pdf'}` with `target="_blank"` or `download` attribute
- Show only when contract is not `draft`

**Escrow/payment actions** (keep existing fund/release/refund but update guard conditions):
- `canFundContract`: status is `active` AND `escrow_status === 'NONE'`
- `canReleaseContract`: status is `active` AND `escrow_status === 'LOCKED'`
- `canRefundContract`: status is `active` AND `escrow_status === 'LOCKED'`

---

## Task 3: Vendor — Venue Listing Management Page

**New route:** `/vendor/venue-listings` (or add tab to vendor portal)

**What to build:**

This is a new page for vendor users to manage their venue inventory.

**Layout:**
```
Header: "My Venue Listings"
[+ Add Venue Listing] button → opens inline form or modal

List of existing listings:
  Each card shows: venue name, city, capacity, base_price, deposit_amount, status (active/inactive)
  [Edit] button → opens edit form
  [Activate/Deactivate] toggle
```

**Create form fields:**
- `venue_name` (required)
- `city` (required)
- `location` (optional, street address)
- `capacity` (required, number)
- `pricing_type`: select: `fixed` | `negotiable`
- `base_price` (number, optional)
- `deposit_amount` (number, optional)
- `currency` (defaults to ETB)
- `description` (textarea)
- `notes` (textarea)

**Endpoint:** `POST /api/v1/venue-listings`
**List endpoint:** `GET /api/v1/venue-listings/me`

Add this to the vendor sidebar navigation (if not already present):
- "Venue Listings" link → `/vendor/venue-listings`

---

## Task 4: Vendor — Reservation Inbox Page

**New route:** `/vendor/venue-listings/reservations` (or `/vendor/reservations`)

**What to build:**

Vendors need to see incoming reservation requests against their listings and respond.

**List view:**
- Load from `GET /api/v1/venue-listings/reservations/me`
- Show each reservation: venue name, organizer's event ID/name (if available), requested dates, status
- Group by status: pending first, then responded

**Reservation detail / response panel:**

For each `requested` reservation, show a response form:
```
Provider Response:
  Action: [Accept] [Decline] [Offer Alternative]

  If Decline or Offer Alternative:
    - Response notes (textarea)
    - Proposed start / end dates (datetime-local)
    - Proposed cost (number)
    - Proposed deposit amount (number)

  [Submit Response] button
```

**Endpoint:** `POST /api/v1/venue-listings/reservations/{reservation_id}/respond`

Payload:
```json
{
  "action": "accept" | "decline" | "offer_alternative",
  "response_notes": "...",
  "proposed_start": "ISO datetime",
  "proposed_end": "ISO datetime",
  "proposed_cost": 50000,
  "proposed_deposit_amount": 10000
}
```

---

## Task 5: Update Vendor Contract Detail Page

**File:** `frontend/app/vendor/...contracts/[id]/page.tsx` (wherever the vendor contract page exists)

Apply same changes as Task 2 but for vendor role:
- Show Phase 2 contract status + signature flags
- Add **"Sign as Vendor"** button → `POST /contracts/{id}/sign/vendor`
- Add PDF download button

---

## Task 6: Update Marketplace Types and Helper Functions

**File:** `frontend/app/lib/marketplace.ts` (if it exists)

Update `canFundContract`, `canReleaseContract`, `canRefundContract` to work with Phase 2 status strings:

```typescript
export function canFundContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'active' && contract.escrow_status === 'NONE';
}

export function canReleaseContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'active' && contract.escrow_status === 'LOCKED';
}

export function canRefundContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'active' && contract.escrow_status === 'LOCKED';
}

export function isContractSigned(contract: MarketplaceContractRecord): boolean {
  return contract.signed_by_organizer && contract.signed_by_vendor;
}
```

---

## Task 7: Update Contract List Page (Both Organizer and Vendor)

**Files:**
- `frontend/app/organizer/contracts/page.tsx`
- Vendor equivalent

**Changes:**
- Status badges need to use Phase 2 status strings (`draft`, `pending_signatures`, `active`, `completed`, `cancelled`)
- `ContractCard` component needs signature status chips: "Org Signed ✅" / "Vendor Signed ✅" etc.
- Filter/search should work against new status values

---

## API Shape Reference

```
// Venue Listing endpoints (under /api/v1/venue-listings)
POST   /                             — vendor creates listing
GET    /me                           — vendor lists own listings
GET    /search?city=&min_capacity=   — searchable, no auth required effectively
GET    /{venue_id}                   — get listing detail
PUT    /{venue_id}                   — vendor updates listing
GET    /reservations/me              — vendor sees reservation requests
POST   /reservations/{id}/respond    — vendor responds to a request

// Venue reservation endpoints (under /api/v1/events/{event_id}/venue-reservations)
GET    /                             — list event reservations
POST   /                             — organizer requests reservation (needs venue_listing_id)
POST   /{reservation_id}/confirm     — organizer confirms provider's response
POST   /{reservation_id}/cancel      — organizer cancels
POST   /{reservation_id}/deposit     — update deposit milestone status

// Contract endpoints (under /api/v1/contracts)
POST   /{contract_id}/sign/organizer — organizer signs
POST   /{contract_id}/sign/vendor    — vendor signs
GET    /{contract_id}/pdf            — download contract PDF (binary response)
POST   /{contract_id}/fund           — fund escrow (after both signed, status=active)
POST   /{contract_id}/complete       — vendor marks work done
POST   /{contract_id}/release        — organizer releases payment
POST   /{contract_id}/refund         — refund escrow
POST   /{contract_id}/cancel         — cancel contract
```

---

## Design Guidelines For New UI

- Venue listing cards: use subtle emerald tones for available venues, grey for unavailable.
- Reservation handshake timeline: use a vertical stepper showing `requested → provider_responded → confirmed` states with icons.
- Signature panel: use checkmark icons with timestamp — show organizer and vendor columns side by side.
- PDF download: use a `FileDown` Lucide icon with an amber CTA button.
- Deposit milestone badge: amber `deposit_pending`, teal `deposit_funded`, emerald `satisfied`.
- Status color map for reservation:
  - `requested` → amber/yellow
  - `provider_accepted` → emerald
  - `offered_alternative` → orange
  - `organizer_confirmed` → teal
  - `confirmed` → green
  - `declined` → red
  - `cancelled` → grey

---

## Build Order (Recommended)

1. Update `types/marketplace.ts` (ContractStatus, MarketplaceContractRecord, VenueListingRecord)
2. Update `types/event.ts` (VenueReservationRecord, VenueReservationCreatePayload)
3. Update `services/eventsService.ts` (venue reservation methods)
4. Update `services/marketplaceService.ts` (signing, PDF URL)
5. Update organizer venue page (`/organizer/events/[id]/venue`)
6. Update organizer contract detail page (`/organizer/contracts/[id]`)
7. Create vendor venue listings management page (`/vendor/venue-listings`)
8. Create vendor reservation inbox page (`/vendor/venue-listings/reservations`)
9. Update vendor contract detail page (if it exists)
10. Update contract list pages (status chip display)

---

## Explicit Exclusions (Do Not Implement)

- AI chatbot
- Paid ticketing changes
- Accommodation booking
- Revenue analytics
- Real LLM schedule provider
- Notification preferences

---

## Notes On Backward Compatibility

- The `VenueSearchOption` type in the old `event.ts` (`venue_name`, `city`, `available`, `estimated_cost`) is now replaced by `VenueListingSearchResponse` which includes an `id` field. Remove the old type or alias it.
- The old `VenueSearchResult` wrapper (`event_id`, `date_from`, `date_to`, `city`, `venues`) shape is preserved on the backend — just the inner venue objects have changed.
- The old `VenueReservationConfirmPayload` (`confirmation_notes`, `final_cost`) changes: `final_cost` is removed; now just `confirmation_notes`.
- The contract `price` field becomes `amount` in the new `ContractResponse`. Update field references.
