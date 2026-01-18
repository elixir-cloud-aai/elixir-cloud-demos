import requests
import time
import threading
from datetime import datetime, timezone
from utils.auth_utils import get_instance_credentials

task_update_lock = threading.Lock()
submitted_tasks = []

def fetch_task_status_from_tes(task_id, tes_url, tes_name='Unknown'):
    if not task_id or not tes_url:
        return False, None, "Missing task_id or tes_url"
    
    try:
        credentials = get_instance_credentials(tes_name, tes_url)
        tes_endpoint = f"{tes_url.rstrip('/')}/ga4gh/tes/v1/tasks/{task_id}?view=FULL"
        headers = {'Accept': 'application/json'}
        auth = None
        
        if credentials.get('token'):
            headers['Authorization'] = f"Bearer {credentials['token']}"
        elif credentials.get('user') and credentials.get('password'):
            auth = (credentials['user'], credentials['password'])
        
        response = requests.get(tes_endpoint, headers=headers, auth=auth, timeout=10)
        
        if response.status_code == 200:
            task_data = response.json()
            return True, task_data, None
        elif response.status_code == 404:
            return False, None, f"Task {task_id} not found on TES instance {tes_url}"
        else:
            return False, None, f"HTTP {response.status_code} error from TES instance"
    
    except requests.exceptions.Timeout:
        return False, None, f"Timeout fetching task {task_id} status"
    except requests.exceptions.ConnectionError as e:
        return False, None, f"Connection error: {str(e)[:100]}"
    except Exception as e:
        return False, None, f"Error: {str(e)[:100]}"

def update_single_task_status(task):
    task_id = task.get('task_id') or task.get('id')
    tes_url = task.get('tes_url')
    tes_name = task.get('tes_name', 'Unknown')
    
    if not task_id or not tes_url:
        return False
    
    success, task_data, error = fetch_task_status_from_tes(task_id, tes_url, tes_name)
    
    if not success:
        if error:
            print(f"Warning: {error}")
        return False
    
    new_state = task_data.get('state', 'UNKNOWN')
    
    with task_update_lock:
        for t in submitted_tasks:
            if (t.get('task_id') == task_id or t.get('id') == task_id) and t.get('tes_url') == tes_url:
                old_state = t.get('state') or t.get('status', 'UNKNOWN')
                
                t['state'] = new_state
                t['status'] = new_state
                
                if task_data.get('creation_time'):
                    t['creation_time'] = task_data['creation_time']
                if task_data.get('start_time'):
                    t['start_time'] = task_data['start_time']
                if task_data.get('end_time'):
                    t['end_time'] = task_data['end_time']
                
                if task_data.get('logs'):
                    t['logs'] = task_data['logs']
                
                if new_state != old_state:
                    print(f"Updated task {task_id}: {old_state} -> {new_state}")
                    return True
                elif new_state in ['COMPLETE', 'CANCELED', 'SYSTEM_ERROR', 'EXECUTOR_ERROR', 'PREEMPTED']:
                    print(f"Verified task {task_id} in terminal state: {new_state}")
                    return True
                
                return False
                
    return False

def update_task_statuses():
    terminal_states = ['COMPLETE', 'CANCELED', 'SYSTEM_ERROR', 'EXECUTOR_ERROR', 'PREEMPTED']
    
    while True:
        try:
            tasks_to_update = []
            with task_update_lock:
                for task in submitted_tasks:
                    current_state = task.get('state') or task.get('status', 'UNKNOWN')
                    if current_state not in terminal_states:
                        tasks_to_update.append(task)
            
            if not tasks_to_update:
                time.sleep(30)
                continue
            
            print(f"Updating status for {len(tasks_to_update)} active tasks...")
            
            updated_count = 0
            for task in tasks_to_update:
                if update_single_task_status(task):
                    updated_count += 1
            
            if updated_count > 0:
                print(f"Updated {updated_count} task statuses")
            
            time.sleep(30)
            
        except Exception as e:
            print(f"Error in task status update loop: {str(e)}")
            time.sleep(60)

def start_task_status_updater():
    import threading
    global task_updater_started
    if not hasattr(start_task_status_updater, 'started'):
        start_task_status_updater.started = False
    
    if start_task_status_updater.started:
        return None
    
    updater_thread = threading.Thread(target=update_task_statuses, daemon=True)
    updater_thread.start()
    start_task_status_updater.started = True
    print("Started background task status updater thread")
    return updater_thread

def get_submitted_tasks():
    return submitted_tasks

def add_task(task):
    submitted_tasks.append(task)
