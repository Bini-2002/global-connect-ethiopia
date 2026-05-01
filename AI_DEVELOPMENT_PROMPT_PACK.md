# Global Connect Ethiopia - AI Development Instruction Prompt Pack

Date: April 29, 2026
Status: AI scope locked after non-AI Phase 1 and Phase 2 planning

## 1) Purpose

Use this document as the execution prompt for the AI portion of the project only.

The non-AI backend and frontend phase work is treated as the completed baseline for this planning cycle. Do not reopen the non-AI phase scope unless an AI requirement explicitly depends on an existing route or UI surface.

The AI work must be demo-ready, stable, and intentionally limited. Favor correctness, low-latency behavior, and explicit fallbacks over broad agent complexity.

## 2) AI Product Goal

Deliver two AI capabilities:

1. `UC-19 Generate Event Schedule via AI`
2. `UC-20 Chatbot Inquiry for Licensing Rules`

The AI layer must behave as a practical product feature, not as a generic chatbot experiment.

### AI delivery principles

- Keep responses deterministic where possible.
- Avoid hallucination-prone behavior.
- Prefer persisted drafts and explicit user approval over automatic write-through.
- Use Gemini API key-based integration.
- Use MongoDB for persistence and speed.
- Keep the chatbot English-only.
- Keep the chatbot read-only advisory.
- Use static FAQ fallback when the service is unavailable.
- Use a mailto contact fallback when the chatbot cannot answer.

## 3) Locked Decisions From The Interview

### UC-19 event schedule AI

- Available to organizers and team members.
- Input constraints stay exactly as written: Event Type, Duration, and Start Time.
- Do not generate relative-time guesses first; generate concrete schedule items only.
- Generated output must be appended as new AI items in the database.
- Do not replace existing schedule content automatically.
- Do not skip persisted AI drafts.
- The organizer may review and manually edit the persisted AI draft.
- Manual edits must happen on persisted draft items in the DB.
- The organizer can click `Apply to Calendar` after review.
- AI timeout must fall back to manual entry.
- Use a 3-day retention window for AI draft records.

### UC-20 licensing chatbot

- Available to any authenticated user.
- Read-only advisory only.
- Answers must include a rule citation and a link to the relevant proposal form when available.
- Use MongoDB collections for the regulatory knowledge base.
- English only.
- If the chatbot cannot answer, show a mailto link to contact a ministry official.
- If the service is unavailable, show a frontend static FAQ page.
- Store conversation history for 3 days.
- Use Gemini API.
- Provider should be switchable via environment variable.
- Enforce prompt/response redaction in logs for sensitive fields.
- Enable deterministic mock mode for demo reliability.

## 4) Functional Requirements

### UC-19 Generate Event Schedule via AI

Actor:
- Organizer
- AI Engine

Precondition:
- Event details exist.
- Session data exists.

Postcondition:
- An AI-generated draft schedule exists as persisted draft items.

Normal flow:
1. Organizer opens `AI Schedule Assistant` in the event dashboard.
2. Organizer enters Event Type, Duration, and Start Time.
3. The system sends a prompt with event context to the LLM.
4. The system returns a suggested hour-by-hour itinerary.
5. The suggestion is stored as persisted draft items.
6. Organizer reviews the draft and clicks `Apply to Calendar`.
7. The persisted AI draft items remain available for traceability.

Alternative flow:
- Organizer manually edits specific time slots before applying.

Exception flow:
- AI service timeout -> show manual schedule entry form.

Required output shape:
- Event Type
- Duration
- Start Time
- Concrete schedule items
- Session title
- Start time
- End time
- Session type or label
- Notes

### UC-20 Chatbot Inquiry for Licensing Rules

Actor:
- Organizer (International or Local)

Precondition:
- Registered authenticated user asks a question.

Postcondition:
- Licensing guidance is displayed to the user.

Normal flow:
1. The organizer opens the `Help & Regulations` chatbot.
2. The organizer types a query such as "Do I need a police permit for 500 people?".
3. The system queries the regulatory knowledge base and/or Gemini.
4. The chatbot responds with specific Ethiopian licensing guidance.
5. The chatbot includes a link to the correct proposal form when relevant.

Alternative flow:
- Chatbot cannot answer -> show `Contact Ministry Official` mailto action.

Exception flow:
- Service unavailable -> show static FAQ page.

