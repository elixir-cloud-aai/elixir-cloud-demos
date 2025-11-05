#!/bin/bash

echo "🚀 Starting TES Dashboard with React Frontend + Flask Backend"
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
if check_port 8000; then
    echo "Stopping process on port 8000..."
    kill $(lsof -t -i:8000) 2>/dev/null || true
fi

if check_port 3000; then
    echo "Stopping process on port 3000..."
    kill $(lsof -t -i:3000) 2>/dev/null || true
fi

sleep 2

# Start backend
echo ""
echo "🔧 Starting Flask Backend on port 8000..."
cd demos/2025-elixir-on-cloud/backend
source /Users/keshavdayal/Desktop/elixir-cloud-demos/.venv/bin/activate
python3 app.py &
BACKEND_PID=$!
cd ../../..

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 3

# Check if backend started successfully
if check_port 8000; then
    echo "✅ Backend started successfully"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo ""
echo "🌐 Starting React Frontend on port 3000..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 Dashboard is starting up!"
echo ""
echo "📋 Access URLs:"
echo "- Frontend (React): http://localhost:3000"
echo "- Backend API: http://localhost:8000/api/health"
echo ""
echo "🛑 To stop the dashboard, press Ctrl+C"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
