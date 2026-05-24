# Global Connect Ethiopia — Backend Setup (for Frontend Developers)

This repository contains the **FastAPI (Python) backend** that your frontend will call.

> Important: The backend is considered **stable/functional** for day‑to‑day integration.
> If you hit an issue, **prioritize verifying your local backend setup first** (env vars, MongoDB, URL, CORS, auth token). Avoid “quick fixes” suggested by Copilot/LLMs that modify backend logic unless the backend team explicitly asks you to.
>
> Known exception: the **government approval** step/flow may be pending or externally blocked. Don’t try to bypass it locally.

---

## 1) Prerequisites

- **Python 3.10+** (recommended: 3.11)
- **MongoDB** (local or Atlas)
- (Optional) **Redis** — only needed if you run the verification worker

Windows tips:
- If PowerShell blocks venv activation, run:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```

---

## 2) Backend install (Windows)

From the repository root:

### A) Create + activate a virtual environment

PowerShell:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

CMD:
```bat
python -m venv venv
venv\Scripts\activate.bat
```

### B) Install dependencies

```powershell
pip install -r requirements.txt
```

---

## 3) Configure environment variables (`.env`)

Create a file named **`.env`** in the repository root.

Minimum required values:

```dotenv
# App info
PROJECT_NAME=Global Connect Ethiopia
VERSION=0.1.0

# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=global_connect_ethiopia

# Auth
JWT_SECRET=change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Storage (defaults to local)
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage
```

Optional (only if you use them):

```dotenv
# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Queue / worker (only needed if running the verification worker)
REDIS_URL=redis://localhost:6379/0
VERIFICATION_QUEUE_NAME=document_verification

# OTP email delivery (Google SMTP recommended)
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail-address@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_FROM_EMAIL=your-gmail-address@gmail.com
OTP_EMAIL_SUBJECT=Your Global Connect Ethiopia verification code

# Optional legacy fallback
RESEND_ENABLED=false
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_OTP_SUBJECT=Your Global Connect Ethiopia verification code
```

Notes:
- The backend loads env vars from `.env` via Pydantic Settings.
- If you see a startup error about missing env vars, it almost always means `.env` is missing or incomplete.

---

## 4) Run the backend API

Start the server:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Quick checks:
- Health: `http://127.0.0.1:8000/` → `{"message": "Server is running!"}`
- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON (live): `http://127.0.0.1:8000/openapi.json`

API base path used by the frontend:

- Base URL: `http://127.0.0.1:8000/api/v1`

---

## 5) (Optional) Run the verification worker

Only do this if your feature requires background verification tasks.

1) Ensure Redis is running
2) Ensure `.env` contains `REDIS_URL`
3) Run the worker:

```powershell
python -m app.workers.run_worker
```

If you don’t need background jobs, skip this entirely.

---

## 6) Integrate with the frontend

### A) Use the OpenAPI contract

You can integrate in 2 ways:

1) **Live OpenAPI** (backend running):
   - `http://127.0.0.1:8000/openapi.json`

2) **Checked-in OpenAPI file** (no server needed):
   - `apidog/global-connect-ethiopia.openapi.json`

The `apidog/README.md` explains the ApiDog workflow and re-export script.

### B) Configure your frontend API base URL

Set your frontend’s API base URL to:

- `http://127.0.0.1:8000/api/v1`

Example (pseudo-code):

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api/v1";

fetch(`${API_BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
```

### C) CORS (browser calls)

If your browser console shows CORS errors, you have two safe options:

- **Preferred for frontend dev:** configure a **dev-server proxy** (Vite/Next/etc.) so the browser calls your frontend origin and the dev server forwards `/api` to the backend.
- Otherwise: ask the backend team to enable/adjust CORS for your frontend origin.

(Please do not “fix” CORS by applying AI-suggested backend middleware changes unless the backend team requests it.)

---

## 7) Troubleshooting checklist (do this before changing anything)

### Step 1 — Confirm you are running from repo root

If you see `ModuleNotFoundError: No module named 'app'`, you likely started `uvicorn` from the wrong folder.

Run from the repository root:

```powershell
uvicorn app.main:app --reload
```

### Step 2 — Verify required env vars are loaded

Common error:
- `ValidationError` / missing `PROJECT_NAME`, `MONGODB_URL`, etc.

Fix:
- Ensure `.env` exists at the repository root and contains all required keys.

### Step 3 — Check MongoDB connectivity

Common error:
- connection refused / timeout

Fix:
- Start MongoDB locally or set `MONGODB_URL` to your Atlas connection string.

### Step 4 — Confirm the exact URL your frontend calls

The backend routes are under:
- `/api/v1/...`

If you call `/auth/login` instead of `/api/v1/auth/login`, you’ll get a 404.

### Step 5 — Don’t accept “LLM fixes” that change backend behavior

If something breaks:
- Capture the request + response (status code, payload)
- Copy the backend stack trace from the terminal
- Share both with the backend team

The backend code is intentionally strict in places (auth, verification, document upload). Random refactors suggested by Copilot/LLMs can easily break the contract.

---

## Where to look in the backend

- API entrypoint: `app/main.py`
- Routes: `app/api/v1/api.py` and `app/api/v1/endpoints/`
- Settings/env vars: `app/core/config.py`
- OpenAPI export script: `scripts/export_openapi.py`

---

## If you’re stuck

Send the backend team:

- The command you ran (e.g. `uvicorn ...`)
- Your `.env` keys **without secrets** (mask values)
- The failing endpoint + request body (mask tokens)
- The terminal traceback
- Screenshot of the browser Network tab (if applicable)