Required answer shape:
- Plain English answer
- Supporting rule citation
- Relevant form link if available
- Clear advisory disclaimer

## 5) AI Subsystem Decomposition

Keep the AI feature set split into small, predictable subsystems.

### 5.1 Frontend AI surfaces

Organize the UI around the workflow already present in the app.

- AI Schedule Assistant entry point inside the event dashboard.
- AI schedule draft viewer inside the schedule page.
- AI assistant controls for generating, reviewing, editing, and applying drafts.
- Help & Regulations chatbot entry point for licensing guidance.
- Static FAQ page for offline or unavailable chatbot fallback.

### 5.2 Backend AI API surfaces

Add or extend endpoints only where needed.

Schedule AI:
- `GET /api/v1/events/{event_id}/schedule/ai-draft`
- `POST /api/v1/events/{event_id}/schedule/ai-draft`
- `POST /api/v1/events/{event_id}/schedule/apply-ai-draft`

Chatbot AI:
- `POST /api/v1/ai/chatbot/licensing`
- `GET /api/v1/ai/chatbot/history`
- `GET /api/v1/ai/faq`

Optional support endpoints if needed for demo reliability:
- `GET /api/v1/ai/providers/status`
- `POST /api/v1/ai/mock-mode/enable`
- `POST /api/v1/ai/mock-mode/disable`

### 5.3 AI service layer

Create a small service boundary for provider calls and retrieval.

- Gemini client wrapper
- Prompt builder for schedule generation
- Prompt builder for licensing Q and A
- Regulatory rule retrieval service
- Conversation history service
- Draft persistence service
- Logging redaction service
- Mock provider service for offline demo mode

### 5.4 Persistence layer

Use MongoDB collections for AI records.

Suggested collections:
- `ai_schedule_drafts`
- `ai_schedule_draft_items`
- `ai_chat_sessions`
- `ai_chat_messages`
- `ai_regulatory_rules`
- `ai_proposal_form_links`

Keep the model minimal and fast. Do not introduce a broad document-management subsystem.

## 6) Data Model Rules

### Schedule draft records

Persist AI schedule output as draft records tied to the event.

Each draft should capture:
- event_id
- organizer_id
- input constraints
- model/provider name
- prompt metadata
- created_at
- expires_at
- status
- generated items
- manual edits
- applied_at if applied

Each draft item should capture:
- session title
- start time
- end time
- category or label
- description
- order index
- is_ai_suggestion
- applied flag

### Chat history records

Persist chatbot interactions with lightweight retention.

Each chat session should capture:
- user_id
- role
- created_at
- expires_at
- status

Each message should capture:
- session_id
- direction
- user query or assistant answer
- citations
- form link
- provider name
- redacted payload metadata

### Regulatory knowledge records

Keep curated licensing rules in MongoDB.

Each rule record should capture:
- title
- rule text
- category
- jurisdiction
- source reference
- proposal form link
- keywords
- active flag

## 7) AI Behavior Rules

### 7.1 Schedule generation rules

- Use concrete event context only.
- Do not invent speakers, rooms, or legal details unless they are available in the event data.
- Do not overwrite saved schedule items automatically.
- Do not create relative draft text without timestamps.
- If the AI returns malformed output, reject it and fall back to manual entry.
- Keep the generated itinerary readable and hour-by-hour.
- Allow the organizer or team member to edit the persisted draft before applying.

### 7.2 Chatbot rules

- Answer only about Ethiopian licensing and event-approval guidance.
- Never claim legal certainty.
- Always provide a short advisory disclaimer.
- Always prefer the curated Mongo rules over model speculation.
- If confidence is low, use the contact fallback.
- Do not answer non-Ethiopian legal questions.
- Do not modify event or proposal data from chatbot actions.

### 7.3 Provider rules

- Use Gemini API key as the primary provider.
- Support provider switching through environment variable.
- Max token usage should be the primary guardrail.
- Enforce a short response budget for both AI features.
- Add deterministic mock mode for demo/testing.

## 8) Error Handling And Fallbacks

Schedule AI failures:
- Timeout -> manual schedule entry form.
- Malformed output -> validation error and retry option.
- Provider unavailable -> manual fallback.

Chatbot failures:
- Cannot answer -> mailto ministry contact action.
- Service unavailable -> static FAQ page.
- Retrieval miss -> fallback to curated FAQ guidance.

