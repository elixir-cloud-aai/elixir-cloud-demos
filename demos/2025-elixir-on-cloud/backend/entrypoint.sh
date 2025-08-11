#!/bin/bash
set -e

echo "PATH at runtime: $PATH"
echo "which nextflow: $(which nextflow)"
ls -l /usr/local/bin/nextflow || true
nextflow -version || true

exec python tes_dashboard.py 