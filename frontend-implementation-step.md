# Frontend Implementation Steps

This document is for frontend developers implementing the organizer post-approval event workflow.

The backend now supports the organizer flow after proposal approval:

1. Create event from approved proposal
2. Complete event details
3. Build schedule
4. Reserve venue
5. Invite team and assign tasks
6. Request vendors and create contracts
7. Configure ticketing
8. Run live operations
9. Send feedback survey
10. Publish final report and archive event

## Base Rules

- Use `NEXT_PUBLIC_API_URL + /events` as the base for the new event lifecycle APIs.
- Keep using bearer auth from `frontend/app/lib/auth.ts`.
- Organizer access is required for most write actions.
- Team members can access tasks, announcements, incidents, badges, and feedback summary when they accept an event invitation.
- Vendor procurement still uses the existing marketplace endpoints, but requests now support `event_id`.

## Existing Frontend Areas To Update

- `frontend/app/services/eventsService.ts`
  - Stop deriving events from approved proposals only.
  - Use `/events` as the source of truth.
- `frontend/app/types/event.ts`
  - Replace the temporary proposal-derived types with backend event response types.
- `frontend/app/organizer/events/page.tsx`
  - Use real event records from `/events`.
- `frontend/app/organizer/create-event/page.tsx`
  - Change the quick-start flow so approved proposals can become real events through `POST /events/from-proposal/{proposal_id}`.

## Recommended Route Structure

- `/organizer/events`
  - Event list page
- `/organizer/events/[eventId]`
  - Event overview and edit page
- `/organizer/events/[eventId]/schedule`
  - Schedule builder
- `/organizer/events/[eventId]/venue`
  - Venue search and reservation
- `/organizer/events/[eventId]/team`
  - Invitations and members
- `/organizer/events/[eventId]/tasks`
  - Task board
- `/organizer/events/[eventId]/vendors`
  - Marketplace requests and contracts for this event
- `/organizer/events/[eventId]/ticketing`
  - Ticket types, inventory, activation
- `/organizer/events/[eventId]/announcements`
  - Broadcasts and scheduled messages
- `/organizer/events/[eventId]/operations`
  - Badges, check-in, incidents
- `/organizer/events/[eventId]/feedback`
  - Survey send and summary
- `/organizer/events/[eventId]/final-report`
  - Lessons learned and closeout

## Step 1: Create Event From Approved Proposal

Use this as the first action after the organizer sees an approved proposal.

- Endpoint: `POST /api/v1/events/from-proposal/{proposal_id}`
- Success response:
  - `event_id`
  - `proposal_id`
  - `status`
  - `message`

Frontend flow:

- On the proposals list or proposal detail page, show `Create Event` only when proposal status is `approved`.
- After success, redirect to `/organizer/events/[eventId]`.
- Update any proposal cards to use `proposal.event_id` when present so the UI does not create duplicates.

## Step 2: Event Overview And Edit Page

The event detail page should load and edit the core event record.

- `GET /api/v1/events/{event_id}`
- `PATCH /api/v1/events/{event_id}`
- `POST /api/v1/events/{event_id}/publish`
- `POST /api/v1/events/{event_id}/start-live`
- `POST /api/v1/events/{event_id}/complete`
- `POST /api/v1/events/{event_id}/archive`

Important fields from the backend:

- `title`
- `description`
- `category`
- `location`
- `capacity`
- `start_date`
- `end_date`
- `visibility`
- `ticketing_mode`
- `vip_list`
- `program_schedule_summary`
- `status`
- `venue_status`
- `ticketing_status`
- `survey_status`
- `final_report_status`
- `permit_number`

UI notes:

- Show status chips directly from backend values. Do not keep the old uppercase mock status model.
- Disable `Publish Event` until the organizer has reviewed required event details.
- `Archive Event` should only be shown when the event is completed and a final report exists.

## Step 3: Budget

Budget is embedded on the event record.

- `GET /api/v1/events/{event_id}/budget`
- `PUT /api/v1/events/{event_id}/budget`

Payload shape:

```json
{
  "currency": "ETB",
  "items": [
    {
      "id": "optional-client-id",
      "name": "Venue",
      "estimated_cost": 100000,
      "actual_cost": 0,
      "notes": "optional"
    }
  ]
}
```

UI notes:

- Use a simple repeating row editor.
- Display `budget_total_estimated` from the response instead of recalculating separately.

## Step 4: Schedule Builder

Use the schedule page to support manual scheduling and AI-assisted drafts.

- `GET /api/v1/events/{event_id}/schedule`
- `POST /api/v1/events/{event_id}/schedule`
- `PATCH /api/v1/events/{event_id}/schedule/{schedule_item_id}`
- `GET /api/v1/events/{event_id}/schedule/ai-draft`
- `POST /api/v1/events/{event_id}/schedule/ai-draft`

Recommended UI:

- Timeline list or day-by-day grouped sessions
- `Generate Draft` button for AI draft generation
- `Accept Draft` flow that writes the returned draft into saved schedule items

Suggested create payload:

```json
{
  "session_title": "Opening Ceremony",
  "description": "Welcome and introductions",
  "start_time": "2026-05-20T09:00:00Z",
  "end_time": "2026-05-20T10:00:00Z",
  "speaker_id": null,
  "room_location": "Main Hall",
  "is_ai_suggestion": false
}
```

## Step 5: Venue Reservation

- `GET /api/v1/events/{event_id}/venues/search`
- `GET /api/v1/events/{event_id}/venue-reservations`
- `POST /api/v1/events/{event_id}/venue-reservations`
- `POST /api/v1/events/{event_id}/venue-reservations/{reservation_id}/confirm`

