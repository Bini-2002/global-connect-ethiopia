"""
Seed script: Populates ai_regulatory_rules collection with Ethiopian event
licensing and regulatory knowledge base for the AI Chatbot.

Run once: python seed_ai_rules.py
"""
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "globalconnect"  # match your .env DATABASE_NAME

RULES = [
    {
        "id": "rule-001",
        "title": "Large Public Event Police Notification",
        "rule_text": (
            "Any public event expected to host more than 500 attendees in Ethiopia requires a formal "
            "notification to and approval from the Federal Police Commission at least 30 days before the event date. "
            "The organizer must submit a written request including event purpose, venue, date, expected headcount, "
            "and crowd control measures."
        ),
        "category": "Public Safety",
        "jurisdiction": "Federal – Ethiopia",
        "source_reference": "Federal Police Commission Directive No. 12/2023",
        "proposal_form_link": "https://www.federalpolice.gov.et/event-permit-form",
        "keywords": ["police", "permit", "500", "public event", "crowd", "notification"],
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": "rule-002",
        "title": "Event Business License Requirement",
        "rule_text": (
            "Event organizers operating commercially (charging entry fees, selling tickets, or collecting "
            "sponsorship funds) must hold a valid trade license (business license) issued by the relevant "
            "regional or federal trade bureau. The license must be renewed annually and presented upon "
            "request by government inspectors."
        ),
        "category": "Licensing",
        "jurisdiction": "Federal – Ethiopia",
        "source_reference": "Trade and Industry Proclamation No. 686/2010",
        "proposal_form_link": "https://www.moct.gov.et/trade-license",
        "keywords": ["business license", "trade license", "commercial event", "ticket", "sponsorship"],
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": "rule-003",
        "title": "Venue Safety and Fire Safety Certificate",
        "rule_text": (
            "Any event venue in Ethiopia must obtain a fire safety clearance certificate from the relevant "
            "municipal fire and emergency management bureau before the event date. Venues hosting more than "
            "200 people must demonstrate adequate emergency exits, fire extinguishers per 200 sq.m, and "
            "clearly marked evacuation routes. A venue inspection may be conducted within 5 days of the event."
        ),
        "category": "Safety",
        "jurisdiction": "Municipal – Addis Ababa, All Regions",
        "source_reference": "Addis Ababa Fire and Emergency Management Regulation 2019",
        "proposal_form_link": "https://www.aacsa.gov.et/fire-certificate",
        "keywords": ["fire", "safety", "venue", "emergency exit", "clearance", "certificate", "evacuation"],
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": "rule-004",
        "title": "International Event or Conference Foreign Participant Permit",
        "rule_text": (
            "Events that include foreign nationals as speakers, delegates, or exhibitors may require an "
            "event hosting permit from the Ministry of Foreign Affairs if the event has a diplomatic or "
            "official inter-governmental character. Additionally, foreign participants may need a conference "
            "visa (a category of Ethiopian visa). Organizers should communicate with the Ministry at least "
            "60 days in advance for international events."
        ),
        "category": "Immigration & Foreign Affairs",
        "jurisdiction": "Federal – Ethiopia",
        "source_reference": "Ministry of Foreign Affairs of Ethiopia – Event Hosting Protocol 2021",
        "proposal_form_link": "https://www.mfa.gov.et/conference-hosting",
        "keywords": ["international", "foreign", "conference", "visa", "delegate", "ministry of foreign affairs"],
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": "rule-005",
        "title": "Music and Entertainment Performance License",
        "rule_text": (
            "Events featuring live music performances, DJ sets, or theatrical performances must obtain an "
            "entertainment license from the Ethiopian Broadcasting Authority (EBA) and the relevant regional "
            "culture and tourism bureau. Organizers must also ensure that artists performing are licensed "
            "and their music rights are cleared to avoid copyright violations."
        ),
        "category": "Entertainment & Media",
        "jurisdiction": "Federal – Ethiopia",
        "source_reference": "Ethiopian Broadcasting Authority – Entertainment Event Guidelines 2020",
        "proposal_form_link": "https://www.eba.gov.et/entertainment-license",
        "keywords": ["music", "performance", "entertainment", "DJ", "artist", "concert", "broadcast", "copyright"],
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": "rule-006",
        "title": "Food and Beverage Catering Health Permit",
        "rule_text": (
            "Any event serving food or beverages (including alcohol) to more than 50 guests requires a "
            "temporary catering permit from the Ethiopian Food and Drug Authority (EFDA) and/or the "
            "municipal health bureau. Alcohol service additionally requires a liquor license, which must "
            "be obtained from the trade bureau at least 15 days before the event."
        ),
        "category": "Health & Food Safety",
        "jurisdiction": "Federal & Municipal – Ethiopia",
        "source_reference": "EFDA Food Safety Regulation 2018 & Addis Ababa Municipal Liquor Licensing Rules",
        "proposal_form_link": "https://www.efda.gov.et/catering-permit",
        "keywords": ["food", "catering", "alcohol", "liquor license", "health permit", "beverage", "EFDA"],
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": "rule-007",
        "title": "Tax Obligations for Commercial Events",
        "rule_text": (
            "Organizers of commercial events (paid ticket events, trade shows, exhibitions) are required to "
            "register with the Ethiopian Revenue and Customs Authority (ERCA) and declare income from ticket "
            "sales, booth fees, and sponsorships. VAT (15%) applies to gross ticket revenue if the organizer's "
            "annual turnover exceeds ETB 500,000. Withholding tax applies to payments made to performers and vendors."
        ),
        "category": "Taxation",
        "jurisdiction": "Federal – Ethiopia",
        "source_reference": "Income Tax Proclamation No. 979/2016, VAT Proclamation No. 285/2002",
        "proposal_form_link": "https://www.erca.gov.et/event-tax-registration",
        "keywords": ["tax", "VAT", "revenue", "ERCA", "income tax", "withholding", "ticket revenue", "commercial"],
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": "rule-008",
        "title": "Outdoor Event Environmental Impact",
        "rule_text": (
            "Outdoor events held in public parks, open grounds, or near water bodies in Ethiopia require an "
            "environmental impact clearance from the Ethiopian Environment, Forest and Climate Change Commission "
            "(EFCCC). This includes events that may produce significant noise, waste, or traffic congestion. "
            "The organizer must present a waste management and noise control plan."
        ),
        "category": "Environment",
        "jurisdiction": "Federal – Ethiopia",
        "source_reference": "Environmental Impact Assessment Proclamation No. 299/2002",
        "proposal_form_link": "https://www.efccc.gov.et/event-clearance",
        "keywords": ["outdoor", "environment", "noise", "waste", "park", "open ground", "impact assessment"],
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    collection = db.ai_regulatory_rules

    # Avoid duplicate seeding
    existing = await collection.count_documents({})
    if existing >= len(RULES):
        print(f"✅ Skipping seed — {existing} rules already in database.")
        client.close()
        return

    result = await collection.insert_many(RULES)
    print(f"✅ Seeded {len(result.inserted_ids)} regulatory rules into ai_regulatory_rules.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
