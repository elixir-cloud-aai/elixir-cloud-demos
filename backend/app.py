import os
from flask import Flask, request, jsonify, send_from_directory, flash, send_file, session
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

# Function to clean environment variable values
def clean_env_value(value):
    if not value:
        return value
    # Remove inline comments (everything after #)
    if '#' in value:
        value = value.split('#')[0]
    # Remove quotes and extra whitespace
    value = value.strip().strip('"').strip("'")
    return value

# Function to get instance-specific credentials
def get_instance_credentials(instance_name, instance_url):
    """Get credentials specific to a TES instance"""
    # Default credentials
    default_user = FUNNEL_SERVER_USER
    default_pass = FUNNEL_SERVER_PASSWORD
    default_token = TES_TOKEN
    
    # Instance-specific overrides
    if 'tesk-prod.cloud.e-infra.cz' in instance_url:
        return {
            'user': os.getenv('TESK_PROD_USER', default_user),
            'password': os.getenv('TESK_PROD_PASSWORD', default_pass),
            'token': os.getenv('TESK_PROD_TOKEN', default_token)
        }
    elif 'tesk-na.cloud.e-infra.cz' in instance_url:
        return {
            'user': os.getenv('TESK_NA_USER', default_user),
            'password': os.getenv('TESK_NA_PASSWORD', default_pass),
            'token': os.getenv('TESK_NA_TOKEN', default_token)
        }
    else:
        return {
            'user': default_user,
            'password': default_pass,
            'token': default_token
        }

# Read TES instances from .tes_instances
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
                url = url.strip()
                if '@' in url:
                    url = url.split('@')[-1]
                    if not url.startswith('http'):
                        url = 'https://' + url
                url = url.rstrip('/')
                TES_INSTANCES.append({'name': name.strip(), 'url': url})

# Environment variables
FUNNEL_SERVER_USER = clean_env_value(os.getenv('FUNNEL_SERVER_USER', ''))
FUNNEL_SERVER_PASSWORD = clean_env_value(os.getenv('FUNNEL_SERVER_PASSWORD', ''))
FTP_USER = clean_env_value(os.getenv('FTP_USER', ''))
FTP_PASSWORD = clean_env_value(os.getenv('FTP_PASSWORD', ''))
FTP_INSTANCE = clean_env_value(os.getenv('FTP_INSTANCE', ''))
TES_GATEWAY = clean_env_value(os.getenv('TES_GATEWAY', ''))
TES_TOKEN = clean_env_value(os.getenv('TES_TOKEN', ''))

# Configuration
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app, 
     origins=['http://localhost:3000', 'http://127.0.0.1:3000'], 
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
app.secret_key = os.getenv('SECRET_KEY', 'supersecretkey')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SESSION_TYPE'] = 'filesystem'

BATCH_RUNS_FILE = os.path.join(app.config['UPLOAD_FOLDER'], 'batch_runs.json')

# Load TES instance locations for map visualization
TES_LOCATIONS_FILE = Path(__file__).parent / 'tes_instance_locations.json'
tes_locations = []
if TES_LOCATIONS_FILE.exists():
    with open(TES_LOCATIONS_FILE) as f:
        tes_locations = json.load(f)

