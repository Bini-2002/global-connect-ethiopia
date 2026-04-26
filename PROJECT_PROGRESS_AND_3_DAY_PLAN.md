# Global Connect Ethiopia - Progress Review and 3-Day Build Plan

Date: April 25, 2026

This document converts the current codebase review into a working plan for the next build days.

## 1) Current Progress Snapshot

### Fully completed

- Authentication, login, OTP verification, session handling, and role normalization.
- Organizer approval-to-event creation, publish, live, complete, and archive lifecycle.
- Booking flow with QR code and check-in pass generation.
- Vendor verification, service listing, requests, negotiation, and contracts.
- Event team invitations, acceptance, team listing, tasks, badges, announcements, incidents, feedback, and final report backend endpoints.
- Resend-based OTP email service scaffold.

### Partially completed

- Organizer-side event workspace UI is ahead in backend but still uneven in frontend polish.
- Booking page and homepage need accessibility/polish cleanup.
- AI assistant exists as a UI concept and schedule draft support, but not as a real integrated feature.
- Team members are implemented as event team members, but onsite-staff is not a dedicated role subsystem.

### Not completed

- Production-ready payment settlement flow.
- Dedicated onsite-staff role, onboarding, and dashboard.
- Full automated test and smoke-test coverage.
- Production observability and performance hardening.

## 2) Progress Percentage

- Frontend: 78%
- Backend: 91%
- Overall functionality: 84%
- Performance/readiness: 69%

## 3) What Team Members and Onsite-Staff Mean in the Current Codebase

### Team members

- Implemented as event-specific invitations and members.
- Used for organizer event operations like schedule, tasks, bookings, badges, and access control.
- Good enough for the current MVP flow.

### Onsite-staff

- Not a first-class auth role yet.
- Currently represented only as event team members with assigned roles such as registration desk, stage manager, security, or operations lead.
- Missing a dedicated portal, explicit staff permissions, and staff-specific onboarding.

## 4) Tools and Libraries to Prepare Before Building

### Required now

- MongoDB running and reachable by the backend.
- Node.js dependencies already present in the frontend project.
- Python 3.11 environment for backend work.
- Resend account, API key, and verified sender email for real registration emails.

### Optional but useful next

- `pytest` and `pytest-asyncio` for backend smoke and regression tests.
- Playwright for browser-level role-flow checks.
- `openai` or `anthropic` for the AI copilot feature.
- `langgraph` only if you want a multi-step AI agent workflow later.

## 5) Resend Setup for Real Registration

1. Enable `RESEND_ENABLED=true` in backend environment variables.
2. Set a valid `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to a verified sender address.
4. Keep OTP verification enabled for organizer, vendor, and attendee roles.
5. Test registration end to end with a fresh email address.

## 6) Three-Day Production-Ready Phase Plan

### Phase 1 - Stability and Registration Hardening

Goal: make sign-up, login, and access checks production safe.

- Verify Resend email delivery and registration OTP flow.
- Fix any auth/session regressions on organizer, vendor, and attendee routes.
- Clean up the frontend lint/accessibility issues on the homepage and booking pages.
- Validate `users/me`, login, logout, and role redirects.

Deliverable:

- Real registration works.
- Core role login is stable.
- No obvious auth breaks on the demo path.

### Phase 2 - Complete the Missing Role Workflows

Goal: close the remaining frontend gaps around event operations and team execution.

- Finish organizer event workspace pages for schedule, venue, team, tasks, announcements, and final report.
- Surface event-scoped vendor procurement more cleanly in the organizer UI.
- Make the team members flow easier to use and present.
- Add a clear onsite-staff workflow using event team roles, even if it is not yet a separate auth role.

Deliverable:

- Organizer can run event operations from the UI.
- Team members and onsite-staff actions are understandable in the product.
- Vendor and organizer flows are consistent end to end.

### Phase 3 - Differentiation, Testing, and Demo Readiness

Goal: add one AI feature and make the system repeatable.

- Add an organizer copilot for schedule drafting, announcement drafting, or proposal summary.
- Add smoke tests for organizer, vendor, attendee, and booking QR flows.
- Prepare seed/demo data and a runbook.
- Document fallback steps for registration, booking, and event operations.

Deliverable:

- A demo-ready build.
- One meaningful AI differentiator.
- Repeatable role-flow validation.

## 7) Recommended AI Feature

Best fit:

- Organizer Copilot

What it should do:

- Draft event schedules from event metadata.
- Summarize proposals, vendor requests, or event notes.
- Generate attendee announcements and FAQ text.

Why this fits:

- The codebase already has AI draft hooks in the event workflow.
- The organizer UI already has AI assistant placeholders.
- It adds value without requiring a new product line.

## 8) Production-Ready Directive Tasks

### Task group A - Registration and auth

- Enable Resend in the backend environment.
- Validate email verification and OTP resend.
- Confirm organizer, vendor, and attendee login flows.

### Task group B - Event operations

- Finish organizer event workspace screens.
- Ensure booking, team, tasks, and operations screens are reachable.
- Clean up accessibility and form labeling issues.

### Task group C - Differentiation and hardening

- Add an AI copilot feature.
- Add test coverage and smoke checks.
- Document the demo flow and fallback path.

## 9) Suggested Build Order

1. Resend and auth hardening.
2. Organizer and team/onsite-staff workflow completion.
3. AI copilot plus testing and runbook.

## 10) Final Note

The project is already beyond a prototype in backend capability. The main work left is to tighten frontend completeness, make registration real with Resend, and turn team members plus onsite-staff into a clearer operational workflow.