# RBAC & Full Task Workflow Implementation Plan

## Background

The existing codebase already has a solid foundation:
- **Backend (FastAPI + MongoDB)**: `UserRole.TEAM_MEMBER` exists, `event_task_collection`, `event_team_member_collection`, `event_team_invitation_collection`, wallet/escrow logic, and a `push_notification` service are all in place.
- **Frontend (Next.js)**: Organizer dashboard + team pages exist; Team Member dashboard (`/team/dashboard`) shows tasks with basic status actions.
- **What's missing**: The full RBAC enforcement (Team Member restricted workspace), "Open Workspace" button flow, Escrow locking at assignment time, Reject-with-note flow, the negotiation-vs-contracting phase gate, and real-time organizer view of workspace activity.

---

## User Review Required

> [!IMPORTANT]
> **Escrow Lock Timing**: The requirement says funds are locked when a task is "assigned and accepted." Since there's no explicit accept step for a team member, we'll lock funds at the moment the organizer **creates and assigns the task with a payout**. The lock is released (paid out) on organizer approval, or returned to the organizer if the task is deleted before completion. Please confirm if a separate "Team Member accepts task" step is needed.

> [!IMPORTANT]
> **Vendor Negotiation Phase Gate**: The requirement says a Team Member can access the Vendors page for "negotiation only," and once negotiation finalizes, they're locked out of contract/payment. The existing codebase has `contracts`, `opportunities`, and `vendors` endpoints. We'll gate access by checking a `vendor_negotiation_lock` field on the task/workspace. The Organizer must explicitly click "Move to Contract Stage" which revokes TM access and notifies the Organizer. Please confirm this is the intended flow.

> [!WARNING]
> **No Breaking Changes**: All new endpoints are additive. Existing organizer and team member routes remain functional. Database schema changes are backward-compatible (new fields default to `None`/`false`).

---

## Confirmed Design Decisions

> [!NOTE]
> ✅ **1. Workspace Scope**: Scoped to a **specific event** — TM can only see vendors/opportunities relevant to the event the task belongs to.
> ✅ **2. Reject keeps access**: Team Member retains workspace access while revising. Access is only revoked on final approval.
> ✅ **3. No platform fee**: Full `payout_amount` goes to the Team Member on task completion. No platform cut.

---

## Proposed Changes

### Component 1: Backend — Escrow & Task Workflow

---

#### [MODIFY] [events.py](file:///c:/Users/binig/Desktop/global-connect-ethiopia/backend/app/api/v1/endpoints/events.py)

**Task creation with escrow lock (`POST /{event_id}/tasks`)**
- When a task is created with `payout_amount > 0` and an `assignee_user_id`, automatically deduct the payout from the organizer's wallet and move it to a `escrow_locked` field in the organizer's wallet document.
- Add `escrow_task_id` to the wallet transaction log with type `ESCROW_LOCK`.
- Store `escrow_locked: true` and `escrow_amount` on the task document itself.

**New endpoint: `POST /{event_id}/tasks/{task_id}/reject`**
- Organizer-only. Requires `note` field (mandatory rejection message).
- Reverts task status from `pending_approval` → `in_progress`.
- Stores `rejection_note` + `rejected_at` timestamp on the task.
- Sends push notification to the Team Member with the rejection note.
- Does **not** release escrow — funds stay locked until final approval or task deletion.

**New endpoint: `POST /{event_id}/tasks/{task_id}/open-workspace`**
- Team Member calls this to "open" the scoped workspace.
- Sets `workspace_open: true`, `workspace_opened_at` on the task.
- Returns a scoped workspace token/session flag (stored in task doc).
- Sends notification to Organizer: "Team Member opened workspace for task X."

**Modify `approve_task` endpoint**
- After marking task `done`, release escrow: move `escrow_amount` back into the transaction as a `TASK_PAYOUT` credit to the TM.
- Add `workspace_closed: true`, `workspace_closed_at` on the task.
- Push notification to TM: "Task approved — payout of ETB X released."