def load_batch_runs():
    if os.path.exists(BATCH_RUNS_FILE):
        with open(BATCH_RUNS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_batch_runs(runs):
    with open(BATCH_RUNS_FILE, 'w') as f:
        json.dump(runs, f)

# Store submitted tasks and workflow runs in memory (for demo purposes)
submitted_tasks = []
workflow_runs = []
batch_runs = load_batch_runs()
save_batch_runs(batch_runs)

# Global variables for workflow status
current_workflow_step = 0
latest_workflow_path = []

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

@app.route('/api/tes_locations', methods=['GET'])
def get_tes_locations():
    """Get TES instance locations for map visualization"""
    return jsonify(tes_locations)

@app.route('/api/network_topology', methods=['GET'])
def get_network_topology():
    """Get comprehensive network topology data"""
    try:
        import random
        
        # Calculate real-time metrics
        active_instances = len([loc for loc in tes_locations if loc.get('status') == 'healthy'])
        total_tasks = sum(loc.get('tasks', 0) for loc in tes_locations)
        total_workflows = sum(loc.get('workflows', 0) for loc in tes_locations)
        
        # Generate connection map
        connections = []
        for i, instance in enumerate(tes_locations):
            # Simulate connections to other instances
            for j, target in enumerate(tes_locations):
                if i != j:
                    connections.append({
                        'source': instance.get('id', f'instance-{i}'),
                        'target': target.get('id', f'instance-{j}'),
                        'latency': abs(instance.get('latency', 50) - target.get('latency', 50)),
                        'bandwidth': '10Gbps',
                        'status': 'active' if instance.get('status') == 'healthy' and target.get('status') == 'healthy' else 'inactive'
                    })
        
        # Generate data flow patterns
        data_flows = []
        for workflow in workflow_runs[-5:]:  # Last 5 workflows
            source_instance = next((loc for loc in tes_locations if loc.get('name') == workflow.get('tes_name')), None)
            if source_instance:
                data_flows.append({
                    'workflow_id': workflow['run_id'],
                    'type': workflow.get('type', 'unknown'),
                    'source': source_instance.get('id', 'unknown'),
                    'path': [source_instance.get('id', 'unknown')],
                    'data_size': f"{random.randint(10, 500)}MB",
                    'transfer_rate': f"{random.randint(50, 200)}MB/s",
                    'status': workflow.get('status', 'RUNNING')
                })
        
        topology_data = {
            'instances': tes_locations,
            'connections': connections,
            'data_flows': data_flows,
            'metrics': {
                'active_instances': active_instances,
                'total_instances': len(tes_locations),
                'total_tasks': total_tasks,
                'total_workflows': total_workflows,
                'network_health': 'healthy' if active_instances == len(tes_locations) else 'degraded',
                'avg_latency': sum(loc.get('latency', 50) for loc in tes_locations) / len(tes_locations) if tes_locations else 0,
                'last_updated': datetime.now().isoformat()
            },
            'geographic_coverage': {
                'regions': list(set(loc.get('region', 'Unknown') for loc in tes_locations)),
                'countries': list(set(loc.get('country', 'Unknown') for loc in tes_locations)),
                'coordinates_bounds': {
                    'north': max((loc.get('lat', 0) for loc in tes_locations), default=0),
                    'south': min((loc.get('lat', 0) for loc in tes_locations), default=0),
                    'east': max((loc.get('lng', 0) for loc in tes_locations), default=0),
                    'west': min((loc.get('lng', 0) for loc in tes_locations), default=0)
                }
            }
        }
        
        return jsonify(topology_data)
        
    except Exception as e:
        app.logger.error(f"Error getting network topology: {str(e)}")
        return jsonify({'error': 'Failed to retrieve network topology data'}), 500

@app.route('/api/network_status', methods=['GET'])
def get_network_status():
    """Get real-time network status and health metrics"""
    try:
        import random
        
        healthy_instances = [loc for loc in tes_locations if loc.get('status') == 'healthy']
        processing_instances = [loc for loc in tes_locations if loc.get('status') == 'processing']
        unhealthy_instances = [loc for loc in tes_locations if loc.get('status') not in ['healthy', 'processing']]
        
        return jsonify({
            'overall_status': 'healthy' if len(unhealthy_instances) == 0 else 'degraded',
            'instances': {
                'healthy': len(healthy_instances),
                'processing': len(processing_instances),
                'unhealthy': len(unhealthy_instances),
                'total': len(tes_locations)
            },
            'performance': {
                'avg_latency': sum(loc.get('latency', 50) for loc in tes_locations) / len(tes_locations) if tes_locations else 0,
                'min_latency': min((loc.get('latency', 50) for loc in tes_locations), default=0),
                'max_latency': max((loc.get('latency', 50) for loc in tes_locations), default=0),
                'total_capacity': {
                    'cpu': sum(loc.get('capacity', {}).get('cpu', 0) for loc in tes_locations),
                    'memory': f"{sum(float(str(loc.get('capacity', {}).get('memory', '0TB')).replace('TB', '')) for loc in tes_locations):.1f}TB",
                    'storage': f"{sum(float(str(loc.get('capacity', {}).get('storage', '0TB')).replace('TB', '')) for loc in tes_locations):.1f}TB"
                }
            },
            'activity': {
                'active_tasks': sum(loc.get('tasks', 0) for loc in tes_locations),
                'active_workflows': sum(loc.get('workflows', 0) for loc in tes_locations),
                'data_transfers': random.randint(5, 15),
                'network_utilization': f"{random.randint(15, 85)}%"
            },
            'last_updated': datetime.now().isoformat()
        })
        
    except Exception as e:
        app.logger.error(f"Error getting network status: {str(e)}")
        return jsonify({'error': 'Failed to retrieve network status'}), 500

@app.route('/api/instance_metrics/<instance_id>', methods=['GET'])
def get_instance_metrics(instance_id):
    """Get detailed metrics for a specific TES instance"""
    try:
        import random
        
        instance = next((loc for loc in tes_locations if loc.get('id') == instance_id), None)
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404
        
        # Generate detailed metrics
        metrics = {
            'instance_info': instance,
            'performance': {
                'cpu_usage': f"{random.randint(20, 90)}%",
                'memory_usage': f"{random.randint(30, 80)}%",
                'storage_usage': f"{random.randint(15, 75)}%",
                'network_io': {
                    'inbound': f"{random.randint(10, 100)}MB/s",
                    'outbound': f"{random.randint(5, 80)}MB/s"
                }
            },
            'tasks': {
                'running': random.randint(0, instance.get('tasks', 0)),
                'queued': random.randint(0, 5),
                'completed_today': random.randint(10, 50),
                'failed_today': random.randint(0, 3)
            },
            'health_checks': {
                'api_response_time': f"{random.randint(50, 200)}ms",
                'last_health_check': datetime.now().isoformat(),
                'uptime': f"{random.randint(95, 100):.1f}%",
                'error_rate': f"{random.randint(0, 5):.1f}%"
            },
            'connections': {
                'active_connections': random.randint(3, 8),
                'peer_instances': [loc.get('id', '') for loc in tes_locations if loc.get('id') != instance_id][:3]
            }
        }
        
        return jsonify(metrics)
        
    except Exception as e:
        app.logger.error(f"Error getting instance metrics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve instance metrics'}), 500

@app.route('/api/dashboard_data', methods=['GET'])
def get_dashboard_data():
    """Get all dashboard data in one request"""
    return jsonify({
        'tasks': submitted_tasks,
        'workflow_runs': workflow_runs,
        'batch_runs': batch_runs,
        'tes_instances': TES_INSTANCES,
        'tes_locations': tes_locations
    })

@app.route('/api/latest_workflow_status', methods=['GET'])
def latest_workflow_status():
    """Get current workflow status for visualization"""
    global current_workflow_step, latest_workflow_path
    return jsonify({
        'currentStep': current_workflow_step,
        'latestPath': latest_workflow_path
    })

@app.route('/api/submit_task', methods=['POST'])
def submit_task():
    """Submit a task to TES"""
    try:
        data = request.get_json()
        task_id = str(uuid.uuid4())
        
        # Get TES instance info
        tes_instance = data.get('tes_instance', 'Unknown')
        task_type = data.get('task_type', 'simple')
        
        # Find TES instance name
        tes_name = 'Unknown'
        for inst in TES_INSTANCES:
            if inst['url'] == tes_instance or tes_instance == 'all':
                tes_name = inst['name']
                break
        
        # Create task object
        task = {
            'task_id': task_id,
            'tes_url': tes_instance,
            'tes_name': tes_name,
            'type': task_type,
            'status': 'QUEUED',
            'submitted_at': datetime.utcnow().isoformat(),
            'input_url': data.get('input_url', ''),
            'output_url': data.get('output_url', '')
        }
        
        submitted_tasks.append(task)
        
        # Update workflow status
        global current_workflow_step, latest_workflow_path
        current_workflow_step = 1
        latest_workflow_path = [tes_name] if tes_name != 'Unknown' else []
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'message': f'Task submitted successfully to {tes_name}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/submit_workflow', methods=['POST'])
def submit_workflow():
    """Submit a workflow (CWL, Snakemake, or Nextflow)"""
    try:
        workflow_type = request.form.get('wf_type', 'cwl')
        tes_instance = request.form.get('wf_tes_instance')
        
        # Generate workflow run ID
        run_id = str(uuid.uuid4())
        
        # Find TES instance name
        tes_name = 'Unknown'
        for inst in TES_INSTANCES:
            if inst['url'] == tes_instance:
                tes_name = inst['name']
                break
        
        # Handle file uploads
        uploaded_files = []
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename:
                filename = f"{run_id}_{file.filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                uploaded_files.append({'key': file_key, 'filename': filename, 'path': filepath})
        
        # Create workflow run object
        workflow_run = {
            'run_id': run_id,
            'type': workflow_type,
            'tes_url': tes_instance,
            'tes_name': tes_name,
            'status': 'RUNNING',
            'submitted_at': datetime.utcnow().isoformat(),
            'files': uploaded_files
        }
        
        workflow_runs.append(workflow_run)
        
        # Update workflow status
        global current_workflow_step, latest_workflow_path
        current_workflow_step = 2
        latest_workflow_path = [tes_name] if tes_name != 'Unknown' else []
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'{workflow_type.upper()} workflow submitted successfully to {tes_name}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/batch_snakemake', methods=['POST'])
def batch_snakemake():
    """Submit batch Snakemake workflows"""
    try:
        batch_mode = request.form.get('batch_mode', 'all')
        
        # Generate batch run ID
        run_id = str(uuid.uuid4())
        
        # Handle file uploads
        uploaded_files = []
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename:
                filename = f"batch_{run_id}_{file.filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                uploaded_files.append({'key': file_key, 'filename': filename, 'path': filepath})
        
        # Create batch runs for each instance
        if batch_mode == 'all':
            for inst in TES_INSTANCES:
                batch_run = {
                    'run_id': f"{run_id}_{inst['name']}",
                    'mode': 'batch',
                    'workflow_type': 'snakemake',
                    'tes_url': inst['url'],
                    'tes_name': inst['name'],
                    'status': 'RUNNING',
                    'submitted_at': datetime.utcnow().isoformat(),
                    'files': uploaded_files
                }
                batch_runs.append(batch_run)
        else:
            # Gateway mode
            batch_run = {
                'run_id': run_id,
                'mode': 'federated',
                'workflow_type': 'snakemake',
                'tes_url': TES_GATEWAY,
                'tes_name': 'TES Gateway',
                'status': 'RUNNING',
                'submitted_at': datetime.utcnow().isoformat(),
                'files': uploaded_files
            }
            batch_runs.append(batch_run)
        
        save_batch_runs(batch_runs)
        
        # Update workflow status
        global current_workflow_step, latest_workflow_path
        current_workflow_step = 3
        latest_workflow_path = [inst['name'] for inst in TES_INSTANCES] if batch_mode == 'all' else ['TES Gateway']
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'Batch Snakemake workflow submitted in {batch_mode} mode'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/batch_nextflow', methods=['POST'])
def batch_nextflow():
    """Submit batch Nextflow workflows"""
    try:
        batch_mode = request.form.get('batch_mode', 'all')
        
        # Generate batch run ID
        run_id = str(uuid.uuid4())
        
        # Handle file uploads
        uploaded_files = []
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename:
                filename = f"batch_{run_id}_{file.filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                uploaded_files.append({'key': file_key, 'filename': filename, 'path': filepath})
        
        # Create batch runs for each instance
        if batch_mode == 'all':
            for inst in TES_INSTANCES:
                batch_run = {
                    'run_id': f"{run_id}_{inst['name']}",
                    'mode': 'batch',
                    'workflow_type': 'nextflow',
                    'tes_url': inst['url'],
                    'tes_name': inst['name'],
                    'status': 'RUNNING',
                    'submitted_at': datetime.utcnow().isoformat(),
                    'files': uploaded_files
                }
                batch_runs.append(batch_run)
        else:
            # Gateway mode
            batch_run = {
                'run_id': run_id,
                'mode': 'federated',
                'workflow_type': 'nextflow',
                'tes_url': TES_GATEWAY,
                'tes_name': 'TES Gateway',
                'status': 'RUNNING',
                'submitted_at': datetime.utcnow().isoformat(),
                'files': uploaded_files
            }
            batch_runs.append(batch_run)
        
        save_batch_runs(batch_runs)
        
        # Update workflow status
        global current_workflow_step, latest_workflow_path
        current_workflow_step = 4
        latest_workflow_path = [inst['name'] for inst in TES_INSTANCES] if batch_mode == 'all' else ['TES Gateway']
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'Batch Nextflow workflow submitted in {batch_mode} mode'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/batch_cwl', methods=['POST'])
def batch_cwl():
    """Submit batch CWL workflows"""
    try:
        batch_mode = request.form.get('batch_mode', 'all')
        
        # Generate batch run ID
        run_id = str(uuid.uuid4())
        
        # Handle file uploads
        uploaded_files = []
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename:
                filename = f"batch_{run_id}_{file.filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                uploaded_files.append({'key': file_key, 'filename': filename, 'path': filepath})
        
        # Create batch runs for each instance
        if batch_mode == 'all':
            for inst in TES_INSTANCES:
                batch_run = {
                    'run_id': f"{run_id}_{inst['name']}",
                    'mode': 'batch',
                    'workflow_type': 'cwl',
                    'tes_url': inst['url'],
                    'tes_name': inst['name'],
                    'status': 'RUNNING',
                    'submitted_at': datetime.utcnow().isoformat(),
                    'files': uploaded_files
                }
                batch_runs.append(batch_run)
        else:
            # Gateway mode
            batch_run = {
                'run_id': run_id,
                'mode': 'federated',
                'workflow_type': 'cwl',
                'tes_url': TES_GATEWAY,
                'tes_name': 'TES Gateway',
                'status': 'RUNNING',
                'submitted_at': datetime.utcnow().isoformat(),
                'files': uploaded_files
            }
            batch_runs.append(batch_run)
        
        save_batch_runs(batch_runs)
        
        # Update workflow status
        global current_workflow_step, latest_workflow_path
        current_workflow_step = 5
        latest_workflow_path = [inst['name'] for inst in TES_INSTANCES] if batch_mode == 'all' else ['TES Gateway']
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'Batch CWL workflow submitted in {batch_mode} mode'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/task_details', methods=['GET'])
def get_task_details():
    """Get details of a specific task"""
    task_id = request.args.get('task_id')
    tes_url = request.args.get('tes_url')
    
    # Find task in submitted tasks
    task = None
    for t in submitted_tasks:
        if t['task_id'] == task_id:
            task = t
            break
    
    if not task:
        return jsonify({'success': False, 'error': 'Task not found'}), 404
    
    return jsonify({'success': True, 'task': task})

