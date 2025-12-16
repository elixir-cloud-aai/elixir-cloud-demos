#!/bin/bash

# Redeploy backend with all fixes
echo "🚀 Redeploying TES Dashboard Backend with fixes..."

# Delete existing backend pod
echo "🗑️ Deleting existing backend pod..."
oc delete pod tes-dashboard-backend-pod -n federated-analytics-showcase --ignore-not-found=true

# Wait a moment for cleanup
sleep 5

# Deploy updated backend
echo "🚀 Deploying updated backend pod..."
oc apply -f backend-pod-deployment.yaml

# Wait for pod to be ready
echo "⏳ Waiting for backend pod to be ready..."
oc wait --for=condition=Ready pod/tes-dashboard-backend-pod -n federated-analytics-showcase --timeout=300s

if [ $? -eq 0 ]; then
    echo "✅ Backend deployment completed successfully!"
    echo "🔗 Backend should be available at: https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi"
    
    # Check pod status
    echo "📊 Backend pod status:"
    oc get pod tes-dashboard-backend-pod -n federated-analytics-showcase
    
    # Check backend logs to verify startup and TES instances loading
    echo "📝 Backend startup logs:"
    oc logs tes-dashboard-backend-pod -n federated-analytics-showcase --tail=30
    
    # Test the deployment
    echo "🧪 Testing backend endpoints..."
    sleep 10
    echo "Testing health endpoint:"
    curl -s "https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi/api/health" | jq . || echo "Health check failed"
    echo "Testing instances endpoint:"
    curl -s "https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi/api/instances" | jq '. | length' || echo "Instances check failed"
else
    echo "❌ Backend deployment failed or timed out"
    echo "📋 Pod status:"
    oc describe pod tes-dashboard-backend-pod -n federated-analytics-showcase
    echo "📝 Pod logs:"
    oc logs tes-dashboard-backend-pod -n federated-analytics-showcase --tail=50
fi