**New endpoint: `POST /{event_id}/tasks/{task_id}/lock-vendor-negotiation`**
- Organizer-only. Marks `negotiation_phase_locked: true` on the task.
- Removes TM access from vendor contract/payment routes for this task.
- Sends notification to both Organizer and TM.

---

#### [MODIFY] [deps.py](file:///c:/Users/binig/Desktop/global-connect-ethiopia/backend/app/api/v1/deps.py)

**New dependency: `require_workspace_access(task_id)`**
- Checks that the calling Team Member has an open, non-locked workspace for the given task.
- Used on vendor and opportunity endpoints when called by a TM.

**New dependency: `block_if_negotiation_locked`**
- Used on contract-related endpoints to gate TM access after negotiation phase.

---

#### [MODIFY] [vendors.py](file:///c:/Users/binig/Desktop/global-connect-ethiopia/backend/app/api/v1/endpoints/vendors.py)

- Apply `block_if_negotiation_locked` to contract/payment-related endpoints for `TEAM_MEMBER` role.
- TMs can still `GET` vendor listings but cannot POST to `/contracts` or `/payments`.

---

#### [MODIFY] [events.py](file:///c:/Users/binig/Desktop/global-connect-ethiopia/backend/app/api/v1/endpoints/events.py) — Task serializer

Add new fields to `_serialize_task`:
```python
"escrow_locked": task.get("escrow_locked", False),
"escrow_amount": task.get("escrow_amount", 0),
"workspace_open": task.get("workspace_open", False),
"negotiation_phase_locked": task.get("negotiation_phase_locked", False),
"rejection_note": task.get("rejection_note"),
"rejected_at": task.get("rejected_at"),
"workspace_opened_at": task.get("workspace_opened_at"),
"workspace_closed_at": task.get("workspace_closed_at"),
```

---

#### [MODIFY] [mongodb.py](file:///c:/Users/binig/Desktop/global-connect-ethiopia/backend/app/db/mongodb.py)

No new collections needed. All new data lives in existing `event_tasks` and `wallets` collections via new fields.

---

### Component 2: Backend — Team Organizer Real-Time View

---

#### [MODIFY] [events.py](file:///c:/Users/binig/Desktop/global-connect-ethiopia/backend/app/api/v1/endpoints/events.py)

**New endpoint: `GET /{event_id}/tasks/activity`** (Organizer only)
- Returns all tasks with their current workspace activity: `workspace_open`, `workspace_opened_at`, who opened it, current status, escrow status.
- Used for the organizer's real-time task activity view.

---

### Component 3: Frontend — Team Member Workspace

---

#### [MODIFY] [page.tsx](file:///c:/Users/binig/Desktop/global-connect-ethiopia/frontend/app/team/dashboard/page.tsx)

**Enhanced Team Member Dashboard**
- Replace the plain "Submit for Approval" button with the full workflow:
  1. **`open`** status → Show **"Open Workspace"** button (green CTA). Clicking calls `POST /tasks/{id}/open-workspace`, then navigates to `/team/workspace/{task_id}`.
  2. **`in_progress`** with `workspace_open: true` → Show **"I Have Finished"** button + "Resume Workspace" link.
  3. **`pending_approval`** → Show amber "Awaiting Organizer Approval" badge.
  4. **`in_progress`** with `rejection_note` → Show red "Revision Required" banner with the organizer's note.
  5. **`done`** → Show "Paid & Completed" badge.
- Add escrow indicator: "ETB X locked in escrow for this task" shown as a locked-padlock chip on each task card.

---

#### [NEW] `/frontend/app/team/workspace/[taskId]/page.tsx`