@app.route('/api/workflow_log/<run_id>', methods=['GET'])
def get_workflow_log(run_id):
    """Get workflow execution log"""
    # Find workflow run
    workflow = None
    for w in workflow_runs:
        if w['run_id'] == run_id:
            workflow = w
            break
    
    if not workflow:
        return jsonify({'success': False, 'error': 'Workflow not found'}), 404
    
    # Mock log content
    log_content = f"""
=== {workflow['type'].upper()} Workflow Log ===
Run ID: {run_id}
TES Instance: {workflow['tes_name']}
Status: {workflow['status']}
Submitted: {workflow['submitted_at']}

[2024-01-01 10:00:00] Workflow started
[2024-01-01 10:00:01] Preparing execution environment
[2024-01-01 10:00:02] Executing workflow steps
[2024-01-01 10:00:03] Workflow completed successfully
"""
    
    return jsonify({'success': True, 'log': log_content, 'workflow': workflow})

@app.route('/api/batch_log/<run_id>', methods=['GET'])
def get_batch_log(run_id):
    """Get batch execution log"""
    # Find batch run
    batch = None
    for b in batch_runs:
        if b['run_id'] == run_id:
            batch = b
            break
    
    if not batch:
        return jsonify({'success': False, 'error': 'Batch run not found'}), 404
    
    # Mock log content
    log_content = f"""
=== Batch {batch['workflow_type'].upper()} Log ===
Run ID: {run_id}
Mode: {batch['mode']}
TES Instance: {batch['tes_name']}
Status: {batch['status']}
Submitted: {batch['submitted_at']}

[2024-01-01 10:00:00] Batch execution started
[2024-01-01 10:00:01] Distributing tasks across instances
[2024-01-01 10:00:02] Executing tasks in parallel
[2024-01-01 10:00:03] Collecting results
[2024-01-01 10:00:04] Batch execution completed
"""
    
    return jsonify({'success': True, 'log': log_content, 'batch': batch})

