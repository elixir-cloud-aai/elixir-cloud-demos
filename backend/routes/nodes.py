from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
from pathlib import Path
import json
import time
import requests
from utils.tes_utils import load_tes_instances

nodes_bp = Blueprint('nodes', __name__, url_prefix='/api')

@nodes_bp.route('/test_connection', methods=['GET', 'OPTIONS'])
def test_connection():
    """Test connection to all TES instances"""
    try:
        results = []
        instances = load_tes_instances()
        
        for instance in instances:
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
        
        return jsonify({
            'status': 'success',
            'message': 'Backend is running',
            'timestamp': datetime.now().isoformat(),
            'results': results
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@nodes_bp.route('/service_status', methods=['GET'])
def get_service_status():
    """Get overall service status"""
    try:
        from config import UPLOAD_FOLDER
        import os
        
        upload_folder_status = {
            'exists': os.path.exists(UPLOAD_FOLDER),
            'writable': os.access(UPLOAD_FOLDER, os.W_OK) if os.path.exists(UPLOAD_FOLDER) else False,
            'path': UPLOAD_FOLDER
        }
        
        middleware_available = current_app.config.get('MIDDLEWARE_AVAILABLE', False)
        
        service_status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'services': {
                'api': {
                    'status': 'operational',
                    'uptime': 'running'
                },
                'storage': {
                    'status': 'operational' if upload_folder_status['exists'] and upload_folder_status['writable'] else 'degraded',
                    'details': upload_folder_status
                },
                'middleware': {
                    'status': 'operational' if middleware_available else 'disabled',
                    'enabled': middleware_available
                },
                'database': {
                    'status': 'operational',
                    'type': 'in-memory'
                }
            },
            'version': '1.0.0',
            'environment': 'development'
        }
        
        service_statuses = [s['status'] for s in service_status['services'].values()]
        if 'degraded' in service_statuses or 'error' in service_statuses:
            service_status['status'] = 'degraded'
        
        return jsonify(service_status)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get service status: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@nodes_bp.route('/nodes', methods=['GET'])
def get_nodes():
    """Get all nodes/instances"""
    try:
        tes_locations_file = Path(__file__).parent.parent / 'tes_instance_locations.json'
        if tes_locations_file.exists():
            with open(tes_locations_file, 'r') as f:
                nodes = json.load(f)
                return jsonify({'nodes': nodes})
        else:
            return jsonify({'nodes': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nodes_bp.route('/nodes', methods=['POST'])
def add_node():
    """Add a new node"""
    try:
        data = request.get_json()
        required_fields = ['id', 'name', 'url', 'country']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        tes_locations_file = Path(__file__).parent.parent / 'tes_instance_locations.json'
        nodes = []
        if tes_locations_file.exists():
            with open(tes_locations_file, 'r') as f:
                nodes = json.load(f)
        
        if any(node['id'] == data['id'] for node in nodes):
            return jsonify({'error': f'Node with ID {data["id"]} already exists'}), 400
        
        new_node = {
            'id': data['id'],
            'name': data['name'],
            'url': data['url'].rstrip('/'),
            'country': data['country'],
            'ip': data.get('ip', '0.0.0.0'),
            'lat': data.get('lat', 0.0),
            'lng': data.get('lng', 0.0),
            'lon': data.get('lng', 0.0),
            'status': 'healthy',
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
        
        nodes.append(new_node)
        with open(tes_locations_file, 'w') as f:
            json.dump(nodes, f, indent=2)
        
        return jsonify({
            'message': 'Node added successfully',
            'node': new_node
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nodes_bp.route('/nodes/<node_id>', methods=['GET'])
def get_node_details(node_id):
    """Get details for a specific node"""
    try:
        tes_locations_file = Path(__file__).parent.parent / 'tes_instance_locations.json'
        if not tes_locations_file.exists():
            return jsonify({'error': 'No nodes configuration found'}), 404
        
        with open(tes_locations_file, 'r') as f:
            nodes = json.load(f)
        
        node = next((n for n in nodes if n.get('id') == node_id), None)
        
        if not node:
            return jsonify({'error': 'Node not found', 'node_id': node_id}), 404
        
        return jsonify({'node': node, 'timestamp': datetime.now().isoformat()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nodes_bp.route('/nodes/<node_id>', methods=['DELETE'])
def remove_node(node_id):
    """Remove a node"""
    try:
        tes_locations_file = Path(__file__).parent.parent / 'tes_instance_locations.json'
        if not tes_locations_file.exists():
            return jsonify({'error': 'No nodes configuration found'}), 404
        
        with open(tes_locations_file, 'r') as f:
            nodes = json.load(f)
        
        original_count = len(nodes)
        nodes = [node for node in nodes if node['id'] != node_id]
        
        if len(nodes) == original_count:
            return jsonify({'error': f'Node with ID {node_id} not found'}), 404
        
        with open(tes_locations_file, 'w') as f:
            json.dump(nodes, f, indent=2)
        
        return jsonify({
            'message': f'Node {node_id} removed successfully',
            'remaining_nodes': len(nodes)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nodes_bp.route('/nodes/<node_id>', methods=['PUT'])
def update_node(node_id):
    """Update a node"""
    try:
        data = request.get_json()
        tes_locations_file = Path(__file__).parent.parent / 'tes_instance_locations.json'
        if not tes_locations_file.exists():
            return jsonify({'error': 'No nodes configuration found'}), 404
        
        with open(tes_locations_file, 'r') as f:
            nodes = json.load(f)
        
        node_index = next((i for i, node in enumerate(nodes) if node['id'] == node_id), None)
        if node_index is None:
            return jsonify({'error': f'Node with ID {node_id} not found'}), 404
        
        current_node = nodes[node_index]
        updatable_fields = ['name', 'url', 'country', 'description', 'region', 'ip', 'lat', 'lng', 'lon']
        
        for field in updatable_fields:
            if field in data:
                current_node[field] = data[field]
        
        if 'capacity' in data:
            current_node['capacity'].update(data['capacity'])
        if 'version' in data:
            current_node['version'] = data['version']
        if 'url' in data:
            current_node['url'] = current_node['url'].rstrip('/')
        
        with open(tes_locations_file, 'w') as f:
            json.dump(nodes, f, indent=2)
        
        return jsonify({
            'message': f'Node {node_id} updated successfully',
            'node': current_node
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nodes_bp.route('/nodes/<node_id>/health', methods=['GET'])
def check_node_health(node_id):
    """Check health of a specific node"""
    try:
        tes_locations_file = Path(__file__).parent.parent / 'tes_instance_locations.json'
        if not tes_locations_file.exists():
            return jsonify({'error': 'No nodes configuration found'}), 404
        
        with open(tes_locations_file, 'r') as f:
            nodes = json.load(f)
        
        service = next((n for n in nodes if n.get('id') == node_id), None)
        
        if not service:
            return jsonify({'error': f'Service with ID {node_id} not found'}), 404
        
        url = service.get('url', '')
        endpoints_to_try = [
            f"{url}/ga4gh/tes/v1/service-info",
            f"{url}/service-info",
            f"{url}/api/service-info",
            f"{url}/api/v1/service-info",   
        ]
        
        for endpoint in endpoints_to_try:
            try:
                start_time = time.time()
                response = requests.get(endpoint, timeout=5, headers={
                    'Accept': 'application/json',
                    'User-Agent': 'TES-Dashboard/1.0'
                })
                response_time = round((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    service_info = None
                    try:
                        service_info = response.json()
                    except:
                        pass
                    
                    return jsonify({
                        'status': 'online',
                        'responseTime': response_time,
                        'endpoint': endpoint,
                        'serviceInfo': service_info,
                        'lastChecked': datetime.now().isoformat()
                    })
                elif response.status_code == 403:
                    return jsonify({
                        'status': 'online',
                        'responseTime': response_time,
                        'endpoint': endpoint,
                        'note': 'Service requires authentication',
                        'lastChecked': datetime.now().isoformat()
                    })
            except:
                continue
        
        return jsonify({
            'status': 'offline',
            'error': 'All service endpoints failed to respond',
            'lastChecked': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nodes_bp.route('/service-status', methods=['GET'])
def service_status():
    """Get detailed service status for healthy nodes only"""
    try:
        service_statuses = []
         
        from services.tes_service import get_healthy_instances
        instances = get_healthy_instances()
         
        for instance in instances:
            name = instance.get('name', 'Unknown')
            url = instance.get('url', '')
            
            status_info = {
                'name': name,
                'url': url,
                'type': 'TES',
                'status': instance.get('status', 'unknown'),
                'health': 'healthy' if instance.get('status') == 'healthy' else 'unhealthy',
                'last_checked': instance.get('last_checked', datetime.now().isoformat())
            }
            
            service_statuses.append(status_info)
        
        online_services = sum(1 for s in service_statuses if s['status'] == 'healthy')
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