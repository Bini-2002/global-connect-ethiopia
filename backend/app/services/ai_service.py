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
        
        if AIService._is_mock_mode():
            # Deterministic mock response
            generated_items = [
                AiScheduleDraftItem(
                    title=f"Welcome & Registration ({constraints.event_type})",
                    start_time="09:00",
                    end_time="10:00",
                    category="Registration",
                    description="Arrival and registration of attendees",
                    order_index=0,
                    is_ai_suggestion=True
                ),
                AiScheduleDraftItem(
                    title="Opening Keynote",
                    start_time="10:00",
                    end_time="11:30",
                    category="Keynote",
                    description="Opening remarks and main keynote",
                    order_index=1,
                    is_ai_suggestion=True
                )
            ]
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
                    f"- Include breaks (coffee, lunch) as separate items\n\n"
                    f"Respond ONLY with a valid JSON array. No prose, no markdown fences. "
                    f"Each item must have exactly these keys: title, start_time, end_time, category, description.\n"
                    f"Example: [{{\"title\":\"Registration\",\"start_time\":\"08:30\",\"end_time\":\"09:00\","
                    f"\"category\":\"Logistics\",\"description\":\"Attendee check-in and badge collection\"}}]"
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
                generated_items = [
                    AiScheduleDraftItem(
                        title=f"Welcome & Registration ({constraints.event_type})",
                        start_time="09:00",
                        end_time="10:00",
                        category="Registration",
                        description="Arrival and registration of attendees",
                        order_index=0,
                        is_ai_suggestion=True,
                    ),
                    AiScheduleDraftItem(
                        title="Opening Keynote",
                        start_time="10:00",
                        end_time="11:30",
                        category="Keynote",
                        description="Opening remarks and main keynote",
                        order_index=1,
                        is_ai_suggestion=True,
                    ),
                ]

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
        event = await event_collection.find_one({"_id": parse_object_id(event_id)})
        base_date = event.get("start_date") or utc_now()

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
        # Simple text search or matching could go here, for now fetch all active
        rules_cursor = ai_regulatory_rule_collection.find({"active": True})
        rules = await rules_cursor.to_list(length=100)
        
        rule_context = "\n".join([f"Rule: {r['title']}\nText: {r['rule_text']}\nJurisdiction: {r['jurisdiction']}" for r in rules])

        citations = []
        form_link = None
        answer = ""

        if AIService._is_mock_mode():
            answer = "Based on the Ethiopian licensing rules, if you are organizing an event over 500 people, you need a police permit."
            citations.append(ChatbotCitation(title="Large Event Policy", source_reference="Police Directive 12/2023"))
            form_link = "https://example.com/police-permit-form"
        else:
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                prompt = (
                    f"You are an assistant for Global Connect Ethiopia. Answer ONLY about Ethiopian licensing and event-approval guidance. "
                    f"Do not invent legal details. Use the following regulatory knowledge base:\n{rule_context}\n\n"
                    f"User question: {request.query}\n\n"
                    f"If you don't know the answer or the context doesn't have it, reply exactly with: 'I cannot answer this based on my current knowledge base.' "
                    f"Otherwise, provide the answer."
                )
                response = model.generate_content(prompt)
                answer = response.text.strip()
                
                # In a real implementation, we would extract citations and form links from the LLM output 
                # or match them based on the rules we passed. For demo purposes we can attach a generic citation if we know what rule matched.
                if rules:
                    first_rule = rules[0]
                    citations.append(ChatbotCitation(title=first_rule["title"], source_reference=first_rule["source_reference"]))
                    form_link = first_rule.get("proposal_form_link")
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
