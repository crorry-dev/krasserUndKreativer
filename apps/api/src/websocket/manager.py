from fastapi import WebSocket
from dataclasses import dataclass, field
from typing import Any
import json
import asyncio
from datetime import datetime


@dataclass
class ConnectedUser:
    """A user connected to a board via WebSocket."""
    websocket: WebSocket
    user_id: str
    display_name: str
    color: str
    cursor_x: float = 0
    cursor_y: float = 0
    connected_at: datetime = field(default_factory=datetime.utcnow)


class ConnectionManager:
    """Manages WebSocket connections for real-time collaboration."""
    
    def __init__(self):
        # board_id -> {user_id -> ConnectedUser}
        self.active_connections: dict[str, dict[str, ConnectedUser]] = {}
        
        # Predefined colors for cursors
        self.cursor_colors = [
            "#FF6B6B",  # Red
            "#4ECDC4",  # Teal
            "#45B7D1",  # Blue
            "#96CEB4",  # Green
            "#FFEAA7",  # Yellow
            "#DDA0DD",  # Plum
            "#98D8C8",  # Mint
            "#F7DC6F",  # Gold
            "#BB8FCE",  # Purple
            "#85C1E9",  # Light Blue
        ]
    
    def _get_color(self, board_id: str) -> str:
        """Get next available cursor color for a board."""
        used_colors = set()
        if board_id in self.active_connections:
            for user in self.active_connections[board_id].values():
                used_colors.add(user.color)
        
        for color in self.cursor_colors:
            if color not in used_colors:
                return color
        
        # All colors used, return first one
        return self.cursor_colors[0]
    
    async def connect(
        self, 
        websocket: WebSocket, 
        board_id: str, 
        user_id: str,
        display_name: str
    ) -> ConnectedUser:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        color = self._get_color(board_id)
        user = ConnectedUser(
            websocket=websocket,
            user_id=user_id,
            display_name=display_name,
            color=color,
        )
        
        if board_id not in self.active_connections:
            self.active_connections[board_id] = {}
        
        self.active_connections[board_id][user_id] = user
        
        # Notify others about new user
        await self.broadcast(
            board_id,
            {
                "type": "user_joined",
                "userId": user_id,
                "displayName": display_name,
                "color": color,
            },
            exclude_user=user_id,
        )
        
        # Send current users to the new user
        users_list = [
            {
                "userId": u.user_id,
                "displayName": u.display_name,
                "color": u.color,
                "cursorX": u.cursor_x,
                "cursorY": u.cursor_y,
            }
            for u in self.active_connections[board_id].values()
            if u.user_id != user_id
        ]
        await websocket.send_json({
            "type": "users_list",
            "users": users_list,
        })
        
        return user
    
    def disconnect(self, board_id: str, user_id: str):
        """Remove a WebSocket connection."""
        if board_id in self.active_connections:
            if user_id in self.active_connections[board_id]:
                del self.active_connections[board_id][user_id]
            
            # Clean up empty boards
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]
    
    async def broadcast(
        self, 
        board_id: str, 
        message: dict[str, Any],
        exclude_user: str | None = None
    ):
        """Broadcast a message to all users in a board."""
        if board_id not in self.active_connections:
            return
        
        disconnected = []
        
        for user_id, user in self.active_connections[board_id].items():
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                await user.websocket.send_json(message)
            except Exception:
                disconnected.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected:
            self.disconnect(board_id, user_id)
    
    async def send_to_user(self, board_id: str, user_id: str, message: dict[str, Any]):
        """Send a message to a specific user."""
        if board_id in self.active_connections:
            if user_id in self.active_connections[board_id]:
                user = self.active_connections[board_id][user_id]
                try:
                    await user.websocket.send_json(message)
                except Exception:
                    self.disconnect(board_id, user_id)
    
    def get_user_count(self, board_id: str) -> int:
        """Get number of connected users for a board."""
        if board_id in self.active_connections:
            return len(self.active_connections[board_id])
        return 0
    
    def update_cursor(self, board_id: str, user_id: str, x: float, y: float):
        """Update a user's cursor position."""
        if board_id in self.active_connections:
            if user_id in self.active_connections[board_id]:
                user = self.active_connections[board_id][user_id]
                user.cursor_x = x
                user.cursor_y = y


# Global connection manager instance
manager = ConnectionManager()
