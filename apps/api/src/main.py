from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import get_settings
from src.core.database import Base, engine
from src.routers import boards, objects, health, guests, history, chunks, payments, users
from src.websocket import websocket_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["Health"])
app.include_router(boards.router, prefix="/api/boards", tags=["Boards"])
app.include_router(objects.router, prefix="/api/boards", tags=["Objects"])
app.include_router(guests.router, prefix="/api", tags=["Guests"])
app.include_router(history.router, prefix="/api", tags=["History"])
app.include_router(chunks.router, prefix="/api", tags=["Chunks"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(websocket_router, tags=["WebSocket"])


@app.get("/")
async def root():
    return {"message": "Infinite Canvas API", "version": "0.1.0"}


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite+aiosqlite")


@app.on_event("startup")
async def ensure_sqlite_schema() -> None:
    if not _is_sqlite(settings.database_url):
        return

    database_url = settings.database_url.replace("sqlite+aiosqlite:///", "")
    if database_url and database_url != ":memory:":
        db_path = Path(database_url).resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
