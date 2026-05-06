# Team Collaboration: File Distribution & Git Commit Plan

To maximize the number of logical commits and cleanly split the 50 uncommitted changes between your two teammates, I've divided the files into two clear domains. 

**Instructions for Both Teammates:**
1. Download the provided `.zip` codebase.
2. Extract and replace/merge the contents into your local repositories.
3. Open a terminal at the root of the project and follow the exact copy-paste `git add` and `git commit` sequences below.

---

## 👩‍💻 Teammate A: Backend Core, AI Integration, & Docs
**Focus:** Backend updates, MongoDB connections, AI services (both backend & frontend), and project documentation.

### 1. Update Backend Configurations & Requirements
```bash
git add backend/requirements.txt backend/app/core/config.py backend/app/db/mongodb.py
git commit -m "chore(backend): update core configurations, requirements and db connections"
```

### 2. Add AI Backend Services & Schemas
```bash
git add backend/app/schemas/ai.py backend/app/services/ai_service.py backend/app/api/v1/endpoints/ai.py backend/app/api/v1/api.py
git commit -m "feat(backend): implement AI chatbot and schedule generation schemas and endpoints"
```

### 3. Update Existing Backend Endpoints (Auth, Events, Email)
```bash
git add backend/app/api/v1/endpoints/auth.py backend/app/api/v1/endpoints/events.py backend/app/services/email_service.py
git commit -m "feat(backend): enhance auth, events, and email services for phase 2"
```

### 4. Implement Frontend AI Integrations
```bash
git add frontend/app/services/aiService.ts frontend/app/types/ai.ts frontend/components/Chatbot.tsx frontend/app/faq/
git commit -m "feat(frontend): integrate AI chatbot component, FAQ views, and AI service layer"
```

### 5. Add Project Documentation
```bash
git add "documentation/Global Connect Ethiopia - International Professional Event Hub.pdf" AI_DEVELOPMENT_PROMPT_PACK.md Frontend_Phase_2_Plan.md backend_ai_summary.md system_test_plan.md
git commit -m "docs: add AI prompt packs, testing plans, and phase 2 documentation"
```

---

## 👨‍💻 Teammate B: Frontend Operations, Marketplace, & Roles
**Focus:** Event operations, marketplace/contracts, venue listings, and role-specific dashboards (Police, Municipal, Organizer).

### 1. Build Marketplace & Contracts System
```bash
git add frontend/app/lib/marketplace.ts frontend/app/services/marketplaceService.ts frontend/app/types/marketplace.ts frontend/components/marketplace/ContractCard.tsx frontend/components/marketplace/StatusBadge.tsx frontend/app/organizer/contracts/[id]/page.tsx frontend/app/vendor/contracts/[id]/page.tsx
git commit -m "feat(frontend): implement marketplace types, services, and contract management UI"
```

### 2. Update Core Event Views & Types
```bash
git add frontend/app/layout.tsx frontend/app/events/[id]/page.tsx frontend/app/register/page.tsx frontend/components/Sidebar.tsx frontend/app/services/eventsService.ts frontend/app/types/event.ts
git commit -m "feat(frontend): refine core layouts, sidebar, registration and global event types"
```

### 3. Implement Organizer Event Workspace & Venue Management
```bash
git add frontend/app/organizer/events/[id]/booking/page.tsx frontend/app/organizer/events/[id]/operations/page.tsx frontend/app/organizer/events/[id]/page.tsx frontend/app/organizer/events/[id]/schedule/page.tsx frontend/app/organizer/events/[id]/venue/page.tsx frontend/app/organizer/events/[id]/announcements/ frontend/components/organizer/events/EventWorkspaceShell.tsx frontend/app/vendor/venue-listings/
git commit -m "feat(frontend): construct organizer workspace, booking, announcements and venue listings"
```

### 4. Update Proposal & Role-Based Workflows (Police, Municipal, Permits)
```bash
git add frontend/app/types/proposal.ts frontend/app/municipal/proposals/[id]/page.tsx frontend/app/organizer/proposals/[id]/page.tsx frontend/app/organizer/proposals/[id]/permit/page.tsx frontend/app/police/proposals/[id]/page.tsx frontend/app/police/proposals/page.tsx
git commit -m "feat(frontend): implement municipal approvals, police dashboards, and organizer permit workflows"
```

---

### ⚠️ Important Note Regarding Untracked Files:
Files like `RESEND-API-KEY.txt`, `uncommitted_files.txt`, `Frontend_Phase_1_Changes.md`, and `AI_Marketplace_Changes.md` were specifically **left out** of these commands. Do not commit these files unless absolutely necessary, as they appear to be local logs, scratch files, or contain sensitive API keys.
