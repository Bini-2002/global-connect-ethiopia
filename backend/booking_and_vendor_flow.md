# Booking And Vendor Flow

## Attendee Booking Flow

### Organizer side prerequisite

1. Organizer creates an event from an approved proposal.
2. Organizer publishes the event.
3. Organizer enables booking for the event.
4. Event becomes visible to attendees.

### Attendee side flow

1. Attendee logs in.
2. Attendee loads the published event list.
3. Attendee opens a specific event.
4. Attendee reads event details.
5. Attendee reserves a place for the event.
6. System creates a booking reference.
7. System generates a QR code value for confirmed bookings.
8. Attendee can retrieve:
   - booking JSON
   - QR image
   - event check-in pass image

### Relevant backend routes

- `GET /api/v1/events`
  - Attendee sees published, live, and completed events only
- `GET /api/v1/events/{event_id}`
  - Attendee sees event details
- `GET /api/v1/events/{event_id}/booking`
  - Booking configuration and availability
- `POST /api/v1/events/{event_id}/bookings`
  - Create attendee booking
- `GET /api/v1/events/{event_id}/bookings`
  - Attendee sees own bookings, organizer sees all
- `GET /api/v1/events/{event_id}/bookings/{booking_id}`
  - Booking detail
- `GET /api/v1/events/{event_id}/bookings/{booking_id}/qr-code`
  - QR image PNG
- `GET /api/v1/events/{event_id}/bookings/{booking_id}/check-in-pass`
  - Event check-in pass PNG
- `POST /api/v1/events/{event_id}/check-in/scan`
  - Staff check-in using QR value

## Vendor Management Flow

### Vendor onboarding flow

1. Vendor registers as a user with vendor role.
2. Vendor submits verification documents.
3. Admin reviews and approves the vendor.
4. Approved vendor can log in and access vendor portal functionality.
5. Approved vendor can create service listings.

### Organizer to vendor flow

1. Organizer browses marketplace services.
2. Organizer creates a request against a vendor service.
3. Vendor receives request in vendor request inbox.
4. Vendor can:
   - accept
   - reject
   - counter-offer
5. Organizer can also counter-offer or accept a negotiated request.
6. Once accepted, organizer creates contract.
7. Organizer signs contract.
8. Vendor signs contract.
9. Contract becomes active.

### Relevant backend routes

#### Vendor verification and portal

- `POST /api/v1/vendors/verification/step-2`
- `POST /api/v1/vendors/verification/step-3/submit`
- `GET /api/v1/vendors/verification/status`
- `GET /api/v1/vendors/portal/summary`

#### Vendor services

- `POST /api/v1/vendors/services`
- `GET /api/v1/vendors/services/me`
- `PUT /api/v1/vendors/services/{service_id}`
- `DELETE /api/v1/vendors/services/{service_id}`

#### Marketplace browsing

- `GET /api/v1/catalog/search`

#### Requests and negotiation

- `POST /api/v1/requests`
- `GET /api/v1/requests/organizer`
- `GET /api/v1/requests/vendor`
- `GET /api/v1/requests/{request_id}`
- `POST /api/v1/requests/{request_id}/counter-offer`
- `POST /api/v1/requests/{request_id}/accept`
- `POST /api/v1/requests/{request_id}/reject`

#### Contracts

- `POST /api/v1/contracts`
- `GET /api/v1/contracts/organizer`
- `GET /api/v1/contracts/vendor`
- `GET /api/v1/contracts/{contract_id}`
- `POST /api/v1/contracts/{contract_id}/sign`

## Demo Vendors Seeded

The following approved vendor accounts were seeded into the configured database:

- `venue.provider.demo@gce.local`
- `catering.provider.demo@gce.local`
- `decor.provider.demo@gce.local`

Default password for all seeded demo vendors:

- `VendorDemo@123`

Each demo vendor already has one active marketplace service:

- Venue Provider
- Catering Provider
- Decor
