#!/bin/bash

# TES Dashboard Analytics - Dashboard Deployment Script
# Use this if you have web dashboard access

echo "=== TES Dashboard Analytics - Dashboard Deployment ==="
echo ""
echo "Since kubectl authentication is not working, please use the Kubernetes Dashboard:"
echo ""
echo "1. Open your Kubernetes Dashboard in a web browser"
echo "   Possible URLs:"
echo "   - https://192.168.140.150:8443"
echo "   - https://192.168.140.150:30000"
echo "   - Check with your cluster administrator"
echo ""
echo "2. Navigate to 'Workloads' > 'Create'"
echo ""
echo "3. Select 'Create from YAML'"
echo ""
echo "4. Copy the contents of this file:"
echo "   $(pwd)/k8s/openshift-deployment.yaml"
echo ""
echo "5. Paste into the web dashboard and click 'Deploy'"
echo ""
echo "=== Deployment File Contents ==="
echo ""
cat k8s/openshift-deployment.yaml
echo ""
echo "=== End of Deployment File ==="
echo ""
echo "After deployment, check 'Services' in the dashboard to get the external IP"
echo "or use port-forwarding to access your application."
