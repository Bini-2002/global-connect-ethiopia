# Frontend Branch Plan

This file splits the frontend work into two separate branches:

- `event-creation`
- `Vendor-marketplace`

The goal is to let frontend developers work in parallel with minimal overlap.

## Branch 1: `event-creation`

This branch owns the organizer event lifecycle after proposal approval.

### Exact Pages To Develop

- `frontend/app/organizer/events/page.tsx`
  - Replace proposal-derived event listing with real `/events` data
- `frontend/app/organizer/events/[eventId]/page.tsx`
  - Event overview and edit page
- `frontend/app/organizer/events/[eventId]/schedule/page.tsx`
  - Schedule builder
- `frontend/app/organizer/events/[eventId]/venue/page.tsx`
  - Venue search and venue reservations
- `frontend/app/organizer/events/[eventId]/team/page.tsx`
  - Team invitations and members
- `frontend/app/organizer/events/[eventId]/tasks/page.tsx`
  - Task management
- `frontend/app/organizer/events/[eventId]/booking/page.tsx`
  - Booking setup and booking list
- `frontend/app/organizer/events/[eventId]/announcements/page.tsx`
  - Broadcasts and scheduled announcements
- `frontend/app/organizer/events/[eventId]/operations/page.tsx`
  - Badges, check-in, incidents
- `frontend/app/organizer/events/[eventId]/feedback/page.tsx`
  - Survey send and feedback summary
- `frontend/app/organizer/events/[eventId]/final-report/page.tsx`
  - Final report and archive flow

### Shared Frontend Files This Branch Should Own

- `frontend/app/services/eventsService.ts`
- `frontend/app/types/event.ts`
- `frontend/components/organizer/events/*`
- any new organizer event-specific components under:
  - `frontend/components/organizer/event-workspace/*`

### What Content Each Page Should Include

- Event list page:
  - event cards
  - event status
  - event type
  - location
  - start and end dates
  - booking summary
  - CTA to open event workspace
  - CTA to create event from approved proposal

- Event overview page:
  - title
  - description
  - supported event type selector
  - location
  - capacity
  - visibility
  - VIP list
  - permit number
  - status controls
  - publish, start live, complete, archive actions
  - budget widget

- Schedule page:
  - saved sessions list
  - session create/edit form
  - AI draft generator
  - accept AI draft flow
  - per-day schedule grouping

- Venue page:
  - venue search filters
  - suggested venue results
  - reservation request form
  - reservation status list
  - confirm reservation action

- Team page:
  - invite member form
  - pending invitations
  - accepted members
  - assigned role display

- Tasks page:
  - task creation form
  - assignee selector
  - status board or task list
  - due date and priority

- Booking page:
  - toggle for booking required
  - booking open date
  - booking close date
  - waitlist toggle
  - event capacity
  - booked count
  - remaining slots
  - bookings table

- Announcements page:
  - create announcement form
  - audience segment selector
  - channel selector
  - scheduled send support
  - announcement history

- Operations page:
  - badge generation controls
  - QR check-in scanner/manual input
  - booking attendance table
  - incident create/update form
  - incident log

- Feedback page:
  - send survey form
  - scheduled survey support
  - custom questions
  - summary cards for rating, vendor rating, NPS, response count

- Final report page:
  - timeline summary
  - total costs
  - vendors used
  - lessons learned
  - visibility setting
  - benchmark notes
  - publish report action
  - archive event action

### API Endpoints This Branch Uses

- `/api/v1/events`
- `/api/v1/events/from-proposal/{proposal_id}`
- `/api/v1/events/{event_id}`
- `/api/v1/events/{event_id}/budget`
- `/api/v1/events/{event_id}/schedule`
- `/api/v1/events/{event_id}/schedule/ai-draft`
- `/api/v1/events/{event_id}/venues/search`
- `/api/v1/events/{event_id}/venue-reservations`
- `/api/v1/events/{event_id}/team/invitations`
- `/api/v1/events/{event_id}/team`
- `/api/v1/events/{event_id}/tasks`
- `/api/v1/events/{event_id}/booking`
- `/api/v1/events/{event_id}/bookings`
- `/api/v1/events/{event_id}/announcements`
- `/api/v1/events/{event_id}/badges`
- `/api/v1/events/{event_id}/check-in/scan`
- `/api/v1/events/{event_id}/incidents`
- `/api/v1/events/{event_id}/feedback/send`
- `/api/v1/events/{event_id}/feedback/summary`
- `/api/v1/events/{event_id}/final-report`

