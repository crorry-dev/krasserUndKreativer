"""History router for versioning and rollback."""

from uuid import UUID
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/boards/{board_id}/history", tags=["history"])


class CanvasEventResponse(BaseModel):
    """Response model for canvas events."""
    id: str
    event_type: str
    object_id: Optional[str]
    user_id: Optional[str]
    guest_session_id: Optional[str]
    previous_state: Optional[dict]
    new_state: Optional[dict]
    created_at: datetime
    sequence_num: int
    
    class Config:
        from_attributes = True


class HistoryListResponse(BaseModel):
    """Response with paginated history."""
    events: list[CanvasEventResponse]
    total: int
    has_more: bool


class RollbackRequest(BaseModel):
    """Request to rollback to a specific point."""
    target_sequence: int  # Rollback to this sequence number


class SnapshotResponse(BaseModel):
    """Response containing a snapshot at a point in time."""
    board_id: str
    snapshot_at: datetime
    sequence_num: int
    objects: list[dict]


# In-memory event store for demo (will be replaced with DB)
_event_store: dict[str, list[dict]] = {}


def get_events_for_board(board_id: str) -> list[dict]:
    """Get all events for a board."""
    return _event_store.get(board_id, [])


def add_event(board_id: str, event: dict) -> dict:
    """Add an event to the store."""
    if board_id not in _event_store:
        _event_store[board_id] = []
    
    # Generate sequence number
    events = _event_store[board_id]
    seq = len(events) + 1
    
    event_record = {
        "id": f"evt-{seq:06d}",
        "sequence_num": seq,
        "created_at": datetime.utcnow(),
        **event,
    }
    
    events.append(event_record)
    return event_record


@router.get("", response_model=HistoryListResponse)
async def get_history(
    board_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(None),
):
    """
    Get history of changes for a board.
    
    Returns events in reverse chronological order (newest first).
    """
    events = get_events_for_board(board_id)
    
    # Filter by type if specified
    if event_type:
        events = [e for e in events if e.get("event_type") == event_type]
    
    # Sort newest first
    events = sorted(events, key=lambda e: e["sequence_num"], reverse=True)
    
    # Paginate
    total = len(events)
    paginated = events[offset:offset + limit]
    
    return HistoryListResponse(
        events=[CanvasEventResponse(**e) for e in paginated],
        total=total,
        has_more=offset + limit < total,
    )


@router.get("/snapshot")
async def get_snapshot(
    board_id: str,
    at_sequence: Optional[int] = Query(None, description="Get snapshot at this sequence number"),
    at_time: Optional[datetime] = Query(None, description="Get snapshot at this timestamp"),
) -> SnapshotResponse:
    """
    Get a snapshot of the board at a specific point in time.
    
    Either specify at_sequence or at_time.
    """
    events = get_events_for_board(board_id)
    
    if not events:
        return SnapshotResponse(
            board_id=board_id,
            snapshot_at=datetime.utcnow(),
            sequence_num=0,
            objects=[],
        )
    
    # Determine cutoff point
    if at_sequence:
        cutoff_events = [e for e in events if e["sequence_num"] <= at_sequence]
    elif at_time:
        cutoff_events = [e for e in events if e["created_at"] <= at_time]
    else:
        cutoff_events = events
    
    if not cutoff_events:
        return SnapshotResponse(
            board_id=board_id,
            snapshot_at=datetime.utcnow(),
            sequence_num=0,
            objects=[],
        )
    
    # Replay events to build state
    objects: dict[str, dict] = {}
    
    for event in sorted(cutoff_events, key=lambda e: e["sequence_num"]):
        obj_id = event.get("object_id")
        event_type = event.get("event_type")
        
        if event_type == "create" and obj_id:
            objects[obj_id] = event.get("new_state", {})
        elif event_type == "update" and obj_id and obj_id in objects:
            objects[obj_id].update(event.get("new_state", {}))
        elif event_type == "delete" and obj_id and obj_id in objects:
            del objects[obj_id]
    
    last_event = max(cutoff_events, key=lambda e: e["sequence_num"])
    
    return SnapshotResponse(
        board_id=board_id,
        snapshot_at=last_event["created_at"],
        sequence_num=last_event["sequence_num"],
        objects=list(objects.values()),
    )


