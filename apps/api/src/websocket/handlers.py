from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from uuid import uuid4
import json

from src.websocket.manager import manager
from src.routers.history import record_canvas_event
from src.services.spatial import get_spatial_index

router = APIRouter()


@router.websocket("/ws/{board_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    board_id: str,
    user_id: str = Query(default=None),
    display_name: str = Query(default="Anonymous"),
):
    """WebSocket endpoint for real-time collaboration."""
    
    # Generate user ID if not provided (guest)
    if not user_id:
        user_id = f"guest-{uuid4().hex[:8]}"
    
    # Connect
    user = await manager.connect(websocket, board_id, user_id, display_name)
    
    # Send current board state to new user
    spatial_index = get_spatial_index(board_id)
    all_objects = spatial_index.get_all_objects()
    if all_objects:
        await websocket.send_json({
            "type": "board_sync",
            "objects": all_objects,
        })
    
    try:
        while True:
            data = await websocket.receive_json()
            await handle_message(board_id, user_id, data)
    
    except WebSocketDisconnect:
        manager.disconnect(board_id, user_id)
        await manager.broadcast(
            board_id,
            {
                "type": "user_left",
                "userId": user_id,
            }
        )
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(board_id, user_id)


async def handle_message(board_id: str, user_id: str, data: dict):
    """Handle incoming WebSocket messages."""
    
    msg_type = data.get("type")
    
    if msg_type == "cursor_move":
        # Update cursor position and broadcast
        x = data.get("x", 0)
        y = data.get("y", 0)
        manager.update_cursor(board_id, user_id, x, y)
        
        await manager.broadcast(
            board_id,
            {
                "type": "cursor_update",
                "userId": user_id,
                "x": x,
                "y": y,
            },
            exclude_user=user_id,
        )
    
    elif msg_type == "object_create":
        # Record event for versioning
        obj = data.get("object", {})
        obj_id = obj.get("id", str(uuid4()))
        
        record_canvas_event(
            board_id=board_id,
            event_type="create",
            object_id=obj_id,
            previous_state=None,
            new_state=obj,
            guest_session_id=user_id,
        )
        
        # Add to spatial index for efficient querying
        spatial_index = get_spatial_index(board_id)
        spatial_index.add_object(obj_id, obj)
        
        # Broadcast new object to all users
        await manager.broadcast(
            board_id,
            {
                "type": "object_created",
                "userId": user_id,
                "object": obj,
            },
            exclude_user=user_id,
        )
    
    elif msg_type == "object_update":
        # Record event for versioning
        obj_id = data.get("objectId")
        changes = data.get("changes", {})
        previous = data.get("previousState")  # Client should send this
        
        record_canvas_event(
            board_id=board_id,
            event_type="update",
            object_id=obj_id,
            previous_state=previous,
            new_state=changes,
            guest_session_id=user_id,
        )
        
        # Update in spatial index
        if obj_id:
            spatial_index = get_spatial_index(board_id)
            # Merge changes with existing object
            merged = {**(previous if previous else {}), **changes}
            spatial_index.add_object(obj_id, merged)
        
        # Broadcast object update
        await manager.broadcast(
            board_id,
            {
                "type": "object_updated",
                "userId": user_id,
                "objectId": obj_id,
                "changes": changes,
            },
            exclude_user=user_id,
        )
    
    elif msg_type == "object_delete":
        # Record event for versioning
        obj_id = data.get("objectId")
        previous = data.get("previousState")  # Client should send this
        
        record_canvas_event(
            board_id=board_id,
            event_type="delete",
            object_id=obj_id,
            previous_state=previous,
            new_state=None,
            guest_session_id=user_id,
        )
        
        # Remove from spatial index
        if obj_id:
            spatial_index = get_spatial_index(board_id)
            spatial_index.remove_object(obj_id)
        
        # Broadcast object deletion
        await manager.broadcast(
            board_id,
            {
                "type": "object_deleted",
                "userId": user_id,
                "objectId": data.get("objectId"),
            },
            exclude_user=user_id,
        )
    
    elif msg_type == "board_publish":
        # User is publishing their local objects (e.g. after loading a saved board)
        objects = data.get("objects", [])
        spatial_index = get_spatial_index(board_id)
        
        for obj in objects:
            obj_id = obj.get("id")
            if obj_id:
                # Add to spatial index
                spatial_index.add_object(obj_id, obj)
        
        # Broadcast all published objects to other users
        if objects:
            await manager.broadcast(
                board_id,
                {
                    "type": "board_sync",
                    "objects": objects,
                },
                exclude_user=user_id,
            )
    
    elif msg_type == "ping":
        # Respond to ping
        await manager.send_to_user(
            board_id,
            user_id,
            {"type": "pong"}
        )