## Branch 2: `Vendor-marketplace`

This branch owns the organizer-to-vendor procurement workspace and vendor-facing marketplace screens.

### Exact Pages To Develop

- `frontend/app/organizer/events/[eventId]/vendors/page.tsx`
  - Event-scoped vendor procurement page
- `frontend/app/organizer/vendors/page.tsx`
  - Optional organizer-level procurement overview
- `frontend/app/vendor/dashboard/page.tsx`
  - Replace placeholder with working dashboard
- `frontend/app/vendor/services/page.tsx`
  - Vendor service list and management
- `frontend/app/vendor/services/create/page.tsx`
  - Create vendor service
- `frontend/app/vendor/services/[serviceId]/edit/page.tsx`
  - Edit vendor service
- `frontend/app/vendor/requests/page.tsx`
  - Vendor request inbox
- `frontend/app/vendor/contracts/page.tsx`
  - Vendor contracts list
- `frontend/app/vendor/contracts/[contractId]/page.tsx`
  - Contract detail and sign flow
- `frontend/app/vendor/wallet/page.tsx`
  - Wallet and withdrawal view

### Shared Frontend Files This Branch Should Own

- marketplace-related service layer files
- vendor dashboard and vendor service components
- organizer vendor procurement components
- request, contract, payment, and wallet UI components

Recommended folders:

- `frontend/app/services/marketplaceService.ts`
- `frontend/app/types/marketplace.ts`
- `frontend/components/vendor/*`
- `frontend/components/organizer/vendors/*`

### What Content Each Page Should Include

- Organizer event vendors page:
  - marketplace search
  - service filters
  - vendor service cards
  - request quote modal
  - event-linked requests list
  - accepted request to contract flow
  - contract signing status

- Organizer vendors overview page:
  - all vendor requests across organizer events
  - filter by event
  - filter by status
  - contract summary

- Vendor dashboard:
  - verification status
  - service count
  - pending requests
  - active contracts
  - wallet snapshot
  - quick actions

- Vendor services pages:
  - service title
  - description
  - category
  - price range
  - pricing type
  - location
  - images
  - availability
  - tags
  - active/inactive state

- Vendor requests page:
  - organizer name
  - event reference
  - service title
  - proposed amount
  - requested event date
  - requirements
  - accept/reject actions
  - conversation timeline

- Contracts pages:
  - contract title
  - scope
  - amount
  - dates
  - terms
  - signature status
  - payment status
  - sign action

- Wallet page:
  - available balance
  - pending withdrawal balance
  - total released
  - total withdrawn
  - withdrawal request form
  - withdrawal history

### API Endpoints This Branch Uses

- `/api/v1/catalog`
- `/api/v1/vendors/services`
- `/api/v1/requests`
- `/api/v1/requests/organizer`
- `/api/v1/requests/vendor`
- `/api/v1/requests/{request_id}/accept`
- `/api/v1/requests/{request_id}/reject`
- `/api/v1/contracts`
- `/api/v1/contracts/{contract_id}`
- `/api/v1/contracts/{contract_id}/sign`
- `/api/v1/payments/*`
- `/api/v1/wallet`

### Important Note For This Branch

When the organizer creates a vendor request from an event workspace, always send `event_id` in the request payload. That is how the backend links procurement work to a specific event.

## Coordination Rules Between Branches

- `event-creation` owns event lifecycle pages and `eventsService`.
- `Vendor-marketplace` owns procurement and vendor marketplace pages.
- The only overlap point is the organizer event vendors page.
- Keep shared event data models stable and pass `event_id` into procurement flows rather than duplicating event state inside marketplace components.