@app.route('/api/topology_logs', methods=['GET'])
def get_topology_logs():
    """Get logs for topology visualization"""
    logs = []
    
    # Add task logs
    for task in submitted_tasks[-5:]:  # Last 5 tasks
        logs.append({
            'label': f"Task {task['task_id'][:8]} - {task['tes_name']}",
            'content': f"Task ID: {task['task_id']}\nTES: {task['tes_name']}\nStatus: {task['status']}\nType: {task['type']}"
        })
    
    # Add workflow logs
    for workflow in workflow_runs[-5:]:  # Last 5 workflows
        logs.append({
            'label': f"Workflow {workflow['run_id'][:8]} - {workflow['type']}",
            'content': f"Run ID: {workflow['run_id']}\nType: {workflow['type']}\nTES: {workflow['tes_name']}\nStatus: {workflow['status']}"
        })
    
    # Add batch logs
    for batch in batch_runs[-5:]:  # Last 5 batch runs
        logs.append({
            'label': f"Batch {batch['run_id'][:8]} - {batch['workflow_type']}",
            'content': f"Run ID: {batch['run_id']}\nType: {batch['workflow_type']}\nMode: {batch['mode']}\nTES: {batch['tes_name']}\nStatus: {batch['status']}"
        })
    
    return jsonify({'logs': logs})

