# 🎨 Infinite Canvas

A real-time collaborative whiteboard with infinite zoom capabilities. Draw, write, and create together – from pixel-level detail to universe-scale views.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Python](https://img.shields.io/badge/Python-3.12-green)
![React](https://img.shields.io/badge/React-18.3-61dafb)

## ✨ Features

- **Infinite Zoom** – Zoom from 0.0001% to 1,000,000%+ without limits
- **Real-time Collaboration** – Work together via WebSocket with live cursors
- **Rich Drawing Tools** – Pen, shapes (rect, circle, triangle, diamond, line, arrow), text, sticky notes
- **Smart Eraser** – Stroke-splitting eraser that cuts through lines
- **Local Persistence** – Board state survives page reloads
- **History Tracking** – Undo/redo with timestamps and user attribution
- **Dark Mode UI** – Modern, minimal interface with Apple-style design

## 🏗️ Architecture

```
infinite-canvas/
├── apps/
│   ├── api/          # Python FastAPI backend
│   └── web/          # React + TypeScript frontend
├── docker-compose.yml
└── dev.sh            # Development startup script
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Zustand, React-Konva, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis 7 |
| Real-time | WebSockets |

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 8
- **Python** ≥ 3.12
- **Docker** & **Docker Compose**

### 1. Clone & Install

```bash
git clone https://github.com/crorry-dev/krasserUndKreativer.git
cd krasserUndKreativer

# Install frontend dependencies
pnpm install
```

### 2. Setup Python Backend

```bash
cd apps/api

# Create virtual environment
python3 -m venv .venv

# Activate (macOS/Linux)
source .venv/bin/activate

# Activate (Windows)
# .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

cd ../..
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL + Redis
docker compose up -d
```

### 4. Run Development Servers

**Option A: Start everything at once**
```bash
./dev.sh
```

**Option B: Start services separately**

Terminal 1 – Backend:
```bash
cd apps/api
source .venv/bin/activate
export PYTHONPATH=$PWD
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 – Frontend:
```bash
cd apps/web
pnpm dev
```

### 5. Open in Browser

- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8000/api/docs
- **Health Check:** http://localhost:8000/api/health

## 📁 Project Structure

### Frontend (`apps/web/`)

```
src/
├── components/
│   ├── Canvas/          # InfiniteCanvas with Konva
│   ├── Toolbar/         # Tool selection & color picker
│   ├── History/         # Undo/redo panel
│   ├── Objects/         # Shape, Text, Sticky components
│   └── ...
├── stores/
│   └── canvasStore.ts   # Zustand state management
├── hooks/
│   ├── useWebSocket.ts  # Real-time sync
│   └── useChunkedLoading.ts
└── pages/               # Route pages
```

### Backend (`apps/api/`)

```
src/
├── core/
│   ├── config.py        # Settings via pydantic-settings
│   └── database.py      # SQLAlchemy async setup
├── models/              # SQLAlchemy models
├── routers/             # FastAPI route handlers
├── services/            # Business logic
└── websocket/           # WebSocket manager & handlers
```

## 🛠️ Development

### Linting & Formatting

```bash
# Frontend
cd apps/web
pnpm lint

# Backend
cd apps/api
source .venv/bin/activate
ruff check .
ruff format .
mypy src
```

### Testing

```bash
# Backend tests
cd apps/api
source .venv/bin/activate
pytest
```

### Database Migrations

```bash
cd apps/api
source .venv/bin/activate

# Create migration
alembic revision --autogenerate -m "description"

# Run migrations
alembic upgrade head
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` in `apps/api/`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/infinite_canvas
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key
DEBUG=true
```

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Main database with PostGIS |
| Redis | 6379 | WebSocket pub/sub & caching |

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/boards/{id}` | Get board data |
| POST | `/api/boards` | Create new board |
| WS | `/api/ws/{board_id}` | WebSocket connection |

Full API documentation available at `/api/docs` (Swagger UI).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **Frontend:** ESLint + Prettier, strict TypeScript
- **Backend:** Ruff, strict mypy, type hints everywhere
- Follow existing patterns and conventions

## 📄 License

This project is licensed under the MIT License – see [LICENSE](LICENSE) for details.

## 👤 Author

**crorry-dev** – [GitHub](https://github.com/crorry-dev)

---

<p align="center">
  Made with ❤️ for collaborative creativity
</p>