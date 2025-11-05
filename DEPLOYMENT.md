# 🚀 Kubernetes Deployment Guide - Elixir Cloud Demo

## Quick Start (Recommended)

### Option 1: Automated Deployment Script
```bash
# Make sure you're in the project root directory
./deploy.sh
```

### Option 2: Manual Step-by-Step Deployment

#### 1. Build Docker Images
```bash
# Build backend
cd backend
docker build -t elixir-backend:latest .

# Build frontend  
cd ../frontend
docker build -t elixir-frontend:latest .
```

#### 2. Deploy to Kubernetes
```bash
# Apply the complete deployment
kubectl apply -f k8s/complete-deployment.yaml

# Wait for pods to be ready
kubectl wait --for=condition=available --timeout=300s deployment/elixir-backend -n elixir-cloud
kubectl wait --for=condition=available --timeout=300s deployment/elixir-frontend -n elixir-cloud
```

#### 3. Access Your Application
```bash
# Get external IP (if LoadBalancer is supported)
kubectl get service elixir-frontend-service -n elixir-cloud

# Or use port-forward for testing
kubectl port-forward service/elixir-frontend-service 8080:80 -n elixir-cloud
# Then visit: http://localhost:8080
```

## For Kubernetes Dashboard Deployment

### Upload Files in This Order:

1. **First**: Upload `k8s/complete-deployment.yaml` 
   - This creates namespace, deployments, and services
   - In K8s Dashboard: Create → Upload YAML

2. **Second**: If you want ingress (for custom domain):
   - Upload `k8s/ingress.yaml` (edit domain first)

### Docker Images Required:
- `elixir-backend:latest` (built from backend/Dockerfile)
- `elixir-frontend:latest` (built from frontend/Dockerfile)

## Architecture

```
Internet → LoadBalancer → Frontend (Nginx) → Backend (Flask API)
                                    ↓
                             Network Topology Data
```

## What Gets Created:

- **Namespace**: `elixir-cloud`
- **Backend**: 2 replicas, Flask API on port 5000
- **Frontend**: 2 replicas, Nginx serving React app on port 80
- **Services**: ClusterIP for backend, LoadBalancer for frontend
- **Health Checks**: Readiness and liveness probes
- **Resource Limits**: Memory and CPU limits for stability

## Access Methods:

### 1. LoadBalancer (Cloud Provider)
- Automatically gets external IP
- Direct internet access

### 2. Port Forward (Local/Testing)
```bash
kubectl port-forward service/elixir-frontend-service 8080:80 -n elixir-cloud
# Access: http://localhost:8080
```

### 3. Ingress (Custom Domain)
- Edit `k8s/ingress.yaml` with your domain
- Requires ingress controller (nginx-ingress)

## Monitoring Commands:

```bash
# Check status
kubectl get all -n elixir-cloud

# View logs
kubectl logs -f deployment/elixir-backend -n elixir-cloud
kubectl logs -f deployment/elixir-frontend -n elixir-cloud

# Scale applications
kubectl scale deployment elixir-frontend --replicas=3 -n elixir-cloud

# Delete everything
kubectl delete namespace elixir-cloud
```

## Features:
- ✅ Production-ready deployment
- ✅ Auto-scaling ready (HPA can be added)
- ✅ Health checks and monitoring
- ✅ Load balancing across replicas
- ✅ Persistent uploads storage
- ✅ Nginx reverse proxy for API calls
- ✅ Resource limits and requests
- ✅ Security best practices

## Troubleshooting:

### Images Not Found:
```bash
# Check if images exist locally
docker images | grep elixir

# Rebuild if needed
cd backend && docker build -t elixir-backend:latest .
cd frontend && docker build -t elixir-frontend:latest .
```

### Pods Not Starting:
```bash
# Check pod status
kubectl describe pods -n elixir-cloud

# Check logs
kubectl logs -l app=elixir-backend -n elixir-cloud
```

### External IP Pending:
```bash
# Use NodePort instead of LoadBalancer
kubectl patch service elixir-frontend-service -n elixir-cloud -p '{"spec":{"type":"NodePort"}}'

# Or use port-forward
kubectl port-forward service/elixir-frontend-service 8080:80 -n elixir-cloud
```
