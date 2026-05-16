from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# --- MOCK DB FALLBACK ---
if getattr(settings, "USE_MOCK_DB", False):
    from mongomock_motor import AsyncMongoMockClient as MockClient
    client = MockClient()
else:
    client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
# ------------------------

db = client[settings.DATABASE_NAME]

# users collection
user_collection = db.users

# sessions collection
session_collection = db.sessions

profile_collection = db.profiles
vendor_collection = db.vendors
organizer_collection = db.organizers
document_collection = db.documents
permit_collection = db.permits
verification_letter_collection = db.verification_letters
police_notification_collection = db.police_notifications
verification_job_collection = db.verification_jobs
verification_result_collection = db.verification_results

# proposals collection
proposal_collection = db.proposals

# post-approval event lifecycle collections
event_collection = db.events
event_schedule_collection = db.event_schedules
venue_listing_collection = db.venue_listings
venue_reservation_collection = db.venue_reservations
event_team_invitation_collection = db.event_team_invitations
event_team_member_collection = db.event_team_members
event_task_collection = db.event_tasks
vip_reservation_collection = db.vip_reservations
ticket_type_collection = db.ticket_types
ticket_purchase_collection = db.ticket_purchases
badge_collection = db.badges
event_announcement_collection = db.event_announcements
announcement_delivery_collection = db.announcement_deliveries
event_incident_collection = db.event_incidents
feedback_survey_collection = db.feedback_surveys
feedback_response_collection = db.feedback_responses
event_final_report_collection = db.event_final_reports

# marketplace collections
vendor_service_collection = db.vendor_services
request_collection = db.requests
marketplace_opportunity_collection = db.marketplace_opportunities
opportunity_proposal_collection = db.opportunity_proposals
contract_collection = db.contracts
transaction_collection = db.transactions
wallet_collection = db.wallets
withdrawal_collection = db.withdrawals
message_collection = db.messages

# notifications collection
notification_collection = db.notifications

# VIP hotel reservations (legacy simple form)
vip_hotel_reservation_collection = db.vip_hotel_reservations

# VIP hotel room reservations (vendor-linked, escrow payment)
vip_hotel_room_reservation_collection = db.vip_hotel_room_reservations

# AI collections
ai_schedule_draft_collection = db.ai_schedule_drafts
ai_schedule_draft_item_collection = db.ai_schedule_draft_items
ai_chat_session_collection = db.ai_chat_sessions
ai_chat_message_collection = db.ai_chat_messages
ai_regulatory_rule_collection = db.ai_regulatory_rules
ai_proposal_form_link_collection = db.ai_proposal_form_links
