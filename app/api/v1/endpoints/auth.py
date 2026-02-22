from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.params import Depends
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token
from app.core import security
from app.db.mongodb import user_collection 
from app.api.v1.deps import RoleChecker
from app.models.roles import UserRole

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate):
    # 1. Check if the user already exists
    existing_user = await user_collection.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    hashed_password = security.get_password_hash(user_in.password)

    # 3. Prepare the data to be saved in MongoDB
    new_user_data = user_in.model_dump()
    new_user_data["password_hash"] = hashed_password
    new_user_data["is_active"] = True  # default to active when registering
    del new_user_data["password"] 

    # 4. Save to Local MongoDB
    result = await user_collection.insert_one(new_user_data)

    # 5. Return the response
    return {
        "id": str(result.inserted_id),
        "full_name": new_user_data["full_name"],
        "email": new_user_data["email"],
        "role": new_user_data["role"]
        }

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()): # type: ignore
    # 1. Look for the user in MongoDB
    user = await user_collection.find_one({"email": form_data.username})
    
    # 2. Check if user exists AND if password matches
    if not user or not security.verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check status
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account deactivated. Please contact the administrator."
        )

    # 3. If everything is correct, generate the JWT
    access_token = security.create_access_token(
        subject=str(user["_id"]), 
        role=user.get("role", "attendee")  # Default to 'attendee' if role is not set # type: ignore
        )

    # 4. Return the Token back to the frontend
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

