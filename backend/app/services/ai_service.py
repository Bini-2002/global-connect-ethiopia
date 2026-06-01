import json
import logging
import uuid
from statistics import median
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import google.generativeai as genai
from pydantic import BaseModel

from app.core.config import settings
from app.db.mongodb import (
    ai_chat_message_collection,
    ai_chat_session_collection,
    ai_proposal_form_link_collection,
    ai_regulatory_rule_collection,
    ai_schedule_draft_collection,
    ai_schedule_draft_item_collection,
    contract_collection,
    event_schedule_collection
)
from app.schemas.ai import (
    AiScheduleDraftCreate,
    AiScheduleDraftItem,
    AiScheduleDraftResponse,
    ChatbotCitation,
    ChatbotRequest,
    ChatbotResponse,
    ChatSessionRecord,
    ChatMessageRecord
)
from app.services.marketplace import utc_now, parse_object_id

logger = logging.getLogger(__name__)

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)


GLOBAL_CONNECT_ETHIOPIA_SPECIFICATIONS = """
System: Global Connect Ethiopia – International Professional Event Hub
Overview: Global Connect Ethiopia is a unified digital ecosystem designed for professional events in Ethiopia, empowering clients to independently plan, manage, and host professional events.

Roles in the System:
- Organizer: Submits event proposals, creates/publishes events, manages budget, assigns tasks, reserves venues, requests quotes, and reviews task completions.
- Vendor: Lists services, responds to quote requests, signs contracts.
- Attendee: Purchases tickets, registers, and check-in to sessions, reserves hotel accommodations.
- Government Reviewer (Ministry): Reviews event proposals, approves or rejects, issues Verification Letters.
- Municipal Officer: Reviews Ministry-verified proposals, checks local calendar/safety, issues Location Allowance, and notifies police.
- Local Authority / Police: Reviews security feasibility and coordinates safety.
- Team Member: Active in event, views tasks, opens scoped workspace, and completes tasks.
- Admin: Platform maintenance, user/vendor moderation (TIN verification).

Core System Workflows & Rules:
1. Event Proposal Workflow (UC-01 & UC-02):
   - Organizer submits a proposal with title, event type, dates, budget summary, expected attendees, venue request, security plan, and uploads PDFs (organizer registration, insurance, draft contracts).
   - Ministry Review: Government Reviewer (Ministry) inspects proposal. Options: Approve (generates a digitally signed Verification Letter and forwards to Municipal queue, notifying Organizer), Revision Request (status becomes 'Requires Revision'), or Reject.
2. Municipal Permit & Police Notification (UC-03):
   - Municipal Officer receives Ministry-verified proposal, checks location and safety. If approved, issues Location Allowance and submits security notification to the nearest police station. Status becomes 'Municipal Approved'.
3. Event Creation & Publishing (UC-04 & UC-10):
   - Organizer selects 'Create Event' and fills metadata (title, category, expected attendees, capacity, VIP list). Location must link to the Municipal Location Allowance.
   - When clicked 'Publish', the system checks the Permit status. If the permit is missing or rejected, publishing is blocked.
4. Venue Reservation (UC-05):
   - Organizer requests venue reservations. Linked to the event.
5. Vendor Registration & Approval (UC-06 & UC-07):
   - Vendor registers with business profile, tax identification number (TIN), trade license copy. Admin verifies TIN/documents and approves to publish vendor service listings.
6. Quote & Contracting Workflow (UC-08 & UC-09):
   - Organizer requests quotes from approved vendors. Vendor can reply with quotes or counter-offers.
   - Quote accepted → Booking status becomes 'Booked'. Platform generates a draft contract with milestones.
   - Organizer and Vendor e-sign the contract.
7. Ticketing & Overbooking Prevention (UC-10, UC-11, UC-12):
   - Organizer configures ticket types (VIP, General) and inventory levels.
   - Attendees purchase tickets using integrated local gateways (Telebirr, Chapa, or bank transfers).
   - System prevents overbooking automatically using transactional locking (optimistic concurrency) to lock seats temporarily during checkout.
8. Check-in & Badge Printing (UC-13):
   - System generates printable badges with QR codes and role labels (Attendee, Vendor, VIP, Speaker). Attendees check in on-site by scanning the QR code.
9. On-site Incident Reporting (UC-14):
   - On-site staff logs incidents (type, time, severity [Low, Medium, High, Critical], description, photos). Severe incidents notify the Organizer and local police.
10. Feedback Survey (UC-15):
    - After completion, the system automatically dispatches feedback surveys to collect attendee satisfaction, NPS, and vendor ratings.
11. Lessons Learned & Roadmap (UC-16):
    - Organizer drafts final roadmap (costs, lessons learned) and sets visibility.
12. Task Escrow & Payout:
    - Escrow locks funds from the Organizer's wallet immediately when a task is created/assigned to a team member with a payout amount.
    - Releasing task escrow pays out 100% of the locked funds to the team member on Organizer approval.
13. VIP Hotel Bookings:
    - Organizers can reserve rooms at mock hotels for special guests. The system saves the reservation and emails details/notifications directly to the special guests.
14. Platform Commission Fee:
    - The platform charges a 5% transaction commission fee from both the Organizer (5%) and the Vendor (5%) upon contract payment completion.
"""


