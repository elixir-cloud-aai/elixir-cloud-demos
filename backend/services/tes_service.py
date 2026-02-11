import requests
import time
from datetime import datetime, timezone
from utils.tes_utils import load_tes_instances, load_tes_location_data
from utils.auth_utils import get_instance_credentials
from services.task_service import get_submitted_tasks

def get_healthy_instances():
    """Get ONLY instances that are actually responding AND can accept tasks (with caching)"""
    import json
    from pathlib import Path
    import requests
    import time
    
    # Load all configured instances
    tes_locations_file = Path(__file__).parent.parent / 'tes_instance_locations.json'
    if not tes_locations_file.exists():
        return []
    
    with open(tes_locations_file, 'r') as f:
        instances = json.load(f)
    
   
    healthy_instances = []
    
    for instance in instances:
        url = instance.get('url', '').rstrip('/')
        instance_id = instance.get('id', url)
        instance_name = instance.get('name', '')
        
        
        service_info_endpoints = [
            f"{url}/ga4gh/tes/v1/service-info",
            f"{url}/service-info",
            f"{url}/v1/service-info"
        ]
        
        service_info_ok = False
        for endpoint in service_info_endpoints:
            try:
                response = requests.get(
                    endpoint,
                    timeout=5,
                    headers={'Accept': 'application/json'}
                )
                if response.status_code == 200:
                    service_info_ok = True
                    break
            except:
                continue
        
       
        if not service_info_ok:
            continue
        
        
        credentials = get_instance_credentials(instance_name, url)
        
        headers = {'Accept': 'application/json'}
        auth = None
        has_credentials = False
        
        if credentials.get('token'):
            headers['Authorization'] = f"Bearer {credentials['token']}"
            has_credentials = True
        elif credentials.get('user') and credentials.get('password'):
            auth = (credentials['user'], credentials['password'])
            has_credentials = True
        
        
        tasks_endpoints = [
            f"{url}/ga4gh/tes/v1/tasks?view=MINIMAL",
            f"{url}/v1/tasks?view=MINIMAL"
        ]
        
        tasks_ok = False
        for tasks_endpoint in tasks_endpoints:
            try:
                tasks_response = requests.get(
                    tasks_endpoint,
                    headers=headers,
                    auth=auth,
                    timeout=5
                )
                
                if tasks_response.status_code == 200:
                    tasks_ok = True
                    break
            except:
                continue
        
        
        if tasks_ok:
            instance['status'] = 'healthy'
            instance['last_checked'] = datetime.now().isoformat()
            healthy_instances.append(instance)
    
    return healthy_instances

def fetch_tes_status(instance):
    try:
        tes_base_url = instance.get("url", "").rstrip("/")
        if not tes_base_url:
            return {**instance, "status": "unreachable"}

        # Try multiple service-info endpoint paths
        endpoints = [
            f"{tes_base_url}/ga4gh/tes/v1/service-info",
            f"{tes_base_url}/v1/service-info",
            f"{tes_base_url}/service-info"
        ]
        
        r = None
        latency_ms = 0
        start_time = time.time()
        
        for endpoint in endpoints:
            try:
                r = requests.get(endpoint, timeout=5, headers={'Accept': 'application/json'})
                latency_ms = int((time.time() - start_time) * 1000)
                if r.status_code in [200, 401, 403]:
                    # Found the right endpoint
                    break
            except:
                continue
        
        if r is None or r.status_code not in [200, 401, 403]:
            # No working endpoint found
            return {**instance, "status": "unreachable"}

        # First check service-info endpoint
        if r.status_code in [401, 403]:
            status = "unhealthy"  # Authentication required but not available
        elif r.status_code != 200:
            status = "unhealthy"
        else:
            
            try:
                instance_name = instance.get("name", "")
                credentials = get_instance_credentials(instance_name, tes_base_url)
                
                
                headers = {'Accept': 'application/json'}
                auth = None
                has_credentials = False
                
                if credentials.get('token'):
                    headers['Authorization'] = f"Bearer {credentials['token']}"
                    has_credentials = True
                elif credentials.get('user') and credentials.get('password'):
                    auth = (credentials['user'], credentials['password'])
                    has_credentials = True
                
                
                tasks_endpoints = [
                    f"{tes_base_url}/ga4gh/tes/v1/tasks?view=MINIMAL",
                    f"{tes_base_url}/v1/tasks?view=MINIMAL"
                ]
                
                tasks_response = None
                for tasks_endpoint in tasks_endpoints:
                    try:
                        tasks_response = requests.get(
                            tasks_endpoint,
                            headers=headers,
                            auth=auth,
                            timeout=5
                        )
                        if tasks_response.status_code not in [404]:
                            
                            break
                    except:
                        continue
                
                
                if tasks_response is None:
                    
                    print(f"⚠️ {instance.get('name')}: No tasks endpoint found")
                    status = "unhealthy"
                elif tasks_response.status_code in [401, 403]:
                    
                    print(f"⚠️ {instance.get('name')}: Authentication required (status {tasks_response.status_code})")
                    if not has_credentials:
                        print(f"   ❌ No credentials configured for this instance")
                    else:
                        print(f"   ❌ Credentials invalid or insufficient")
                    status = "unhealthy"
                elif tasks_response.status_code == 200:
                    
                    print(f"✅ {instance.get('name')}: Tasks endpoint accessible")
                    status = "healthy"
                else:
                   
                    print(f"⚠️ {instance.get('name')}: Tasks endpoint returned {tasks_response.status_code}")
                    status = "healthy"
                    
            except Exception as tasks_error:
                print(f"⚠️ Could not check tasks endpoint for {instance.get('name')}: {tasks_error}")
                
                status = "unhealthy"
        
        version = ""
        try:
            version = r.json().get("version", "")
        except Exception:
            version = ""

        tasks_for_instance = 0
        try:
            base_url_normalized = tes_base_url.rstrip("/")
            submitted_tasks = get_submitted_tasks()
            tasks_for_instance = sum(
                1
                for t in submitted_tasks
                if isinstance(t, dict)
                and t.get("tes_url", "").rstrip("/") == base_url_normalized
            )
        except Exception as e:
            print(f"Failed to count tasks for instance {tes_base_url}: {e}")

        enriched = {
            **instance,
            "status": status,
            "version": version,
            "latency": latency_ms,
            "tasks": tasks_for_instance,
            "taskCount": tasks_for_instance,
            "cpuUsage": 0,
            "memoryUsage": 0,
            "throughput": "N/A",
            "uptime": "N/A",
            "last_checked": datetime.utcnow().isoformat() + "Z",
        }
        return enriched
    except Exception as e:
        print(f"TES location check failed for {instance.get('url')}: {e}")
        return {
            **instance,
            "status": "unreachable",
            "latency": None,
            "tasks": 0,
            "taskCount": 0,
            "cpuUsage": 0,
            "memoryUsage": 0,
            "throughput": "N/A",
            "uptime": "N/A",
            "last_checked": datetime.utcnow().isoformat() + "Z",
        }