@app.route('/api/test_connection', methods=['GET'])
def test_connection():
    """Test connection to TES instances"""
    results = []
    
    for instance in TES_INSTANCES:
        try:
            response = requests.get(f"{instance['url']}/service-info", timeout=5)
            results.append({
                'name': instance['name'],
                'url': instance['url'],
                'status': 'online' if response.status_code == 200 else 'error',
                'response_time': response.elapsed.total_seconds()
            })
        except Exception as e:
            results.append({
                'name': instance['name'],
                'url': instance['url'],
                'status': 'offline',
                'error': str(e)
            })
    
    return jsonify({'results': results})

@app.route('/api/data_transfers', methods=['GET'])
def get_data_transfers():
    """Get active data transfers between instances and storage"""
    import random
    from datetime import datetime, timedelta
    
    transfers = []
    storage_endpoints = [
        {'id': 'storage-eu-central', 'name': 'EU Central Storage', 'location': 'Frankfurt'},
        {'id': 'storage-eu-north', 'name': 'EU North Storage', 'location': 'Stockholm'},
        {'id': 'storage-na-east', 'name': 'NA East Storage', 'location': 'Virginia'},
        {'id': 'storage-global', 'name': 'Global Cache Hub', 'location': 'London'}
    ]
    
    for i in range(random.randint(3, 8)):
        source = random.choice(tes_locations)
        target = random.choice(storage_endpoints)
        
        transfers.append({
            'id': f'transfer-{i}',
            'source': {
                'name': source.get('name', ''),
                'lat': source.get('latitude', 0),
                'lng': source.get('longitude', 0)
            },
            'target': {
                'name': target['name'],
                'location': target['location']
            },
            'status': random.choice(['active', 'completed', 'pending']),
            'progress': random.randint(10, 95),
            'speed': f"{random.randint(50, 500)} MB/s",
            'size': f"{random.uniform(1, 50):.1f} GB",
            'start_time': (datetime.now() - timedelta(minutes=random.randint(5, 60))).isoformat(),
            'estimated_completion': (datetime.now() + timedelta(minutes=random.randint(2, 30))).isoformat()
        })
    
    return jsonify({
        'transfers': transfers,
        'total_active': len([t for t in transfers if t['status'] == 'active']),
        'total_bandwidth': f"{sum(int(t['speed'].split()[0]) for t in transfers)} MB/s"
    })