Frontend flow:

- Search available venues first
- Let organizer submit a reservation request
- Show reservation status history
- Allow organizer to confirm the selected reservation

The backend returns venue search suggestions and reservation records separately, so keep search results and saved reservations in different UI sections.

## Step 6: Team Invitations And Tasks

Invitations:

- `GET /api/v1/events/{event_id}/team/invitations`
- `POST /api/v1/events/{event_id}/team/invitations`
- `POST /api/v1/events/{event_id}/team/invitations/{invitation_id}/accept`
- `GET /api/v1/events/{event_id}/team`

Tasks:

- `GET /api/v1/events/{event_id}/tasks`
- `POST /api/v1/events/{event_id}/tasks`
- `PATCH /api/v1/events/{event_id}/tasks/{task_id}`

Frontend flow:

- Team page:
  - invite by email
  - show invitation status
  - show accepted members
- Task page:
  - create task
  - assign to team member by `user_id` or email
  - update task status

Recommended task status columns:

- `open`
- `in_progress`
- `done`
- `cancelled`

## Step 7: Vendor Procurement For An Event

Reuse the marketplace screens, but attach the event.

Endpoints already available:

- `GET /api/v1/catalog`
- `POST /api/v1/requests`
- `GET /api/v1/requests/organizer`
- `POST /api/v1/contracts`
- `GET /api/v1/contracts/{contract_id}`
- `POST /api/v1/contracts/{contract_id}/sign`
- payment endpoints remain under `/api/v1/payments`

New procurement behavior:

- `RequestCreate` now supports `event_id`
- request responses now include `event_id`
- contract responses now include `event_id`

Recommended request payload:

```json
{
  "event_id": "EVENT_ID",
  "proposal_id": "OPTIONAL_PROPOSAL_ID",
  "service_id": "SERVICE_ID",
  "message": "We need exhibition booth setup and lighting support",
  "proposed_amount": 75000,
  "currency": "ETB",
  "event_date": "2026-05-20T09:00:00Z",
  "requirements": "Need setup one day before opening"
}
```

Frontend note:

- Build the organizer vendor page as an event-scoped procurement workspace instead of a generic vendor page.
- Filter organizer requests and contracts by `event_id`.

## Step 8: Ticketing

- `GET /api/v1/events/{event_id}/ticket-types`
- `POST /api/v1/events/{event_id}/ticket-types`
- `PATCH /api/v1/events/{event_id}/ticket-types/{ticket_type_id}`
- `POST /api/v1/events/{event_id}/ticketing/activate`
- `GET /api/v1/events/{event_id}/tickets/purchases`
- `POST /api/v1/events/{event_id}/tickets/purchase`

Organizer ticketing UI:

- create ticket types
- show sold and remaining counts
- activate or disable ticketing
- view purchases

Attendee purchase UI can be built later, but the backend endpoint already exists.

## Step 9: Announcements

- `GET /api/v1/events/{event_id}/announcements`
- `POST /api/v1/events/{event_id}/announcements`

Use for:

- attendee announcements
- VIP reminders
- team notifications
- schedule updates

Suggested payload:

```json
{
  "audience_segment": "all_attendees",
  "subject": "Program Update",
  "body": "Registration opens at 8:00 AM.",
  "channel": "in_app",
  "send_at": null
}
```

## Step 10: Live Operations

Badges and check-in:

- `GET /api/v1/events/{event_id}/badges`
- `POST /api/v1/events/{event_id}/badges/generate`
- `POST /api/v1/events/{event_id}/check-in/scan`

Incidents:

- `GET /api/v1/events/{event_id}/incidents`
- `POST /api/v1/events/{event_id}/incidents`
- `PATCH /api/v1/events/{event_id}/incidents/{incident_id}`

Recommended UI:

- Operations dashboard with three widgets:
  - badge generation
  - QR scan/check-in table
  - incident log

## Step 11: Feedback And Final Report

Feedback:

- `POST /api/v1/events/{event_id}/feedback/send`
- `POST /api/v1/events/{event_id}/feedback/respond`
- `GET /api/v1/events/{event_id}/feedback/summary`

Final report:

- `GET /api/v1/events/{event_id}/final-report`
- `POST /api/v1/events/{event_id}/final-report`
- `PATCH /api/v1/events/{event_id}/final-report`

Archive:

- `POST /api/v1/events/{event_id}/archive`

Frontend flow:

- Feedback page:
  - organizer sends survey
  - organizer views summary metrics
- Final report page:
  - capture outcomes, lessons learned, attendance summary, recommendations
  - once published, allow archive action

## Suggested Frontend Build Order

1. Replace proposal-derived event list logic with `/events`.
2. Add `Create Event` from approved proposal.
3. Build event overview and edit page.
4. Build schedule and venue pages.
5. Build team and tasks.
6. Upgrade vendor procurement to pass `event_id`.
7. Build ticketing.
8. Build announcements and operations dashboard.
9. Build feedback and final report.

## Important Integration Notes

- Existing `eventsService.ts` currently treats approved proposals as events. That should be considered temporary and replaced.
- Proposal responses now expose `event_id`, so proposal detail pages can deep-link into the event workspace.
- Backend status values are lowercase enum-style values. Keep the frontend mapper close to the API layer instead of scattering status conversion across components.
- If the frontend needs a consolidated event dashboard response later, add it as a separate backend endpoint instead of overloading the core event detail record.
