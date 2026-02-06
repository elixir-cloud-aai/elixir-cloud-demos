from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timezone
import uuid
import json
import time
import requests
import shlex
import logging
from services.task_service import get_submitted_tasks, add_task, update_single_task_status
from utils.tes_utils import load_tes_instances
from utils.auth_utils import get_instance_credentials
import logging

logger = logging.getLogger(__name__)

tasks_bp = Blueprint('tasks', __name__)

def build_failed_task(tes_task, tes_url, tes_name, tes_endpoint=None, 
                      error_message=None, error_type=None, error_code=None, 
                      error_reason=None, http_status_code=None):
    """
    Construct a standardized failed task dictionary.
    
    Args:
        tes_task: The TES task specification dict
        tes_url: TES instance URL
        tes_name: TES instance name
        tes_endpoint: Optional TES endpoint used (if reached that stage)
        error_message: Human-readable error description
        error_type: Category of error (e.g., 'connection_error', 'bad_request')
        error_code: Machine-readable error code
        error_reason: Detailed reason for the error
        http_status_code: HTTP status code if applicable
        
    Returns:
        Dict containing failed task with SUBMISSION_FAILED state
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    
    failed_task = {
        'id': str(uuid.uuid4()),
        'task_id': 'N/A',
        'name': tes_task['name'],
        'task_name': tes_task['name'],
        'description': tes_task['description'],
        'state': 'SUBMISSION_FAILED',
        'status': 'SUBMISSION_FAILED',
        'creation_time': now_iso,
        'submitted_at': now_iso,
        'start_time': None,
        'end_time': None,
        'tes_url': tes_url,
        'tes_name': tes_name,
        'tes_endpoint': tes_endpoint,
        'inputs': tes_task.get('inputs', []),
        'outputs': tes_task.get('outputs', []),
        'resources': tes_task.get('resources', {}),
        'executors': tes_task.get('executors', []),
        'volumes': [],
        'tags': {}
    }
    
    # Add error details if provided
    if error_message:
        failed_task['error_message'] = error_message
    if error_type:
        failed_task['error_type'] = error_type
    if error_code:
        failed_task['error_code'] = error_code
    if error_reason:
        failed_task['error_reason'] = error_reason
    if http_status_code:
        failed_task['http_status_code'] = http_status_code
    
    return failed_task

def build_error_response(success=False, error=None, error_type=None, error_code=None,
                        reason=None, dashboard_task_id=None, tes_url=None, tes_name=None, 
                        tes_endpoint=None, status_code=None):
    """
    Construct a standardized error response.
    
    Args:
        dashboard_task_id: The local dashboard task record ID (UUID) for failed submissions
        status_code: HTTP status code from TES response (if applicable)
    
    Returns:
        Dict containing consistent error response structure
    """
    response = {
        'success': success,
        'error': error,
        'error_type': error_type,
        'error_code': error_code,
        'reason': reason,
        'dashboard_task_id': dashboard_task_id,  # Local dashboard record ID (not TES task_id)
        'tes_url': tes_url,
        'tes_name': tes_name,
        'tes_endpoint': tes_endpoint
    }
    
    if status_code is not None:
        response['status_code'] = status_code
    
    return response

@tasks_bp.route('/api/tasks', methods=['GET'])
def get_tasks():
    return jsonify(get_submitted_tasks())

@tasks_bp.route('/api/submit_task', methods=['POST'])
def submit_task():
    try:
        data = request.get_json()
        tes_url = data.get('tes_instance')
        docker_image = data.get('docker_image')
        
        if not tes_url or not docker_image:
            error_msg = f'TES instance URL and Docker image are required. Got tes_url: {tes_url}, docker_image: {docker_image}'
            print(f"Validation error: {error_msg}")
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        tes_name = 'Unknown TES Instance'
        tes_instances = load_tes_instances()
        for inst in tes_instances:
            if inst['url'].rstrip('/') == tes_url.rstrip('/'):
                tes_name = inst['name']
                break
            
            # bug: demo python script task does not complete #12
        # Parse command - handle both list and string formats with proper shell-like quoting
        command_input = data.get('command')
        if isinstance(command_input, list):
            command = command_input
        elif isinstance(command_input, str) and command_input:
            try:
                # Use shlex.split() to properly handle quoted arguments
                command = shlex.split(command_input)
            except ValueError as e:
                # Log parsing error and return 400 for invalid command syntax
                error_msg = f"Invalid command syntax: {str(e)}. Command contains unmatched quotes or invalid escape sequences."
                logger.error(f"Command parsing failed for '{command_input}': {e}")
                return jsonify({
                    'success': False,
                    'error': error_msg,
                    'error_type': 'invalid_command',
                    'error_code': 'INVALID_COMMAND_SYNTAX',
                    'reason': 'The command string contains syntax errors. Check for unmatched quotes or invalid escape sequences.',
                    'invalid_command': command_input
                }), 400
        else:
            command = ['echo', 'Hello World']
        
        executor = {
            "image": docker_image,
            "command": command,
            "workdir": data.get('workdir', '/tmp')
        }
        
        stdin = data.get('stdin', '').strip()
        if stdin and stdin.startswith('/'):
            executor["stdin"] = stdin
            
        stdout = data.get('stdout', '').strip()
        if stdout and stdout.startswith('/'):
            executor["stdout"] = stdout
            
        stderr = data.get('stderr', '').strip()
        if stderr and stderr.startswith('/'):
            executor["stderr"] = stderr
        
        tes_task = {
            "name": data.get('task_name', f'Task-{datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")}'),
            "description": data.get('description', 'Task submitted via TES Dashboard'),
            "inputs": [],
            "outputs": [],
            "resources": {
                "cpu_cores": int(data.get('cpu_cores', 1)),
                "ram_gb": float(data.get('ram_gb', 2.0)),
                "disk_gb": float(data.get('disk_gb', 10.0))
            },
            "executors": [executor]
        }
        
        input_url = data.get('input_url', '').strip()
        if input_url:
            tes_task["inputs"].append({
                "url": input_url,
                "path": data.get('input_path', '/tmp/input'),
                "type": "FILE"
            })
        
        output_url = data.get('output_url', '').strip()
        if output_url:
            tes_task["outputs"].append({
                "url": output_url,
                "path": data.get('output_path', '/tmp/output'),
                "type": "FILE"
            }) 
        base_url = tes_url.rstrip('/')
        endpoint_patterns = [
            {'service_info': f'{base_url}/ga4gh/tes/v1/service-info', 'tasks': f'{base_url}/ga4gh/tes/v1/tasks'},
            {'service_info': f'{base_url}/v1/service-info', 'tasks': f'{base_url}/v1/tasks'},
            {'service_info': f'{base_url}/service-info', 'tasks': f'{base_url}/tasks'},
        ] 
        service_is_reachable = False
        working_endpoint = None
        connectivity_error_info = None
        
        print(f"🔍 Testing connectivity to {tes_name} ({tes_url})...")
        
        for pattern in endpoint_patterns:
            service_info_url = pattern['service_info']
            tasks_url = pattern['tasks']
            
            try:
                print(f"  Trying service-info: {service_info_url}")
                test_response = requests.get(service_info_url, timeout=10)
                
                if test_response.status_code == 200:
                    service_is_reachable = True
                    working_endpoint = tasks_url
                    print(f"  ✅ Service reachable at {service_info_url} (status {test_response.status_code})")
                    print(f"  Will use tasks endpoint: {tasks_url}")
                    break
                elif test_response.status_code in [401, 403]:
                    # Authentication required - treat as unreachable since we can't use it
                    print(f"  🔐 Authentication required at {service_info_url} (status {test_response.status_code})")
                    connectivity_error_info = {
                        'error_type': 'unauthorized',
                        'error_code': 'UNAUTHORIZED',
                        'message': 'Authentication required - TES instance requires credentials',
                        'reason': 'This TES instance requires authentication. Please configure TESK_PROD_TOKEN or credentials in environment variables.'
                    }
                    continue
                else:
                    print(f"  ⚠️ Service returned status {test_response.status_code}")
                    
            except requests.exceptions.Timeout:
                print(f"  ⏱️ Timeout for {service_info_url}")
                connectivity_error_info = {
                    'error_type': 'timeout',
                    'error_code': 'TIMEOUT',
                    'message': 'Connection timeout - TES instance did not respond within 10 seconds',
                    'reason': 'The TES instance may be overloaded, offline, or unreachable'
                }
                continue
                
            except requests.exceptions.ConnectionError as conn_err:
                error_str = str(conn_err).lower()
                print(f"  🔌 Connection error: {error_str[:100]}")
                
                if 'name resolution' in error_str or 'nodename' in error_str or 'servname' in error_str:
                    connectivity_error_info = {
                        'error_type': 'dns_error',
                        'error_code': 'DNS_ERROR',
                        'message': 'DNS resolution failed - Cannot resolve TES instance hostname',
                        'reason': f'The hostname "{tes_url}" cannot be resolved. Check if the URL is correct.'
                    }
                elif 'connection refused' in error_str or 'refused' in error_str:
                    connectivity_error_info = {
                        'error_type': 'connection_refused',
                        'error_code': 'CONNECTION_REFUSED',
                        'message': 'Connection refused - TES instance is not accepting connections',
                        'reason': 'The TES instance may be offline, the port may be blocked, or the service may not be running'
                    }
                elif 'ssl' in error_str or 'certificate' in error_str:
                    connectivity_error_info = {
                        'error_type': 'ssl_error',
                        'error_code': 'SSL_ERROR',
                        'message': 'SSL/TLS certificate error',
                        'reason': 'There is a problem with the SSL certificate. The connection may be insecure or the certificate is invalid.'
                    }
                else:
                    connectivity_error_info = {
                        'error_type': 'connection_error',
                        'error_code': 'CONNECTION_ERROR',
                        'message': f'Connection error - Cannot reach TES instance',
                        'reason': 'Network connectivity issue. Check if the TES instance is accessible.'
                    }
                continue
                
            except requests.exceptions.SSLError as ssl_err:
                print(f"  🔐 SSL error: {ssl_err}")
                connectivity_error_info = {
                    'error_type': 'ssl_error',
                    'error_code': 'SSL_ERROR',
                    'message': 'SSL/TLS certificate verification failed',
                    'reason': f'SSL error: {str(ssl_err)}'
                }
                continue
                
            except Exception as connectivity_error:
                print(f"  ❌ Error: {connectivity_error}")
                connectivity_error_info = {
                    'error_type': 'unknown_error',
                    'error_code': 'UNKNOWN_ERROR',
                    'message': f'Connectivity test failed: {str(connectivity_error)}',
                    'reason': 'An unexpected error occurred while testing connectivity'
                }
                continue 
            
        if not service_is_reachable:
            print(f"❌ All service-info endpoints failed for {tes_name}")
             # feat: add failed submission tasks to task management #11
            error_message = connectivity_error_info['message'] if connectivity_error_info else 'Could not reach TES instance'
            error_type = connectivity_error_info['error_type'] if connectivity_error_info else 'service_unavailable'
            error_code = connectivity_error_info['error_code'] if connectivity_error_info else 'SERVICE_UNAVAILABLE'
            error_reason = connectivity_error_info['reason'] if connectivity_error_info else 'None of the service-info endpoints responded'
            
            failed_task = build_failed_task(
                tes_task=tes_task,
                tes_url=tes_url,
                tes_name=tes_name,
                tes_endpoint=None,
                error_message=error_message,
                error_type=error_type,
                error_code=error_code,
                error_reason=error_reason
            )
            
            add_task(failed_task)
            
            return jsonify(build_error_response(
                success=False,
                error=error_message,
                error_type=error_type,
                error_code=error_code,
                reason=error_reason,
                dashboard_task_id=failed_task['id'],
                tes_url=tes_url,
                tes_name=tes_name,
                tes_endpoint=None
            )), 503
         
        tes_endpoint = working_endpoint
        print(f"🚀 Submitting task to {tes_endpoint}")
        print(f"📦 Task payload: {json.dumps(tes_task, indent=2)}")
         
        credentials = get_instance_credentials(tes_name, tes_url)
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        auth = None
        if credentials.get('token'):
            headers['Authorization'] = f"Bearer {credentials['token']}"
        elif credentials.get('user') and credentials.get('password'):
            auth = (credentials['user'], credentials['password'])
         
        response = requests.post(
            tes_endpoint,
            json=tes_task,
            headers=headers,
            auth=auth,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            response_data = response.json()
            task_id = response_data.get('id', str(uuid.uuid4()))
            
            initial_state = response_data.get('state', 'QUEUED')
            if initial_state not in ['UNKNOWN', 'QUEUED', 'INITIALIZING', 'RUNNING', 'COMPLETE', 'CANCELED', 'SYSTEM_ERROR', 'EXECUTOR_ERROR', 'PREEMPTED']:
                initial_state = 'QUEUED'
            
            local_task = {
                'id': task_id,
                'task_id': task_id,
                'name': tes_task['name'],
                'task_name': tes_task['name'],
                'description': tes_task['description'],
                'state': initial_state,
                'status': initial_state,
                'creation_time': response_data.get('creation_time') or datetime.utcnow().isoformat(),
                'submitted_at': datetime.utcnow().isoformat(),
                'start_time': response_data.get('start_time'),
                'end_time': response_data.get('end_time'),
                'tes_url': tes_url,
                'tes_name': tes_name,
                'tes_endpoint': tes_endpoint,
                'inputs': tes_task['inputs'],
                'outputs': tes_task['outputs'],
                'resources': tes_task['resources'],
                'executors': tes_task['executors'],
                'volumes': tes_task.get('volumes', []),
                'tags': tes_task.get('tags', {}),
                'workdir': data.get('workdir', '/tmp'),
                'stdin': data.get('stdin', ''),
                'stdout': data.get('stdout', ''),
                'stderr': data.get('stderr', ''),
                'env': data.get('env', {}),
                'docker_image': docker_image,
                'command': data.get('command', ''),
                'input_url': input_url,
                'output_url': output_url,
                'response': response_data,
                'logs': response_data.get('logs', []),
                'task_log': [],
                'submitted_by': 'TES Dashboard',
                'submission_method': 'REST API',
                'client_info': {
                    'user_agent': request.headers.get('User-Agent', 'Unknown'),
                    'client_ip': request.remote_addr,
                    'timestamp': datetime.utcnow().isoformat(),
                    'content_type': request.content_type
                },
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
            
            add_task(local_task)
            
            try:
                time.sleep(0.5)
                if update_single_task_status(local_task):
                    print(f"✅ Task {task_id} status updated immediately after submission")
            except Exception as e:
                print(f"⚠️ Could not immediately update task {task_id} status: {str(e)}")
            
            return jsonify({
                'success': True,
                'task_id': task_id,
                'message': f'Task "{tes_task["name"]}" submitted successfully to {tes_name}',
                'tes_response': response_data,
                'tes_endpoint': tes_endpoint,
                'task_name': tes_task['name']
            })
        else:
            error_type_map = {
                400: {'error_type': 'bad_request', 'error_code': 'BAD_REQUEST', 'reason': 'The task specification is invalid or malformed'},
                401: {'error_type': 'unauthorized', 'error_code': 'UNAUTHORIZED', 'reason': 'Authentication required. Please configure TESK_PROD_TOKEN or TESK_PROD_USER/TESK_PROD_PASSWORD environment variables for this instance.'},
                403: {'error_type': 'forbidden', 'error_code': 'FORBIDDEN', 'reason': 'You do not have permission to submit tasks to this instance'},
                404: {'error_type': 'not_found', 'error_code': 'NOT_FOUND', 'reason': 'The TES endpoint was not found. Check if the URL is correct.'},
                408: {'error_type': 'timeout', 'error_code': 'TIMEOUT', 'reason': 'The request timed out. The TES instance may be overloaded.'},
                429: {'error_type': 'rate_limit', 'error_code': 'RATE_LIMITED', 'reason': 'Too many requests. Please wait before submitting again.'},
                500: {'error_type': 'server_error', 'error_code': 'SERVER_ERROR', 'reason': 'The TES instance encountered an internal error'},
                502: {'error_type': 'bad_gateway', 'error_code': 'BAD_GATEWAY', 'reason': 'The TES instance gateway is not responding correctly'},
                503: {'error_type': 'service_unavailable', 'error_code': 'SERVICE_UNAVAILABLE', 'reason': 'The TES instance service is temporarily unavailable'},
                504: {'error_type': 'gateway_timeout', 'error_code': 'GATEWAY_TIMEOUT', 'reason': 'The TES instance gateway timed out'}
            }
            
            error_info = error_type_map.get(response.status_code, {
                'error_type': 'http_error',
                'error_code': 'HTTP_ERROR',
                'reason': f'HTTP {response.status_code} error from TES instance'
            })
            
            error_msg = f'TES submission failed with status {response.status_code}'
            print(f"❌ TES returned status {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            print(f"Response body: {response.text[:500]}")
            
            try:
                error_data = response.json()
                print(f"Error data JSON: {error_data}")
                if error_data.get('message'):
                    error_msg = error_data.get('message')
                elif error_data.get('error'):
                    error_msg = error_data.get('error')
                elif error_data.get('detail'):
                    error_msg = error_data.get('detail')
                elif error_data.get('title'):
                    error_msg = error_data.get('title')
                else:
                    error_msg = f'{error_msg}: {str(error_data)}'
            except:
                response_text = response.text[:200] if response.text else 'No error details provided'
                error_msg = f'{error_msg}: {response_text}'
            
            # feat: add failed submission tasks to task management #11
            failed_task = build_failed_task(
                tes_task=tes_task,
                tes_url=tes_url,
                tes_name=tes_name,
                tes_endpoint=tes_endpoint,
                error_message=error_msg,
                error_type=error_info['error_type'],
                error_code=error_info['error_code'],
                error_reason=error_info['reason'],
                http_status_code=response.status_code
            )
            
            add_task(failed_task)
            
            return jsonify(build_error_response(
                success=False,
                error=error_msg,
                error_type=error_info['error_type'],
                error_code=error_info['error_code'],
                reason=error_info['reason'],
                dashboard_task_id=failed_task['id'],
                tes_url=tes_url,
                tes_name=tes_name,
                tes_endpoint=tes_endpoint,
                status_code=response.status_code
            )), response.status_code
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        print(f"❌ Task submission error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Task submission failed: {str(e)}',
            'error_type': 'unknown_error',
            'error_code': 'UNKNOWN_ERROR'
        }), 500