from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import secrets
import hashlib

from src.core.database import get_db
from src.models import GuestLink, Board

router = APIRouter()


def generate_link_code() -> str:
    """Generate a short, URL-friendly link code."""
    return secrets.token_urlsafe(8)[:12]


def hash_password(password: str) -> str:
    """Hash a password for storage."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return hash_password(password) == hashed


class GuestLinkCreate(BaseModel):
    expires_in_days: int = 14
    max_uses: Optional[int] = None
    password: Optional[str] = None
    permissions: str = "edit"  # 'edit' or 'view'


class GuestLinkResponse(BaseModel):
    id: str
    board_id: str
    expires_at: datetime
    max_uses: Optional[int]
    usage_count: int
    permissions: str
    has_password: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class GuestLinkPublicResponse(BaseModel):
    """Public info about a link (for join page)."""
    board_name: str
    requires_password: bool
    permissions: str
    expires_at: datetime
    is_valid: bool


class JoinRequest(BaseModel):
    password: Optional[str] = None
    display_name: str = "Anonymous"


class JoinResponse(BaseModel):
    success: bool
    board_id: str
    session_token: str
    permissions: str
    display_name: str


@router.get("/{board_id}/links", response_model=list[GuestLinkResponse])
async def list_guest_links(
    board_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all guest links for a board."""
    result = await db.execute(
        select(GuestLink)
        .where(GuestLink.board_id == board_id)
        .order_by(GuestLink.created_at.desc())
    )
    links = result.scalars().all()
    
    # Add has_password field
    response = []
    for link in links:
        link_dict = {
            "id": link.id,
            "board_id": str(link.board_id),
            "expires_at": link.expires_at,
            "max_uses": link.max_uses,
            "usage_count": link.usage_count,
            "permissions": link.permissions,
            "has_password": link.password_hash is not None,
            "is_active": link.is_active,
            "created_at": link.created_at,
        }
        response.append(link_dict)
    
    return response


@router.post("/{board_id}/links", response_model=GuestLinkResponse, status_code=201)
async def create_guest_link(
    board_id: str,
    data: GuestLinkCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new guest link for a board."""
    from uuid import uuid4
    
    # Try to find existing board or create ephemeral entry
    board_result = await db.execute(select(Board).where(Board.id == board_id))
    board = board_result.scalar_one_or_none()
    
    # If board doesn't exist, create it dynamically (for ephemeral boards)
    if not board:
        board = Board(
            id=board_id,  # Use the string ID directly
            name=f"Board {board_id[:12]}",
            owner_id=uuid4(),  # Anonymous owner
        )
        db.add(board)
        await db.flush()
        await db.refresh(board)
    
    link_code = generate_link_code()
    expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)
    
    password_hash = None
    if data.password:
        password_hash = hash_password(data.password)
    
    new_link = GuestLink(
        id=link_code,
        board_id=board_id,
        expires_at=expires_at,
        max_uses=data.max_uses,
        password_hash=password_hash,
        permissions=data.permissions,
        created_by=board.owner_id,
    )
    
    db.add(new_link)
    await db.flush()
    await db.refresh(new_link)
    
    return {
        "id": new_link.id,
        "board_id": str(new_link.board_id),
        "expires_at": new_link.expires_at,
        "max_uses": new_link.max_uses,
        "usage_count": new_link.usage_count,
        "permissions": new_link.permissions,
        "has_password": password_hash is not None,
        "is_active": new_link.is_active,
        "created_at": new_link.created_at,
    }


@router.delete("/{board_id}/links/{link_id}", status_code=204)
async def delete_guest_link(
    board_id: str,
    link_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a guest link."""
    result = await db.execute(
        select(GuestLink).where(
            GuestLink.id == link_id,
            GuestLink.board_id == board_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    link.is_active = False


# Public endpoints for joining (no auth required)
@router.get("/join/{link_code}", response_model=GuestLinkPublicResponse)
async def get_link_info(
    link_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Get public info about a guest link."""
    result = await db.execute(
        select(GuestLink, Board)
        .join(Board, GuestLink.board_id == Board.id)
        .where(GuestLink.id == link_code)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Link not found")
    
    link, board = row
    
    # Check if link is valid
    is_valid = (
        link.is_active
        and link.expires_at > datetime.utcnow()
        and (link.max_uses is None or link.usage_count < link.max_uses)
    )
    
    return {
        "board_name": board.name,
        "requires_password": link.password_hash is not None,
        "permissions": link.permissions,
        "expires_at": link.expires_at,
        "is_valid": is_valid,
    }


@router.post("/join/{link_code}", response_model=JoinResponse)
async def join_with_link(
    link_code: str,
    data: JoinRequest,
    db: AsyncSession = Depends(get_db),
):
    """Join a board using a guest link."""
    result = await db.execute(
        select(GuestLink).where(GuestLink.id == link_code)
    )
    link = result.scalar_one_or_none()
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Validate link
    if not link.is_active:
        raise HTTPException(status_code=410, detail="Link is no longer active")
    
    if link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Link has expired")
    
    if link.max_uses is not None and link.usage_count >= link.max_uses:
        raise HTTPException(status_code=410, detail="Link has reached maximum uses")
    
    # Check password
    if link.password_hash:
        if not data.password:
            raise HTTPException(status_code=401, detail="Password required")
        if not verify_password(data.password, link.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
    
    # Increment usage count
    link.usage_count += 1
    
    # Generate session token
    session_token = secrets.token_urlsafe(32)
    
    return {
        "success": True,
        "board_id": str(link.board_id),
        "session_token": session_token,
        "permissions": link.permissions,
        "display_name": data.display_name,
    }