@router.post("/rollback")
async def rollback_to_point(
    board_id: str,
    request: RollbackRequest,
) -> dict:
    """
    Rollback the board to a specific point in history.
    
    This creates inverse events to undo changes after the target sequence.
    """
    events = get_events_for_board(board_id)
    
    # Find events to undo (after target sequence)
    events_to_undo = [
        e for e in events 
        if e["sequence_num"] > request.target_sequence
    ]
    
    if not events_to_undo:
        raise HTTPException(
            status_code=400,
            detail="No changes to rollback",
        )
    
    # Sort in reverse order to undo
    events_to_undo = sorted(
        events_to_undo, 
        key=lambda e: e["sequence_num"], 
        reverse=True
    )
    
    rollback_events = []
    
    for event in events_to_undo:
        event_type = event.get("event_type")
        obj_id = event.get("object_id")
        
        if event_type == "create":
            # Undo create = delete
            rollback_event = add_event(board_id, {
                "event_type": "delete",
                "object_id": obj_id,
                "previous_state": event.get("new_state"),
                "new_state": None,
                "user_id": None,
                "guest_session_id": "system-rollback",
            })
            rollback_events.append(rollback_event)
            
        elif event_type == "update":
            # Undo update = restore previous state
            rollback_event = add_event(board_id, {
                "event_type": "update",
                "object_id": obj_id,
                "previous_state": event.get("new_state"),
                "new_state": event.get("previous_state"),
                "user_id": None,
                "guest_session_id": "system-rollback",
            })
            rollback_events.append(rollback_event)
            
        elif event_type == "delete":
            # Undo delete = recreate
            rollback_event = add_event(board_id, {
                "event_type": "create",
                "object_id": obj_id,
                "previous_state": None,
                "new_state": event.get("previous_state"),
                "user_id": None,
                "guest_session_id": "system-rollback",
            })
            rollback_events.append(rollback_event)
    
    return {
        "success": True,
        "message": f"Rolled back {len(events_to_undo)} changes",
        "rollback_events": len(rollback_events),
        "new_sequence": get_events_for_board(board_id)[-1]["sequence_num"] if get_events_for_board(board_id) else 0,
    }


@router.get("/timeline")
async def get_timeline(
    board_id: str,
    granularity: str = Query("minute", pattern="^(minute|hour|day)$"),
) -> list[dict]:
    """
    Get aggregated timeline of changes for visualization.
    
    Groups events by time bucket for timeline UI.
    """
    events = get_events_for_board(board_id)
    
    if not events:
        return []
    
    # Group by time bucket
    buckets: dict[str, dict] = {}
    
    for event in events:
        created_at = event["created_at"]
        
        if granularity == "minute":
            bucket_key = created_at.strftime("%Y-%m-%d %H:%M")
        elif granularity == "hour":
            bucket_key = created_at.strftime("%Y-%m-%d %H:00")
        else:  # day
            bucket_key = created_at.strftime("%Y-%m-%d")
        
        if bucket_key not in buckets:
            buckets[bucket_key] = {
                "timestamp": bucket_key,
                "sequence_start": event["sequence_num"],
                "sequence_end": event["sequence_num"],
                "event_count": 0,
                "creates": 0,
                "updates": 0,
                "deletes": 0,
                "contributors": set(),
            }
        
        bucket = buckets[bucket_key]
        bucket["event_count"] += 1
        bucket["sequence_end"] = max(bucket["sequence_end"], event["sequence_num"])
        
        event_type = event.get("event_type", "")
        if event_type == "create":
            bucket["creates"] += 1
        elif event_type == "update":
            bucket["updates"] += 1
        elif event_type == "delete":
            bucket["deletes"] += 1
        
        contributor = event.get("user_id") or event.get("guest_session_id")
        if contributor:
            bucket["contributors"].add(contributor)
    
    # Convert to list and format
    timeline = []
    for bucket in sorted(buckets.values(), key=lambda b: b["timestamp"]):
        timeline.append({
            "timestamp": bucket["timestamp"],
            "sequence_start": bucket["sequence_start"],
            "sequence_end": bucket["sequence_end"],
            "event_count": bucket["event_count"],
            "creates": bucket["creates"],
            "updates": bucket["updates"],
            "deletes": bucket["deletes"],
            "contributor_count": len(bucket["contributors"]),
        })
    
    return timeline


# Export for use in WebSocket handlers
def record_canvas_event(
    board_id: str,
    event_type: str,
    object_id: str,
    previous_state: Optional[dict],
    new_state: Optional[dict],
    user_id: Optional[str] = None,
    guest_session_id: Optional[str] = None,
) -> dict:
    """Record a canvas event (called from WebSocket handlers)."""
    return add_event(board_id, {
        "event_type": event_type,
        "object_id": object_id,
        "previous_state": previous_state,
        "new_state": new_state,
        "user_id": user_id,
        "guest_session_id": guest_session_id,
    })
