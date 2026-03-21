# 🚀 Global Connect Ethiopia — Developer Setup Guide

## Prerequisites

Make sure you have the following installed:

| Tool | Required Version | Download |
|---|---|---|
| Git | Any recent | https://git-scm.com |
| Node.js | v18+ | https://nodejs.org |
| Miniconda / Anaconda | Any recent | https://docs.conda.io/en/latest/miniconda.html |
| MongoDB (local) | 6+ | https://www.mongodb.com/try/download/community *(or use Atlas)* |

---

## 1. Clone the Repository

```bash
git clone https://github.com/Bini-2002/global-connect-ethiopia.git
cd global-connect-ethiopia
```

> If you're fetching a specific branch (e.g. `feature/frontend`):
> ```bash
> git checkout -b feature/frontend origin/feature/frontend
> ```

---

## 2. Backend Setup

### 2a. Create the Python 3.11.5 Conda Environment

```bash
conda create -n gce_backend python=3.11.5 -y
conda activate gce_backend
```

### 2b. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2c. Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```bash
# backend/.env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=global_connect_ethiopia
SECRET_KEY=your-secret-key-here-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

> **Using MongoDB Atlas instead of local?** Replace `MONGODB_URL` with your Atlas connection string:
> ```
> MONGODB_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
> ```

### 2d. Start the Backend Server

```bash
# Make sure gce_backend is active
conda activate gce_backend

# From the backend/ directory
uvicorn app.main:app --reload
```

✅ Backend runs at **http://localhost:8000**  
📚 API docs available at **http://localhost:8000/docs**

---

## 3. Frontend Setup

### 3a. Install Node Dependencies

```bash
cd frontend
npm install
```

### 3b. Configure Environment Variables

Create a `.env.local` file inside the `frontend/` folder:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3c. Start the Frontend Dev Server

```bash
npm run dev
```

✅ Frontend runs at **http://localhost:3000**

---

## 4. Running Both at Once

Open **two separate terminal windows**:

**Terminal 1 — Backend:**
```bash
conda activate gce_backend
cd global-connect-ethiopia/backend
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd global-connect-ethiopia/frontend
npm run dev
```

---

## 5. User Roles & Test Accounts

After registering, the backend assigns roles. The login page redirects each role to their portal automatically.

| Role | Portal URL |
|---|---|
| Organizer | `/organizer/dashboard` |
| Vendor | `/vendor/verification` |
| Admin | `/admin/proposals` |
| Ministry | `/ministry/proposals` |
| Municipal | `/municipal/proposals` |
| Police | `/police/proposals` |

---

## 6. Project Structure

```
global-connect-ethiopia/
├── backend/              # FastAPI + MongoDB
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/      # API route files
│   │   ├── models/       # Database models
│   │   └── services/     # Business logic
│   ├── requirements.txt
│   └── .env              # ← you create this
│
└── frontend/             # Next.js + TypeScript + Tailwind
    ├── app/              # App Router pages
    │   ├── page.tsx      # Landing page
    │   ├── login/
    │   ├── organizer/
    │   ├── admin/
    │   ├── ministry/
    │   ├── municipal/
    │   ├── police/
    │   └── vendor/
    ├── components/       # Shared components
    ├── package.json
    └── .env.local        # ← you create this
```

---

## 7. Troubleshooting

### `ImportError: cannot import name 'coroutine' from 'asyncio'`
Your global Python is 3.12+. Make sure to activate the conda env first:
```bash
conda activate gce_backend
```

### `'next' is not recognized`
Run `npm install` inside the `frontend/` directory first.

### Frontend 401 / API not found
Ensure the backend is running at `localhost:8000` and your `frontend/.env.local` has the correct `NEXT_PUBLIC_API_URL`.

### MongoDB connection error
Confirm MongoDB is running locally (`mongod`) or your Atlas connection string is correct.
