from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin_proposals,
    admin_organizers,
    admin_documents,
    admin_vendors,
    auth,
    catalog,
    events,
    market_contracts,
    market_requests,
    ministry_proposals,
    municipal_proposals,
    offices,
    organizers,
    payments,
    permits,
    police_proposals,
    proposals,
    users,
    vendors_services,
    vendors,
    wallet,
)

api_router = APIRouter()


api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendor Registration"])
api_router.include_router(proposals.router, prefix="/proposals", tags=["Organizer Proposals"])
api_router.include_router(offices.router, prefix="/offices", tags=["Review Offices"])
api_router.include_router(admin_proposals.router, prefix="/admin/proposals", tags=["Admin Review - Proposals"])
api_router.include_router(admin_vendors.router, prefix="/admin/vendors", tags=["Admin Review - Vendor Registration"])
api_router.include_router(admin_organizers.router, prefix="/admin/organizers", tags=["Admin Review - Organizer Registration"])
api_router.include_router(ministry_proposals.router, prefix="/ministry/proposals", tags=["Ministry Review"])
api_router.include_router(municipal_proposals.router, prefix="/municipal/proposals", tags=["Municipal Review"])
api_router.include_router(police_proposals.router, prefix="/police/proposals", tags=["Police Portal"])
api_router.include_router(permits.router, prefix="/permits", tags=["Permits"])
api_router.include_router(organizers.router, prefix="/organizers", tags=["Organizer Registration"])
api_router.include_router(admin_documents.router, prefix="/admin", tags=["Admin Documents"])
api_router.include_router(vendors_services.router, prefix="/vendors/services", tags=["Vendor Services"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["Marketplace Catalog"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(market_requests.router, prefix="/requests", tags=["Vendor Requests"])
api_router.include_router(market_contracts.router, prefix="/contracts", tags=["Contracts"])
api_router.include_router(payments.router, prefix="/payments", tags=["Escrow Payments"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["Vendor Wallet"])
