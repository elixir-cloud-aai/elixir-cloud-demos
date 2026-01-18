from flask import Blueprint, jsonify
from datetime import datetime
import random
from utils.tes_utils import load_tes_location_data
from services.workflow_service import get_workflow_runs

network_bp = Blueprint('network', __name__)

@network_bp.route('/api/network_topology', methods=['GET'])
def get_network_topology():
    try:
        current_tes_locations = load_tes_location_data()
        
        active_instances = len([loc for loc in current_tes_locations if loc.get('status') == 'healthy'])
        total_tasks = sum(loc.get('tasks', 0) for loc in current_tes_locations)
        total_workflows = sum(loc.get('workflows', 0) for loc in current_tes_locations)
        
        connections = []
        for i, instance in enumerate(current_tes_locations):
            for j, target in enumerate(current_tes_locations):
                if i != j:
                    connections.append({
                        'source': instance.get('id', f'instance-{i}'),
                        'target': target.get('id', f'instance-{j}'),
                        'latency': abs(instance.get('latency', 50) - target.get('latency', 50)),
                        'bandwidth': '10Gbps',
                        'status': 'active' if instance.get('status') == 'healthy' and target.get('status') == 'healthy' else 'inactive'
                    })
        
        data_flows = []
        workflow_runs = get_workflow_runs()
        for workflow in workflow_runs[-5:]:
            source_instance = next((loc for loc in current_tes_locations if loc.get('name') == workflow.get('tes_name')), None)
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
            'instances': current_tes_locations,
            'connections': connections,
            'data_flows': data_flows,
            'metrics': {
                'active_instances': active_instances,
                'total_instances': len(current_tes_locations),
                'total_tasks': total_tasks,
                'total_workflows': total_workflows,
                'network_health': 'healthy' if active_instances == len(current_tes_locations) else 'degraded',
                'avg_latency': sum(loc.get('latency', 50) for loc in current_tes_locations) / len(current_tes_locations) if current_tes_locations else 0,
                'last_updated': datetime.now().isoformat()
            },
            'geographic_coverage': {
                'regions': list(set(loc.get('region', 'Unknown') for loc in current_tes_locations)),
                'countries': list(set(loc.get('country', 'Unknown') for loc in current_tes_locations)),
                'coordinates_bounds': {
                    'north': max((loc.get('lat', 0) for loc in current_tes_locations), default=0),
                    'south': min((loc.get('lat', 0) for loc in current_tes_locations), default=0),
                    'east': max((loc.get('lng', 0) for loc in current_tes_locations), default=0),
                    'west': min((loc.get('lng', 0) for loc in current_tes_locations), default=0)
                }
            }
        }
        
        return jsonify(topology_data)
        
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve network topology data'}), 500

@network_bp.route('/api/network_status', methods=['GET'])
def get_network_status():
    try:
        current_tes_locations = load_tes_location_data()
        
        healthy_instances = [loc for loc in current_tes_locations if loc.get('status') == 'healthy']
        processing_instances = [loc for loc in current_tes_locations if loc.get('status') == 'processing']
        unhealthy_instances = [loc for loc in current_tes_locations if loc.get('status') not in ['healthy', 'processing']]
        
        return jsonify({
            'overall_status': 'healthy' if len(unhealthy_instances) == 0 else 'degraded',
            'instances': {
                'healthy': len(healthy_instances),
                'processing': len(processing_instances),
                'unhealthy': len(unhealthy_instances),
                'total': len(current_tes_locations)
            },
            'performance': {
                'avg_latency': sum(loc.get('latency', 50) for loc in current_tes_locations) / len(current_tes_locations) if current_tes_locations else 0,
                'min_latency': min((loc.get('latency', 50) for loc in current_tes_locations), default=0),
                'max_latency': max((loc.get('latency', 50) for loc in current_tes_locations), default=0),
                'total_capacity': {
                    'cpu': sum(loc.get('capacity', {}).get('cpu', 0) for loc in current_tes_locations),
                    'memory': f"{sum(float(str(loc.get('capacity', {}).get('memory', '0TB')).replace('TB', '')) for loc in current_tes_locations):.1f}TB",
                    'storage': f"{sum(float(str(loc.get('capacity', {}).get('storage', '0TB')).replace('TB', '')) for loc in current_tes_locations):.1f}TB"
                }
            },
            'activity': {
                'active_tasks': sum(loc.get('tasks', 0) for loc in current_tes_locations),
                'active_workflows': sum(loc.get('workflows', 0) for loc in current_tes_locations),
                'data_transfers': random.randint(5, 15),
                'network_utilization': f"{random.randint(15, 85)}%"
            },
            'last_updated': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve network status'}), 500

@network_bp.route('/api/instance_metrics/<instance_id>', methods=['GET'])
def get_instance_metrics(instance_id):
    try:
        current_tes_locations = load_tes_location_data()
        instance = next((loc for loc in current_tes_locations if loc.get('id') == instance_id), None)
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404
        
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
                'peer_instances': [loc.get('id', '') for loc in current_tes_locations if loc.get('id') != instance_id][:3]
            }
        }
        
        return jsonify(metrics)
        
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve instance metrics'}), 500

@network_bp.route('/api/data_transfers', methods=['GET'])
def get_data_transfers():
    from datetime import timedelta
    from utils.tes_utils import load_tes_location_data
    
    transfers = []
    storage_endpoints = [
        {'id': 'storage-eu-central', 'name': 'EU Central Storage', 'location': 'Frankfurt'},
        {'id': 'storage-eu-north', 'name': 'EU North Storage', 'location': 'Stockholm'},
        {'id': 'storage-na-east', 'name': 'NA East Storage', 'location': 'Virginia'},
        {'id': 'storage-global', 'name': 'Global Cache Hub', 'location': 'London'}
    ]
    
    tes_locations = load_tes_location_data()
    for i in range(random.randint(3, 8)):
        source = random.choice(tes_locations)
        target = random.choice(storage_endpoints)
        
        transfers.append({
            'id': f'transfer-{i}',
            'source': {
                'name': source.get('name', ''),
                'lat': source.get('lat', 0),
                'lng': source.get('lng', 0)
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

@network_bp.route('/api/network_metrics', methods=['GET'])
def get_network_metrics():
    tes_locations = load_tes_location_data()
    
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

@network_bp.route('/api/storage_locations', methods=['GET'])
def get_storage_locations():
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
