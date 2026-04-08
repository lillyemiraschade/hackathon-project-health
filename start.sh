#!/bin/bash
# Care Companion MVP — start both backend and frontend

set -e

echo "=== Care Companion MVP ==="
echo ""

# Copy .env if needed
if [ ! -f backend/.env ]; then
    cp .env.example backend/.env
    echo "Created backend/.env from .env.example"
    echo "Edit backend/.env to add your ANTHROPIC_API_KEY for live features."
    echo ""
fi

# Backend
echo "Starting backend..."
cd backend
source venv/bin/activate
python seed.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=================================="
echo "  Care Companion MVP is running!"
echo "=================================="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo "=================================="
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
