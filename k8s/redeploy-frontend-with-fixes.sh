#!/bin/bash

echo "🚀 Redeploying TES Dashboard Frontend with API fixes..."

# Delete existing frontend pod
echo "🗑️ Deleting existing frontend pod..."
oc delete pod tes-dashboard-frontend-pod -n federated-analytics-showcase --ignore-not-found=true

# Wait a moment for cleanup
sleep 5

# Deploy updated frontend pod
echo "📦 Deploying updated frontend pod..."
oc apply -f frontend-pod-deployment.yaml

# Wait for pod to be ready
echo "⏳ Waiting for frontend pod to be ready..."
oc wait --for=condition=Ready pod/tes-dashboard-frontend-pod -n federated-analytics-showcase --timeout=300s

if [ $? -eq 0 ]; then
    echo "✅ Frontend deployment completed successfully!"
    echo "🔗 Frontend should be available at: https://tes-dashboard-frontend-route-federated-analytics-showcase.2.rahtiapp.fi"
    
    # Check pod status
    echo "📊 Frontend pod status:"
    oc get pod tes-dashboard-frontend-pod -n federated-analytics-showcase
    
    # Check frontend logs
    echo "📝 Frontend startup logs:"
    oc logs tes-dashboard-frontend-pod -n federated-analytics-showcase --tail=20
    
    # Test the deployment
    echo "🧪 Testing frontend..."
    sleep 10
    curl -s "https://tes-dashboard-frontend-route-federated-analytics-showcase.2.rahtiapp.fi" | head -5
else
    echo "❌ Frontend deployment failed or timed out"
    echo "📋 Pod status:"
    oc describe pod tes-dashboard-frontend-pod -n federated-analytics-showcase
    echo "📝 Pod logs:"
    oc logs tes-dashboard-frontend-pod -n federated-analytics-showcase --tail=50
fi
