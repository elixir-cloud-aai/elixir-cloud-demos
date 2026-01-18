from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from urllib.parse import unquote
import requests
from services.task_service import get_submitted_tasks
from services.workflow_service import get_workflow_runs
from services.batch_service import get_batch_runs
from utils.auth_utils import get_instance_credentials

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/api/task_details', methods=['GET'])
def get_task_details():
    task_id = request.args.get('task_id')
    tes_url = request.args.get('tes_url')
    view_level = request.args.get('view', 'FULL')
    
    if not task_id or not tes_url:
        return jsonify({'success': False, 'error': 'task_id and tes_url parameters are required'}), 400
    
    try:
        from utils.tes_utils import load_tes_instances
        
        base_url = tes_url.rstrip('/')
         
        view_levels_to_try = ['FULL', 'MINIMAL'] if view_level == 'FULL' else [view_level]
         
        endpoint_patterns = [
            f"{base_url}/v1/tasks/{task_id}",
            f"{base_url}/ga4gh/tes/v1/tasks/{task_id}",
            f"{base_url}/tasks/{task_id}",
        ]
        
        instance_name = next((inst['name'] for inst in load_tes_instances() if inst['url'] in tes_url), 'unknown')
        credentials = get_instance_credentials(instance_name, tes_url)
        
        headers = {'Accept': 'application/json'}
        auth = None
        if credentials.get('token'):
            headers['Authorization'] = f"Bearer {credentials['token']}"
        elif credentials.get('user') and credentials.get('password'):
            auth = (credentials['user'], credentials['password'])
         
        last_error = None
        for view in view_levels_to_try:
            for pattern in endpoint_patterns:
                tes_endpoint = f"{pattern}?view={view}"
                
                try:
                    print(f"🔍 Trying task detail endpoint: {tes_endpoint}")
                    response = requests.get(tes_endpoint, headers=headers, auth=auth, timeout=15)
                    
                    if response.status_code == 200:
                        task_json = response.json()
                        print(f"✅ Successfully retrieved task from {tes_endpoint}")
                        
                        enhanced_response = {
                            'success': True,
                            'task_json': task_json,
                            'source': 'tes_instance',
                            'tes_endpoint': tes_endpoint,
                            'view_level': view,
                            'instance_name': instance_name,
                            'fetch_timestamp': datetime.utcnow().isoformat(),
                        }
                        return jsonify(enhanced_response)
                        
                    elif response.status_code == 404:
                        print(f"⚠️ Task not found at {tes_endpoint}")
                        last_error = f"Task not found (404)"
                        continue
                        
                    else:
                        print(f"⚠️ Endpoint returned {response.status_code}: {tes_endpoint}")
                        last_error = f"HTTP {response.status_code}"
                        continue
                        
                except requests.exceptions.Timeout:
                    print(f"⏱️ Timeout for endpoint: {tes_endpoint}")
                    last_error = "Connection timeout"
                    continue
                    
                except requests.exceptions.ConnectionError as e:
                    print(f"🔌 Connection error for {tes_endpoint}: {e}")
                    last_error = f"Connection failed"
                    continue
                    
                except Exception as e:
                    print(f"❌ Error with endpoint {tes_endpoint}: {e}")
                    last_error = str(e)
                    continue
        
        print(f"❌ All TES endpoints failed for task {task_id}. Last error: {last_error}")
        
    except Exception as e:
        print(f"❌ Error in task_details route: {e}")
        last_error = str(e)
      
    print(f"🔍 Searching in dashboard submitted tasks for task_id: {task_id}")
    task = None
    for t in get_submitted_tasks():
        if t.get('task_id') == task_id or t.get('id') == task_id:
            task = t
            break
    
    if task:
        print(f"✅ Found task in dashboard submitted tasks")
        return jsonify({
            'success': True,
            'task_json': task,
            'source': 'dashboard_submitted',
            'view_level': view_level,
            'instance_name': instance_name if 'instance_name' in locals() else 'unknown',
            'fetch_timestamp': datetime.utcnow().isoformat(),
        })
    
    print(f"❌ Task not found anywhere: {task_id}")
    return jsonify({
        'success': False,
        'error': f'Task {task_id} not found in TES instance or dashboard records. Last error: {last_error}',
        'last_error': last_error
    }), 404

@logs_bp.route('/api/task_log/<path:task_id>', methods=['GET'])
def get_task_log(task_id):
    decoded_task_id = unquote(task_id)
    
    task = None
    for t in get_submitted_tasks():
        if t.get('task_id') == decoded_task_id or t.get('id') == decoded_task_id:
            task = t
            break
    
    if not task:
        return jsonify({'success': False, 'error': 'Task not found'}), 404
    
    log_content = f"""=== Task Execution Log ===
Task ID: {decoded_task_id}
Task Name: {task.get('name', task.get('task_name', 'Unknown'))}
TES Instance: {task.get('tes_name', 'Unknown')}
State: {task.get('state', task.get('status', 'Unknown'))}
Submitted: {task.get('creation_time', task.get('submitted_at', 'Unknown'))}
"""
    
    if task.get('start_time'):
        log_content += f"Started: {task['start_time']}\n"
    if task.get('end_time'):
        log_content += f"Completed: {task['end_time']}\n"
    
    return jsonify({
        'success': True,
        'log': log_content,
        'task': task
    })

