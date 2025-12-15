#!/bin/bash

echo "🚀 Redeploying TES Dashboard Backend..."

# Delete existing backend pod
echo "🗑️ Deleting existing backend pod..."
oc delete pod tes-dashboard-backend-pod -n federated-analytics-showcase --ignore-not-found=true

# Wait a moment for cleanup
sleep 5

# Deploy new backend pod
echo "📦 Deploying updated backend pod..."
oc apply -f backend-pod-deployment.yaml

# Wait for pod to be ready
echo "⏳ Waiting for backend pod to be ready..."
oc wait --for=condition=Ready pod/tes-dashboard-backend-pod -n federated-analytics-showcase --timeout=300s

if [ $? -eq 0 ]; then
    echo "✅ Backend deployment completed successfully!"
    echo "🔗 Backend should be available at: https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi"
    
    # Test the deployment
    echo "🧪 Testing backend health..."
    sleep 10
    curl -s "https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi/api/health" | jq .
else
    echo "❌ Backend deployment failed or timed out"
    echo "📋 Pod status:"
    oc describe pod tes-dashboard-backend-pod -n federated-analytics-showcase
fi
