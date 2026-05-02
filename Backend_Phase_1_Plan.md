# Backend Phase 1 Plan

Use this document as the execution prompt for backend phase 1. Implement only the scope defined here. Do not implement AI chatbot, AI schedule provider wiring, accommodation, or revenue analytics in this phase.

## Objective

Complete the highest-priority partial backend flows needed for a correct end-to-end local demo:

- verification letter and permit separation
- police notification persistence and police dashboard visibility
- booking flow cleanup
- attendee-only booking creation
- stricter over-capacity protection
- in-app announcement delivery model

The result must favor correct workflow/state behavior over extra breadth.

## Part 1: Verification Letter And Permit Separation

Implement the event-approval artifact model so the ministry and municipal responsibilities are clearly separated.

Requirements:

- Do not generate a verification letter on ministry approval.
- Keep ministry review as content review only.
- On municipal approval:
  - generate or ensure the municipal permit artifact as before
  - generate a separate verification letter artifact
- The verification letter must be a downloadable PDF.
- The verification letter must be distinct in storage and retrieval from the permit.
- The verification letter PDF must include:
  - proposal title
  - organizer name
  - event dates
  - ministry office name
  - municipal office name
  - reviewer name
  - approval timestamp
  - reference number

Backend deliverables:

- add a persistent verification-letter record linked to the approved proposal and resulting event
- update municipal approval logic to create both artifacts
- add read/download API support for the verification letter
- keep permit APIs intact or minimally adapted

Design constraints:

- the verification-letter record should stay attached to the proposal/event workflow
- do not introduce a separate broad document-management subsystem for this
- artifact generation may be simple PDF generation suitable for demo use

## Part 2: Police Notification Persistence And Security Visibility

Implement automatic, persistent police notification after municipal approval.

Requirements:

- municipal approval must automatically create a police notification record
- police remains read-only after approval
- police notification data must be stored in the database
- police dashboard/detail views must be backed by event-linked persisted security context
- police-visible security information must include:
  - event title
  - location
  - dates
  - expected attendees
  - organizer contacts
  - security level
  - personnel count
  - uploaded security plan document
  - permit or approval reference

Backend deliverables:

- add a police-notification persistence model linked to proposal/event
- update municipal approval flow to write the record automatically
- extend police-facing query/detail endpoints to return the full security context from persisted data

Design constraints:

- police must not mutate proposal or event approval state
- this is notification/visibility, not a second approval workflow

## Part 3: Booking Flow Cleanup

Refactor event booking behavior so it matches the finalized product direction.

Requirements:

- booking is the only attendee access model; do not expand ticketing
- one event uses one generic reservation pool
- only public published events may accept attendee bookings
- each attendee may have exactly one booking record per event
- only authenticated attendees may create bookings
- organizer/vendor/admin convenience booking through the attendee booking endpoint must be removed
- attendee submits required personal information through the organizer-defined booking form before the booking is stored
- confirmed bookings generate:
  - QR code
  - check-in pass

Behavior rules:

- if capacity exists, booking is confirmed immediately
- if capacity is full, reject the new booking
- do not create waitlist records in the finalized phase-1 behavior

Backend deliverables:

- tighten role enforcement on booking creation
- tighten event-status and visibility enforcement
- ensure booking payload and persisted booking record support attendee information collection needed by organizers
- preserve current QR/check-in-pass retrieval endpoints

Design constraints:

- do not add booking categories or multi-pool inventory
- do not add booking cancellation in this phase

## Part 4: Stricter Capacity Protection

Upgrade booking-capacity enforcement so the flow is deterministic and safer under concurrent requests.

Requirements:

- count only confirmed bookings against capacity
- first successful request wins
- later conflicting request fails cleanly
- over-capacity attempts must not be silently ignored
- booking status should end up reflecting full capacity correctly

Backend deliverables:

- replace the current best-effort booking increment logic with a stricter concurrency-safe mechanism
- ensure final booking write and event capacity update behave atomically enough for the demo target
- return clear failure responses when capacity has already been consumed

Design constraints:

- no waitlist behavior in this finalized phase-1 booking model
- keep the mechanism practical for MongoDB and current code structure

## Part 5: In-App Announcement Delivery Model

Implement announcement behavior as real in-app delivery backed by persistence.

Requirements:

- audience for this phase is all confirmed bookings
- zero recipients should produce a warning but not block sending
- support immediate send
- support scheduled records
- support a manual “run scheduled now” action for demo use
- actual delivery in this phase means recipient-targeted in-app announcement records are created and can be surfaced later by frontend

Backend deliverables:

- persist announcement definitions
- persist resolved recipient delivery records for in-app announcements
- support immediate delivery execution
- support manual execution of scheduled announcements
- keep channel model aligned with in-app delivery for this phase rather than pretending email/SMS are implemented

Design constraints:

- do not build full queue-worker scheduling yet
- scheduled announcements may stay dormant until manually triggered

## API And Data Notes

When implementing phase 1:

- prefer extending current endpoints where behavior is already close
- add new endpoints only where needed for:
  - verification-letter download
  - manual execution of scheduled announcements
  - police notification retrieval if current event/proposal routes are insufficient
- keep schema and response changes minimal but explicit
- explain any breaking API changes before applying them to frontend consumers

## Acceptance Criteria

Phase 1 is complete when all of the following are true:

- municipal approval creates both a permit and a separate verification-letter PDF
- organizer can download the verification letter
- police dashboard data is populated from persisted notification/security records
- only attendees can create attendee bookings
- bookings only work for eligible public published events
- capacity enforcement rejects the second competing request at full capacity
- confirmed bookings still return QR/check-in-pass access
- announcements can be sent immediately to confirmed-booking recipients as in-app delivery records
- scheduled announcements can be manually executed for the demo

## Explicit Exclusions

Do not implement in this phase:

- accommodation
- real chatbot backend
- real LLM schedule provider wiring
- notification preferences
- revenue analytics
- paid ticket checkout
- attendee booking cancellation
