#!/bin/bash

echo "🔧 Testing TES Dashboard Integration..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to test API endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    
    echo "Testing $endpoint..."
    response=$(curl -s -w "%{http_code}" -o /tmp/test_response.json "http://localhost:8000$endpoint")
    
    if [ "$response" -eq "$expected_status" ]; then
        echo "✅ $endpoint - OK"
        return 0
    else
        echo "❌ $endpoint - Failed (HTTP $response)"
        return 1
    fi
}

# Check if backend is running
if check_port 8000; then
    echo "✅ Backend is running on port 8000"
else
    echo "❌ Backend is not running on port 8000"
    echo "Please start the backend with: cd backend && python3 app.py"
    exit 1
fi

echo ""
echo "🔍 Testing Backend API Endpoints..."

# Test all critical endpoints
endpoints=(
    "/api/health"
    "/api/instances"
    "/api/tasks"
    "/api/workflows"
    "/api/batch_runs"
    "/api/tes_locations"
    "/api/dashboard_data"
    "/api/latest_workflow_status"
    "/api/test_connection"
    "/api/topology_logs"
    "/api/storage_locations"
    "/api/network_metrics"
    "/api/data_transfers"
    "/api/network_topology"
)

failed_tests=0

for endpoint in "${endpoints[@]}"; do
    if ! test_endpoint "$endpoint"; then
        ((failed_tests++))
    fi
done

echo ""
if [ $failed_tests -eq 0 ]; then
    echo "✅ All backend endpoints are working correctly!"
else
    echo "❌ $failed_tests endpoint(s) failed"
fi

echo ""
echo "🌐 Testing Frontend Integration..."

# Check if frontend dependencies are installed
if [ -d "/Users/keshavdayal/Desktop/elixir-cloud-demos/frontend/node_modules" ]; then
    echo "✅ Frontend dependencies are installed"
else
    echo "❌ Frontend dependencies not found"
    echo "Please install with: cd frontend && npm install"
    exit 1
fi

echo ""
echo "📋 Integration Summary:"
echo "- Backend API: ✅ Running on http://localhost:8000"
echo "- Frontend configured for: http://localhost:8000"
echo "- CORS enabled for: http://localhost:3000"
echo ""
echo "🚀 To start the complete dashboard:"
echo "1. Backend: cd backend && python3 app.py"
echo "2. Frontend: cd frontend && npm start"
echo ""
echo "Or use the convenient script: ./run.sh"