**Scoped Workspace Page** — the page the TM lands on after clicking "Open Workspace":
- Header: task name, event name, escrow amount locked badge.
- Left panel: **Vendors** tab (read/negotiate only, no contract actions).
- Right panel: **Opportunities** tab.
- Floating bottom bar: **"I Have Finished"** button → calls `PATCH /tasks/{id}` with `status: pending_approval` + notification to organizer → redirects back to dashboard.
- Permission Gate banner: If `negotiation_phase_locked: true` on the task, show a red banner "Your access to vendor contracts has been revoked. The organizer is handling the contracting phase."

---

### Component 4: Frontend — Organizer Task Review Panel

---

#### [MODIFY] Organizer event team/tasks page

Update the task list in `/organizer/events/[id]/team` or the dashboard task view:
- For each task in `pending_approval` status, show **two action buttons**:
  - ✅ **"Accept Task"** → calls `POST /tasks/{id}/approve` → releases escrow, marks done, revokes TM workspace.
  - ❌ **"Reject"** → opens a modal with a **mandatory** "Note/Fix Message" textarea → calls `POST /tasks/{id}/reject`.
- **Escrow indicator**: Show "ETB X in Escrow" badge on each task.
- **Workspace Activity indicator**: Show live dot + "Workspace Open" if `workspace_open: true`.
- Add **"Lock Vendor Negotiation → Move to Contract"** button when task has `workspace_open: true` and `negotiation_phase_locked: false`.

---

#### [NEW] `RejectTaskModal` component

`/frontend/components/team/RejectTaskModal.tsx`
- Modal with mandatory `textarea` for rejection note.
- Disabled submit if note is empty.
- On submit → calls reject endpoint → closes modal → updates task status locally.

---

### Component 5: Frontend — Route Protection (RBAC)

---

#### [MODIFY] [layout.tsx](file:///c:/Users/binig/Desktop/global-connect-ethiopia/frontend/app/team/layout.tsx) (or middleware)

Add route guard:
- Team Members can only access: `/team/*` and `/team/workspace/*`.
- Attempting to access `/organizer/*`, `/admin/*`, etc. redirects to `/team/dashboard`.
- Inside workspace: vendor page shows only negotiation UI (no contract signing, no payment buttons).

---

## Data Model Changes (event_tasks document)

```json
{
  // Existing fields...
  "status": "open | in_progress | pending_approval | done",
  
  // New fields
  "escrow_locked": true,
  "escrow_amount": 5000.00,
  "escrow_locked_at": "2026-05-25T...",
  
  "workspace_open": false,
  "workspace_opened_at": null,
  "workspace_closed": false,
  "workspace_closed_at": null,
  
  "negotiation_phase_locked": false,
  "negotiation_locked_at": null,
  
  "rejection_note": null,
  "rejected_at": null,
  "rejection_count": 0
}
```

---

## Verification Plan

### Automated Tests
- Run existing backend tests: `cd backend && python -m pytest tests/ -v`
- Verify escrow deduction on task creation with payout.
- Verify TM cannot access contract endpoints when `negotiation_phase_locked: true`.
- Verify reject endpoint requires `note` field.
- Verify approve endpoint releases escrow to TM wallet.

### Manual Verification
1. **As Organizer**: Create task with payout → verify wallet deducted by payout amount (escrow lock).
2. **As Team Member**: Click "Open Workspace" → verify scoped workspace opens with only Vendors/Opportunities.
3. **As Team Member**: Click "I Have Finished" → verify organizer receives notification, task shows "Pending Review."
4. **As Organizer**: Click "Reject" without a note → button should stay disabled. Enter note → verify task goes back to "In Progress" for TM with the note visible.
5. **As Organizer**: Click "Accept Task" → verify TM wallet is credited, organizer wallet stays reduced, task marked "Done."
6. **As Organizer**: Click "Lock Vendor Negotiation" → verify TM sees permission gate banner on workspace.
7. **Route Guard**: Log in as Team Member → attempt to navigate to `/organizer/dashboard` → should redirect.
