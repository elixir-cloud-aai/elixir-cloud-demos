#!/bin/bash

# TES Dashboard - Docker Deployment Script
# This script builds and runs the TES Dashboard using Docker Compose

set -e

echo "🚀 Starting TES Dashboard Docker Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "📦 Building Docker images..."
docker-compose build --no-cache

echo "🔄 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ TES Dashboard is now running!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo ""
echo "📊 Health checks:"
echo "   Backend: curl http://localhost:8000/api/health"
echo "   Frontend: curl http://localhost:3000"
echo ""
echo "📋 View logs:"
echo "   All services: docker-compose logs -f"
echo "   Backend only: docker-compose logs -f backend"
echo "   Frontend only: docker-compose logs -f frontend"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"
echo ""
