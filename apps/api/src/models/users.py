"""
User and Invite system models.
Each user can invite exactly ONE other person.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import secrets
from passlib.context import CryptContext

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


# In-memory storage (replace with database in production)
users_db: dict[str, "User"] = {}
invites_db: dict[str, "Invite"] = {}
donations_db: list["Donation"] = []


def generate_invite_code() -> str:
    """Generate a unique 8-character invite code."""
    return secrets.token_urlsafe(6)[:8].upper()


def generate_user_id() -> str:
    """Generate a unique user ID."""
    return f"user-{secrets.token_urlsafe(12)}"


class User(BaseModel):
    id: str
    email: str
    name: str
    password_hash: str  # In production, use proper hashing
    invited_by: Optional[str] = None  # User ID who invited them
    invite_code: str  # Their personal invite code
    has_used_invite: bool = False  # True if they've already invited someone
    invited_user_id: Optional[str] = None  # Who they invited
    total_donated: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_admin: bool = False
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Invite(BaseModel):
    code: str
    created_by: str  # User ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    used_by: Optional[str] = None
    used_at: Optional[datetime] = None
    is_valid: bool = True


class Donation(BaseModel):
    id: str
    user_id: str
    amount: float  # in EUR
    stripe_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    invite_code: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    invite_code: str
    has_used_invite: bool
    total_donated: float
    created_at: datetime
    
    # Tree info
    invited_by_name: Optional[str] = None
    invited_user_name: Optional[str] = None


class InviteTree(BaseModel):
    """Represents a user in the invite tree."""
    id: str
    name: str
    total_donated: float
    created_at: datetime
    child: Optional["InviteTree"] = None


# Functions to work with the in-memory DB

def get_user_by_email(email: str) -> Optional[User]:
    for user in users_db.values():
        if user.email.lower() == email.lower():
            return user
    return None


def get_user_by_id(user_id: str) -> Optional[User]:
    return users_db.get(user_id)


def get_user_by_invite_code(code: str) -> Optional[User]:
    for user in users_db.values():
        if user.invite_code.upper() == code.upper():
            return user
    return None


def create_user(email: str, name: str, password: str, invited_by: Optional[str] = None) -> User:
    """Create a new user."""
    user_id = generate_user_id()
    invite_code = generate_invite_code()
    
    user = User(
        id=user_id,
        email=email,
        name=name,
        password_hash=hash_password(password),
        invited_by=invited_by,
        invite_code=invite_code,
    )
    
    users_db[user_id] = user
    
    # Mark inviter as having used their invite
    if invited_by:
        inviter = users_db.get(invited_by)
        if inviter:
            inviter.has_used_invite = True
            inviter.invited_user_id = user_id
    
    return user


def record_donation(user_id: str, amount: float, stripe_session_id: Optional[str] = None) -> Donation:
    """Record a donation from a user."""
    donation = Donation(
        id=f"don-{secrets.token_urlsafe(8)}",
        user_id=user_id,
        amount=amount,
        stripe_session_id=stripe_session_id,
    )
    donations_db.append(donation)
    
    # Update user's total
    user = users_db.get(user_id)
    if user:
        user.total_donated += amount
    
    return donation


def get_invite_tree(user_id: str) -> Optional[InviteTree]:
    """Get the invite tree starting from a user."""
    user = users_db.get(user_id)
    if not user:
        return None
    
    tree = InviteTree(
        id=user.id,
        name=user.name,
        total_donated=user.total_donated,
        created_at=user.created_at,
    )
    
    if user.invited_user_id:
        tree.child = get_invite_tree(user.invited_user_id)
    
    return tree


def get_all_users_with_donations() -> list[dict]:
    """Get all users with their donation totals (for admin)."""
    result = []
    for user in users_db.values():
        inviter = users_db.get(user.invited_by) if user.invited_by else None
        invited = users_db.get(user.invited_user_id) if user.invited_user_id else None
        
        result.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "total_donated": user.total_donated,
            "invited_by": inviter.name if inviter else None,
            "invited": invited.name if invited else None,
            "created_at": user.created_at.isoformat(),
        })
    
    return sorted(result, key=lambda x: x["total_donated"], reverse=True)


def get_total_donations() -> float:
    """Get total donations across all users."""
    return sum(d.amount for d in donations_db)


def get_donation_stats() -> dict:
    """Get donation statistics."""
    total = get_total_donations()
    count = len(donations_db)
    user_count = len(users_db)
    donors = len(set(d.user_id for d in donations_db))
    
    return {
        "total_amount": total,
        "donation_count": count,
        "user_count": user_count,
        "donor_count": donors,
        "average_donation": total / count if count > 0 else 0,
        "donor_percentage": (donors / user_count * 100) if user_count > 0 else 0,
    }


# Create initial admin user
def init_admin():
    if not users_db:
        admin = User(
            id="admin",
            email="admin@infinite-canvas.app",
            name="Admin",
            password_hash="admin",  # Change in production!
            invite_code="FOUNDER",
            is_admin=True,
        )
        users_db[admin.id] = admin
        print("[Users] Admin user created with invite code: FOUNDER")


init_admin()