class AIService:
    @staticmethod
    def _is_mock_mode() -> bool:
        return settings.AI_MOCK_MODE or not settings.GEMINI_API_KEY

    @staticmethod
    async def generate_schedule_draft(
        event_id: str,
        organizer_id: str,
        constraints: AiScheduleDraftCreate
    ) -> AiScheduleDraftResponse:
        now = utc_now()
        expires_at = now + timedelta(days=3)
        
        draft_id = str(uuid.uuid4())
        
        # Enriched default items matching GC Ethiopia workflows
        enriched_default_items = [
            AiScheduleDraftItem(
                title="Attendee Check-in & QR Badge Printing",
                start_time="08:00",
                end_time="09:00",
                category="Logistics",
                description="On-site check-in using tickets and printing QR-enabled badges.",
                order_index=0,
                is_ai_suggestion=True
            ),
            AiScheduleDraftItem(
                title="Local Authorities & Police Security Briefing",
                start_time="09:00",
                end_time="09:30",
                category="Security",
                description="Final security clearance briefing with municipal police representatives.",
                order_index=1,
                is_ai_suggestion=True
            ),
            AiScheduleDraftItem(
                title="Opening Ceremony & Welcome",
                start_time="09:30",
                end_time="10:30",
                category="Keynote",
                description="Official welcome remarks by government and industry representatives.",
                order_index=2,
                is_ai_suggestion=True
            ),
            AiScheduleDraftItem(
                title="VIP Hotel Accommodation Check-in",
                start_time="10:30",
                end_time="11:30",
                category="VIP Services",
                description="Coordination and room keys check-in for special guests at mock hotels.",
                order_index=3,
                is_ai_suggestion=True
            ),
            AiScheduleDraftItem(
                title=f"Industry Panel Focus ({constraints.event_type})",
                start_time="11:30",
                end_time="13:00",
                category="Education",
                description=f"Key topics and discussions in the area of {constraints.event_type}.",
                order_index=4,
                is_ai_suggestion=True
            ),
            AiScheduleDraftItem(
                title="Lunch & Vendor Marketplace Showcase",
                start_time="13:00",
                end_time="14:30",
                category="Catering",
                description="Networking lunch and exhibition of services by verified platform vendors.",
                order_index=5,
                is_ai_suggestion=True
            ),
            AiScheduleDraftItem(
                title="B2B Matchmaking & Vendor Spotlight",
                start_time="14:30",
                end_time="16:00",
                category="Networking",
                description="Direct matching sessions between event organizers, attendees, and vendors.",
                order_index=6,
                is_ai_suggestion=True
            ),
            AiScheduleDraftItem(
                title="Post-Event Survey & Feedback Dispatch",
                start_time="16:00",
                end_time="16:30",
                category="Evaluation",
                description="Automatic feedback collection via the post-event NPS survey system.",
                order_index=7,
                is_ai_suggestion=True
            ),
            AiScheduleDraftItem(
                title="Task Escrow & Vendor Payout Settlement",
                start_time="16:30",
                end_time="17:00",
                category="Finance",
                description="Finalizing payout releases and processing the 5% platform commission fees.",
                order_index=8,
                is_ai_suggestion=True
            )
        ]

        if AIService._is_mock_mode():
            generated_items = enriched_default_items
        else:
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')

                # ── Per-event-type expert prompts ──────────────────────────
                EVENT_TYPE_PROMPTS: dict[str, str] = {
                    "conference": (
                        "You are an expert conference planner. Design a professional multi-track conference schedule.\n"
                        "Include: Registration & Networking, Opening Keynote (high-profile speaker), 2-3 breakout/panel sessions per half-day, "
                        "sponsored lunch break with sponsor showcase, afternoon sessions with Q&A, Closing Remarks, and optional Evening Networking Dinner.\n"
                        "CRITICAL: Do NOT generate generic titles like 'Session 1'. Generate specific, creative session names (e.g., 'The Future of AI Innovation', 'Panel: Global Economic Trends')."
                    ),
                    "summit_forum": (
                        "You are an expert executive summit and forum planner. Design a high-level summit schedule.\n"
                        "Include: VIP Breakfast Briefing, Plenary Session, Expert Panel Discussions, Closed-door roundtable, "
                        "Press conference, and a formal closing declaration.\n"
                        "CRITICAL: Do NOT generate generic titles like 'Session 1'. Generate specific, high-level session names (e.g., 'Ministerial Dialogue on Policy', 'CEO Roundtable: Investment Opportunities')."
                    ),
                    "workshop_training": (
                        "You are an expert corporate L&D facilitator. Design a focused training workshop agenda.\n"
                        "Include: Welcome & icebreaker activity, Pre-assessment or knowledge check, Theory presentation, "
                        "Group discussion & case study, Hands-on workshop exercise, Team presentation of findings, Expert feedback session.\n"
                        "CRITICAL: Do NOT generate generic titles like 'Session 1'. Generate specific, actionable session names (e.g., 'Mastering Python Data Structures', 'Interactive Case Study: Crisis Management')."
                    ),
                    "expo_trade_fair": (
                        "You are an expert trade fair and exhibition organizer. Design a commercial B2B trade fair schedule.\n"
                        "Include: VIP early access hour, Official opening ceremony with ribbon cutting, Exhibition hall open to public, "
                        "Hourly exhibitor spotlight presentations, Business matchmaking sessions, Product demonstration slots, "
                        "Award ceremony for best exhibitor, Closing ceremony.\n"
                        "CRITICAL: Do NOT generate generic titles like 'Session 1'. Generate specific, commercial session names (e.g., 'Product Showcase: Green Tech', 'B2B Matchmaking Mixer')."
                    ),
                    "networking_gala": (
                        "You are an expert gala and networking event coordinator. Design a formal networking gala timeline.\n"
                        "Include: Red carpet arrivals, Welcome reception with cocktails/mocktails, Opening address by host, "
                        "Dinner service (multi-course), Keynote speech or entertainment segment, Awards presentation ceremony, "
                        "Open networking & dessert, Closing toast.\n"
                        "CRITICAL: Do NOT generate generic titles like 'Session 1'. Generate specific, elegant session names (e.g., 'Annual Excellence Awards Presentation', 'VIP Champagne Reception')."
                    ),
                }

                # Normalize event type and pick the matching prompt
                normalized = constraints.event_type.lower().replace(" ", "_").replace("-", "_")
                type_prompt = None
                for key in EVENT_TYPE_PROMPTS:
                    if key in normalized or normalized in key:
                        type_prompt = EVENT_TYPE_PROMPTS[key]
                        break
                if not type_prompt:
                    # Fallback for any other event type
                    type_prompt = (
                        "You are an expert event planner. Design a professional and detailed event schedule. "
                        "Include a logical flow from registration through main programming to closing."
                    )

                prompt = (
                    f"{type_prompt}\n\n"
                    f"Event Type: {constraints.event_type}\n"
                    f"Duration: {constraints.duration_days} day(s)\n"
                    f"Start Time: {constraints.start_time}\n\n"
                    f"Rules:\n"
                    f"- Generate all sessions for all {constraints.duration_days} day(s)\n"
                    f"- Use realistic time blocks (30 min minimum per session)\n"
                    f"- All times must be in HH:MM 24-hour format\n"
                    f"- End time of each session must be after its start time\n"
                    f"- Sessions must not overlap\n"
                    f"- Include breaks (coffee, lunch) as separate items\n"
                    f"- Incorporate specific operational phases of Global Connect Ethiopia in the schedule:\n"
                    f"  1. Start of Day 1 MUST include 'Attendee Check-in & QR Badge Printing' under category 'Logistics'.\n"
                    f"  2. Early Day 1 MUST include 'Local Authorities & Police Security Briefing' under category 'Security' for safety and permit alignment.\n"
                    f"  3. Incorporate VIP guest transport/hotel check-ins or VIP hotel accommodation slots under category 'VIP Services'.\n"
                    f"  4. Integrate B2B Matchmaking or Vendor Spotlight sessions under category 'Networking' to engage platform vendors.\n"
                    f"  5. The end of the event MUST include 'Post-Event Survey & Feedback Dispatch' under category 'Evaluation'.\n"
                    f"  6. Include a brief 'Task Escrow Payout Settlement' slot or 'Vendor Payouts Closure' under category 'Finance' near the end of the timeline.\n\n"
                    f"Respond ONLY with a valid JSON array. No prose, no markdown fences. "
                    f"Each item must have exactly these keys: title, start_time, end_time, category, description.\n"
                    f"Example: [{{\"title\":\"Attendee Check-in & QR Badge Printing\",\"start_time\":\"08:00\",\"end_time\":\"09:00\","
                    f"\"category\":\"Logistics\",\"description\":\"On-site check-in using tickets and printing QR-enabled badges.\"}}]"
                )

                response = model.generate_content(prompt)
                response_text = response.text.strip()
                # Strip markdown fences if Gemini wraps output
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()

                try:
                    data = json.loads(response_text)
                    if not isinstance(data, list):
                        raise ValueError("Expected a JSON array")
                    generated_items = []
                    for idx, item in enumerate(data):
                        generated_items.append(
                            AiScheduleDraftItem(
                                title=item.get("title", "Session"),
                                start_time=item.get("start_time", "00:00"),
                                end_time=item.get("end_time", "01:00"),
                                category=item.get("category", "General"),
                                description=item.get("description", ""),
                                order_index=idx,
                                is_ai_suggestion=True,
                                applied=False,
                            )
                        )
                except (json.JSONDecodeError, ValueError):
                    raise Exception("Malformed AI output — could not parse schedule JSON")
            except Exception as e:
                logger.error(f"Gemini scheduler error: {e}")
                generated_items = enriched_default_items

        # Store draft
        draft_doc = {
            "id": draft_id,
            "event_id": event_id,
            "organizer_id": organizer_id,
            "input_constraints": constraints.model_dump(),
            "provider": "mock" if AIService._is_mock_mode() else "gemini",
            "status": "pending_review",
            "created_at": now,
            "expires_at": expires_at,
            "can_apply": True
        }
        await ai_schedule_draft_collection.insert_one(draft_doc)

        for item in generated_items:
            item_doc = item.model_dump()
            item_doc["draft_id"] = draft_id
            await ai_schedule_draft_item_collection.insert_one(item_doc)

        return AiScheduleDraftResponse(
            id=draft_id,
            event_id=event_id,
            organizer_id=organizer_id,
            input_constraints=constraints.model_dump(),
            provider=draft_doc["provider"],
            status=draft_doc["status"],
            generated_items=generated_items,
            created_at=draft_doc["created_at"],
            expires_at=draft_doc["expires_at"],
            can_apply=draft_doc["can_apply"]
        )

    @staticmethod
    async def recommend_service_price_range(
        *,
        query: str | None = None,
        category: str | None = None,
        location: str | None = None,
        candidate_services: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        services = candidate_services or []
        listing_prices: list[float] = []
        for service in services:
            low = service.get("price_min")
            high = service.get("price_max")
            if low is not None:
                listing_prices.append(float(low))
            if high is not None:
                listing_prices.append(float(high))

        historical_prices: list[float] = []
        contracts = await contract_collection.find({"price": {"$gt": 0}}, projection={"price": 1}).to_list(length=300)
        for contract in contracts:
            try:
                historical_prices.append(float(contract.get("price", 0.0)))
            except (TypeError, ValueError):
                continue

        if AIService._is_mock_mode() or not services:
            pool = listing_prices or historical_prices or [0.0]
            base = median(pool)
            spread = max(base * 0.15, 500.0)
            return {
                "recommended_price_min": round(max(base - spread, 0.0), 2),
                "recommended_price_max": round(base + spread, 2),
                "price_recommendation_source": "mock" if AIService._is_mock_mode() else "market_data",
            }

        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            prompt = (
                "You are recommending a market price range for event service providers.\n"
                f"Search query: {query or 'none'}\n"
                f"Category: {category or 'none'}\n"
                f"Location: {location or 'none'}\n"
                f"Candidate services: {json.dumps(services[:10], default=str)}\n"
                f"Historical contract prices: {historical_prices[:50]}\n"
                "Return strict JSON with recommended_price_min, recommended_price_max, and a short rationale."
            )
            response = model.generate_content(prompt)
            response_text = (response.text or "").strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            data = json.loads(response_text)
            return {
                "recommended_price_min": float(data.get("recommended_price_min", 0.0)),
                "recommended_price_max": float(data.get("recommended_price_max", 0.0)),
                "price_recommendation_source": "gemini",
                "rationale": data.get("rationale"),
            }
        except Exception as exc:
            logger.error(f"Gemini price recommendation error: {exc}")
            pool = listing_prices or historical_prices or [0.0]
            base = median(pool)
            spread = max(base * 0.15, 500.0)
            return {
                "recommended_price_min": round(max(base - spread, 0.0), 2),
                "recommended_price_max": round(base + spread, 2),
                "price_recommendation_source": "fallback",
            }

    @staticmethod
    async def get_schedule_draft(draft_id: str) -> Optional[AiScheduleDraftResponse]:
        draft = await ai_schedule_draft_collection.find_one({"id": draft_id})
        if not draft:
            return None
            
        items_cursor = ai_schedule_draft_item_collection.find({"draft_id": draft_id}).sort("order_index", 1)
        items = await items_cursor.to_list(length=100)
        
        generated_items = [AiScheduleDraftItem(**item) for item in items]
        
        return AiScheduleDraftResponse(
            id=draft["id"],
            event_id=draft["event_id"],
            organizer_id=draft["organizer_id"],
            input_constraints=draft["input_constraints"],
            provider=draft["provider"],
            status=draft["status"],
            generated_items=generated_items,
            created_at=draft["created_at"],
            expires_at=draft["expires_at"],
            can_apply=draft["can_apply"]
        )

    @staticmethod
    async def update_schedule_draft(draft_id: str, items: List[AiScheduleDraftItem]):
        # Remove old items and insert new ones
        await ai_schedule_draft_item_collection.delete_many({"draft_id": draft_id})
        
        for idx, item in enumerate(items):
            item_doc = item.model_dump()
            item_doc["draft_id"] = draft_id
            item_doc["order_index"] = idx
            await ai_schedule_draft_item_collection.insert_one(item_doc)

    @staticmethod
    async def apply_schedule_draft(draft_id: str, event_id: str, items: List[AiScheduleDraftItem]):
        now = utc_now()
        draft = await ai_schedule_draft_collection.find_one({"id": draft_id, "event_id": event_id})
        if not draft:
            raise ValueError("Draft not found")

        from app.db.mongodb import event_collection
        from app.services.marketplace import parse_object_id
        event = await event_collection.find_one({"_id": parse_object_id(event_id, field_name="event_id")})
        base_date_val = event.get("start_date") if event else None
        
        if isinstance(base_date_val, str):
            try:
                base_date = datetime.fromisoformat(base_date_val.replace("Z", "+00:00"))
            except Exception:
                base_date = utc_now()
        elif isinstance(base_date_val, datetime):
            base_date = base_date_val
        else:
            base_date = utc_now()

        current_day_offset = 0
        last_time_minutes = -1

        # Insert items to actual event schedule collection
        schedule_docs = []
        for item in items:
            # Parse HH:MM
            try:
                start_h, start_m = [int(p) for p in item.start_time.split(":", 1)]
                end_h, end_m = [int(p) for p in item.end_time.split(":", 1)]
            except Exception:
                start_h, start_m = 9, 0
                end_h, end_m = 10, 0

            start_total_mins = start_h * 60 + start_m
            end_total_mins = end_h * 60 + end_m

            # If time drops (e.g. from 17:00 back to 09:00), we moved to the next day
            if last_time_minutes != -1 and start_total_mins < (last_time_minutes - 120):
                current_day_offset += 1

            last_time_minutes = end_total_mins

            item_start_date = base_date + timedelta(days=current_day_offset)
            start_dt = item_start_date.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
            
            # If end time is before start time, it might be past midnight
            end_day_offset = current_day_offset
            if end_total_mins < start_total_mins:
                end_day_offset += 1
                
            item_end_date = base_date + timedelta(days=end_day_offset)
            end_dt = item_end_date.replace(hour=end_h, minute=end_m, second=0, microsecond=0)

            schedule_docs.append({
                "event_id": event_id,
                "session_title": item.title,
                "description": item.description,
                "start_time": start_dt,
                "end_time": end_dt,
                "is_ai_suggestion": True,
                "created_at": now,
                "updated_at": now
            })
        
        if schedule_docs:
            await event_schedule_collection.insert_many(schedule_docs)

        # Update draft status
        await ai_schedule_draft_collection.update_one(
            {"id": draft_id},
            {"$set": {"status": "applied", "applied_at": now, "can_apply": False}}
        )

    @staticmethod
    async def process_chatbot_query(request: ChatbotRequest, user_id: str) -> ChatbotResponse:
        now = utc_now()
        session_id = request.session_id
        
        if not session_id:
            session_id = str(uuid.uuid4())
            session = ChatSessionRecord(
                id=session_id,
                user_id=user_id,
                role="user",
                expires_at=now + timedelta(days=3)
            )
            await ai_chat_session_collection.insert_one(session.model_dump())
        
        # Save user message
        user_msg = ChatMessageRecord(
            session_id=session_id,
            direction="user",
            text=request.query
        )
        await ai_chat_message_collection.insert_one(user_msg.model_dump())

        # Retrieve relevant rules from MongoDB
        rules_cursor = ai_regulatory_rule_collection.find({"active": True})
        rules = await rules_cursor.to_list(length=100)
        
        rule_context = "\n".join([f"Rule: {r['title']}\nText: {r['rule_text']}\nJurisdiction: {r['jurisdiction']}" for r in rules])

        citations = []
        form_link = None
        answer = ""

        if AIService._is_mock_mode():
            answer = (
                "I am the Global Connect Ethiopia assistant. I can give a general overview of how the platform works: event proposals, approval steps, permits, ticketing, vendor coordination, check-ins, hotel bookings, task assignments, and payment flow. "
                "If you want, I can summarize one area at a high level, such as proposals, permits, tickets, vendors, or event operations."
            )
            citations.append(ChatbotCitation(title="General Platform Overview", source_reference="Global Connect specifications"))
        else:
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                system_spec = GLOBAL_CONNECT_ETHIOPIA_SPECIFICATIONS
                rule_context_full = system_spec + "\n\nAdditional Database Rules:\n" + rule_context
                prompt = (
                    f"You are a helpful assistant for Global Connect Ethiopia. "
                    f"Answer at a broad, concept level based on the following system specifications and regulatory rules:\n"
                    f"{rule_context_full}\n\n"
                    f"User question: {request.query}\n\n"
                    f"Guidelines:\n"
                    f"- Keep the answer general and conceptual instead of highly specific or procedural.\n"
                    f"- Summarize the main idea, the likely workflow, and a few broad next steps.\n"
                    f"- If the question is very specific, still respond with the closest high-level overview rather than refusing.\n"
                    f"- Provide a professional and concise answer."
                )
                response = model.generate_content(prompt)
                answer = response.text.strip()
                
                if rules:
                    first_rule = rules[0]
                    citations.append(ChatbotCitation(title=first_rule["title"], source_reference=first_rule["source_reference"]))
                    form_link = first_rule.get("proposal_form_link")
                else:
                    citations.append(ChatbotCitation(title="Global Connect Specifications", source_reference="Project documentation"))
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
                raise Exception("Service unavailable")

        fallback_action = None
        if "cannot answer" in answer.lower():
            fallback_action = "mailto_contact"

        assistant_msg = ChatMessageRecord(
            session_id=session_id,
            direction="assistant",
            text=answer,
            citations=[c.model_dump() for c in citations],
            form_link=form_link,
            provider_name="mock" if AIService._is_mock_mode() else "gemini"
        )
        await ai_chat_message_collection.insert_one(assistant_msg.model_dump())

        return ChatbotResponse(
            session_id=session_id,
            answer=answer,
            citations=citations,
            form_link=form_link,
            provider="mock" if AIService._is_mock_mode() else "gemini",
            fallback_action=fallback_action,
            created_at=now
        )
