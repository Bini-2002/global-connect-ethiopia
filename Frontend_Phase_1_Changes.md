# Frontend File Mapping for Backend Phase 1

This document outlines the frontend files modified to support the changes introduced in `Backend_Phase_1_Plan.md`. 

## 1. File Categorization

**Part 1: Verification Letter And Permit Separation**
*(Municipal approval and artifact generation, Organizer permit & verification letter download)*
* `frontend/app/municipal/proposals/[id]/page.tsx`
* `frontend/app/organizer/proposals/[id]/page.tsx`
* `frontend/app/organizer/proposals/[id]/permit/page.tsx`
* `frontend/app/types/proposal.ts`

**Part 2: Police Notification Persistence And Security Visibility**
*(Police dashboard and detail views backed by persisted security context)*
* `frontend/app/police/proposals/page.tsx`
* `frontend/app/police/proposals/[id]/page.tsx`

**Part 3 & 4: Booking Flow Cleanup & Stricter Capacity Protection**
*(Attendee-only booking, capacity protection limits, updating event types/services)*
* `frontend/app/events/[id]/page.tsx`
* `frontend/app/organizer/events/[id]/booking/page.tsx`
* `frontend/app/services/eventsService.ts`
* `frontend/app/types/event.ts`

**Part 5: In-App Announcement Delivery Model**
*(Announcement views, operations, navigation shell updates)*
* `frontend/app/organizer/events/[id]/announcements/` (New folder)
* `frontend/app/organizer/events/[id]/operations/page.tsx`
* `frontend/app/organizer/events/[id]/page.tsx`
* `frontend/components/organizer/events/EventWorkspaceShell.tsx`

---

## 2. Git Commands for Teammates

Once the files are extracted or if you are ready to commit them directly, use the following commands from the root of the project to stage and commit the frontend implementation for Phase 1:

```bash
# Stage all the frontend changes (including the new announcements folder)
git add frontend/app/events/ frontend/app/municipal/ frontend/app/organizer/ frontend/app/police/ frontend/app/services/ frontend/app/types/ frontend/components/

# Commit the changes
git commit -m "feat(frontend): implement Phase 1 UI for permits, police dashboard, booking flow, and announcements"
```

> **Note:** Make sure **not** to add `RESEND-API-KEY.txt` or `AI_DEVELOPMENT_PROMPT_PACK.md` unless they are explicitly needed in the repository, as they were also modified/currently show up as untracked files.