Logging failures:
- Never block the user flow because of logging.

## 9) Security And Privacy Rules

- Do not send unnecessary PII to the provider.
- Redact sensitive fields before logging prompts or responses.
- Keep chat access limited to authenticated users.
- Keep schedule generation limited to event owners and team members.
- Avoid storing more history than necessary for the demo.

## 10) API Shape Expectations

Keep API responses explicit and stable.

### Schedule AI response should include

- draft_id
- event_id
- status
- provider
- generated_items
- created_at
- expires_at
- can_apply

### Chatbot response should include

- session_id
- answer
- citations
- form_link
- disclaimer
- fallback_action
- provider
- created_at

### Error response should include

- detail
- fallback_available
- fallback_type

## 11) Implementation Order

Build in this order:

1. Backend AI collections and models
2. Gemini client wrapper and mock mode
3. Regulatory rules collection and retrieval logic
4. Schedule AI generation and persistence
5. Schedule AI apply flow and manual edit support
6. Chatbot licensing endpoint and history persistence
7. Static FAQ fallback and mailto contact fallback
8. Frontend AI surfaces and review flows
9. Endpoint tests and demo-mode validation

## 12) Validation Plan

Validate each slice before moving on.

### Schedule AI validation

- Generate a draft for an event with known data.
- Confirm draft items are persisted.
- Confirm manual edit of persisted draft works.
- Confirm apply to calendar appends items without replacing existing ones.
- Confirm timeout path returns manual entry fallback.

### Chatbot validation

- Submit a licensing question as an authenticated user.
- Confirm answer contains a rule citation.
- Confirm answer contains a proposal form link when relevant.
- Confirm chatbot rejects non-Ethiopian legal guidance.
- Confirm `cannot answer` shows the mailto fallback.
- Confirm service unavailable shows the static FAQ page.

### Mock mode validation

- Enable mock mode.
- Confirm both schedule AI and chatbot remain usable offline.
- Confirm mocked responses are deterministic.

## 13) Explicit Exclusions

Do not implement in this AI phase:

- full autonomous agent loops
- multi-turn planning agent chains
- web browsing by the model
- revenue analytics
- accommodation AI
- notification preferences
- paid ticket checkout
- non-English chatbot responses
- automatic mutation of proposal or event data from chatbot answers

## 14) Master Prompt For Future AI Development Sessions

Paste the following prompt into a coding assistant when continuing AI development:

```text
You are my senior backend-first full-stack engineer for Global Connect Ethiopia.

Build only the AI part of the project. The non-AI Phase 1 and Phase 2 scope is already handled and must remain untouched unless a small integration change is required.

AI scope is locked to two features:
1. UC-19 Generate Event Schedule via AI
2. UC-20 Chatbot Inquiry for Licensing Rules

For UC-19:
- Available to organizers and team members.
- Inputs are exactly Event Type, Duration, and Start Time.
- Generate concrete hour-by-hour schedule items only.
- Do not generate relative-time-only drafts.
- Append new AI items to the database.
- Do not replace existing schedule records automatically.
- Persist the AI draft before applying.
- Allow manual edits on persisted draft items.
- Apply to Calendar should add the AI draft to the live calendar.
- If the AI times out, fall back to manual schedule entry.
- Retain AI draft records for 3 days.

For UC-20:
- Available to any authenticated user.
- Read-only advisory only.
- English only.
- Use Gemini API key as the primary provider.
- Store licensing rules in MongoDB collections.
- Return a plain answer, rule citation, and proposal form link when available.
- If the chatbot cannot answer, show a mailto link to contact a ministry official.
- If the service is unavailable, show a static FAQ page.
- Store chat history for 3 days.
- Add deterministic mock mode for demo reliability.
- Redact sensitive data in logs.

Implementation rules:
- Use MongoDB for persistence.
- Keep the architecture small and practical.
- Avoid broad document-management systems.
- Add only the endpoints needed for schedule AI, chatbot AI, history, FAQ, and fallback actions.
- Keep responses explicit and stable.
- Prefer deterministic behavior over open-ended model creativity.

Validation rules:
- Write focused tests for draft persistence, apply flow, chatbot citation flow, fallback behavior, and mock mode.
- Validate that schedule AI appends items instead of replacing them.
- Validate that chatbot answers are advisory only and contain the correct fallbacks.
- Validate that provider switching works through environment configuration.
```
