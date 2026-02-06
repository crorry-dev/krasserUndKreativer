from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from datetime import datetime
from typing import Any

from src.core.database import get_db
from src.models import CanvasObject, Board

router = APIRouter()


class ObjectCreate(BaseModel):
    object_type: str
    x: float
    y: float
    width: float = 0
    height: float = 0
    data: dict[str, Any] = {}


class ObjectUpdate(BaseModel):
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    data: dict[str, Any] | None = None


class ObjectResponse(BaseModel):
    id: UUID
    object_type: str
    x: float
    y: float
    width: float
    height: float
    data: dict[str, Any]
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/{board_id}/objects", response_model=list[ObjectResponse])
async def list_objects(
    board_id: str,
    min_x: float = Query(default=-10000),
    min_y: float = Query(default=-10000),
    max_x: float = Query(default=10000),
    max_y: float = Query(default=10000),
    db: AsyncSession = Depends(get_db),
):
    """Get objects in viewport (spatial query)."""
    # Verify board exists
    board_result = await db.execute(select(Board).where(Board.id == board_id))
    if not board_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Query objects in viewport using bounding box filter
    # Note: For PostgreSQL with PostGIS, this could use ST_MakeEnvelope for better performance
    # Current implementation uses simple coordinate comparison which works for SQLite/PostgreSQL
    result = await db.execute(
        select(CanvasObject)
        .where(
            and_(
                CanvasObject.board_id == board_id,
                CanvasObject.is_deleted == False,
                CanvasObject.x >= min_x - 1000,  # Buffer for object width
                CanvasObject.x <= max_x + 1000,
                CanvasObject.y >= min_y - 1000,
                CanvasObject.y <= max_y + 1000,
            )
        )
        .order_by(CanvasObject.created_at)
    )
    return result.scalars().all()


@router.post("/{board_id}/objects", response_model=ObjectResponse, status_code=201)
async def create_object(
    board_id: str,
    obj: ObjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new canvas object."""
    # Verify board exists
    board_result = await db.execute(select(Board).where(Board.id == board_id))
    if not board_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Board not found")
    
    new_obj = CanvasObject(
        id=uuid4(),
        board_id=board_id,
        object_type=obj.object_type,
        x=obj.x,
        y=obj.y,
        width=obj.width,
        height=obj.height,
        data=obj.data,
    )
    db.add(new_obj)
    await db.flush()
    await db.refresh(new_obj)
    return new_obj


@router.patch("/{board_id}/objects/{object_id}", response_model=ObjectResponse)
async def update_object(
    board_id: str,
    object_id: UUID,
    updates: ObjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a canvas object."""
    result = await db.execute(
        select(CanvasObject).where(
            and_(
                CanvasObject.id == object_id,
                CanvasObject.board_id == board_id,
                CanvasObject.is_deleted == False,
            )
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    
    await db.flush()
    await db.refresh(obj)
    return obj


@router.delete("/{board_id}/objects/{object_id}", status_code=204)
async def delete_object(
    board_id: str,
    object_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a canvas object."""
    result = await db.execute(
        select(CanvasObject).where(
            and_(
                CanvasObject.id == object_id,
                CanvasObject.board_id == board_id,
            )
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
