#!/bin/bash

echo "🚀 Redeploying TES Dashboard with Task Logs Fix"
echo "================================================"

# Check if oc/kubectl is available
if command -v oc &> /dev/null; then
    CLI="oc"
elif command -v kubectl &> /dev/null; then
    CLI="kubectl"
else
    echo "❌ Neither oc nor kubectl found. Please install OpenShift CLI or kubectl."
    exit 1
fi

NAMESPACE="federated-analytics-showcase"

echo "📋 Current pod status:"
$CLI get pods -l app=federated-analytics-showcase-frontend -n $NAMESPACE
$CLI get pods -l app=federated-analytics-showcase-backend -n $NAMESPACE

echo ""
echo "🔄 Deleting existing pods to force recreation with latest code..."

# Delete frontend pod
echo "Deleting frontend pod..."
$CLI delete pod -l app=federated-analytics-showcase-frontend -n $NAMESPACE --force --grace-period=0

# Delete backend pod  
echo "Deleting backend pod..."
$CLI delete pod -l app=federated-analytics-showcase-backend -n $NAMESPACE --force --grace-period=0

echo ""
echo "⏳ Waiting for pods to be recreated..."
sleep 10

echo ""
echo "📋 New pod status:"
$CLI get pods -l app=federated-analytics-showcase-frontend -n $NAMESPACE
$CLI get pods -l app=federated-analytics-showcase-backend -n $NAMESPACE

echo ""
echo "🔗 Access URLs:"
echo "Frontend: https://tes-dashboard-frontend-route-federated-analytics-showcase.2.rahtiapp.fi"
echo "Backend: https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi"
echo ""
echo "📝 Test the task logs with your task ID:"
echo "https://tes-dashboard-frontend-route-federated-analytics-showcase.2.rahtiapp.fi/logs?type=task&taskId=057f60c5-0831-47e9-9c4d-ceb28db97e33"
echo ""
echo "✅ Redeploy complete! Please wait a few minutes for pods to start up."
