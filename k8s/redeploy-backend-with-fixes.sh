#!/bin/bash

# Redeploy backend with all fixes
echo "🚀 Redeploying TES Dashboard Backend with fixes..."

# Apply the configmap
echo "📋 Creating TES instances configmap..."
kubectl apply -f tes-instances-configmap.yaml

# Delete existing backend pod
echo "🗑️ Deleting existing backend pod..."
kubectl delete pod tes-dashboard-backend-pod -n federated-analytics-showcase --ignore-not-found=true

# Wait a moment for cleanup
sleep 5

# Deploy updated backend
echo "🚀 Deploying updated backend pod..."
kubectl apply -f backend-pod-deployment.yaml

# Wait for pod to be ready
echo "⏳ Waiting for backend pod to be ready..."
kubectl wait --for=condition=Ready pod/tes-dashboard-backend-pod -n federated-analytics-showcase --timeout=300s

# Check pod status
echo "📊 Backend pod status:"
kubectl get pod tes-dashboard-backend-pod -n federated-analytics-showcase

# Check backend logs to verify startup
echo "📝 Backend startup logs:"
kubectl logs tes-dashboard-backend-pod -n federated-analytics-showcase --tail=20

echo "✅ Backend redeployment complete!"
echo "🌐 Backend should be available at: https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi"