@app.route('/api/network_metrics', methods=['GET'])
def get_network_metrics():
    """Get real-time network performance metrics"""
    import random
    from datetime import datetime
    
    metrics = {
        'timestamp': datetime.now().isoformat(),
        'network_health': random.randint(85, 98),
        'total_throughput': f"{random.randint(800, 1500)} MB/s",
        'average_latency': random.randint(25, 85),
        'packet_loss': round(random.uniform(0.01, 0.5), 2),
        'connection_count': random.randint(150, 300),
        'instance_metrics': []
    }
    
    for instance in tes_locations:
        metrics['instance_metrics'].append({
            'id': instance.get('id', instance.get('name', '').replace(' ', '-').lower()),
            'name': instance.get('name', ''),
            'cpu_usage': random.randint(15, 85),
            'memory_usage': random.randint(20, 75),
            'disk_usage': random.randint(30, 80),
            'network_in': f"{random.randint(10, 200)} MB/s",
            'network_out': f"{random.randint(5, 150)} MB/s",
            'active_connections': random.randint(5, 25),
            'uptime': f"{random.randint(95, 100)}%"
        })
    
    return jsonify(metrics)

@app.route('/api/storage_locations', methods=['GET'])
def get_storage_locations():
    """Get storage endpoints with usage statistics"""
    storage_locations = [
        {
            'id': 'storage-eu-central',
            'name': 'EU Central Storage',
            'type': 'S3',
            'location': 'Frankfurt, Germany',
            'latitude': 50.1109,
            'longitude': 8.6821,
            'capacity': '500TB',
            'usage': 65,
            'connections': ['elixir-cz', 'funnel-cz', 'elixir-gr'],
            'status': 'healthy'
        },
        {
            'id': 'storage-eu-north',
            'name': 'EU North Storage',
            'type': 'MinIO',
            'location': 'Stockholm, Sweden',
            'latitude': 59.3293,
            'longitude': 18.0686,
            'capacity': '300TB',
            'usage': 45,
            'connections': ['elixir-fi', 'funnel-fi'],
            'status': 'healthy'
        },
        {
            'id': 'storage-na-east',
            'name': 'NA East Storage',
            'type': 'S3',
            'location': 'Virginia, USA',
            'latitude': 39.0458,
            'longitude': -76.6413,
            'capacity': '800TB',
            'usage': 78,
            'connections': ['elixir-ca'],
            'status': 'healthy'
        },
        {
            'id': 'storage-global',
            'name': 'Global Cache Hub',
            'type': 'MinIO',
            'location': 'London, UK',
            'latitude': 51.5074,
            'longitude': -0.1278,
            'capacity': '2PB',
            'usage': 34,
            'connections': ['tes-gateway', 'elixir-uk', 'elixir-nl'],
            'status': 'healthy'
        }
    ]
    
    return jsonify(storage_locations)

