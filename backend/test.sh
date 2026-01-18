#!/bin/bash

# TES Instance Test Script
# Tests all TES instances with a simple task submission

instances=(
  "https://funnel.cloud.e-infra.cz/v1/tasks|Funnel/OpenPBS @ ELIXIR-CZ"
  "https://vm4816.kaj.pouta.csc.fi/v1/tasks|Funnel/Slurm @ ELIXIR-FI"
  "https://tesk-prod.cloud.e-infra.cz/ga4gh/tes/v1/tasks|TESK/Kubernetes @ ELIXIR-CZ (Prod)"
  "https://tesk-na.cloud.e-infra.cz/v1/tasks|TESK North America"
  "https://tesk.elixir-cloud.bi.denbi.de/v1/tasks|TESK/Kubernetes @ ELIXIR-DE"
  "https://tesk-eu.hypatia-comp.athenarc.gr/v1/tasks|TESK/Kubernetes @ ELIXIR-GR"
  "https://csc-tesk-noauth.rahtiapp.fi/ga4gh/tes/v1/tasks|TESK/OpenShift @ ELIXIR-FI"
  "http://localhost:8080/v1/tasks|Local TES"
)

echo "========================================"
echo "TES Instance Task Submission Test"
echo "========================================"
echo ""

for instance in "${instances[@]}"; do
  IFS='|' read -r url name <<< "$instance"
  
  echo "Testing: $name"
  echo "URL: $url"
  echo "----------------------------------------"
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Task - '"$name"'",
      "description": "Automated test task",
      "executors": [{
        "image": "ubuntu:20.04",
        "command": ["echo", "Hello World"],
        "stdout": "/tmp/stdout",
        "stderr": "/tmp/stderr"
      }],
      "resources": {
        "cpu_cores": 1,
        "ram_gb": 1,
        "disk_gb": 5
      }
    }' 2>&1)
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "✅ SUCCESS (HTTP $http_code)"
    task_id=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$task_id" ]; then
      echo "   Task ID: $task_id"
    fi
  elif [ "$http_code" = "403" ]; then
    echo "🔒 REQUIRES AUTH (HTTP $http_code)"
  elif [ "$http_code" = "000" ]; then
    echo "❌ CONNECTION FAILED (Timeout or unreachable)"
  else
    echo "❌ FAILED (HTTP $http_code)"
    echo "   Response: $body" | head -c 200
  fi
  
  echo ""
done

echo "========================================"
echo "Test Complete"
echo "========================================"