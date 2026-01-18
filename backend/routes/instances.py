from flask import Blueprint, jsonify
from datetime import datetime, timezone
from utils.tes_utils import load_tes_instances
from services.tes_service import get_healthy_instances, fetch_tes_status
from concurrent.futures import ThreadPoolExecutor
import requests

instances_bp = Blueprint('instances', __name__)

@instances_bp.route('/api/instances', methods=['GET'])
def get_instances():
    instances = load_tes_instances()
    return jsonify(instances)

@instances_bp.route('/api/healthy-instances', methods=['GET'])
def get_healthy_instances_route():
    """Get list of healthy TES instances from cache"""
    try: 
        healthy_instances = get_healthy_instances()
        
        return jsonify({
            'instances': healthy_instances,
            'count': len(healthy_instances),
            'last_updated': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error in get_healthy_instances: {str(e)}")
        return jsonify({'error': str(e)}), 500

@instances_bp.route('/api/tes_locations', methods=['GET'])
def tes_locations():
    from utils.tes_utils import load_tes_location_data
    instances = load_tes_location_data()
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(fetch_tes_status, instances))
    return jsonify(results)

@instances_bp.route('/api/service_info', methods=['GET'])
def get_service_info():
    from flask import request
    from services.tes_service import get_service_info as tes_get_service_info
    
    tes_url = request.args.get('tes_url')
    if not tes_url:
        return jsonify({
            'error': 'tes_url parameter is required',
            'error_code': 'MISSING_PARAMETER',
            'error_type': 'validation_error'
        }), 400
    
    result = tes_get_service_info(tes_url)
     
    if isinstance(result, tuple):
        error_info, status_code = result
        return jsonify(error_info), status_code
     
    return jsonify(result), 200