def get_service_info(tes_url):
    """Get service info from a TES instance with multiple endpoint attempts"""
    try: 
        endpoints_to_try = [
            f"{tes_url}/ga4gh/tes/v1/service-info",
            f"{tes_url}/v1/tasks",
            f"{tes_url}/service-info",
            f"{tes_url}/api/service-info",
            f"{tes_url}/api/v1/service-info",
        ]
        
        last_error = None
        auth_required = False
        
        for endpoint in endpoints_to_try:
            try:
                print(f"🔍 Trying service-info endpoint: {endpoint}")
                response = requests.get(
                    endpoint,
                    timeout=10,
                    headers={
                        'Accept': 'application/json',
                        'User-Agent': 'TES-Dashboard/1.0'
                    },
                    verify=True
                )
                
                print(f"📊 Response status: {response.status_code}")
                  
                if response.status_code == 200:
                    try:
                        service_info = response.json()
                        print(f"✅ Successfully got service info from {endpoint}")
                        return service_info
                    except ValueError as json_error:
                        print(f"⚠️ Invalid JSON response: {json_error}")
                        last_error = f"Invalid JSON: {json_error}"
                        continue
                 
                elif response.status_code == 403:
                    print(f"🔒 Endpoint {endpoint} requires authentication")
                    auth_required = True
                    last_error = "Authentication required" 
                    break
                
                else:
                    print(f"⚠️ Status {response.status_code} from {endpoint}")
                    last_error = f"HTTP {response.status_code}"
                    continue
                    
            except requests.exceptions.Timeout:
                print(f"⏱️ Timeout: {endpoint}")
                last_error = "Connection timeout"
                continue
                
            except requests.exceptions.SSLError as ssl_error:
                print(f"🔐 SSL error: {ssl_error}")
                last_error = f"SSL error: {ssl_error}"
                continue
                
            except requests.exceptions.ConnectionError as conn_error:
                print(f"🔌 Connection error: {conn_error}")
                last_error = f"Connection failed: {conn_error}"
                continue
                
            except Exception as e:
                print(f"❌ Error: {type(e).__name__}: {e}")
                last_error = str(e)
                continue
         
        if auth_required:
            print(f"✅ Service is running but requires authentication")
            return {
                'name': 'TES Service (Authentication Required)',
                'id': tes_url,
                'organization': {
                    'name': 'Authentication Required',
                    'url': tes_url
                },
                'description': 'This TES instance requires authentication to view service information.',
                'type': {
                    'group': 'ga4gh',
                    'artifact': 'tes',
                    'version': 'Unknown (requires auth)'
                },
                'contactUrl': 'Unknown',
                'documentationUrl': 'Unknown',
                'storage': ['Unknown'],
                'version': 'Unknown',
                'auth_required': True,
                'message': 'Service is operational but requires authentication',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
         
        error_message = f"Could not retrieve service info from {tes_url}. Reason: {last_error}"
        print(f"❌ All endpoints failed: {error_message}")
        
        return {
            'error': 'Service Unavailable',
            'message': error_message,
            'reason': last_error or 'All service-info endpoints failed',
            'error_code': 'SERVICE_INFO_UNAVAILABLE',
            'error_type': 'service_unavailable',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }, 503
        
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {e}")
        return {
            'error': 'Internal Server Error',
            'message': f'Unexpected error: {str(e)}',
            'error_code': 'INTERNAL_ERROR',
            'error_type': 'server_error',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }, 500
