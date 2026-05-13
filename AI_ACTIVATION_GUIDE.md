# AI Features Activation Guide

All three AI features (Chatbot, Marketplace Recommender, Scheduler) are fully wired
to Gemini. The only thing needed is your API key.

---

## Step 1 — Add your Gemini API key to .env

Open `backend/.env` and add / update these two lines:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
AI_MOCK_MODE=false
```

> Get a free key at: https://aistudio.google.com/app/apikey

---

## Step 2 — Seed the Chatbot Knowledge Base (run once)

```bash
cd backend
python seed_ai_rules.py
```

Output: `✅ Seeded 8 regulatory rules into ai_regulatory_rules.`

---

## Step 3 — Restart the backend

```bash
uvicorn app.main:app --reload --port 8000
```

---

## What each AI feature does now

### 🤖 AI Chatbot (`/organizer/ai-chat` or chatbot widget)
- Answers questions about Ethiopian event licensing, permits, police notifications,
  fire safety, entertainment licensing, food permits, taxes, and environmental rules
- Cites the exact law/directive it's referencing
- Responds with "I cannot answer this" when outside its knowledge base
- Session-persistent (multi-turn conversation)

### 💡 AI Marketplace Recommender
- When browsing vendor services, displays an AI-generated price range
- Uses: real contract history from DB + live vendor listing prices + Gemini reasoning
- Shows `rationale` explaining the price estimate
- Falls back to statistical median if Gemini is unavailable

### 📅 AI Scheduler (5 Event Types)

The scheduler now has **expert pre-written prompts** for each event type.
When the organizer selects an event type, the backend automatically picks the matching prompt:

| Event Type input | Prompt persona |
|---|---|
| `conference` | International conference planner — multi-track, keynotes, panels |
| `wedding` | Wedding coordinator — Ethiopian + formal timeline |
| `trade_fair` | B2B exhibition organizer — VIP access, matchmaking, pitch competition |
| `cultural_festival` | Festival programmer — Ethiopian traditions (timkat, coffee ceremony) |
| `corporate_workshop` | L&D facilitator — modules, exercises, evaluations |
| Any other type | Generic professional event planner |

> **Usage:** Event workspace → Schedule tab → "AI Draft Schedule" → pick type → Generate

---

## Troubleshooting

**`google.generativeai.types.generation_types.StopCandidateException`**
- The prompt triggered a safety filter. Add `safety_settings` param to relax filters for business content.
- Temporary fix: rename event type to something less ambiguous.

**`APIError: 429 Resource exhausted`**
- You've hit the free tier rate limit. Wait 1 minute or upgrade your API plan.

**`KeyError: 'GEMINI_API_KEY'`**
- The `.env` file is not being loaded. Make sure you're running uvicorn from inside `backend/` directory.
- Check: `backend/.env` exists (not `backend/app/.env`)

**Chatbot returns "Service unavailable"**
- Check backend logs — look for `Gemini API error:`
- Verify key: `curl https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY`

**Scheduler returns mock data even with key set**
- Check `AI_MOCK_MODE=false` in `.env` (must be exactly `false`, not `False`)
- Verify: `GET /api/v1/events/{id}/schedule/ai-draft` response has `"provider": "gemini"` not `"mock"`
