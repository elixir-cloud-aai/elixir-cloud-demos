#!/bin/bash

# Update TES Dashboard Analytics deployment
# This will replace the existing deployment with the fixed version

echo "🔄 Updating TES Dashboard Analytics deployment..."

# Apply the updated deployment
echo "📋 Applying updated deployment configuration..."
kubectl apply -f k8s/openshift-deployment.yaml

# Wait a moment for resources to be created
sleep 5

# Watch the pods starting
echo "👀 Monitoring pod status..."
echo "⏳ This will take 2-3 minutes for full startup..."
echo ""
echo "Key fixes applied:"
echo "  ✅ Using dashboard-deploy branch (has your backend/frontend code)"
echo "  ✅ Fixed permissions with proper chmod/chown"
echo "  ✅ Added debug output to troubleshoot issues"
echo "  ✅ Improved error handling"
echo ""
echo "Timeline:"
echo "  - Init containers: 30-60 seconds (git clone dashboard-deploy branch)"
echo "  - Backend ready: 60-90 seconds (pip install + startup)"
echo "  - Frontend ready: 120-180 seconds (npm install + build + startup)"
echo ""

# Show pod status
echo "📊 Current pod status:"
kubectl get pods -l app.kubernetes.io/part-of=tes-dashboard-analytics-app

echo ""
echo "🌐 Your app will be available at:"
echo "   https://tesdashboardanalytics-route-tesdashboardanalytics.2.rahtiapp.fi"
echo ""
echo "📊 To monitor progress:"
echo "   kubectl get pods -l app.kubernetes.io/part-of=tes-dashboard-analytics-app -w"
echo ""
echo "📝 To check logs:"
echo "   kubectl logs -f deployment/tesdashboardanalytics-backend"
echo "   kubectl logs -f deployment/tesdashboardanalytics-frontend"
echo ""
echo "🔍 To check init container logs:"
echo "   kubectl logs deployment/tesdashboardanalytics-backend -c git-clone"
echo "   kubectl logs deployment/tesdashboardanalytics-frontend -c git-clone-frontend"
