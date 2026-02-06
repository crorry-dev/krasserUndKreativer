"""
User authentication and invite system router.
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import jwt
import os
from datetime import datetime, timedelta

from src.models.users import (
    User, UserCreate, UserLogin, UserPublic,
    get_user_by_email, get_user_by_id, get_user_by_invite_code,
    create_user, get_invite_tree, get_all_users_with_donations,
    get_donation_stats, record_donation, users_db, verify_password
)

router = APIRouter(tags=["users"])
security = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30


def create_token(user_id: str) -> str:
    """Create a JWT token for a user."""
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    """Verify a JWT token and return user_id."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """Get current user from token."""
    if not credentials:
        return None
    
    user_id = verify_token(credentials.credentials)
    if not user_id:
        return None
    
    return get_user_by_id(user_id)


async def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Require authenticated user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Nicht angemeldet")
    
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Ungültiges Token")
    
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
    
    return user


async def require_admin(user: User = Depends(require_user)) -> User:
    """Require admin user."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Keine Admin-Rechte")
    return user


# Response models
class TokenResponse(BaseModel):
    token: str
    user: UserPublic


class InviteCheckResponse(BaseModel):
    valid: bool
    inviter_name: Optional[str] = None
    message: str


class MyInviteResponse(BaseModel):
    code: str
    can_invite: bool
    invited_user: Optional[str] = None


# Routes

@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    """
    Register a new user with an invite code.
    Each user can only be invited by one person.
    """
    # Check if email already exists
    if get_user_by_email(data.email):
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
    
    # Validate invite code
    inviter = get_user_by_invite_code(data.invite_code)
    if not inviter:
        raise HTTPException(status_code=400, detail="Ungültiger Einladungscode")
    
    # Check if inviter has already used their invite
    if inviter.has_used_invite:
        raise HTTPException(
            status_code=400, 
            detail="Dieser Einladungscode wurde bereits verwendet"
        )
    
    # Create user
    user = create_user(
        email=data.email,
        name=data.name,
        password=data.password,
        invited_by=inviter.id,
    )
    
    # Create token
    token = create_token(user.id)
    
    # Build public user response
    user_public = UserPublic(
        id=user.id,
        name=user.name,
        invite_code=user.invite_code,
        has_used_invite=user.has_used_invite,
        total_donated=user.total_donated,
        created_at=user.created_at,
        invited_by_name=inviter.name,
    )
    
    return TokenResponse(token=token, user=user_public)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Login with email and password."""
    user = get_user_by_email(data.email)
    
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    token = create_token(user.id)
    
    # Get inviter/invited names
    inviter = get_user_by_id(user.invited_by) if user.invited_by else None
    invited = get_user_by_id(user.invited_user_id) if user.invited_user_id else None
    
    user_public = UserPublic(
        id=user.id,
        name=user.name,
        invite_code=user.invite_code,
        has_used_invite=user.has_used_invite,
        total_donated=user.total_donated,
        created_at=user.created_at,
        invited_by_name=inviter.name if inviter else None,
        invited_user_name=invited.name if invited else None,
    )
    
    return TokenResponse(token=token, user=user_public)


@router.get("/me", response_model=UserPublic)
async def get_me(user: User = Depends(require_user)):
    """Get current user info."""
    inviter = get_user_by_id(user.invited_by) if user.invited_by else None
    invited = get_user_by_id(user.invited_user_id) if user.invited_user_id else None
    
    return UserPublic(
        id=user.id,
        name=user.name,
        invite_code=user.invite_code,
        has_used_invite=user.has_used_invite,
        total_donated=user.total_donated,
        created_at=user.created_at,
        invited_by_name=inviter.name if inviter else None,
        invited_user_name=invited.name if invited else None,
    )


@router.get("/invite/check/{code}", response_model=InviteCheckResponse)
async def check_invite_code(code: str):
    """Check if an invite code is valid."""
    inviter = get_user_by_invite_code(code)
    
    if not inviter:
        return InviteCheckResponse(
            valid=False,
            message="Ungültiger Einladungscode"
        )
    
    if inviter.has_used_invite:
        return InviteCheckResponse(
            valid=False,
            inviter_name=inviter.name,
            message=f"{inviter.name} hat bereits jemanden eingeladen"
        )
    
    return InviteCheckResponse(
        valid=True,
        inviter_name=inviter.name,
        message=f"Einladung von {inviter.name}"
    )


@router.get("/invite/my", response_model=MyInviteResponse)
async def get_my_invite(user: User = Depends(require_user)):
    """Get current user's invite code and status."""
    invited = get_user_by_id(user.invited_user_id) if user.invited_user_id else None
    
    return MyInviteResponse(
        code=user.invite_code,
        can_invite=not user.has_used_invite,
        invited_user=invited.name if invited else None,
    )


@router.get("/invite/tree")
async def get_my_invite_tree(user: User = Depends(require_user)):
    """Get the invite tree starting from current user."""
    # Walk up to find root
    root_id = user.id
    current = user
    
    while current.invited_by:
        root_id = current.invited_by
        parent = get_user_by_id(current.invited_by)
        if not parent:
            break
        current = parent
    
    tree = get_invite_tree(root_id)
    return tree


# Admin routes

@router.get("/admin/users")
async def admin_list_users(admin: User = Depends(require_admin)):
    """List all users with donation info (admin only)."""
    return get_all_users_with_donations()


@router.get("/admin/stats")
async def admin_get_stats(admin: User = Depends(require_admin)):
    """Get donation statistics (admin only)."""
    stats = get_donation_stats()
    stats["users"] = len(users_db)
    return stats


@router.get("/admin/tree")
async def admin_get_full_tree(admin: User = Depends(require_admin)):
    """Get full invite tree from admin (admin only)."""
    return get_invite_tree("admin")
