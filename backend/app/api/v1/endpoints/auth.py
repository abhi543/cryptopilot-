from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserCreate, UserResponse

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> Any:
    """Register a new user account (Phase 1 local/dev endpoint)."""
    stmt = select(User).where((User.email == user_in.email) | (User.username == user_in.username))
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or username already exists"
        )

    # In Phase 1 we mock password hashing for development baseline
    # Full bcrypt/argon2 can be wired in production auth
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=f"hash_{user_in.password}", # Placeholder secure hashing
        is_active=True,
        is_superuser=False
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
async def get_current_user_stub() -> Any:
    """Return default developer user profile for Phase 1 development."""
    return {
        "id": "dev-user-001",
        "email": "trader@cryptopilot.local",
        "username": "cryptopilot_lead",
        "is_active": True,
        "is_superuser": True,
        "created_at": "2026-11-21T00:00:00",
        "updated_at": "2026-11-21T00:00:00"
    }
