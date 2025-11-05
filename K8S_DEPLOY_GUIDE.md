# 🚀 **KUBERNETES DEPLOYMENT - STEP BY STEP GUIDE**

## 📋 **What You Have Now**

Your project is now **production-ready** with complete Kubernetes deployment files:

```
elixir-cloud-demos/
├── backend/
│   ├── Dockerfile              ← Backend container
│   └── app.py
├── frontend/
│   ├── Dockerfile              ← Frontend container  
│   ├── nginx.conf              ← Nginx configuration
│   └── src/
├── k8s/
│   ├── complete-deployment.yaml ← 🎯 MAIN FILE FOR K8S DASHBOARD
│   ├── backend-deployment.yaml  ← Individual backend deployment
│   ├── frontend-deployment.yaml ← Individual frontend deployment
│   └── ingress.yaml             ← For custom domains
├── deploy.sh                    ← Automated deployment script
├── build.sh                     ← Build Docker images
└── DEPLOYMENT.md               ← Full documentation
```

---

## 🎯 **KUBERNETES DASHBOARD DEPLOYMENT** 

### **Option A: Quick Upload (Recommended)**

1. **Upload the main file to your K8s Dashboard:**
   - File: `k8s/complete-deployment.yaml`
   - In Dashboard: **Create** → **Upload YAML** → Select file
   - Click **Upload**

2. **Wait for deployment** (2-3 minutes)
   - Check **Workloads** → **Deployments**
   - Should see: `elixir-backend` and `elixir-frontend` (both green)

3. **Get your public URL:**
   - Go to **Service and Ingresses** → **Services**
   - Find `elixir-frontend-service`
   - Look for **External IP** (may take 5-10 minutes)
   - Access: `http://EXTERNAL_IP`

---

### **Option B: Command Line Deployment**

```bash
# 1. Build Docker images
./build.sh

# 2. Deploy to Kubernetes
./deploy.sh

# 3. Get your public URL
kubectl get service elixir-frontend-service -n elixir-cloud
```

---

## 🌐 **Getting Your Public URL**

### **Method 1: LoadBalancer (Auto Public IP)**
```bash
kubectl get service tesdashboardanalytics-frontend-service -n tesdashboardanalytics
# Wait for EXTERNAL-IP to appear (not <pending>)
```

### **Method 2: Port Forward (Instant Testing)**  
```bash
kubectl port-forward service/tesdashboardanalytics-frontend-service 8080:80 -n tesdashboardanalytics
# Then visit: http://localhost:8080
```

### **Method 3: NodePort (Alternative)**
```bash
kubectl patch service tesdashboardanalytics-frontend-service -n tesdashboardanalytics -p '{"spec":{"type":"NodePort"}}'
kubectl get service tesdashboardanalytics-frontend-service -n tesdashboardanalytics
# Use: http://NODE_IP:NODE_PORT
```

---

## 🛠️ **What Gets Deployed**

| Component | Replicas | Port | Purpose |
|-----------|----------|------|---------|
| **Backend** | 2 | 5000 | Flask API + Network Topology Data |
| **Frontend** | 2 | 80 | React App + Nginx Reverse Proxy |
| **LoadBalancer** | - | 80 | Public Internet Access |

### **Architecture:**
```
Internet → LoadBalancer → Frontend (Nginx:80) → Backend (Flask:5000)
                              ↓
                       Network Topology Data
```

---

## 📊 **Monitoring Your Deployment**

### **Kubernetes Dashboard:**
- **Workloads** → **Deployments**: Check pod status
- **Service and Ingresses** → **Services**: Get external IP
- **Workloads** → **Pods**: View logs and details

### **Command Line:**
```bash
# Overall status
kubectl get all -n tesdashboardanalytics

# Pod logs  
kubectl logs -f deployment/tesdashboardanalytics-backend -n tesdashboardanalytics
kubectl logs -f deployment/tesdashboardanalytics-frontend -n tesdashboardanalytics

# Scale up/down
kubectl scale deployment tesdashboardanalytics-frontend --replicas=3 -n tesdashboardanalytics
```

---

## 🔧 **Troubleshooting**

### **Pods Not Starting:**
```bash
kubectl describe pods -n tesdashboardanalytics
kubectl logs -l app=tesdashboardanalytics-backend -n tesdashboardanalytics
```

### **External IP Stuck on <pending>:**
```bash
# Use NodePort instead
kubectl patch service tesdashboardanalytics-frontend-service -n tesdashboardanalytics -p '{"spec":{"type":"NodePort"}}'

# Or port-forward for testing
kubectl port-forward service/tesdashboardanalytics-frontend-service 8080:80 -n tesdashboardanalytics
```

### **Images Not Found:**
```bash
# Rebuild images
./build.sh

# Or manually:
docker build -t elixir-backend:latest ./backend
docker build -t elixir-frontend:latest ./frontend
```

---

## 🎉 **Success Checklist**

- ✅ Upload `k8s/complete-deployment.yaml` to K8s Dashboard
- ✅ Wait for pods to be **Running** (green status)
- ✅ Get **External IP** from `tesdashboardanalytics-frontend-service`
- ✅ Access your app: `http://EXTERNAL_IP`
- ✅ Test Network Topology page with live data

---

## 🚀 **Next Steps After Deployment**

1. **Custom Domain** (Optional):
   - Edit `k8s/ingress.yaml` with your domain
   - Apply: `kubectl apply -f k8s/ingress.yaml`

2. **SSL Certificate** (Optional):
   - Install cert-manager in your cluster
   - Automatic HTTPS with Let's Encrypt

3. **Monitoring** (Optional):
   - Add Prometheus/Grafana for metrics
   - Set up log aggregation

4. **Scaling** (Optional):
   - Add Horizontal Pod Autoscaler (HPA)
   - Configure resource limits

---

## 📞 **Need Help?**

1. **Check logs** first: `kubectl logs -l app=tesdashboardanalytics-frontend -n tesdashboardanalytics`
2. **Verify images**: `docker images | grep elixir`
3. **Test locally**: `kubectl port-forward service/tesdashboardanalytics-frontend-service 8080:80 -n tesdashboardanalytics`

**Your app should be accessible within 5-10 minutes!** 🎊
