import json
from pathlib import Path
from config import TES_INSTANCES_FILE, TES_LOCATIONS_FILE

def load_tes_instances():
    instances = []
    if TES_INSTANCES_FILE.exists():
        with open(TES_INSTANCES_FILE) as f:
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
                    instances.append({'name': name.strip(), 'url': url})
    return instances

def load_tes_location_data():
    default_coords = {
        'Czech Republic': {'lat': 49.8175, 'lng': 15.4730, 'region': 'EU-Central'},
        'Finland': {'lat': 61.9241, 'lng': 25.7482, 'region': 'EU-North'},
        'Greece': {'lat': 39.0742, 'lng': 21.8243, 'region': 'EU-South'},
        'Germany': {'lat': 51.1657, 'lng': 10.4515, 'region': 'EU-Central'},
        'Canada': {'lat': 56.1304, 'lng': -106.3468, 'region': 'North America'},
        'Local': {'lat': 0, 'lng': 0, 'region': 'Local'},
    }
    
    location_map = {}
    try:
        if TES_LOCATIONS_FILE.exists():
            with open(TES_LOCATIONS_FILE) as f:
                data = json.load(f)
                if isinstance(data, list):
                    for loc in data:
                        url_key = loc.get('url', '').rstrip('/').lower()
                        name_key = loc.get('name', '').lower()
                        location_map[url_key] = loc
                        location_map[name_key] = loc
    except Exception as e:
        print(f"Failed to load tes_instance_locations.json: {e}")

    instances = load_tes_instances()
    enriched_instances = []
    seen_ids = set()
    
    for idx, inst in enumerate(instances):
        inst_name = inst.get('name', '')
        inst_url = inst.get('url', '').rstrip('/')
        url_key = inst_url.lower()
        
        location_data = location_map.get(url_key) or location_map.get(inst_name.lower())
        
        country = 'Unknown'
        if 'CZ' in inst_name or 'Czech' in inst_name:
            country = 'Czech Republic'
        elif 'FI' in inst_name or 'Finland' in inst_name:
            country = 'Finland'
        elif 'GR' in inst_name or 'Greece' in inst_name:
            country = 'Greece'
        elif 'DE' in inst_name or 'Germany' in inst_name or 'denbi' in inst_url.lower():
            country = 'Germany'
        elif 'NA' in inst_name or 'North America' in inst_name or 'calculquebec' in inst_url.lower():
            country = 'Canada'
        elif 'localhost' in inst_url.lower():
            country = 'Local'
        
        coords = default_coords.get(country, {'lat': 0, 'lng': 0, 'region': 'Unknown'})
        
        base_id = location_data.get('id') if location_data else inst_name.lower().replace(' ', '-').replace('@', '').replace('(', '').replace(')', '').replace('/', '-').replace(' ', '-')
        
        instance_id = base_id
        counter = 0
        while instance_id in seen_ids:
            counter += 1
            instance_id = f"{base_id}-{counter}"
        seen_ids.add(instance_id)
        
        enriched = {
            'id': instance_id,
            'name': inst_name,
            'url': inst_url,
            'lat': location_data.get('lat') if location_data and location_data.get('lat') else coords['lat'],
            'lng': location_data.get('lng') if location_data and location_data.get('lng') else coords['lng'],
            'lon': location_data.get('lng') if location_data and location_data.get('lng') else coords['lng'],
            'country': location_data.get('country') if location_data else country,
            'region': location_data.get('region') if location_data else coords['region'],
            'status': location_data.get('status', 'unknown') if location_data else 'unknown',
            'description': location_data.get('description', inst_name) if location_data else inst_name,
            'instanceType': location_data.get('instanceType', 'compute') if location_data else 'compute',
        }
        enriched_instances.append(enriched)
    
    return enriched_instances
