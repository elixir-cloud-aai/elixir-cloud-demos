from flask import Blueprint, jsonify
from datetime import datetime, timezone
import json
from utils.tes_utils import load_tes_location_data
from services.task_service import get_submitted_tasks
from services.workflow_service import get_workflow_runs
from services.batch_service import get_batch_runs
from utils.tes_utils import load_tes_instances

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard_data', methods=['GET'])
def get_dashboard_data():
    current_tes_locations = load_tes_location_data()
    
    fresh_instances = []
    for tes_instance in current_tes_locations:
        fresh_instances.append({
            "name": tes_instance.get("name"),
            "url": tes_instance.get("url"),
            "status": "healthy",
            "last_checked": datetime.now(timezone.utc).isoformat()
        })
    
    data = {
        'tasks': get_submitted_tasks(),
        'workflow_runs': get_workflow_runs(),
        'batch_runs': get_batch_runs(),
        'tes_instances': current_tes_locations,
        'healthy_instances': fresh_instances,
        'instances_count': len(current_tes_locations),
        'tes_locations': current_tes_locations
    }
    
    serializable_data = {}
    for k, v in data.items():
        try:
            json.dumps(v)
            serializable_data[k] = v
        except Exception as e:
            print(f"Key '{k}' is not serializable: {e}")
            if k == 'tes_locations' and isinstance(v, list):
                serializable_data[k] = [loc if isinstance(loc, (dict, list, str, int, float, bool, type(None))) else str(loc) for loc in v]
            else:
                serializable_data[k] = str(v) if v else None
    
    return jsonify(serializable_data)

@dashboard_bp.route('/', methods=['GET'])
def index():
    import os
    import json
    from pathlib import Path
    
    try:
        tes_locations_file = Path(__file__).parent.parent / 'tes_instance_locations.json'
        with open(tes_locations_file, 'r') as f:
            locations_data = json.load(f)
            if isinstance(locations_data, list):
                nodes = locations_data
            else:
                nodes = locations_data.get('nodes', [])
    except Exception as e:
        print(f"Error loading nodes: {e}")
        nodes = []
    
    tes_instances = load_tes_instances()
    
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
            'total_tasks': len(get_submitted_tasks()),
            'total_workflows': len(get_workflow_runs()),
            'total_batch_runs': len(get_batch_runs()),
            'available_instances': len(tes_instances)
        },
        'workaround_data': {
            'nodes': nodes,
            'instances': tes_instances,
            'tes_instances': tes_instances
        }
    })
