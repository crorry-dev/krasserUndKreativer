from uuid import UUID
from datetime import datetime
from sqlalchemy import JSON, String, ForeignKey, Float, Boolean, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from src.core.database import Base

JSONType = JSON().with_variant(JSONB, "postgresql")
BoundsType = Geometry("POLYGON", srid=0).with_variant(Text, "sqlite")


class User(Base):
    """Registered user account."""
    
    __tablename__ = "users"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    owned_boards: Mapped[list["Board"]] = relationship(back_populates="owner")


class Board(Base):
    """A canvas/whiteboard instance."""
    
    __tablename__ = "boards"
    
    # Using String instead of UUID to support client-generated IDs like "board-xxx"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    owner_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner: Mapped["User | None"] = relationship(back_populates="owned_boards")
    objects: Mapped[list["CanvasObject"]] = relationship(back_populates="board", cascade="all, delete-orphan")
    guest_links: Mapped[list["GuestLink"]] = relationship(back_populates="board", cascade="all, delete-orphan")


class CanvasObject(Base):
    """An object on the canvas (stroke, shape, text, etc.)."""
    
    __tablename__ = "canvas_objects"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    
    # Type and data
    object_type: Mapped[str] = mapped_column(String(50))
    data: Mapped[dict] = mapped_column(JSONType, default=dict)
    
    # Position (for spatial queries)
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    width: Mapped[float] = mapped_column(Float, default=0)
    height: Mapped[float] = mapped_column(Float, default=0)
    
    # Bounding box for PostGIS spatial queries
    bounds: Mapped[str | None] = mapped_column(
        BoundsType,
        nullable=True
    )
    
    # Metadata
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    created_by_guest: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    
    # Relationships
    board: Mapped["Board"] = relationship(back_populates="objects")


class GuestLink(Base):
    """Shareable link for guest access without account."""
    
    __tablename__ = "guest_links"
    
    id: Mapped[str] = mapped_column(String(20), primary_key=True)  # Short URL-friendly code
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    
    # Validity
    expires_at: Mapped[datetime] = mapped_column()
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Security
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Permissions
    permissions: Mapped[str] = mapped_column(String(20), default="edit")  # 'edit' or 'view'
    
    # Metadata
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    board: Mapped["Board"] = relationship(back_populates="guest_links")


class CanvasEvent(Base):
    """Event log for versioning (event sourcing)."""
    
    __tablename__ = "canvas_events"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    board_id: Mapped[UUID] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    
    # Who
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    guest_session_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # What
    event_type: Mapped[str] = mapped_column(String(50))  # 'create', 'update', 'delete'
    object_id: Mapped[UUID | None] = mapped_column(nullable=True)
    
    # Before/After for rollback
    previous_state: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    new_state: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    
    # When
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, index=True)
    sequence_num: Mapped[int] = mapped_column(Integer, autoincrement=True)