@app.route('/')
def index():
    """Root endpoint - API information"""
    return jsonify({
        'message': 'TES Dashboard API',
        'version': '1.0.0',
        'description': 'Task Execution Service Dashboard Backend',
        'frontend_url': 'http://localhost:3000',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'instances': '/api/instances',
            'tasks': '/api/tasks',
            'workflows': '/api/workflows',
            'batch_runs': '/api/batch_runs',
            'tes_locations': '/api/tes_locations',
            'dashboard_data': '/api/dashboard_data',
            'submit_task': '/api/submit_task',
            'submit_workflow': '/api/submit_workflow',
            'batch_snakemake': '/api/batch_snakemake',
            'batch_nextflow': '/api/batch_nextflow',
            'batch_cwl': '/api/batch_cwl',
            'test_connection': '/api/test_connection',
            'data_transfers': '/api/data_transfers',
            'network_metrics': '/api/network_metrics',
            'storage_locations': '/api/storage_locations'
        },
        'statistics': {
            'total_tasks': len(submitted_tasks),
            'total_workflows': len(workflow_runs),
            'total_batch_runs': len(batch_runs),
            'available_instances': len(TES_INSTANCES)
        }
    })

if __name__ == '__main__':
    print("🚀 Starting TES Dashboard Backend...")
    print(f"📊 Loaded {len(TES_INSTANCES)} TES instances")
    print(f"📍 Loaded {len(tes_locations)} TES locations")
    print("🌐 CORS enabled for frontend at http://localhost:3000")
    print("🔗 API documentation available at http://localhost:8000")
    
    app.run(host='0.0.0.0', port=8000, debug=True)
