# Backend Phase 2 Plan

Use this document as the execution prompt for backend phase 2. Implement only the scope defined here. This phase builds on the finalized understanding and on backend phase 1.

## Objective

Complete the remaining agreed non-AI partial backend work needed for a strong local demo:

- marketplace-backed venue listing entity
- venue reservation handshake workflow
- alternative-offer and failed-attempt persistence
- deposit/payment linkage for venue reservations
- simplified contract-signing model
- downloadable contract PDF artifact

The implementation should stay optimized and state-driven.

## Part 1: Venue Listing Entity

Introduce venue inventory as a dedicated marketplace-managed entity instead of a mock search list.

Requirements:

- do not keep venue search as a hardcoded static result source
- model venue listings as a separate entity
- venue listings are vendor managed
- venue listings must be discoverable for reservation flow

Venue listing should support, at minimum:

- vendor ownership
- venue name
- location and city
- capacity
- pricing or deposit-related commercial fields needed by reservation flow
- availability or reservability metadata
- notes and descriptive details
- active/inactive status

Design constraints:

- use a dedicated venue listing entity, not a generic vendor service record reused blindly
- keep the schema focused on reservation use cases needed for the demo

## Part 2: Venue Reservation Handshake Workflow

Replace the simplified organizer-only reservation confirmation with a proper organizer-provider handshake.

Required flow:

1. organizer requests reservation
2. venue provider reviews request
3. provider may:
   - accept
   - decline
   - offer alternative
4. organizer reviews provider response
5. organizer confirms accepted or alternative offer
6. deposit/payment milestone is handled
7. reservation becomes confirmed

Reservation workflow requirements:

- organizer must be able to create a reservation request against a venue listing
- provider-side response must be persisted
- organizer-side final acceptance of a provider offer must be persisted
- reservation status model must support at least:
  - requested
  - provider_accepted
  - offered_alternative
  - organizer_confirmed
  - confirmed
  - declined
  - cancelled

You may simplify names, but preserve these state meanings.

## Part 3: Alternative Offers And Failure Persistence

Support richer failure and alternative handling for venue reservations.

Requirements:

- failed reservation attempts must still be stored
- provider alternative offers may change:
  - dates
  - price
  - capacity
  - notes
  - location details
- suggested alternatives should come from other venue listings returned by marketplace search

Backend deliverables:

- persist alternative-offer details directly on the reservation workflow
- persist failed attempts instead of discarding them
- link marketplace-based alternative suggestions to the failed or alternative response path

Design constraints:

- do not silently replace one venue with another
- confirmed reservation must remain explicit and organizer-approved

## Part 4: Reservation Deposit And Payment Linkage

Add deposit/payment support to the venue reservation process.

Requirements:

- deposit/payment is in scope for this phase
- deposit should be modeled through a contract-linked payment milestone approach
- avoid building a separate unrelated payment model for venue reservations if the contract/payment stack can be reused cleanly

Expected outcome:

- once organizer confirms the venue deal, the system can represent the required deposit milestone
- the venue reservation workflow should know whether the deposit milestone is pending, funded, or satisfied enough to allow final confirmation

Design constraints:

- keep the flow demo-ready and locally executable
- reuse the current payment/fund/release direction where practical

## Part 5: Simplified Contract Signing Model

Refine contract signing to the agreed optimized state model.

Use these states:

- `draft`
- `pending_signatures`
- `active`
- `completed`
- `cancelled`

Track signature progress with separate fields:

- `signed_by_organizer`
- `signed_by_vendor`
- optionally signed timestamps for each side

Requirements:

- contracts originate only from accepted marketplace requests
- organizer and vendor sign through separate dedicated endpoints
- contract becomes `active` only after both signatures
- keep current fund/release lifecycle in place

Design constraints:

- remove the need for extra state names like `organizer_signed` and `vendor_signed`
- preserve auditability through fields rather than state explosion

## Part 6: Contract PDF Artifact

Add a downloadable PDF summary artifact for contracts.

Requirements:

- generate a PDF summary of contract terms and sign status
- the artifact should be downloadable through backend API
- the PDF should be demo-ready and readable, not necessarily legally production-grade

Suggested content:

- contract reference
- event reference
- organizer party
- vendor party
- key terms or negotiated description
- sign status for organizer
- sign status for vendor
- activation status
- created date

Design constraints:

- this is a generated summary artifact, not a full e-signature platform

## API And Data Notes

When implementing phase 2:

- introduce new venue-listing and venue-provider workflow endpoints as needed
- preserve compatibility where reasonable, but prefer correctness over maintaining mock-only behavior
- update contract endpoints to reflect the simplified signature model
- add contract artifact download endpoint if one does not exist
- explain API shape changes before wiring frontend consumers

## Acceptance Criteria

Phase 2 is complete when all of the following are true:

- venue listings exist as a dedicated backend entity
- organizer can request a venue reservation against a venue listing
- provider can accept, decline, or offer an alternative
- organizer can confirm the chosen provider response
- failed reservation attempts are persisted
- alternative offers persist changed terms and can show marketplace-driven alternatives
- deposit/payment milestone behavior is represented in the reservation-deal workflow
- contracts use the simplified state model plus per-party signature flags
- contract becomes active only after both signatures
- contract PDF artifact can be downloaded

## Explicit Exclusions

Do not implement in this phase:

- accommodation booking
- chatbot backend
- real LLM schedule provider integration
- revenue analytics
- notification preferences
- paid ticketing restoration
