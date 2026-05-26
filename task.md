# Task: RBAC & Full Task Workflow

## Backend

### Escrow & Task Workflow (events.py)
- [x] Finalize plan and gather codebase understanding
- [x] Add new fields to `_serialize_task` (escrow, workspace, rejection, negotiation lock)
- [x] Modify `create_event_task` → lock escrow on creation with payout
- [x] Add `POST /{event_id}/tasks/{task_id}/open-workspace` endpoint
- [x] Add `POST /{event_id}/tasks/{task_id}/reject` endpoint (mandatory note, keeps workspace access)
- [x] Modify `approve_task` → release escrow, close workspace, full payout (no fee)
- [x] Add `POST /{event_id}/tasks/{task_id}/lock-vendor-negotiation` endpoint
- [x] Add `GET /{event_id}/tasks/activity` endpoint (organizer real-time view)

### RBAC Middleware (deps.py)
- [x] Add `block_if_negotiation_locked` dependency/helper for vendors/contracts

### Vendor Phase Gate (vendors.py / market_requests.py)
- [x] Apply negotiation lock check to TM contract/payment routes

## Frontend

### Team Member Dashboard (team/dashboard/page.tsx)
- [x] Add "Open Workspace" button for `open` tasks
- [x] Add "I Have Finished" button (replaces "Submit for Approval")
- [x] Show rejection note banner on tasks with `in_progress` + `rejection_note`
- [x] Show escrow locked chip per task
- [x] Show "Awaiting Organizer Approval" for `pending_approval`

### Scoped Workspace Page
- [x] Create `/team/workspace/[taskId]/page.tsx`
- [x] Vendors tab (negotiate only, no contracts)
- [x] Opportunities tab
- [x] "I Have Finished" bottom bar
- [x] Negotiation lock banner (when locked by organizer)

### Organizer Task Review Panel
- [x] Add "Accept Task" button on pending_approval tasks
- [x] Add "Reject" button → opens RejectTaskModal
- [x] Show escrow badge per task
- [x] Show "Workspace Open" live indicator
- [x] Add "Move to Contract Stage" button

### Components
- [x] Create `RejectTaskModal` component
- [x] Create `EscrowBadge` component
- [x] Create `WorkspaceActivityDot` component

## Route Guard
- [x] Restrict Team Members from accessing `/organizer/*` routes
