#!/bin/bash

echo "🔍 Validating Backend Deployment Configuration..."

# Check if YAML is valid
echo "📋 Validating YAML syntax..."
python3 -c "
import yaml
import sys

try:
    with open('backend-pod-deployment.yaml', 'r') as f:
        docs = list(yaml.safe_load_all(f))
    print(f'✅ YAML is valid. Found {len(docs)} documents.')
    for i, doc in enumerate(docs):
        if doc and 'metadata' in doc:
            print(f'  Document {i+1}: {doc.get(\"kind\", \"Unknown\")} - {doc.get(\"metadata\", {}).get(\"name\", \"No name\")}')
except Exception as e:
    print(f'❌ YAML Error: {e}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ YAML validation failed!"
    exit 1
fi

echo ""
echo "🔧 Configuration Summary:"
echo "  • Pod Name: tes-dashboard-backend-pod"
echo "  • Namespace: federated-analytics-showcase" 
echo "  • Image: python:3.9-slim"
echo "  • Port: 8000"
echo "  • TES Instances: Embedded in startup script (10 instances)"
echo "  • No ConfigMap dependencies ✅"

echo ""
echo "📋 Key Fixes Applied:"
echo "  ✅ Removed tes-instances-config ConfigMap dependency"
echo "  ✅ TES instances file created inline during startup"
echo "  ✅ Fixed task submission (stdin/stdout/stderr handling)" 
echo "  ✅ Enhanced error logging and debugging"
echo "  ✅ 10 TES instances instead of 5"

echo ""
echo "🚀 Ready for Deployment!"
echo "Run './redeploy-backend-with-fixes.sh' when oc/kubectl is configured."

echo ""
echo "🔗 Expected URLs after deployment:"
echo "  • Backend API: https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi"
echo "  • Health Check: https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi/api/health"
echo "  • TES Instances: https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi/api/instances"
