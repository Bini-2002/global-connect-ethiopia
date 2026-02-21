# Global Connect Ethiopia - Backend

FastAPI backend for the **Global Connect Ethiopia** project, using **MongoDB Atlas** as the database.

Current backend includes:
- User registration
- User login (JWT access token)
- Session schema support

---

## Requirements

- Python 3.11
- pip
- MongoDB Atlas account

---

## Setup

### 1) Clone the repository

```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2) Create and activate a virtual environment (Windows)

```powershell
py -3.11 -m venv venv
.\venv\Scripts\Activate
python -m pip install --upgrade pip
```

### 3) Install dependencies

```bash
pip install -r requirements.txt
```

### 4) Configure environment variables

Create a `.env` file in the project root:

```dotenv
MONGODB_URL="mongodb+srv://<username>:<password>@globalconnectcluster.m4yhahs.mongodb.net/?appName=GlobalConnectCluster"
PROJECT_NAME="Global Connect"
VERSION="1.0.0"
DATABASE_NAME="global_connect_db"
JWT_SECRET="your_jwt_secret_key_here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Replace `<username>` and `<password>` with your MongoDB Atlas DB user credentials.

---

## Run the server

```bash
uvicorn app.main:app --reload
```

Server URL:
- http://127.0.0.1:8000

API docs (Swagger UI):
- http://127.0.0.1:8000/docs

---

## API testing

Use Swagger UI (`/docs`) to test endpoints:

- `POST /api/v1/auth/register` — Create a user
- `POST /api/v1/auth/login` — Login and get JWT token

You can also use Postman:
- Header: `Content-Type: application/json`
- Body JSON should match schemas in `app/schemas/user.py`

---

## Collaboration workflow

### Branching

```bash
git checkout -b feature/<branch-name>
```

### Sync with default branch before work

```bash
git pull origin <default-branch>
```

### Push your branch

```bash
git add .
git commit -m "Add feature XYZ"
git push origin feature/<branch-name>
```

### Pull requests

Create PRs to merge feature branches into the default branch.

---

## Shared MongoDB Atlas access

For teammates:
- Add teammate as a DB user in MongoDB Atlas
- Add teammate IP address to Network Access allowlist
- Teammate creates local `.env` with their own credentials

---

## Notes and tips

- Use Python 3.11 for best compatibility with FastAPI/Pydantic/Motor.
- Never commit `.env` to GitHub.
- Keep dependencies updated when packages are added:

```bash
pip freeze > requirements.txt
```

- Test endpoints locally before pushing.

---

## Security reminder

If credentials were ever committed or shared publicly, rotate them immediately:
- MongoDB Atlas DB user password
- JWT secret
