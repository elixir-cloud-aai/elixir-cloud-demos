#!/bin/bash

echo "🚀 Deploying TES Dashboard Analytics with Port Fixes..."

# Apply the main deployment
echo "📦 Applying Kubernetes deployment..."
kubectl apply -f k8s/openshift-deployment.yaml

echo "⏳ Waiting for pods to start..."
sleep 30

echo "📊 Checking deployment status..."
kubectl get pods -n tesdashboardanalytics

echo "🌐 Getting routes..."
kubectl get routes -n tesdashboardanalytics

echo "✅ Deployment complete! Check the routes above for access URLs."
echo "💡 The backend should now be accessible on port 8000 and the frontend should be able to connect to it."

# Instructions
echo ""
echo "🔍 To troubleshoot:"
echo "  kubectl logs -n tesdashboardanalytics -l app=tesdashboardanalytics-backend"
echo "  kubectl logs -n tesdashboardanalytics -l app=tesdashboardanalytics-frontend"
echo ""
echo "🌐 To check if backend is responding:"
echo "  kubectl port-forward -n tesdashboardanalytics svc/tesdashboardanalytics-backend-service 8000:8000"
echo "  curl http://localhost:8000/api/test_connection"
