from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, vendors, proposals, organizers

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(proposals.router, prefix="/proposals", tags=["Proposals"])
api_router.include_router(organizers.router, prefix="/organizers", tags=["Organizers"])