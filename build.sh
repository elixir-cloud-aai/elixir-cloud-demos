#!/bin/bash

# Build script for production deployment
set -e

echo "🏗️  Building Elixir Cloud Demo for Production..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Building frontend with production settings...${NC}"
cd frontend
NODE_ENV=production npm run build
echo -e "${GREEN}✅ Frontend build completed${NC}"

echo -e "${BLUE}Building Docker images...${NC}"
cd ..

# Build backend image
docker build -t elixir-backend:latest ./backend
echo -e "${GREEN}✅ Backend image built${NC}"

# Build frontend image  
docker build -t elixir-frontend:latest ./frontend
echo -e "${GREEN}✅ Frontend image built${NC}"

echo -e "${GREEN}🎉 All images built successfully!${NC}"
echo "Ready to deploy with: kubectl apply -f k8s/complete-deployment.yaml"
