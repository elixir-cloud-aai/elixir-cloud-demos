#!/bin/bash

# Elixir Cloud Demo - Build and Deploy Script
# This script builds Docker images and deploys to Kubernetes

set -e

echo "🚀 Building Elixir Cloud Demo Project..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_IMAGE="elixir-backend:latest"
FRONTEND_IMAGE="elixir-frontend:latest"
NAMESPACE="tesdashboardanalytics"

echo -e "${BLUE}Step 1: Building Backend Docker Image...${NC}"
cd backend
docker build -t $BACKEND_IMAGE .
echo -e "${GREEN}✅ Backend image built successfully${NC}"

echo -e "${BLUE}Step 2: Building Frontend Docker Image...${NC}"
cd ../frontend
docker build -t $FRONTEND_IMAGE .
echo -e "${GREEN}✅ Frontend image built successfully${NC}"

echo -e "${BLUE}Step 3: Deploying to Kubernetes...${NC}"
cd ../k8s

# Check if namespace exists, create if not
if ! kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
    echo -e "${YELLOW}Creating namespace: $NAMESPACE${NC}"
    kubectl create namespace $NAMESPACE
fi

# Apply the complete deployment
kubectl apply -f complete-deployment.yaml

echo -e "${BLUE}Step 4: Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/tesdashboardanalytics-backend -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/tesdashboardanalytics-frontend -n $NAMESPACE

echo -e "${GREEN}✅ All deployments are ready!${NC}"

echo -e "${BLUE}Step 5: Getting service information...${NC}"
echo -e "${YELLOW}Services in namespace $NAMESPACE:${NC}"
kubectl get services -n $NAMESPACE

echo -e "${YELLOW}Pods in namespace $NAMESPACE:${NC}"
kubectl get pods -n $NAMESPACE

# Get the external IP for frontend service
echo -e "${BLUE}Step 6: Getting external access information...${NC}"
EXTERNAL_IP=$(kubectl get service tesdashboardanalytics-frontend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

if [ -z "$EXTERNAL_IP" ]; then
    echo -e "${YELLOW}⏳ External IP not yet assigned. You can check later with:${NC}"
    echo "kubectl get service tesdashboardanalytics-frontend-service -n $NAMESPACE"
    echo -e "${YELLOW}Or use port-forward for testing:${NC}"
    echo "kubectl port-forward service/tesdashboardanalytics-frontend-service 8080:80 -n $NAMESPACE"
    echo -e "${YELLOW}Then access: http://localhost:8080${NC}"
else
    echo -e "${GREEN}🌐 Your application is available at: http://$EXTERNAL_IP${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}Useful commands:${NC}"
echo "- View logs: kubectl logs -f deployment/tesdashboardanalytics-backend -n $NAMESPACE"
echo "- Scale: kubectl scale deployment tesdashboardanalytics-frontend --replicas=3 -n $NAMESPACE"
echo "- Delete: kubectl delete namespace $NAMESPACE"
