from uuid import UUID, uuid4
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from src.core.database import get_db
from src.models import Board
from src.routers.users import get_current_user
from src.models.users import User

router = APIRouter()
security = HTTPBearer(auto_error=False)


class BoardCreate(BaseModel):
    name: str


class BoardResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.get("", response_model=list[BoardResponse])
async def list_boards(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """List all boards. If authenticated, filters by user."""
    query = select(Board).order_by(Board.updated_at.desc())
    
    # Filter by owner if user is authenticated
    if current_user:
        try:
            user_uuid = UUID(current_user.id.replace('user-', ''))
            query = query.where(Board.owner_id == user_uuid)
        except ValueError:
            pass
    
    result = await db.execute(query)
    boards = result.scalars().all()
    return boards


@router.post("", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def create_board(
    board: BoardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Create a new board."""
    import random
    import string
    
    # Generate a board ID similar to client format
    board_id = f"board-{uuid4().hex[:8]}-{uuid4().hex[:5]}"
    
    # Use authenticated user's ID or None for anonymous
    owner_id = None
    if current_user:
        try:
            owner_id = UUID(current_user.id.replace('user-', ''))
        except ValueError:
            pass
    
    new_board = Board(
        id=board_id,
        name=board.name,
        owner_id=owner_id,
    )
    db.add(new_board)
    await db.flush()
    await db.refresh(new_board)
    return new_board


@router.get("/{board_id}", response_model=BoardResponse)
async def get_board(board_id: str, db: AsyncSession = Depends(get_db)):
    """Get a board by ID."""
    result = await db.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(board_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a board."""
    result = await db.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    await db.delete(board)
