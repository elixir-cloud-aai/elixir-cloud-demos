# DEPLOYMENT INSTRUCTIONS - Use Kubernetes Dashboard

## Method 1: Kubernetes Web Dashboard (Recommended)

1. Open your Kubernetes Dashboard in a web browser
   - Usually accessible at: https://192.168.140.150:8443
   - Or check with your cluster administrator

2. Navigate to "Workloads" > "Create"

3. Select "Create from YAML"

4. Copy and paste the contents of `/k8s/openshift-deployment.yaml`

5. Click "Deploy"

## Method 2: Fix kubectl Authentication

If you have access to the cluster certificates, place them in:
- `/Users/keshavdayal/Desktop/elixir-cloud-demos/demos/2025-elixir-on-cloud/client-cert.pem`
- `/Users/keshavdayal/Desktop/elixir-cloud-demos/demos/2025-elixir-on-cloud/client-key.pem`

Then run:
```bash
kubectl apply -f k8s/openshift-deployment.yaml
```

## Method 3: Get New Cluster Access

Contact your cluster administrator to:
1. Get new certificate files
2. Or get a service account token
3. Or get access to the web dashboard

## After Deployment

Once deployed successfully, access your application:

1. **Through Load Balancer** (if external IP is assigned):
   ```bash
   kubectl get svc tesdashboardanalytics-frontend-service
   ```

2. **Through Port Forward**:
   ```bash
   kubectl port-forward svc/tesdashboardanalytics-frontend-service 8080:80
   ```
   Then access: http://localhost:8080

3. **Through OpenShift Route** (if routes are supported):
   ```bash
   kubectl get route tesdashboardanalytics-route
   ```

## Files Ready for Deployment

- ✅ `/k8s/openshift-deployment.yaml` - OpenShift-compatible deployment
- ✅ `/k8s/deployment-no-namespace.yaml` - Standard Kubernetes deployment
- ✅ `/k8s/complete-deployment.yaml` - Full deployment with namespace

Choose the deployment file that works with your cluster permissions.
