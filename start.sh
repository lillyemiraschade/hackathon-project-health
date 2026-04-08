#!/bin/bash
# CareBridge — start all services

set -e

echo "=== CareBridge ==="
echo ""

# Copy .env if needed
if [ ! -f backend/.env ]; then
    cp .env.example backend/.env
    echo "Created backend/.env from .env.example"
    echo "Edit backend/.env to add your ANTHROPIC_API_KEY."
    echo ""
fi

# Backend
echo "Starting backend..."
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Provider dashboard
echo "Starting provider dashboard..."
cd frontend
npm run dev &
PROVIDER_PID=$!
cd ..

# Consumer app
echo "Starting consumer app..."
cd consumer
npm run dev &
CONSUMER_PID=$!
cd ..

echo ""
echo "========================================="
echo "  CareBridge is running!"
echo "========================================="
echo "  Provider:  http://localhost:5173"
echo "  Consumer:  http://localhost:5174"
echo "  Backend:   http://localhost:8000"
echo "  API docs:  http://localhost:8000/docs"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $PROVIDER_PID $CONSUMER_PID 2>/dev/null; exit" INT TERM
wait
