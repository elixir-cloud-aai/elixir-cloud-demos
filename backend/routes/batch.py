from flask import Blueprint, jsonify, request
from datetime import datetime
import uuid
import os
from services.batch_service import get_batch_runs, add_batch_run
from utils.tes_utils import load_tes_instances
from config import UPLOAD_FOLDER, TES_GATEWAY
import routes.workflows as workflows_module

batch_bp = Blueprint('batch', __name__)

@batch_bp.route('/api/batch_runs', methods=['GET'])
def get_batch_runs_route():
    return jsonify(get_batch_runs())

def _create_batch_run(run_id, workflow_type, batch_mode, uploaded_files):
    tes_instances = load_tes_instances()
    
    if batch_mode == 'all':
        for inst in tes_instances:
            batch_run = {
                'run_id': f"{run_id}_{inst['name']}",
                'mode': 'batch',
                'workflow_type': workflow_type,
                'tes_url': inst['url'],
                'tes_name': inst['name'],
                'status': 'RUNNING',
                'submitted_at': datetime.utcnow().isoformat(),
                'files': uploaded_files
            }
            add_batch_run(batch_run)
        return [inst['name'] for inst in tes_instances]
    else:
        batch_run = {
            'run_id': run_id,
            'mode': 'federated',
            'workflow_type': workflow_type,
            'tes_url': TES_GATEWAY,
            'tes_name': 'TES Gateway',
            'status': 'RUNNING',
            'submitted_at': datetime.utcnow().isoformat(),
            'files': uploaded_files
        }
        add_batch_run(batch_run)
        return ['TES Gateway']

@batch_bp.route('/api/batch_snakemake', methods=['POST'])
def batch_snakemake():
    try:
        batch_mode = request.form.get('batch_mode', 'all')
        run_id = str(uuid.uuid4())
        
        uploaded_files = []
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename:
                filename = f"batch_{run_id}_{file.filename}"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                uploaded_files.append({'key': file_key, 'filename': filename, 'path': filepath})
        
        path_list = _create_batch_run(run_id, 'snakemake', batch_mode, uploaded_files)
        
        import routes.workflows as workflows_module
        workflows_module.current_workflow_step = 3
        workflows_module.latest_workflow_path = path_list
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'Batch Snakemake workflow submitted in {batch_mode} mode'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@batch_bp.route('/api/batch_nextflow', methods=['POST'])
def batch_nextflow():
    try:
        batch_mode = request.form.get('batch_mode', 'all')
        run_id = str(uuid.uuid4())
        
        uploaded_files = []
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename:
                filename = f"batch_{run_id}_{file.filename}"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                uploaded_files.append({'key': file_key, 'filename': filename, 'path': filepath})
        
        path_list = _create_batch_run(run_id, 'nextflow', batch_mode, uploaded_files)
        
        import routes.workflows as workflows_module
        workflows_module.current_workflow_step = 4
        workflows_module.latest_workflow_path = path_list
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'Batch Nextflow workflow submitted in {batch_mode} mode'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@batch_bp.route('/api/batch_cwl', methods=['POST'])
def batch_cwl():
    try:
        batch_mode = request.form.get('batch_mode', 'all')
        run_id = str(uuid.uuid4())
        
        uploaded_files = []
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename:
                filename = f"batch_{run_id}_{file.filename}"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                uploaded_files.append({'key': file_key, 'filename': filename, 'path': filepath})
        
        path_list = _create_batch_run(run_id, 'cwl', batch_mode, uploaded_files)
        
        import routes.workflows as workflows_module
        workflows_module.current_workflow_step = 5
        workflows_module.latest_workflow_path = path_list
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'Batch CWL workflow submitted in {batch_mode} mode'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
