"""Spatial query service for chunk-based loading."""

from typing import Optional
from uuid import UUID
from dataclasses import dataclass


@dataclass
class BoundingBox:
    """A rectangular bounding box for spatial queries."""
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    
    @property
    def width(self) -> float:
        return self.max_x - self.min_x
    
    @property
    def height(self) -> float:
        return self.max_y - self.min_y
    
    @property
    def center(self) -> tuple[float, float]:
        return (
            (self.min_x + self.max_x) / 2,
            (self.min_y + self.max_y) / 2,
        )
    
    def intersects(self, other: 'BoundingBox') -> bool:
        """Check if two bounding boxes intersect."""
        return not (
            self.max_x < other.min_x or
            self.min_x > other.max_x or
            self.max_y < other.min_y or
            self.min_y > other.max_y
        )
    
    def contains_point(self, x: float, y: float) -> bool:
        """Check if a point is within the bounding box."""
        return (
            self.min_x <= x <= self.max_x and
            self.min_y <= y <= self.max_y
        )
    
    def expand(self, margin: float) -> 'BoundingBox':
        """Return an expanded bounding box."""
        return BoundingBox(
            min_x=self.min_x - margin,
            min_y=self.min_y - margin,
            max_x=self.max_x + margin,
            max_y=self.max_y + margin,
        )
    
    def to_wkt(self) -> str:
        """Convert to WKT POLYGON for PostGIS queries."""
        return (
            f"POLYGON(("
            f"{self.min_x} {self.min_y}, "
            f"{self.max_x} {self.min_y}, "
            f"{self.max_x} {self.max_y}, "
            f"{self.min_x} {self.max_y}, "
            f"{self.min_x} {self.min_y}"
            f"))"
        )


@dataclass
class ChunkCoord:
    """A chunk coordinate in the infinite grid."""
    chunk_x: int
    chunk_y: int
    
    def to_id(self) -> str:
        """Convert to unique chunk ID."""
        return f"{self.chunk_x}:{self.chunk_y}"
    
    @classmethod
    def from_id(cls, chunk_id: str) -> 'ChunkCoord':
        """Parse from chunk ID."""
        parts = chunk_id.split(':')
        return cls(int(parts[0]), int(parts[1]))
    
    @classmethod
    def from_world_coords(cls, x: float, y: float, chunk_size: int) -> 'ChunkCoord':
        """Get chunk coordinate from world position."""
        return cls(
            chunk_x=int(x // chunk_size),
            chunk_y=int(y // chunk_size),
        )
    
    def to_bounding_box(self, chunk_size: int) -> BoundingBox:
        """Get the world bounding box for this chunk."""
        return BoundingBox(
            min_x=self.chunk_x * chunk_size,
            min_y=self.chunk_y * chunk_size,
            max_x=(self.chunk_x + 1) * chunk_size,
            max_y=(self.chunk_y + 1) * chunk_size,
        )


class SpatialIndex:
    """In-memory spatial index for canvas objects."""
    
    def __init__(self, chunk_size: int = 1000):
        self.chunk_size = chunk_size
        # chunk_id -> set of object_ids
        self._chunks: dict[str, set[str]] = {}
        # object_id -> object data
        self._objects: dict[str, dict] = {}
        # object_id -> set of chunk_ids (objects can span multiple chunks)
        self._object_chunks: dict[str, set[str]] = {}
    
    def add_object(self, obj_id: str, data: dict) -> None:
        """Add or update an object in the spatial index."""
        # Remove old chunk references if updating
        if obj_id in self._object_chunks:
            for old_chunk in self._object_chunks[obj_id]:
                if old_chunk in self._chunks:
                    self._chunks[old_chunk].discard(obj_id)
        
        # Calculate which chunks this object occupies
        x = data.get('x', 0)
        y = data.get('y', 0)
        width = data.get('width', 0)
        height = data.get('height', 0)
        
        obj_box = BoundingBox(x, y, x + width, y + height)
        
        # Find all chunks that intersect with this object
        min_chunk = ChunkCoord.from_world_coords(obj_box.min_x, obj_box.min_y, self.chunk_size)
        max_chunk = ChunkCoord.from_world_coords(obj_box.max_x, obj_box.max_y, self.chunk_size)
        
        chunk_ids = set()
        for cx in range(min_chunk.chunk_x, max_chunk.chunk_x + 1):
            for cy in range(min_chunk.chunk_y, max_chunk.chunk_y + 1):
                chunk_id = f"{cx}:{cy}"
                chunk_ids.add(chunk_id)
                
                if chunk_id not in self._chunks:
                    self._chunks[chunk_id] = set()
                self._chunks[chunk_id].add(obj_id)
        
        self._objects[obj_id] = data
        self._object_chunks[obj_id] = chunk_ids
    
    def remove_object(self, obj_id: str) -> Optional[dict]:
        """Remove an object from the spatial index."""
        if obj_id not in self._objects:
            return None
        
        # Remove from all chunks
        for chunk_id in self._object_chunks.get(obj_id, set()):
            if chunk_id in self._chunks:
                self._chunks[chunk_id].discard(obj_id)
        
        del self._object_chunks[obj_id]
        return self._objects.pop(obj_id)
    
    def query_viewport(self, viewport: BoundingBox) -> list[dict]:
        """Get all objects visible in the given viewport."""
        # Find all chunks that intersect with viewport
        min_chunk = ChunkCoord.from_world_coords(
            viewport.min_x, viewport.min_y, self.chunk_size
        )
        max_chunk = ChunkCoord.from_world_coords(
            viewport.max_x, viewport.max_y, self.chunk_size
        )
        
        visible_objects = set()
        for cx in range(min_chunk.chunk_x, max_chunk.chunk_x + 1):
            for cy in range(min_chunk.chunk_y, max_chunk.chunk_y + 1):
                chunk_id = f"{cx}:{cy}"
                if chunk_id in self._chunks:
                    visible_objects.update(self._chunks[chunk_id])
        
        return [
            self._objects[obj_id] 
            for obj_id in visible_objects 
            if obj_id in self._objects
        ]
    
    def query_chunks(self, chunk_ids: list[str]) -> dict[str, list[dict]]:
        """Get objects for specific chunks."""
        result = {}
        for chunk_id in chunk_ids:
            if chunk_id in self._chunks:
                result[chunk_id] = [
                    self._objects[obj_id]
                    for obj_id in self._chunks[chunk_id]
                    if obj_id in self._objects
                ]
            else:
                result[chunk_id] = []
        return result
    
    def get_loaded_chunk_ids(self) -> list[str]:
        """Get IDs of all chunks that have content."""
        return [
            chunk_id for chunk_id, objects in self._chunks.items()
            if objects  # Only non-empty chunks
        ]
    
    def get_stats(self) -> dict:
        """Get statistics about the spatial index."""
        return {
            "total_objects": len(self._objects),
            "total_chunks": len(self._chunks),
            "non_empty_chunks": len([c for c in self._chunks.values() if c]),
            "chunk_size": self.chunk_size,
        }
    
    def get_all_objects(self) -> list[dict]:
        """Get all objects in the index."""
        return list(self._objects.values())
    
    def clear(self) -> None:
        """Clear all objects from the index."""
        self._chunks.clear()
        self._objects.clear()
        self._object_chunks.clear()


# Per-board spatial index instances
_board_indexes: dict[str, SpatialIndex] = {}


def get_spatial_index(board_id: str) -> SpatialIndex:
    """Get or create a spatial index for a board."""
    if board_id not in _board_indexes:
        _board_indexes[board_id] = SpatialIndex()
    return _board_indexes[board_id]
