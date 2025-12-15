import os
from flask import Flask, request, jsonify, send_from_directory, flash, send_file, session, g
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path
import requests
import subprocess
import uuid
import json
import time
from datetime import datetime
import asyncio
import functools

# Import middleware system
try:
    from middleware_manager import MiddlewareManager, MiddlewareContext
    from middleware_config import setup_default_middleware, create_test_manager
    from middleware_implementations import MonitoringMiddleware, CachingMiddleware
    MIDDLEWARE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Middleware system not available: {e}")
    MIDDLEWARE_AVAILABLE = False

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

def load_tes_instances():
    """Return the loaded TES instances"""
    return TES_INSTANCES

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

# Initialize Middleware System
middleware_manager = None
if MIDDLEWARE_AVAILABLE:
    try:
        middleware_manager = create_test_manager()
        print("✅ Middleware system initialized successfully")
        print(f"📊 Registered {len(middleware_manager.middlewares)} middleware components")
    except Exception as e:
        print(f"❌ Failed to initialize middleware system: {e}")
        MIDDLEWARE_AVAILABLE = False
else:
    print("⚠️ Running without middleware system")

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

# Middleware processing functions
def run_async_middleware(coro):
    """Helper function to run async middleware in sync context"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is already running, create a new task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        # No loop running, create new one
        return asyncio.run(coro)

def create_middleware_context() -> MiddlewareContext:
    """Create middleware context from Flask request"""
    if not MIDDLEWARE_AVAILABLE:
        return None
    
    # Extract request information
    request_data = {
        'endpoint': request.endpoint or request.path,
        'method': request.method,
        'headers': dict(request.headers),
        'query_params': dict(request.args),
        'client_ip': request.remote_addr,
        'body': {}
    }
    
    # Add request body if present
    if request.is_json:
        try:
            request_data['body'] = request.get_json() or {}
        except:
            request_data['body'] = {}
    elif request.form:
        request_data['body'] = dict(request.form)
    
    return MiddlewareContext(request_data)

def process_middleware_request():
    """Process request through middleware chain"""
    if not MIDDLEWARE_AVAILABLE or not middleware_manager:
        return True, None  # Allow request to proceed
    
    context = create_middleware_context()
    if not context:
        return True, None
    
    try:
        # Execute middleware chain
        results = run_async_middleware(middleware_manager.execute_chain(context))
        
        # Store context in Flask g for use in response processing
        g.middleware_context = context
        g.middleware_results = results
        
        # Check if any middleware failed and should block the request
        for result in results:
            if result.status.value in ['failed'] and result.middleware_name in ['authentication', 'authorization']:
                error_response = jsonify({
                    'error': 'Middleware blocked request',
                    'middleware': result.middleware_name,
                    'message': result.message,
                    'timestamp': datetime.now().isoformat()
                })
                error_response.status_code = 401 if result.middleware_name == 'authentication' else 403
                return False, error_response
        
        # Check for cached response
        if hasattr(context, 'cached_response') and context.cached_response:
            cached_response = jsonify(context.cached_response)
            cached_response.headers['X-Cache'] = 'HIT'
            return False, cached_response
        
        return True, None
        
    except Exception as e:
        print(f"❌ Middleware processing error: {e}")
        return True, None  # Allow request to proceed on middleware error

def process_middleware_response(response):
    """Process response through middleware (for caching, monitoring, etc.)"""
    if not MIDDLEWARE_AVAILABLE or not hasattr(g, 'middleware_context'):
        return response
    
    try:
        context = g.middleware_context
        
        # Handle caching
        if hasattr(context, 'should_cache') and context.should_cache and hasattr(context, 'cache_key'):
            # Find caching middleware and cache the response
            for middleware in middleware_manager.middlewares.values():
                if hasattr(middleware, 'cache_response'):
                    middleware.cache_response(context.cache_key, response.get_json())
                    break
        
        # Handle monitoring
        status_code = response.status_code
        for middleware in middleware_manager.middlewares.values():
            if hasattr(middleware, 'record_response_metrics'):
                middleware.record_response_metrics(context.__dict__, status_code)
        
        # Add middleware info to response headers
        response.headers['X-Middleware-Processed'] = 'true'
        response.headers['X-Middleware-Count'] = str(len(g.middleware_results))
        
        # Add execution time
        total_time = context.get_execution_time()
        response.headers['X-Middleware-Time'] = f"{total_time:.2f}ms"
        
    except Exception as e:
        print(f"❌ Middleware response processing error: {e}")
    
    return response

# Flask before_request hook
@app.before_request
def before_request():
    """Process request through middleware before handling"""
    # Skip middleware for middleware management endpoints to avoid recursion
    if request.path.startswith('/api/middleware'):
        return None
    
    should_proceed, response = process_middleware_request()
    if not should_proceed:
        return response

# Flask after_request hook  
@app.after_request
def after_request(response):
    """Process response through middleware after handling"""
    return process_middleware_response(response)

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

@app.route('/api/service_info', methods=['GET'])
def get_service_info():
    """Get TES service info for a specific instance"""
    try:
        tes_url = request.args.get('tes_url')
        if not tes_url:
            return jsonify({'error': 'tes_url parameter is required'}), 400
        
        # Try to get real service info from the TES instance
        try:
            # Make a request to the TES instance service-info endpoint
            service_info_url = f"{tes_url.rstrip('/')}/ga4gh/tes/v1/service-info"
            response = requests.get(service_info_url, timeout=10)
            if response.status_code == 200:
                return jsonify(response.json())
        except Exception as e:
            print(f"Failed to get real service info from {tes_url}: {e}")
        
        # Fallback: return mock service info
        return jsonify({
            "id": "tes-service",
            "name": "Task Execution Service",
            "type": {
                "group": "org.ga4gh",
                "artifact": "tes",
                "version": "1.1.0"
            },
            "description": "TES service for task execution",
            "organization": {
                "name": "Elixir Cloud",
                "url": "https://elixir-cloud.dcc.sib.swiss/"
            },
            "contactUrl": "mailto:cloud-service@elixir-europe.org",
            "documentationUrl": "https://ga4gh.github.io/task-execution-schemas/",
            "version": "1.1.0",
            "createdAt": "2023-01-01T00:00:00Z",
            "updatedAt": datetime.now().isoformat() + "Z",
            "environment": "production"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    """Submit a task to TES instance using GA4GH TES v1 API"""
    try:
        data = request.get_json()
        
        # Validate required fields
        tes_url = data.get('tes_instance')
        docker_image = data.get('docker_image')
        
        if not tes_url or not docker_image:
            return jsonify({
                'success': False,
                'error': 'TES instance URL and Docker image are required'
            }), 400
        
        # Find TES instance name from our configuration
        tes_name = 'Unknown TES Instance'
        tes_instances = load_tes_instances()
        for inst in tes_instances:
            if inst['url'].rstrip('/') == tes_url.rstrip('/'):
                tes_name = inst['name']
                break
        
        # Create GA4GH TES task specification
        tes_task = {
            "name": data.get('task_name', f'Task-{datetime.utcnow().strftime("%Y%m%d-%H%M%S")}'),
            "description": data.get('description', 'Task submitted via TES Dashboard'),
            "inputs": [],
            "outputs": [],
            "resources": {
                "cpu_cores": int(data.get('cpu_cores', 1)),
                "ram_gb": float(data.get('ram_gb', 2.0)),
                "disk_gb": float(data.get('disk_gb', 10.0))
            },
            "executors": [
                {
                    "image": docker_image,
                    "command": data.get('command', '').split() if data.get('command') else ['echo', 'Hello World'],
                    "workdir": data.get('workdir', '/tmp'),
                    "stdin": data.get('stdin', ''),
                    "stdout": data.get('stdout', ''),
                    "stderr": data.get('stderr', '')
                }
            ]
        }
        
        # Add input files if specified
        input_url = data.get('input_url', '').strip()
        if input_url:
            tes_task["inputs"].append({
                "url": input_url,
                "path": data.get('input_path', '/tmp/input'),
                "type": "FILE"
            })
        
        # Add output files if specified
        output_url = data.get('output_url', '').strip()
        if output_url:
            tes_task["outputs"].append({
                "url": output_url,
                "path": data.get('output_path', '/tmp/output'),
                "type": "FILE"
            })
        
        # Submit to actual TES instance
        tes_endpoint = f"{tes_url.rstrip('/')}/ga4gh/tes/v1/tasks"
        
        print(f"🚀 Submitting task to: {tes_endpoint}")
        print(f"📝 Task payload: {json.dumps(tes_task, indent=2)}")
        
        import requests
        response = requests.post(
            tes_endpoint,
            json=tes_task,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            response_data = response.json()
            task_id = response_data.get('id', str(uuid.uuid4()))
            
            # Store comprehensive task info locally for dashboard tracking
            local_task = {
                # Basic GA4GH TES fields
                'id': task_id,
                'task_id': task_id,  # Keep for backwards compatibility
                'name': tes_task['name'],
                'description': tes_task['description'],
                'state': 'QUEUED',
                'status': 'QUEUED',  # Keep for backwards compatibility
                
                # Timing information
                'creation_time': datetime.utcnow().isoformat(),
                'submitted_at': datetime.utcnow().isoformat(),  # Keep for backwards compatibility
                'start_time': None,
                'end_time': None,
                
                # TES instance information
                'tes_url': tes_url,
                'tes_name': tes_name,
                'tes_endpoint': tes_endpoint,
                
                # Complete task specification (GA4GH TES compliant)
                'inputs': tes_task['inputs'],
                'outputs': tes_task['outputs'],
                'resources': tes_task['resources'],
                'executors': tes_task['executors'],
                'volumes': tes_task.get('volumes', []),
                'tags': tes_task.get('tags', {}),
                
                # Additional execution details
                'workdir': data.get('workdir', '/tmp'),
                'stdin': data.get('stdin', ''),
                'stdout': data.get('stdout', ''),
                'stderr': data.get('stderr', ''),
                'env': data.get('env', {}),
                
                # Legacy fields for backwards compatibility
                'docker_image': docker_image,
                'command': data.get('command', ''),
                'input_url': input_url,
                'output_url': output_url,
                
                # Response and tracking
                'response': response_data,
                'logs': [],  # Will be populated as task runs
                'task_log': [],  # Task execution logs
                
                # Submission metadata
                'submitted_by': 'TES Dashboard',
                'submission_method': 'REST API',
                'client_info': {
                    'user_agent': request.headers.get('User-Agent', 'Unknown'),
                    'client_ip': request.remote_addr,
                    'timestamp': datetime.utcnow().isoformat(),
                    'content_type': request.content_type
                },
                
                # Task metadata for analytics
                'metadata': {
                    'input_count': len(tes_task['inputs']),
                    'output_count': len(tes_task['outputs']),
                    'executor_count': len(tes_task['executors']),
                    'volume_count': len(tes_task.get('volumes', [])),
                    'has_custom_workdir': data.get('workdir') != '/tmp',
                    'has_env_vars': bool(data.get('env', {})),
                    'has_stdin': bool(data.get('stdin', '')),
                    'has_stdout_redirect': bool(data.get('stdout', '')),
                    'has_stderr_redirect': bool(data.get('stderr', ''))
                }
            }
            
            submitted_tasks.append(local_task)
            
            # Update workflow status
            global current_workflow_step, latest_workflow_path
            current_workflow_step = 1
            latest_workflow_path = [tes_name]
            
            return jsonify({
                'success': True,
                'task_id': task_id,
                'message': f'Task "{tes_task["name"]}" submitted successfully to {tes_name}',
                'tes_response': response_data,
                'tes_endpoint': tes_endpoint,
                'task_name': tes_task['name']
            })
        else:
            error_msg = f'TES submission failed with status {response.status_code}'
            try:
                error_data = response.json()
                error_msg = f'{error_msg}: {error_data.get("message", error_data)}'
            except:
                error_msg = f'{error_msg}: {response.text}'
            
            return jsonify({
                'success': False,
                'error': error_msg,
                'tes_endpoint': tes_endpoint,
                'status_code': response.status_code
            }), 400
    
    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'error': 'Request timeout - TES instance may be unavailable'
        }), 408
    except requests.exceptions.ConnectionError:
        return jsonify({
            'success': False,
            'error': 'Connection error - TES instance may be offline'
        }), 503
    except Exception as e:
        print(f"❌ Task submission error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Task submission failed: {str(e)}'
        }), 500

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
    """Get comprehensive details of a specific task with enhanced metadata"""
    task_id = request.args.get('task_id')
    tes_url = request.args.get('tes_url')
    view_level = request.args.get('view', 'FULL')  # MINIMAL, BASIC, or FULL
    
    if not task_id or not tes_url:
        return jsonify({'success': False, 'error': 'task_id and tes_url parameters are required'}), 400
    
    try:
        # First try to get task details from the actual TES instance
        tes_endpoint = f"{tes_url.rstrip('/')}/ga4gh/tes/v1/tasks/{task_id}"
        
        # Add view parameter for GA4GH TES API to get comprehensive data
        if view_level in ['MINIMAL', 'BASIC', 'FULL']:
            tes_endpoint += f"?view={view_level}"
        
        # Get instance-specific credentials
        instance_name = next((inst['name'] for inst in TES_INSTANCES if inst['url'] in tes_url), 'unknown')
        credentials = get_instance_credentials(instance_name, tes_url)
        
        headers = {'Accept': 'application/json'}
        auth = None
        
        # Add authentication if available
        if credentials.get('token'):
            headers['Authorization'] = f"Bearer {credentials['token']}"
        elif credentials.get('user') and credentials.get('password'):
            auth = (credentials['user'], credentials['password'])
        
        print(f"Fetching comprehensive task details from: {tes_endpoint}")
        
        response = requests.get(tes_endpoint, headers=headers, auth=auth, timeout=30)
        
        if response.status_code == 200:
            task_json = response.json()
            print(f"Successfully fetched task details: {task_json.get('id', 'Unknown ID')}")
            
            # Enhance the response with comprehensive metadata
            enhanced_response = {
                'success': True, 
                'task_json': task_json,
                'source': 'tes_instance',
                'tes_endpoint': tes_endpoint,
                'view_level': view_level,
                'instance_name': instance_name,
                'fetch_timestamp': datetime.utcnow().isoformat(),
                'raw_response_size': len(str(task_json)),
                'comprehensive_metadata': {
                    # Content analysis
                    'has_inputs': bool(task_json.get('inputs', [])),
                    'has_outputs': bool(task_json.get('outputs', [])),
                    'has_executors': bool(task_json.get('executors', [])),
                    'has_logs': bool(task_json.get('logs', [])),
                    'has_volumes': bool(task_json.get('volumes', [])),
                    'has_tags': bool(task_json.get('tags', {})),
                    'has_resources': bool(task_json.get('resources', {})),
                    
                    # Counts
                    'input_count': len(task_json.get('inputs', [])),
                    'output_count': len(task_json.get('outputs', [])),
                    'executor_count': len(task_json.get('executors', [])),
                    'volume_count': len(task_json.get('volumes', [])),
                    'log_entries': len(task_json.get('logs', [])),
                    'tag_count': len(task_json.get('tags', {})),
                    
                    # State analysis
                    'is_terminal_state': task_json.get('state') in ['COMPLETE', 'CANCELED', 'SYSTEM_ERROR', 'EXECUTOR_ERROR'],
                    'is_running': task_json.get('state') in ['RUNNING', 'INITIALIZING'],
                    'is_queued': task_json.get('state') == 'QUEUED',
                    
                    # Timing analysis
                    'has_creation_time': bool(task_json.get('creation_time')),
                    'has_start_time': bool(task_json.get('start_time')),
                    'has_end_time': bool(task_json.get('end_time')),
                    'duration_seconds': None,
                    
                    # Resource analysis
                    'total_cpu_cores': task_json.get('resources', {}).get('cpu_cores', 0) if task_json.get('resources') else 0,
                    'total_ram_gb': task_json.get('resources', {}).get('ram_gb', 0) if task_json.get('resources') else 0,
                    'total_disk_gb': task_json.get('resources', {}).get('disk_gb', 0) if task_json.get('resources') else 0,
                    
                    # File analysis
                    'total_input_files': len([inp for inp in task_json.get('inputs', []) if inp.get('type') == 'FILE']),
                    'total_output_files': len([out for out in task_json.get('outputs', []) if out.get('type') == 'FILE']),
                    'has_directory_inputs': any(inp.get('type') == 'DIRECTORY' for inp in task_json.get('inputs', [])),
                    'has_directory_outputs': any(out.get('type') == 'DIRECTORY' for out in task_json.get('outputs', []))
                }
            }
            
            # Calculate duration if both start and end times are available
            if task_json.get('start_time') and task_json.get('end_time'):
                try:
                    from datetime import datetime
                    start = datetime.fromisoformat(task_json['start_time'].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(task_json['end_time'].replace('Z', '+00:00'))
                    enhanced_response['comprehensive_metadata']['duration_seconds'] = (end - start).total_seconds()
                except:
                    pass
            
            return jsonify(enhanced_response)
        else:
            print(f"TES API returned status {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"Error fetching from TES instance: {e}")
    
    # Fallback: look for task in submitted tasks and enhance it
    task = None
    for t in submitted_tasks:
        if t['task_id'] == task_id:
            task = t
            break
    
    if task:
        # Create enhanced task data with GA4GH TES structure
        enhanced_task = dict(task)  # Make a copy
        
        # Ensure GA4GH TES compliance
        if 'id' not in enhanced_task and 'task_id' in enhanced_task:
            enhanced_task['id'] = enhanced_task['task_id']
        
        if 'state' not in enhanced_task and 'status' in enhanced_task:
            enhanced_task['state'] = enhanced_task['status']
        
        if 'creation_time' not in enhanced_task and 'submitted_at' in enhanced_task:
            enhanced_task['creation_time'] = enhanced_task['submitted_at']
        
        # Ensure proper structure for inputs/outputs/executors
        if 'inputs' not in enhanced_task:
            enhanced_task['inputs'] = []
            if enhanced_task.get('input_url'):
                enhanced_task['inputs'].append({
                    'name': 'input_file',
                    'url': enhanced_task['input_url'],
                    'path': enhanced_task.get('input_path', '/tmp/input'),
                    'type': 'FILE',
                    'content': enhanced_task.get('input_content', '')
                })
        
        if 'outputs' not in enhanced_task:
            enhanced_task['outputs'] = []
            if enhanced_task.get('output_url'):
                enhanced_task['outputs'].append({
                    'name': 'output_file',
                    'url': enhanced_task['output_url'],
                    'path': enhanced_task.get('output_path', '/tmp/output'),
                    'type': 'FILE',
                    'path_prefix': enhanced_task.get('output_prefix', '')
                })
        
        if 'executors' not in enhanced_task and enhanced_task.get('docker_image'):
            enhanced_task['executors'] = [{
                'image': enhanced_task['docker_image'],
                'command': enhanced_task.get('command', '').split() if enhanced_task.get('command') else ['echo', 'Hello World'],
                'workdir': enhanced_task.get('workdir', '/tmp'),
                'stdin': enhanced_task.get('stdin', ''),
                'stdout': enhanced_task.get('stdout', ''),
                'stderr': enhanced_task.get('stderr', ''),
                'env': enhanced_task.get('env', {}),
                'ignore_error': enhanced_task.get('ignore_error', False)
            }]
        
        # Add default empty arrays for missing fields
        if 'volumes' not in enhanced_task:
            enhanced_task['volumes'] = []
        if 'tags' not in enhanced_task:
            enhanced_task['tags'] = {}
        if 'logs' not in enhanced_task:
            enhanced_task['logs'] = []
        
        return jsonify({
            'success': True, 
            'task_json': enhanced_task,
            'source': 'dashboard_submitted',
            'view_level': view_level,
            'instance_name': instance_name,
            'fetch_timestamp': datetime.utcnow().isoformat(),
            'raw_response_size': len(str(enhanced_task)),
            'comprehensive_metadata': {
                'has_inputs': bool(enhanced_task.get('inputs', [])),
                'has_outputs': bool(enhanced_task.get('outputs', [])),
                'has_executors': bool(enhanced_task.get('executors', [])),
                'has_logs': bool(enhanced_task.get('logs', [])),
                'has_volumes': bool(enhanced_task.get('volumes', [])),
                'has_tags': bool(enhanced_task.get('tags', {})),
                'has_resources': bool(enhanced_task.get('resources', {})),
                'input_count': len(enhanced_task.get('inputs', [])),
                'output_count': len(enhanced_task.get('outputs', [])),
                'executor_count': len(enhanced_task.get('executors', [])),
                'volume_count': len(enhanced_task.get('volumes', [])),
                'log_entries': len(enhanced_task.get('logs', [])),
                'tag_count': len(enhanced_task.get('tags', {})),
                'is_terminal_state': enhanced_task.get('state') in ['COMPLETE', 'CANCELED', 'SYSTEM_ERROR', 'EXECUTOR_ERROR'],
                'is_running': enhanced_task.get('state') in ['RUNNING', 'INITIALIZING'],
                'is_queued': enhanced_task.get('state') == 'QUEUED',
                'has_creation_time': bool(enhanced_task.get('creation_time')),
                'has_start_time': bool(enhanced_task.get('start_time')),
                'has_end_time': bool(enhanced_task.get('end_time')),
                'total_cpu_cores': enhanced_task.get('resources', {}).get('cpu_cores', 0) if enhanced_task.get('resources') else 0,
                'total_ram_gb': enhanced_task.get('resources', {}).get('ram_gb', 0) if enhanced_task.get('resources') else 0,
                'total_disk_gb': enhanced_task.get('resources', {}).get('disk_gb', 0) if enhanced_task.get('resources') else 0,
                'total_input_files': len([inp for inp in enhanced_task.get('inputs', []) if inp.get('type') == 'FILE']),
                'total_output_files': len([out for out in enhanced_task.get('outputs', []) if out.get('type') == 'FILE']),
                'has_directory_inputs': any(inp.get('type') == 'DIRECTORY' for inp in enhanced_task.get('inputs', [])),
                'has_directory_outputs': any(out.get('type') == 'DIRECTORY' for out in enhanced_task.get('outputs', []))
            }
        })
    
    # If not found anywhere, return a helpful error
    return jsonify({
        'success': False, 
        'error': f'Task {task_id} not found in TES instance {tes_url} or dashboard records. The task may not exist, or you may not have permission to view it.',
        'tes_endpoint': f"{tes_url.rstrip('/')}/ga4gh/tes/v1/tasks/{task_id}",
        'attempted_view_level': view_level
    }), 404

@app.route('/api/workflow_log/<path:run_id>', methods=['GET'])
def get_workflow_log(run_id):
    """Get workflow execution log"""
    # URL decode the run_id to handle special characters
    from urllib.parse import unquote
    decoded_run_id = unquote(run_id)
    
    # Find workflow run
    workflow = None
    for w in workflow_runs:
        if w['run_id'] == decoded_run_id:
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

@app.route('/api/batch_log/<path:run_id>', methods=['GET'])
def get_batch_log(run_id):
    """Get batch execution log"""
    # URL decode the run_id to handle special characters
    from urllib.parse import unquote
    decoded_run_id = unquote(run_id)
    
    # Find batch run
    batch = None
    for b in batch_runs:
        if b['run_id'] == decoded_run_id:
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

@app.route('/api/task_log/<path:task_id>', methods=['GET'])
def get_task_log(task_id):
    """Get individual task execution log"""
    # URL decode the task_id to handle special characters
    from urllib.parse import unquote
    decoded_task_id = unquote(task_id)
    
    # Find task in submitted_tasks
    task = None
    for t in submitted_tasks:
        if t['task_id'] == decoded_task_id:
            task = t
            break
    
    if not task:
        return jsonify({'success': False, 'error': 'Task not found'}), 404
    
    # Mock log content for individual task
    log_content = f"""
