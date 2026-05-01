#!/bin/bash
# Vyrexo — Start both backend and frontend servers

echo "Starting Vyrexo..."
echo ""

# Start backend
echo "[Backend] Starting FastAPI on http://127.0.0.1:8001"
cd backend
PYTHONPATH=src python -m uvicorn vyrexo.main:app --host 127.0.0.1 --port 8001 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
sleep 3

# Start frontend
echo "[Frontend] Starting Next.js on http://localhost:3001"
cd frontend
npx next dev -p 3001 &
FRONTEND_PID=$!
cd ..

echo ""
echo "Vyrexo is running!"
echo "  Backend:  http://127.0.0.1:8001"
echo "  Frontend: http://localhost:3001"
echo "  API docs: http://127.0.0.1:8001/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
