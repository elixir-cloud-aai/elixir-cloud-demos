#!/bin/bash

# Build and push Docker images for TES Dashboard Analytics
# Make sure you're logged in to Docker Hub first: docker login

set -e

# Configuration
DOCKER_USERNAME="${DOCKER_USERNAME:-your-dockerhub-username}"  # Replace with your Docker Hub username
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "Building and pushing TES Dashboard Analytics images..."
echo "Docker Username: $DOCKER_USERNAME"
echo "Image Tag: $IMAGE_TAG"

# Build backend image
echo "Building backend image..."
cd backend
docker build -t $DOCKER_USERNAME/tesdashboardanalytics-backend:$IMAGE_TAG .
echo "Pushing backend image..."
docker push $DOCKER_USERNAME/tesdashboardanalytics-backend:$IMAGE_TAG

# Build frontend image
echo "Building frontend image..."
cd ../frontend
docker build -t $DOCKER_USERNAME/tesdashboardanalytics-frontend:$IMAGE_TAG .
echo "Pushing frontend image..."
docker push $DOCKER_USERNAME/tesdashboardanalytics-frontend:$IMAGE_TAG

echo "✅ Images built and pushed successfully!"
echo "Backend image: $DOCKER_USERNAME/tesdashboardanalytics-backend:$IMAGE_TAG"
echo "Frontend image: $DOCKER_USERNAME/tesdashboardanalytics-frontend:$IMAGE_TAG"
echo ""
echo "Next steps:"
echo "1. Update your Kubernetes deployment with these image names"
echo "2. Apply the updated deployment: kubectl apply -f k8s/openshift-deployment.yaml"
