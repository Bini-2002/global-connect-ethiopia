# Global Connect Ethiopia - Git Workflow Guide

Now that the repository is restructured into `frontend` and `backend` directories, here is the recommended Git branching and merging strategy for your team.

## Overview
- **`main`**: Production code. Stable, deployable.
- **`develop`** (or `test-develop`): Integration branch. All new features merge here for testing before going to `main`.
- **Feature Branches**: Where the actual work happens. Prefixed by the team (e.g., `front/`, `back/`, `full/`).

---

## 🚀 Scenario: Building a New Feature (e.g., "Event Creation")

When starting a new feature, both the Frontend and Backend teams will branch off the latest `test-develop` (or `develop`) branch.

### 1. Backend Team Workflow

**Create the Branch:**
```bash
git checkout test-develop
git pull origin test-develop
git checkout -b back/event-creation
```

**Work and Commit:**
The backend team works **exclusively** inside the `backend/` folder.
```bash
cd backend/
# write code, test...
git add .
git commit -m "feat(backend): implement event creation API endpoints"
```

**Push and PR:**
```bash
git push -u origin back/event-creation
```
Create a Pull Request (PR) on GitHub from `back/event-creation` into `test-develop`. Once reviewed, it gets merged into `test-develop`.

---

### 2. Frontend Team Workflow

**Create the Branch:**
```bash
git checkout test-develop
git pull origin test-develop
git checkout -b front/event-creation
```

**Work and Commit:**
The frontend team works **exclusively** inside the `frontend/` folder.
```bash
cd frontend/
# write code, test widgets...
git add .
git commit -m "feat(frontend): build event creation form UI"
```

**Push and PR:**
```bash
git push -u origin front/event-creation
```
Create a Pull Request (PR) on GitHub from `front/event-creation` into `test-develop`. Once reviewed, it gets merged into `test-develop`.

---

### 3. Integrated Testing on `test-develop`

As soon as a PR is merged (let's say backend merges first), `test-develop` is updated. 

If the frontend team needs the new backend endpoints to test their UI locally, they pull the latest `test-develop` changes into their current branch:
```bash
# While on front/event-creation
git pull origin test-develop
```
This safely brings the new `backend/` code into the frontend developer's local machine without affecting their `frontend/` work!

### 4. Avoiding Merge Conflicts

Because the teams are working in completely separate folders (`frontend/` vs `backend/`):
- Git will easily merge `back/feature-x` and `front/feature-x` together.
- They will **never** have merge conflicts with each other, even if they merge into `test-develop` at the exact same time.
- The only files that require coordination are root-level files like `.gitignore` or `README.md`.

## 📌 Rules of Thumb
1. **Never commit directly to `test-develop` or `main`.** Always use feature branches (`front/` or `back/`).
2. **Keep root clean.** All Node/React code stays in `/frontend`. All Python/FastAPI code stays in `/backend`.
3. **Run from root.** If you need to test both simultaneously locally, open two terminal tabs. In tab 1: `cd backend && uvicorn app.main:app`. In tab 2: `cd frontend && npm run dev` (or equivalent).