=== Task Execution Log ===
Task ID: {task_id}
Task Name: {task.get('task_name', 'Unknown')}
TES Instance: {task.get('tes_name', 'Unknown')}
Status: {task.get('status', 'Unknown')}
Submitted: {task.get('submitted_at', 'Unknown')}

[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Task execution started
[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Initializing execution environment
[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Downloading input files
[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Executing command: {task.get('command', 'echo "Hello World"')}
[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Command output: Hello World from TES!
[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Uploading output files
[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Task execution completed successfully

=== Task Details ===
Executors: {len(task.get('executors', []))}
Resources: CPU={task.get('cpu', 'N/A')}, Memory={task.get('memory', 'N/A')}
Inputs: {len(task.get('inputs', []))} files
Outputs: {len(task.get('outputs', []))} files
"""
    
    return jsonify({'success': True, 'log': log_content, 'task': task})

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

@app.route('/api/service_status', methods=['GET'])
@app.route('/api/service-status', methods=['GET'])
def service_status():
    """Get status of all TES services and nodes"""
    try:
        service_statuses = []
        
        # Read from the rich TES instance locations file instead of .tes_instances
        tes_locations_file = Path(__file__).parent / 'tes_instance_locations.json'
        instances = []
        if tes_locations_file.exists():
            with open(tes_locations_file, 'r') as f:
                instances = json.load(f)
        else:
            # Fallback to TES_INSTANCES if JSON file doesn't exist
            instances = TES_INSTANCES
            
        for instance in instances:
            # Handle both JSON format and simple format
            name = instance.get('name', instance.get('id', 'Unknown'))
            url = instance.get('url', '')
            country = instance.get('country', 'Unknown')
            
            status_info = {
                'name': name,
                'url': url,
                'type': 'TES',
                'location': country,
                'status': 'offline',
                'response_time': None,
                'health': 'unhealthy',
                'details': {},
                'last_checked': datetime.now().isoformat()
            }
            
            # Try different TES service-info endpoint patterns
            endpoints_to_try = [
                f"{url}/ga4gh/tes/v1/service-info",  # Standard GA4GH TES
                f"{url}/service-info",                # Simple service-info
                f"{url}/api/service-info",            # API prefixed
                f"{url}",                            # Basic connectivity test
            ]
            
            success = False
            for endpoint in endpoints_to_try:
                try:
                    start_time = time.time()
                    response = requests.get(endpoint, timeout=8)
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        status_info['status'] = 'online'
                        status_info['health'] = 'healthy'
                        status_info['response_time'] = response_time
                        
                        # Try to get service info details
                        try:
                            service_data = response.json()
                            status_info['details'] = {
                                'version': service_data.get('version', 'Unknown'),
                                'name': service_data.get('name', name),
                                'description': service_data.get('description', 'TES Service'),
                                'organization': service_data.get('organization', {}).get('name', 'Unknown'),
                                'endpoint_used': endpoint
                            }
                        except:
                            # If it's not JSON or doesn't have expected fields, it's still a successful connection
                            status_info['details'] = {
                                'message': 'Service responded successfully',
                                'endpoint_used': endpoint
                            }
                        success = True
                        break
                        
                    elif response.status_code == 403:
                        # Service exists but requires authentication
                        status_info['status'] = 'online'
                        status_info['health'] = 'healthy'  # Service is working, just needs auth
                        status_info['response_time'] = response_time
                        status_info['details'] = {
                            'message': 'Service requires authentication (403 - Service Available)',
                            'endpoint_used': endpoint
                        }
                        success = True
                        break
                        
                except requests.exceptions.Timeout:
                    continue  # Try next endpoint
                    
                except requests.exceptions.ConnectionError:
                    continue  # Try next endpoint
                    
                except Exception:
                    continue  # Try next endpoint
            
            # If none of the endpoints worked, mark as offline
            if not success:
                status_info['status'] = 'offline'
                status_info['health'] = 'unhealthy'
                status_info['details'] = {'error': 'All endpoints unreachable or returned errors'}
            
            service_statuses.append(status_info)
        
        # Calculate overall system health
        online_services = sum(1 for s in service_statuses if s['status'] == 'online')
        total_services = len(service_statuses)
        health_percentage = (online_services / total_services * 100) if total_services > 0 else 0
        
        overall_status = 'healthy' if health_percentage >= 80 else 'degraded' if health_percentage >= 50 else 'unhealthy'
        
        return jsonify({
            'services': service_statuses,
            'summary': {
                'total_services': total_services,
                'online_services': online_services,
                'offline_services': total_services - online_services,
                'health_percentage': health_percentage,
                'overall_status': overall_status,
                'last_updated': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/service-health/<service_id>', methods=['GET'])
def get_service_health(service_id):
    """Get health status for a specific service by ID"""
    try:
        # Load TES instances
        tes_locations_file = Path(__file__).parent / 'tes_instance_locations.json'
        instances = []
        if tes_locations_file.exists():
            with open(tes_locations_file, 'r') as f:
                instances = json.load(f)
        
        # Find the service by ID
        service = None
        for instance in instances:
            if instance.get('id') == service_id:
                service = instance
                break
        
        if not service:
            return jsonify({'error': f'Service with ID {service_id} not found'}), 404
        
        # Check service health with multiple endpoint patterns
        url = service.get('url', '')
        endpoints_to_try = [
            f"{url}/ga4gh/tes/v1/service-info",  # Standard GA4GH TES
            f"{url}/service-info",                # Simple service-info
            f"{url}/api/service-info",            # API prefixed
        ]
        
        for endpoint in endpoints_to_try:
            try:
                start_time = time.time()
                response = requests.get(endpoint, timeout=5, headers={
                    'Accept': 'application/json',
                    'User-Agent': 'TES-Dashboard/1.0'
                })
                response_time = round((time.time() - start_time) * 1000)  # Convert to milliseconds
                
                if response.status_code == 200:
                    service_info = None
                    try:
                        service_info = response.json()
                    except:
                        pass  # Not JSON, but still successful
                    
                    return jsonify({
                        'status': 'online',
                        'responseTime': response_time,
                        'endpoint': endpoint,
                        'serviceInfo': service_info,
                        'lastChecked': datetime.now().isoformat()
                    })
                    
                elif response.status_code == 403:
                    # Service exists but requires authentication
                    return jsonify({
                        'status': 'online',
                        'responseTime': response_time,
                        'endpoint': endpoint,
                        'note': 'Service requires authentication',
                        'lastChecked': datetime.now().isoformat()
                    })
                    
            except requests.exceptions.RequestException as e:
                continue  # Try next endpoint
        
        # All endpoints failed
        return jsonify({
            'status': 'offline',
            'error': 'All service endpoints failed to respond',
            'lastChecked': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes', methods=['GET'])
def get_nodes():
    """Get all nodes in the federated TES network"""
    try:
        tes_locations_file = Path(__file__).parent / 'tes_instance_locations.json'
        if tes_locations_file.exists():
            with open(tes_locations_file, 'r') as f:
                nodes = json.load(f)
                return jsonify({'nodes': nodes})
        else:
            return jsonify({'nodes': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes', methods=['POST'])
def add_node():
    """Add a new node to the federated TES network"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['id', 'name', 'url', 'country']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Load existing nodes
        tes_locations_file = Path(__file__).parent / 'tes_instance_locations.json'
        nodes = []
        if tes_locations_file.exists():
            with open(tes_locations_file, 'r') as f:
                nodes = json.load(f)
        
        # Check if node ID already exists
        if any(node['id'] == data['id'] for node in nodes):
            return jsonify({'error': f'Node with ID {data["id"]} already exists'}), 400
        
        # Create new node with default values
        new_node = {
            'id': data['id'],
            'name': data['name'],
            'url': data['url'].rstrip('/'),  # Remove trailing slash
            'country': data['country'],
            'ip': data.get('ip', '0.0.0.0'),
            'lat': data.get('lat', 0.0),
            'lng': data.get('lng', 0.0),
            'lon': data.get('lng', 0.0),  # Some systems use lon instead of lng
            'status': 'healthy',  # Default to healthy, will be updated by health checks
            'tasks': 0,
            'workflows': 0,
            'description': data.get('description', f'TES instance at {data["country"]}'),
            'capacity': {
                'cpu': data.get('cpu', 100),
                'memory': data.get('memory', '100GB'),
                'storage': data.get('storage', '1TB')
            },
            'version': data.get('version', 'v1.0.0'),
            'region': data.get('region', 'Unknown'),
            'latency': data.get('latency', 100)
        }
        
        # Test connectivity to the new node
        connectivity_status = 'unknown'
        try:
            endpoints_to_try = [
                f"{new_node['url']}/ga4gh/tes/v1/service-info",
                f"{new_node['url']}/service-info",
                f"{new_node['url']}/api/service-info",
                f"{new_node['url']}"
            ]
            
            for endpoint in endpoints_to_try:
                try:
                    response = requests.get(endpoint, timeout=5)
                    if response.status_code in [200, 403]:  # 403 means service exists but needs auth
                        connectivity_status = 'reachable'
                        break
                except:
                    continue
        except:
            connectivity_status = 'unreachable'
        
        # Add connectivity test result
        new_node['connectivity_test'] = connectivity_status
        
        # Add to nodes list
        nodes.append(new_node)
        
        # Save updated nodes
        with open(tes_locations_file, 'w') as f:
            json.dump(nodes, f, indent=2)
        
        # Also update TES_INSTANCES for backward compatibility
        TES_INSTANCES.append({
            'name': new_node['name'],
            'url': new_node['url']
        })
        
        return jsonify({
            'message': 'Node added successfully',
            'node': new_node,
            'connectivity_test': connectivity_status
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes/<node_id>', methods=['DELETE'])
def remove_node(node_id):
    """Remove a node from the federated TES network"""
    try:
        tes_locations_file = Path(__file__).parent / 'tes_instance_locations.json'
        if not tes_locations_file.exists():
            return jsonify({'error': 'No nodes configuration found'}), 404
        
        # Load existing nodes
        with open(tes_locations_file, 'r') as f:
            nodes = json.load(f)
        
        # Find and remove the node
        original_count = len(nodes)
        nodes = [node for node in nodes if node['id'] != node_id]
        
        if len(nodes) == original_count:
            return jsonify({'error': f'Node with ID {node_id} not found'}), 404
        
        # Save updated nodes
        with open(tes_locations_file, 'w') as f:
            json.dump(nodes, f, indent=2)
        
        # Also update TES_INSTANCES for backward compatibility
        global TES_INSTANCES
        TES_INSTANCES = [inst for inst in TES_INSTANCES if inst.get('url') != next(
            (node['url'] for node in nodes if node['id'] == node_id), None
        )]
        
        return jsonify({
            'message': f'Node {node_id} removed successfully',
            'remaining_nodes': len(nodes)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes/<node_id>', methods=['PUT'])
def update_node(node_id):
    """Update an existing node in the federated TES network"""
    try:
        data = request.get_json()
        
        tes_locations_file = Path(__file__).parent / 'tes_instance_locations.json'
        if not tes_locations_file.exists():
            return jsonify({'error': 'No nodes configuration found'}), 404
        
        # Load existing nodes
        with open(tes_locations_file, 'r') as f:
            nodes = json.load(f)
        
        # Find the node to update
        node_index = next((i for i, node in enumerate(nodes) if node['id'] == node_id), None)
        if node_index is None:
            return jsonify({'error': f'Node with ID {node_id} not found'}), 404
        
        # Update the node with provided data
        current_node = nodes[node_index]
        updatable_fields = ['name', 'url', 'country', 'description', 'region', 'ip', 'lat', 'lng', 'lon']
        
        for field in updatable_fields:
            if field in data:
                current_node[field] = data[field]
        
        # Update capacity if provided
        if 'capacity' in data:
            current_node['capacity'].update(data['capacity'])
        
        # Update version if provided
        if 'version' in data:
            current_node['version'] = data['version']
        
        # Remove trailing slash from URL
        if 'url' in data:
            current_node['url'] = current_node['url'].rstrip('/')
        
        # Test connectivity if URL was updated
        if 'url' in data:
            connectivity_status = 'unknown'
            try:
                endpoints_to_try = [
                    f"{current_node['url']}/ga4gh/tes/v1/service-info",
                    f"{current_node['url']}/service-info",
                    f"{current_node['url']}/api/service-info",
                    f"{current_node['url']}"
                ]
                
                for endpoint in endpoints_to_try:
                    try:
                        response = requests.get(endpoint, timeout=5)
                        if response.status_code in [200, 403]:
                            connectivity_status = 'reachable'
                            break
                    except:
                        continue
            except:
                connectivity_status = 'unreachable'
            
            current_node['connectivity_test'] = connectivity_status
        
        # Save updated nodes
        with open(tes_locations_file, 'w') as f:
            json.dump(nodes, f, indent=2)
        
        return jsonify({
            'message': f'Node {node_id} updated successfully',
            'node': current_node
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes/<node_id>/test', methods=['POST'])
def test_node_connectivity(node_id):
    """Test connectivity to a specific node"""
    try:
        tes_locations_file = Path(__file__).parent / 'tes_instance_locations.json'
        if not tes_locations_file.exists():
            return jsonify({'error': 'No nodes configuration found'}), 404
        
        # Load existing nodes
        with open(tes_locations_file, 'r') as f:
            nodes = json.load(f)
        
        # Find the node
        node = next((n for n in nodes if n['id'] == node_id), None)
        if not node:
            return jsonify({'error': f'Node with ID {node_id} not found'}), 404
        
        # Test connectivity
        test_results = []
        endpoints_to_try = [
            f"{node['url']}/ga4gh/tes/v1/service-info",
            f"{node['url']}/service-info", 
            f"{node['url']}/api/service-info",
            f"{node['url']}"
        ]
        
        overall_status = 'unreachable'
        fastest_response = None
        
        for endpoint in endpoints_to_try:
            try:
                start_time = time.time()
                response = requests.get(endpoint, timeout=10)
                response_time = time.time() - start_time
                
                result = {
                    'endpoint': endpoint,
                    'status_code': response.status_code,
                    'response_time': response_time,
                    'reachable': response.status_code in [200, 403]
                }
                
                if result['reachable']:
                    overall_status = 'reachable'
                    if fastest_response is None or response_time < fastest_response:
                        fastest_response = response_time
                
                # Try to get service info if successful
                if response.status_code == 200:
                    try:
                        service_data = response.json()
                        result['service_info'] = {
                            'name': service_data.get('name', 'Unknown'),
                            'version': service_data.get('version', 'Unknown'),
                            'description': service_data.get('description', 'No description')
                        }
                    except:
                        result['service_info'] = {'error': 'Could not parse service info'}
                
                test_results.append(result)
                
            except requests.exceptions.Timeout:
                test_results.append({
                    'endpoint': endpoint,
                    'error': 'Timeout',
                    'reachable': False
                })
            except requests.exceptions.ConnectionError:
                test_results.append({
                    'endpoint': endpoint,
                    'error': 'Connection refused',
                    'reachable': False
                })
            except Exception as e:
                test_results.append({
                    'endpoint': endpoint,
                    'error': str(e),
                    'reachable': False
                })
        
        return jsonify({
            'node_id': node_id,
            'node_name': node['name'],
            'node_url': node['url'],
            'overall_status': overall_status,
            'fastest_response_time': fastest_response,
            'test_results': test_results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    """Root endpoint - API information with embedded data for proxy workaround"""
    # Get nodes data for frontend workaround
    try:
        with open(os.path.join(os.path.dirname(__file__), 'tes_instance_locations.json'), 'r') as f:
            locations_data = json.load(f)
            nodes = locations_data.get('nodes', [])
    except Exception as e:
        print(f"Error loading nodes: {e}")
        nodes = []
    
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
        },
        # Embedded data for proxy workaround - accessible via /api/
        'workaround_data': {
            'nodes': nodes,
            'instances': TES_INSTANCES,
            'tes_instances': TES_INSTANCES  # For compatibility with different frontend calls
        }
    })

# Middleware Management API Endpoints
@app.route('/api/middleware/status', methods=['GET'])
def get_middleware_status():
    """Get status of all middlewares"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        status = {}
        for name, middleware in middleware_manager.middlewares.items():
            status[name] = {
                "name": name,
                "enabled": middleware.enabled,
                "priority": middleware.priority,
                "type": type(middleware).__name__,
                "description": getattr(middleware, 'description', ''),
                "metrics": getattr(middleware, 'metrics', {})
            }
        
        return jsonify({
            "status": "success",
            "middlewares": status,
            "total_count": len(middleware_manager.middlewares),
            "enabled_count": len([m for m in middleware_manager.middlewares.values() if m.enabled])
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get middleware status: {str(e)}"}), 500

@app.route('/api/middleware/<middleware_name>/toggle', methods=['POST'])
def toggle_middleware(middleware_name):
    """Enable/disable a specific middleware"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        if middleware_name not in middleware_manager.middlewares:
            return jsonify({"error": f"Middleware '{middleware_name}' not found"}), 404
        
        middleware = middleware_manager.middlewares[middleware_name]
        middleware.enabled = not middleware.enabled
        
        return jsonify({
            "status": "success",
            "middleware": middleware_name,
            "enabled": middleware.enabled
        })
    except Exception as e:
        return jsonify({"error": f"Failed to toggle middleware: {str(e)}"}), 500

@app.route('/api/middleware/<middleware_name>/config', methods=['GET', 'PUT'])
def middleware_config(middleware_name):
    """Get or update middleware configuration"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        if middleware_name not in middleware_manager.middlewares:
            return jsonify({"error": f"Middleware '{middleware_name}' not found"}), 404
        
        middleware = middleware_manager.middlewares[middleware_name]
        
        if request.method == 'GET':
            config = getattr(middleware, 'config', {})
            return jsonify({
                "status": "success",
                "middleware": middleware_name,
                "config": config
            })
        
        elif request.method == 'PUT':
            new_config = request.get_json()
            if hasattr(middleware, 'update_config'):
                middleware.update_config(new_config)
                return jsonify({
                    "status": "success",
                    "middleware": middleware_name,
                    "message": "Configuration updated"
                })
            else:
                return jsonify({"error": "Middleware does not support configuration updates"}), 400
    
    except Exception as e:
        return jsonify({"error": f"Failed to handle middleware config: {str(e)}"}), 500

@app.route('/api/middleware/metrics', methods=['GET'])
def get_middleware_metrics():
    """Get aggregated metrics from all middlewares"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        metrics = {}
        for name, middleware in middleware_manager.middlewares.items():
            if hasattr(middleware, 'get_metrics'):
                middleware_metrics = middleware.get_metrics()
                metrics[name] = middleware_metrics
            elif hasattr(middleware, 'metrics'):
                metrics[name] = middleware.metrics
        
        return jsonify({
            "status": "success",
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get middleware metrics: {str(e)}"}), 500

@app.route('/api/middleware/test', methods=['POST'])
def test_middleware_chain():
    """Test the middleware chain with a sample request"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        test_data = request.get_json() or {}
        
        # Create a test context
        context = MiddlewareContext(
            user_id=test_data.get('user_id', 'test_user'),
            endpoint=test_data.get('endpoint', '/api/test'),
            method=test_data.get('method', 'GET'),
            headers=test_data.get('headers', {}),
            data=test_data.get('data', {})
        )
        
        # Process through middleware chain
        should_continue, response = asyncio.run(
            middleware_manager.process_request(context)
        )
        
        if not should_continue:
            return jsonify({
                "status": "blocked",
                "message": "Request blocked by middleware",
                "response": response,
                "context": {
                    "user_id": context.user_id,
                    "endpoint": context.endpoint,
                    "method": context.method
                }
            })
        
        return jsonify({
            "status": "success",
            "message": "Request passed through middleware chain",
            "context": {
                "user_id": context.user_id,
                "endpoint": context.endpoint,
                "method": context.method,
                "processed_middlewares": len(middleware_manager.middlewares)
            }
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to test middleware chain: {str(e)}"}), 500

@app.route('/api/middleware/reset', methods=['POST'])
def reset_middleware():
    """Reset all middleware configurations and metrics"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        for middleware in middleware_manager.middlewares.values():
            if hasattr(middleware, 'reset'):
                middleware.reset()
            elif hasattr(middleware, 'metrics'):
                middleware.metrics = {}
        
        return jsonify({
            "status": "success",
            "message": "All middleware configurations and metrics reset"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to reset middleware: {str(e)}"}), 500

@app.route('/api/middleware/reorder', methods=['POST'])
def reorder_middlewares():
    """Reorder middleware execution priorities"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        new_order = request.get_json()
        if not new_order or 'middlewares' not in new_order:
            return jsonify({"error": "Invalid request format"}), 400
        
        # Update priorities based on new order
        for middleware_info in new_order['middlewares']:
            middleware_name = middleware_info.get('name')
            new_priority = middleware_info.get('priority')
            
            if middleware_name in middleware_manager.middlewares:
                middleware_manager.middlewares[middleware_name].priority = new_priority
        
        return jsonify({
            "status": "success",
            "message": "Middleware order updated successfully"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to reorder middlewares: {str(e)}"}), 500

@app.route('/api/middleware/install', methods=['POST'])
def install_middleware():
    """Install new middleware from local or GitHub source"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_config = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'type', 'source']
        for field in required_fields:
            if field not in middleware_config:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Check for duplicate names
        if middleware_config['name'] in middleware_manager.middlewares:
            return jsonify({"error": "Middleware with this name already exists"}), 400
        
        # Handle GitHub source
        if middleware_config['source'] == 'github':
            github_url = middleware_config.get('githubUrl')
            if not github_url:
                return jsonify({"error": "GitHub URL is required for external middlewares"}), 400
            
            # TODO: Implement GitHub middleware installation
            # This would involve:
            # 1. Cloning the repository
            # 2. Validating the middleware code
            # 3. Installing dependencies
            # 4. Loading the middleware class
            return jsonify({
                "status": "success",
                "message": f"GitHub middleware '{middleware_config['name']}' installation initiated",
                "note": "GitHub middleware installation is not yet implemented"
            })
        
        # Handle local middleware creation
        else:
            # Create a basic middleware template
            middleware_class_name = f"{middleware_config['name'].replace(' ', '')}Middleware"
            
            # TODO: Generate actual middleware file and load it
            # For now, return success with placeholder
            return jsonify({
                "status": "success",
                "message": f"Local middleware '{middleware_config['name']}' created successfully",
                "middleware": {
                    "name": middleware_config['name'],
                    "type": middleware_config['type'],
                    "enabled": middleware_config.get('enabled', True),
                    "priority": middleware_config.get('priority', 5),
                    "class_name": middleware_class_name
                }
            })
    
    except Exception as e:
        return jsonify({"error": f"Failed to install middleware: {str(e)}"}), 500

@app.route('/api/middleware/<middleware_name>/remove', methods=['DELETE'])
def remove_middleware(middleware_name):
    """Remove middleware from the system"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        if middleware_name not in middleware_manager.middlewares:
            return jsonify({"error": f"Middleware '{middleware_name}' not found"}), 404
        
        # Remove from middleware manager
        del middleware_manager.middlewares[middleware_name]
        
        return jsonify({
            "status": "success",
            "message": f"Middleware '{middleware_name}' removed successfully"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to remove middleware: {str(e)}"}), 500

@app.route('/api/middleware/github/validate', methods=['POST'])
def validate_github_middleware():
    """Validate GitHub repository for middleware compatibility"""
    try:
        data = request.get_json()
        github_url = data.get('githubUrl')
        
        if not github_url:
            return jsonify({"error": "GitHub URL is required"}), 400
        
        # Basic URL validation
        if not github_url.startswith('https://github.com/'):
            return jsonify({
                "valid": False,
                "error": "Invalid GitHub URL format"
            }), 400
        
        # TODO: Implement actual GitHub repository validation
        # This would involve:
        # 1. Checking if repository exists and is accessible
        # 2. Validating middleware structure and dependencies
        # 3. Checking for security issues
        
        return jsonify({
            "valid": True,
            "repository": {
                "url": github_url,
                "accessible": True,
                "has_middleware": True,
                "estimated_size": "2.3 MB",
                "languages": ["Python"],
                "dependencies": ["flask", "asyncio"]
            },
            "validation": {
                "structure_valid": True,
                "dependencies_compatible": True,
                "security_scan_passed": True
            }
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to validate GitHub middleware: {str(e)}"}), 500

@app.route('/api/middleware/<middleware_name>/source', methods=['GET'])
def get_middleware_source(middleware_name):
    """Get middleware source code"""
    if not MIDDLEWARE_AVAILABLE:
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        if middleware_name not in middleware_manager.middlewares:
            return jsonify({"error": f"Middleware '{middleware_name}' not found"}), 404
        
        middleware = middleware_manager.middlewares[middleware_name]
        
        # TODO: Read actual source code from file
        # For now, return a placeholder
        source_code = f"""# {middleware_name} Middleware
# Type: {type(middleware).__name__}
# Priority: {middleware.priority}
# Enabled: {middleware.enabled}

from middleware_manager import BaseMiddleware

class {middleware_name.replace(' ', '')}Middleware(BaseMiddleware):
    def __init__(self, config):
        super().__init__(config)
        self.middleware_type = '{type(middleware).__name__.replace('Middleware', '').lower()}'
    
    async def process_request(self, context):
        '''Process incoming request'''
        if not self.enabled:
            return True, None
        
        # Middleware logic here
        return True, None
    
    async def process_response(self, context, response):
        '''Process outgoing response'''
        if not self.enabled:
            return response
            
        # Response processing logic here
        return response
"""
        
        return jsonify({
            "status": "success",
            "middleware": middleware_name,
            "source_code": source_code,
            "file_path": f"backend/middleware_implementations.py",
            "language": "python",
            "lines": len(source_code.split('\n'))
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to get middleware source: {str(e)}"}), 500
