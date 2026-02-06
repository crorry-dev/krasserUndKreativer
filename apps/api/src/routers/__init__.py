from .health import router as health_router
from .boards import router as boards_router
from .objects import router as objects_router
from .guests import router as guests_router
from .history import router as history_router
from .chunks import router as chunks_router
from .payments import router as payments_router
from .users import router as users_router

__all__ = [
    "health_router",
    "boards_router",
    "objects_router",
    "guests_router",
    "history_router",
    "chunks_router",
    "payments_router",
    "users_router",
]
