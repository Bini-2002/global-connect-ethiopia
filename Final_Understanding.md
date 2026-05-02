# Final Understanding

This document captures the final shared understanding for the partial backend completion work before implementation starts. It is written as the source-of-truth prompt context for the next execution phase.

## Product Direction

- Remove the old ticketing flow from the event lifecycle and keep booking as the active attendee access model.
- Accommodation is required in the future for events with special guests, where the organizer reserves on behalf of those guests, but accommodation is not part of these backend partial-completion phases.
- The target is demo-ready behavior that works end to end locally.
- Correctness of workflow and state transitions is the main priority.
- Backend completion comes first. Frontend changes should only be planned where they are necessary to support backend-backed demo behavior.
- Finish functionality first. Tests can be expanded later.
- Do not include AI chatbot development in these phase plans.

## Partial Use Cases In Scope

These partial areas are in scope for the current planning set:

- `UC-02` Ministry review and verification artifact alignment
- `UC-03` Municipal approval and police notification persistence
- `UC-05` Venue reservation redesign
- `UC-09` Contract signing refinement
- `UC-10` Booking configuration refinement
- `UC-11` Booking flow refinement
- `UC-12` Over-capacity protection refinement
- `UC-23` Event announcements refinement

These are explicitly excluded from the current backend phase plans:

- `UC-19` AI schedule implementation work
- `UC-20` Licensing chatbot implementation work
- accommodation implementation
- notification preferences
- revenue analytics

## Booking Model

- The system uses one generic reservation pool per event.
- This means there are no separate attendee classes such as general, VIP, press, or tiered booking pools in the current booking model.
- Event capacity is a single shared limit for all attendee bookings.
- Each attendee may have exactly one booking record per event.
- Booking creation is attendee-only. Non-attendee roles must not be allowed to create attendee bookings through the public booking flow.
- Booking should only be available for public published events.
- Private events must not support attendee booking in this phase.
- The organizer should prepare the attendee information form for the open event, and the attendee must fill the required information before submitting the booking.
- Booking flow behavior:
  - if capacity is available, booking is confirmed immediately
  - if capacity is full, new bookings are rejected
  - waitlist is not used in the finalized behavior for this phase
- Capacity counting must include only confirmed bookings.
- Over-capacity attempts should be rejected and not silently ignored.
- Over-capacity enforcement should use a stricter concurrency-safe mechanism where the first successful request wins and the second request fails.
- QR code and check-in pass must be issued for confirmed bookings.

## Verification Letter And Permit

- The ministry approval is about event-content review and is not the municipal allowance certificate step.
- The verification letter must be distinct from the municipal permit artifact.
- The verification letter should be generated only after municipal approval, not after ministry approval.
- The verification letter must be a downloadable PDF.
- The organizer must have frontend access to download the verification letter.
- The verification letter must include:
  - proposal title
  - organizer name
  - event dates
  - ministry office name
  - municipal office name
  - reviewer name
  - approval timestamp
  - reference number
- The permit remains separate from the verification letter.
- Verification-letter and permit records should remain attached to the event/proposal workflow, not introduced as a separate standalone notification subsystem.

## Police Notification

- Police is read-only after municipal approval.
- Municipal approval must automatically trigger police notification.
- Police notification must be persisted in the database.
- Police should receive event security information through the dashboard.
- The police-facing read-only security context must include:
  - event title
  - location
  - dates
  - expected attendees
  - organizer contacts
  - security level
  - personnel count
  - uploaded security plan document
  - permit or approval reference
- The persistence model should be event-linked and attached to the proposal/event workflow.

## Venue Reservation

- Venue management should move away from a mock internal catalog toward a separate venue listing entity.
- Venue listings should be marketplace and vendor managed.
- Venue reservation must use a handshake flow between organizer and venue provider.
- Organizer starts the process by requesting a reservation.
- Provider-side outcomes must support:
  - accept
  - decline
  - offered alternative
- Alternative offers may adjust:
  - dates
  - price
  - capacity
  - notes
  - location details
- Failed reservation attempts must still be stored.
- Suggested alternatives should come from other venue listings found through marketplace search.
- Confirmed venue reservation should update only the reservation record, not auto-overwrite the event location.
- Deposit/payment is in scope and should be modeled as a contract-linked payment milestone.

## Contracts

- Contracts originate only from accepted marketplace requests.
- Contract signing should use a simplified state machine.
- Use these contract states:
  - `draft`
  - `pending_signatures`
  - `active`
  - `completed`
  - `cancelled`
- Track signature progress with separate organizer/vendor signature flags instead of adding extra contract states such as `organizer_signed` and `vendor_signed`.
- Organizer and vendor must sign separately through dedicated endpoints.
- A contract becomes active only after both signatures.
- The current fund/release lifecycle is sufficient for payment flow in this phase.
- The downloadable artifact should be a generated PDF summary of contract terms and sign status.

## Announcements

- Actual announcement delivery for the demo means real in-app delivery behavior backed by persisted recipient-facing records.
- The supported audience segment for this phase is all confirmed bookings.
- If there are zero recipients, sending is allowed with a warning.
- Scheduled announcements should be stored as scheduled records.
- For demo support, there should also be a manual "run scheduled now" action.

## Delivery Split

Phase split is confirmed as:

- `Backend_Phase_1_Plan.md`
  - verification letter and permit separation
  - police notification persistence and police read-only dashboard data
  - booking rules cleanup
  - attendee-only booking enforcement
  - stricter capacity protection
  - announcement persistence and in-app delivery model

- `Backend_Phase_2_Plan.md`
  - venue listing entity
  - venue reservation handshake
  - failed reservation persistence plus alternative suggestions
  - contract signing simplification
  - contract PDF artifact
  - venue deposit/payment linkage through contract-style milestones

## Notes For Next Implementation Prompt

- Explain any API shape changes before applying them, because the current frontend compatibility needs to be understood first.
- Favor minimal but reliable schema changes.
- Keep the implementation focused on demo usability and workflow correctness.
- Do not reintroduce ticketing or paid attendee checkout as a parallel path.
