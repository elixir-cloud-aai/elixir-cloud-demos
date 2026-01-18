import os
from pathlib import Path
from dotenv import load_dotenv

env_file_path = Path(__file__).parent / '.env'
load_dotenv(env_file_path)

def clean_env_value(value):
    if not value:
        return value
    if '#' in value:
        value = value.split('#')[0]
    value = value.strip().strip('"').strip("'")
    return value

FUNNEL_SERVER_USER = clean_env_value(os.getenv('FUNNEL_SERVER_USER', ''))
FUNNEL_SERVER_PASSWORD = clean_env_value(os.getenv('FUNNEL_SERVER_PASSWORD', ''))
FTP_USER = clean_env_value(os.getenv('FTP_USER', ''))
FTP_PASSWORD = clean_env_value(os.getenv('FTP_PASSWORD', ''))
FTP_INSTANCE = clean_env_value(os.getenv('FTP_INSTANCE', ''))
TES_GATEWAY = clean_env_value(os.getenv('TES_GATEWAY', ''))
TES_TOKEN = clean_env_value(os.getenv('TES_TOKEN', ''))

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

SECRET_KEY = os.getenv('SECRET_KEY', 'supersecretkey')

CORS_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5001',
    'http://127.0.0.1:5001',
    'https://tes-dashboard-frontend-route-federated-analytics-showcase.2.rahtiapp.fi'
]

TES_INSTANCES_FILE = Path(__file__).parent / '.tes_instances'
TES_LOCATIONS_FILE = Path(__file__).parent / 'tes_instance_locations.json'
BATCH_RUNS_FILE = os.path.join(UPLOAD_FOLDER, 'batch_runs.json')