@logs_bp.route('/api/workflow_log/<path:run_id>', methods=['GET'])
def get_workflow_log(run_id):
    decoded_run_id = unquote(run_id)
    
    workflow = None
    for w in get_workflow_runs():
        if w['run_id'] == decoded_run_id:
            workflow = w
            break
    
    if not workflow:
        return jsonify({'success': False, 'error': 'Workflow not found'}), 404
    
    log_content = f"""=== {workflow['type'].upper()} Workflow Log ===
Run ID: {decoded_run_id}
TES Instance: {workflow['tes_name']}
TES URL: {workflow.get('tes_url', 'Unknown')}
Status: {workflow['status']}
Submitted: {workflow['submitted_at']}
"""
    
    return jsonify({
        'success': True,
        'log': log_content,
        'workflow': workflow
    })

@logs_bp.route('/api/batch_log/<path:run_id>', methods=['GET'])
def get_batch_log(run_id):
    decoded_run_id = unquote(run_id)
    
    batch = None
    for b in get_batch_runs():
        if b['run_id'] == decoded_run_id or b['run_id'].startswith(decoded_run_id + '_'):
            batch = b
            break
    
    if not batch:
        return jsonify({'success': False, 'error': 'Batch run not found'}), 404
    
    log_content = f"""=== Batch {batch['workflow_type'].upper()} Log ===
Run ID: {decoded_run_id}
Mode: {batch['mode']}
TES Instance: {batch['tes_name']}
TES URL: {batch.get('tes_url', 'Unknown')}
Status: {batch['status']}
Submitted: {batch['submitted_at']}
"""
    
    return jsonify({
        'success': True,
        'log': log_content,
        'batch': batch
    })

@logs_bp.route('/api/task_log', methods=['GET'])
def task_log():
    tes_url = request.args.get('tesUrl')
    task_id = request.args.get('taskId')
    
    if not tes_url or not task_id:
        return jsonify({'error': 'Missing parameters'}), 400
    
    base_url = tes_url.rstrip('/')
     
    view_levels = ['FULL', 'MINIMAL']
    endpoint_patterns = [
        f"{base_url}/v1/tasks/{task_id}",
        f"{base_url}/ga4gh/tes/v1/tasks/{task_id}",
        f"{base_url}/tasks/{task_id}"
    ]
    
    for view in view_levels:
        for pattern in endpoint_patterns:
            endpoint = f"{pattern}?view={view}"
            
            try:
                print(f"🔍 Trying log endpoint: {endpoint}")
                resp = requests.get(endpoint, timeout=10)
                
                if resp.status_code == 200:
                    data = resp.json()
                    logs = []
                     
                    if 'logs' in data and data['logs']:
                        for log_entry in data['logs']:
                            if 'logs' in log_entry:
                                for executor_log in log_entry['logs']:
                                    stdout = executor_log.get('stdout', '')
                                    stderr = executor_log.get('stderr', '')
                                    exit_code = executor_log.get('exit_code')
                                    
                                    if stdout:
                                        logs.append(f"=== STDOUT (exit code: {exit_code}) ===\n{stdout}")
                                    if stderr:
                                        logs.append(f"=== STDERR (exit code: {exit_code}) ===\n{stderr}")
                            
                            if 'metadata' in log_entry and log_entry['metadata']:
                                import json
                                logs.append(f"=== METADATA ===\n{json.dumps(log_entry['metadata'], indent=2)}")
                    
                    if 'executors' in data:
                        for executor in data['executors']:
                            if 'logs' in executor:
                                for log in executor['logs']:
                                    stdout = log.get('stdout', '')
                                    stderr = log.get('stderr', '')
                                    exit_code = log.get('exit_code')
                                    
                                    if stdout:
                                        logs.append(f"=== EXECUTOR STDOUT (exit code: {exit_code}) ===\n{stdout}")
                                    if stderr:
                                        logs.append(f"=== EXECUTOR STDERR (exit code: {exit_code}) ===\n{stderr}")
                    
                    if not logs:
                        logs.append(f"=== NO LOGS AVAILABLE (view: {view}) ===\nThe task may still be running or logs were not captured.")
                    
                    print(f"✅ Successfully retrieved {len(logs)} log entries from {endpoint}")
                    return jsonify({
                        'success': True,
                        'logs': logs,
                        'task': data,
                        'log_count': len(logs),
                        'endpoint': endpoint,
                        'view_level': view
                    })
                else:
                    print(f"⚠️ Endpoint returned {resp.status_code}: {endpoint}")
            except Exception as e:
                print(f"❌ Error with endpoint {endpoint}: {e}")
                continue
    
    return jsonify({
        'success': False,
        'error': 'Could not retrieve task logs from any endpoint',
        'logs': ['=== ERROR ===\nFailed to fetch logs from TES instance. Tried both FULL and MINIMAL views.']
    }), 502