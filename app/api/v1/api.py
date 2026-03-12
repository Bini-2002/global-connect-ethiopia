from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin_proposals,
    admin_documents,
    auth,
    ministry_proposals,
    municipal_proposals,
    organizers,
    permits,
    proposals,
    users,
    vendors,
)

api_router = APIRouter()


api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendor Registration"])
api_router.include_router(proposals.router, prefix="/proposals", tags=["Organizer Proposals"])
api_router.include_router(admin_proposals.router, prefix="/admin/proposals", tags=["Admin Review"])
api_router.include_router(municipal_proposals.router, prefix="/municipal/proposals", tags=["Municipal Review"])
api_router.include_router(ministry_proposals.router, prefix="/ministry/proposals", tags=["Ministry Review"])
api_router.include_router(permits.router, prefix="/permits", tags=["Permits"])
api_router.include_router(organizers.router, prefix="/organizers", tags=["Organizer Registration"])
api_router.include_router(admin_documents.router, prefix="/admin", tags=["Admin Documents"])