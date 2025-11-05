import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
import requests
import subprocess
import uuid
import json
from datetime import datetime

# Load environment variables
env_file_path = Path(__file__).parent / '.env'
load_dotenv(env_file_path)

# Configuration
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv('SECRET_KEY', 'supersecretkey')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Environment variables
FUNNEL_SERVER_USER = os.getenv('FUNNEL_SERVER_USER', '')
FUNNEL_SERVER_PASSWORD = os.getenv('FUNNEL_SERVER_PASSWORD', '')
TES_TOKEN = os.getenv('TES_TOKEN', '')
TES_GATEWAY = os.getenv('TES_GATEWAY', '')

# Data storage
submitted_tasks = []
workflow_runs = []
batch_runs = []

# Load TES instances
TES_INSTANCES = []
tes_instances_file = Path(__file__).parent / '.tes_instances'
if tes_instances_file.exists():
    with open(tes_instances_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if ',' in line:
                name, url = line.split(',', 1)
                url = url.strip().rstrip('/')
                TES_INSTANCES.append({'name': name.strip(), 'url': url})

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'TES Dashboard API is running'})

@app.route('/api/instances', methods=['GET'])
def get_instances():
    """Get available TES instances"""
    return jsonify(TES_INSTANCES)

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get submitted tasks"""
    return jsonify(submitted_tasks)

@app.route('/api/workflows', methods=['GET'])
def get_workflows():
    """Get workflow runs"""
    return jsonify(workflow_runs)

@app.route('/api/batch_runs', methods=['GET'])
def get_batch_runs():
    """Get batch runs"""
    return jsonify(batch_runs)

@app.route('/api/submit_task', methods=['POST'])
def submit_task():
    """Submit a task to TES"""
    try:
        data = request.get_json()
        task_id = str(uuid.uuid4())
        
        # Add task to submitted tasks
        task = {
            'id': task_id,
            'name': data.get('name', 'Unnamed Task'),
            'status': 'QUEUED',
            'instance': data.get('instance', 'Unknown'),
            'submitted_at': str(datetime.utcnow())
        }
        submitted_tasks.append(task)
        
        return jsonify({'task_id': task_id, 'status': 'submitted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    """Root endpoint - redirect to frontend"""
    return jsonify({
        'message': 'TES Dashboard API',
        'frontend_url': 'http://localhost:3000',
        'api_endpoints': [
            '/api/health',
            '/api/instances',
            '/api/tasks',
            '/api/workflows',
            '/api/batch_runs'
        ]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
