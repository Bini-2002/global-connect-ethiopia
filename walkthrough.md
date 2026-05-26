# Walkthrough: RBAC & Full Task Workflow System

We have successfully implemented the comprehensive Role-Based Access Control (RBAC) and Full Task Workflow system to separate and power the **Team Member** vs **Organizer** workspaces.

---

## 1. Backend Extensions

### 🔒 Escrow & Task Assignment Handlers (`events.py`)
- **Escrow Locking**: When a task is assigned with a payout, the organizer's wallet is debited immediately, locking the funds safely in escrow (`escrow_locked: true`).
- **Open Workspace**: Adds a `/open-workspace` endpoint that lets team members activate their workspace, setting status to `in_progress`.
- **Task Rejection**: Adds a `/reject` endpoint requiring a mandatory note, shifting status to `in_progress` but leaving workspace access open so the team member can revise.
- **Approve & Pay**: Releasing task escrow, paying out the team member 100% of the funds, closing the workspace.

### 🚫 Negotiation Phase Gate (`deps.py` & `market_requests.py`)
- **Lock Check Helper**: Added `check_negotiation_lock` to block team members from starting negotiations or counter-offering if the organizer has locked negotiation phase for their task.
- **Integrations**: Hooked into request creation, quoting, and countering endpoints in the marketplace requests API.

---

## 2. Frontend Experiences

### 💼 Scoped Workspace Page (`/team/workspace/[taskId]/page.tsx`)
- **Tabs Interface**: Easily toggles between **Negotiations** (to negotiate with verified event vendors) and **Opportunities** (read-only itinerary, VIP hotels, venue bookings).
- **Interactive Chat Thread**: A responsive bubble chat UI to view quotes, propose counters, and initiate conversations with vendors.
- **Negotiation Locked Alert**: Warns team members once the organizer takes over contracting.
- **Finish Sticky Bottom Bar**: Shows the task status and enables team members to click **I Have Finished** once they're ready to submit.

### 📊 Team Dashboard Enhancements (`team/dashboard/page.tsx`)
- Displays an **Escrow Locked** chip next to payout amounts.
- Integrates **Start & Open Workspace**, **Go to Workspace**, and **I Have Finished** triggers.
- Pulls in correction/rejection note banners instantly if a task is rejected.

### 👑 Organizer Control Panel (`organizer/events/[id]/tasks/page.tsx`)
- Show live workspace indicators like a green pulsing dot for **Workspace Active**.
- Embedded **Lock Negotiation** button to lock the vendor phase.
- Embedded a fully responsive **Reject Task** modal with mandatory fix comments.

### 🚪 Organizer Route Guard (`organizer/layout.tsx`)
- Removed `team_member` from the layout check, restricting team members from navigating to `/organizer/*` routes and redirecting them to their respective dashboards.

---

## 3. Verification Details

All changes have been successfully integrated:
- Backend models compile.
- Next.js Client Components use Lucide icons, Harmony color palettes, and responsive glassmorphism styles.
- Routing is secured under `/organizer` layouts.
