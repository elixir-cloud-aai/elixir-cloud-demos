#!/bin/bash

echo "🔄 Redeploying TES Dashboard with latest code..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Set namespace
NAMESPACE="federated-analytics-showcase"

echo "📍 Using namespace: $NAMESPACE"

# Delete existing pods to force restart and pull latest code
echo "🗑️  Deleting existing backend pod..."
kubectl delete pod tes-dashboard-backend-pod -n $NAMESPACE --ignore-not-found=true

echo "🗑️  Deleting existing frontend pod..."  
kubectl delete pod tes-dashboard-frontend-pod -n $NAMESPACE --ignore-not-found=true

# Wait a moment for cleanup
echo "⏳ Waiting for pods to terminate..."
sleep 5

# Redeploy backend
echo "🚀 Deploying backend pod..."
kubectl apply -f k8s/backend-pod-deployment.yaml -n $NAMESPACE

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
kubectl wait --for=condition=Ready pod/tes-dashboard-backend-pod -n $NAMESPACE --timeout=300s

# Redeploy frontend 
echo "🚀 Deploying frontend pod..."
kubectl apply -f k8s/frontend-pod-deployment.yaml -n $NAMESPACE

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
kubectl wait --for=condition=Ready pod/tes-dashboard-frontend-pod -n $NAMESPACE --timeout=600s

echo "✅ Dashboard redeployed successfully!"

# Show pod status
echo "📊 Current pod status:"
kubectl get pods -n $NAMESPACE -l app.kubernetes.io/part-of=tes-dashboard-analytics-app

# Test the deployment
echo "🧪 Testing deployment..."
sleep 10

# Get the route URL
ROUTE_URL="https://tes-dashboard-frontend-route-federated-analytics-showcase.2.rahtiapp.fi"

echo "🌐 Testing frontend health..."
curl -s "${ROUTE_URL}/health" | jq . || echo "Health check failed"

echo "🌐 Testing backend API..."  
curl -s "${ROUTE_URL}/api/instances" | head -10 || echo "API test failed"

echo "🎉 Deployment complete! Dashboard available at: ${ROUTE_URL}"
