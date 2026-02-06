"""Chunks router for efficient spatial loading."""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from src.services.spatial import (
    get_spatial_index,
    BoundingBox,
    ChunkCoord,
)

router = APIRouter(prefix="/boards/{board_id}/chunks", tags=["chunks"])


class ViewportQuery(BaseModel):
    """Query for viewport-based loading."""
    min_x: float
    min_y: float
    max_x: float
    max_y: float


class ChunkData(BaseModel):
    """Response with chunk data."""
    chunk_id: str
    objects: list[dict]


class ViewportResponse(BaseModel):
    """Response for viewport query."""
    objects: list[dict]
    loaded_chunks: list[str]
    stats: dict


@router.post("/viewport")
async def query_viewport(
    board_id: str,
    viewport: ViewportQuery,
) -> ViewportResponse:
    """
    Get all objects visible in the given viewport.
    
    This is the primary method for loading visible content.
    Only objects that intersect with the viewport are returned.
    """
    index = get_spatial_index(board_id)
    
    bbox = BoundingBox(
        min_x=viewport.min_x,
        min_y=viewport.min_y,
        max_x=viewport.max_x,
        max_y=viewport.max_y,
    )
    
    objects = index.query_viewport(bbox)
    
    # Calculate which chunks were queried
    chunk_size = index.chunk_size
    min_chunk = ChunkCoord.from_world_coords(bbox.min_x, bbox.min_y, chunk_size)
    max_chunk = ChunkCoord.from_world_coords(bbox.max_x, bbox.max_y, chunk_size)
    
    loaded_chunks = []
    for cx in range(min_chunk.chunk_x, max_chunk.chunk_x + 1):
        for cy in range(min_chunk.chunk_y, max_chunk.chunk_y + 1):
            loaded_chunks.append(f"{cx}:{cy}")
    
    return ViewportResponse(
        objects=objects,
        loaded_chunks=loaded_chunks,
        stats=index.get_stats(),
    )


@router.get("/list")
async def list_chunks(
    board_id: str,
) -> dict:
    """
    Get a list of all chunks that have content.
    
    Useful for showing a mini-map or overview of where content is located.
    """
    index = get_spatial_index(board_id)
    chunk_ids = index.get_loaded_chunk_ids()
    
    # Parse chunk coordinates for mapping
    chunks_info = []
    for chunk_id in chunk_ids:
        coord = ChunkCoord.from_id(chunk_id)
        bbox = coord.to_bounding_box(index.chunk_size)
        chunks_info.append({
            "id": chunk_id,
            "x": coord.chunk_x,
            "y": coord.chunk_y,
            "worldBounds": {
                "minX": bbox.min_x,
                "minY": bbox.min_y,
                "maxX": bbox.max_x,
                "maxY": bbox.max_y,
            },
        })
    
    return {
        "chunks": chunks_info,
        "chunkSize": index.chunk_size,
        "stats": index.get_stats(),
    }


@router.get("/by-ids")
async def get_chunks_by_ids(
    board_id: str,
    ids: str = Query(..., description="Comma-separated chunk IDs"),
) -> dict:
    """
    Get objects for specific chunk IDs.
    
    Useful for preloading nearby chunks.
    """
    index = get_spatial_index(board_id)
    chunk_ids = [id.strip() for id in ids.split(",") if id.strip()]
    
    result = index.query_chunks(chunk_ids)
    
    return {
        "chunks": [
            {"id": chunk_id, "objects": objects}
            for chunk_id, objects in result.items()
        ],
        "stats": index.get_stats(),
    }


@router.get("/around")
async def get_chunks_around(
    board_id: str,
    x: float = Query(..., description="Center X coordinate"),
    y: float = Query(..., description="Center Y coordinate"),
    radius: int = Query(1, ge=0, le=5, description="Chunk radius to load"),
) -> dict:
    """
    Get chunks around a specific point.
    
    Loads a square of chunks centered on the given position.
    """
    index = get_spatial_index(board_id)
    center_chunk = ChunkCoord.from_world_coords(x, y, index.chunk_size)
    
    chunk_ids = []
    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            chunk_ids.append(f"{center_chunk.chunk_x + dx}:{center_chunk.chunk_y + dy}")
    
    result = index.query_chunks(chunk_ids)
    
    return {
        "centerChunk": center_chunk.to_id(),
        "chunks": [
            {"id": chunk_id, "objects": objects}
            for chunk_id, objects in result.items()
        ],
        "stats": index.get_stats(),
    }


@router.get("/stats")
async def get_spatial_stats(
    board_id: str,
) -> dict:
    """
    Get statistics about the spatial index for a board.
    """
    index = get_spatial_index(board_id)
    return {
        "boardId": board_id,
        **index.get_stats(),
    }
