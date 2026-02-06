from uuid import uuid4

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from src.routers.history import record_canvas_event
from src.services.spatial import get_spatial_index
from src.websocket.manager import manager

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
    await manager.connect(websocket, board_id, user_id, display_name)

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
        channel_id = manager.get_user_voice_channel(board_id, user_id)
        manager.disconnect(board_id, user_id)
        await manager.broadcast(
            board_id,
            {
                "type": "user_left",
                "userId": user_id,
            }
        )
        if channel_id:
            await manager.broadcast(
                board_id,
                {
                    "type": "voice_channel_leave",
                    "userId": user_id,
                    "channelId": channel_id,
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

        if not obj_id:
            return

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

        if not obj_id:
            return

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

    # ============= Voice Channels =============

    elif msg_type == "voice_channel_create":
        channel = data.get("channel")
        if channel:
            manager.upsert_voice_channel(board_id, channel)
            await manager.broadcast(
                board_id,
                {
                    "type": "voice_channel_create",
                    "channel": channel,
                }
            )

    elif msg_type == "voice_channel_update":
        channel = data.get("channel")
        if channel:
            manager.upsert_voice_channel(board_id, channel)
            await manager.broadcast(
                board_id,
                {
                    "type": "voice_channel_update",
                    "channel": channel,
                }
            )

    elif msg_type == "voice_channel_delete":
        channel_id = data.get("channelId")
        if channel_id:
            manager.remove_voice_channel(board_id, channel_id)
            await manager.broadcast(
                board_id,
                {
                    "type": "voice_channel_delete",
                    "channelId": channel_id,
                }
            )

    elif msg_type == "voice_channel_join":
        channel_id = data.get("channelId")
        if channel_id:
            manager.set_user_voice_channel(board_id, user_id, channel_id)
            await manager.broadcast(
                board_id,
                {
                    "type": "voice_channel_join",
                    "userId": user_id,
                    "channelId": channel_id,
                }
            )

    elif msg_type == "voice_channel_move":
        channel_id = data.get("channelId")
        target_user_id = data.get("targetUserId")
        if channel_id and target_user_id:
            manager.set_user_voice_channel(board_id, target_user_id, channel_id)
            await manager.broadcast(
                board_id,
                {
                    "type": "voice_channel_move",
                    "userId": target_user_id,
                    "channelId": channel_id,
                }
            )

    # ============= Voice Call Signaling =============

    elif msg_type == "call_start":
        await manager.broadcast(
            board_id,
            {
                "type": "call_start",
                "userId": user_id,
                "userName": data.get("userName"),
                "userColor": data.get("userColor"),
                "withVideo": data.get("withVideo", False),
                "channelId": data.get("channelId"),
            },
        )

    elif msg_type == "call_join":
        await manager.broadcast(
            board_id,
            {
                "type": "call_join",
                "userId": user_id,
                "userName": data.get("userName"),
                "userColor": data.get("userColor"),
                "withVideo": data.get("withVideo", False),
                "channelId": data.get("channelId"),
            },
        )

    elif msg_type == "call_end":
        await manager.broadcast(
            board_id,
            {
                "type": "call_end",
                "userId": user_id,
                "channelId": data.get("channelId"),
            },
        )

    elif msg_type == "call_mute":
        await manager.broadcast(
            board_id,
            {
                "type": "call_mute",
                "userId": user_id,
                "isMuted": data.get("isMuted", False),
                "channelId": data.get("channelId"),
            },
        )

    elif msg_type == "call_video":
        await manager.broadcast(
            board_id,
            {
                "type": "call_video",
                "userId": user_id,
                "isVideoOff": data.get("isVideoOff", True),
                "channelId": data.get("channelId"),
            },
        )

    elif msg_type == "call_decline":
        target_user_id = data.get("targetUserId")
        if target_user_id:
            await manager.send_to_user(
                board_id,
                target_user_id,
                {
                    "type": "call_decline",
                    "userId": user_id,
                }
            )

    elif msg_type == "webrtc_offer":
        target_user_id = data.get("targetUserId")
        if target_user_id:
            await manager.send_to_user(
                board_id,
                target_user_id,
                {
                    "type": "webrtc_offer",
                    "userId": user_id,
                    "userName": data.get("userName"),
                    "userColor": data.get("userColor"),
                    "offer": data.get("offer"),
                }
            )

    elif msg_type == "webrtc_answer":
        target_user_id = data.get("targetUserId")
        if target_user_id:
            await manager.send_to_user(
                board_id,
                target_user_id,
                {
                    "type": "webrtc_answer",
                    "userId": user_id,
                    "answer": data.get("answer"),
                }
            )

    elif msg_type == "webrtc_ice":
        target_user_id = data.get("targetUserId")
        if target_user_id:
            await manager.send_to_user(
                board_id,
                target_user_id,
                {
                    "type": "webrtc_ice",
                    "userId": user_id,
                    "candidate": data.get("candidate"),
                }
            )

    elif msg_type == "user_profile":
        display_name = data.get("displayName")
        avatar_url = data.get("avatarUrl")
        updated = manager.update_user_profile(
            board_id,
            user_id,
            display_name=display_name,
            avatar_url=avatar_url,
        )
        if updated:
            await manager.broadcast(
                board_id,
                {
                    "type": "user_profile_update",
                    "userId": user_id,
                    "displayName": updated.display_name,
                    "avatarUrl": updated.avatar_url,
                },
                exclude_user=user_id,
            )

    # ============= Presenter Mode Events =============

    elif msg_type == "presenter_start":
        # User starts presenting - notify all users in the board
        display_name = data.get("displayName", "Unknown")
        await manager.broadcast(
            board_id,
            {
                "type": "presenter_start",
                "userId": user_id,
                "displayName": display_name,
            }
        )

    elif msg_type == "presenter_viewport":
        # Presenter broadcasts their viewport position
        viewport = data.get("viewport", {})
        await manager.broadcast(
            board_id,
            {
                "type": "presenter_viewport",
                "userId": user_id,
                "viewport": viewport,
            },
            exclude_user=user_id,
        )

    elif msg_type == "presenter_end":
        # Presenter stops presenting
        await manager.broadcast(
            board_id,
            {
                "type": "presenter_end",
                "userId": user_id,
            }
        )

    # ============= Chat Events =============

    elif msg_type == "chat_message":
        # User sends a chat message
        group_id = data.get("groupId", "board-chat")
        message = data.get("message", {})

        await manager.broadcast(
            board_id,
            {
                "type": "chat_message",
                "groupId": group_id,
                "message": message,
            },
            exclude_user=user_id,
        )

    elif msg_type == "chat_typing":
        # User is typing
        group_id = data.get("groupId", "board-chat")
        is_typing = data.get("isTyping", False)

        await manager.broadcast(
            board_id,
            {
                "type": "chat_typing",
                "groupId": group_id,
                "userId": user_id,
                "isTyping": is_typing,
            },
            exclude_user=user_id,
        )

    # ============= Workspace Regions =============

    elif msg_type == "workspace_region_create":
        region = data.get("region", {})
        if region:
            manager.upsert_workspace_region(board_id, region)
            await manager.broadcast(
                board_id,
                {
                    "type": "workspace_region_create",
                    "region": region,
                },
                exclude_user=user_id,
            )

    elif msg_type == "workspace_region_update":
        region = data.get("region", {})
        if region:
            manager.upsert_workspace_region(board_id, region)
            await manager.broadcast(
                board_id,
                {
                    "type": "workspace_region_update",
                    "region": region,
                },
                exclude_user=user_id,
            )

    elif msg_type == "workspace_region_delete":
        region_id = data.get("regionId")
        if region_id:
            manager.remove_workspace_region(board_id, region_id)
            await manager.broadcast(
                board_id,
                {
                    "type": "workspace_region_delete",
                    "regionId": region_id,
                },
                exclude_user=user_id,
            )
