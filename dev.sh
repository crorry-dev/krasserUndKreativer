#!/bin/bash
set -e

echo "🚀 Starte Infinite Canvas Development Environment"
echo ""

# API starten
echo "📡 Starte API Server..."
cd apps/api
source .venv/bin/activate
export PYTHONPATH=$PWD
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!
cd ../..

echo "✅ API Server läuft auf http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/api/docs"
echo ""

# Frontend starten
echo "🎨 Starte Frontend Dev Server..."
cd apps/web
pnpm dev &
WEB_PID=$!
cd ../..

echo "✅ Frontend läuft auf http://localhost:5173"
echo ""
echo "⏹️  Zum Beenden: Strg+C drücken"
echo ""

# Warten auf Abbruch
trap "echo ''; echo '🛑 Beende Services...'; kill $API_PID $WEB_PID 2>/dev/null; exit" INT TERM

wait
