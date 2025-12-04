#!/bin/bash

echo "🔍 Testing TES Dashboard Backend Endpoints"
echo "========================================"

BACKEND_URL="https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi"

echo "Backend URL: $BACKEND_URL"
echo ""

# Test if backend is responding
echo "1. Testing backend health:"
curl -s "$BACKEND_URL/api/health" | head -200
echo ""
echo ""

# Test if new task_log endpoint exists (should return 404 but with task not found, not endpoint not found)
echo "2. Testing new /api/task_log endpoint (expect 'Task not found' not 'Not Found'):"
curl -s "$BACKEND_URL/api/task_log/test-task-id" | head -200
echo ""
echo ""

# Test what endpoints are available
echo "3. Testing available endpoints:"
echo "   - /api/tasks (should return list):"
curl -s "$BACKEND_URL/api/tasks" | head -200
echo ""
echo ""

echo "   - /api/batch_log/test (should return batch not found):"
curl -s "$BACKEND_URL/api/batch_log/test-batch-id" | head -200
echo ""
echo ""

echo "4. Testing your specific task ID:"
curl -s "$BACKEND_URL/api/task_log/057f60c5-0831-47e9-9c4d-ceb28db97e33" | head -200
echo ""
echo ""

echo "✅ Endpoint test complete!"
echo ""
echo "🔧 What to look for:"
echo "   - If /api/task_log returns 'Task not found' = Backend has new code ✅"
echo "   - If /api/task_log returns HTML 404 page = Backend needs update ❌"
echo "   - If your task shows up in logs but with error = Frontend issue ⚠️"
