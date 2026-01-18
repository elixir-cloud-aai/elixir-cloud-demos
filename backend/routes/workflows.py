from flask import Blueprint, jsonify, request
from datetime import datetime
import uuid
import os
from services.workflow_service import get_workflow_runs, add_workflow_run
from utils.tes_utils import load_tes_instances
from config import UPLOAD_FOLDER

workflows_bp = Blueprint('workflows', __name__)

current_workflow_step = 0
latest_workflow_path = []

@workflows_bp.route('/api/workflows', methods=['GET'])
def get_workflows():
    return jsonify(get_workflow_runs())

@workflows_bp.route('/api/submit_workflow', methods=['POST'])
def submit_workflow():
    try:
        workflow_type = request.form.get('wf_type', 'cwl')
        tes_instance = request.form.get('wf_tes_instance')
        
        run_id = str(uuid.uuid4())
        
        tes_name = 'Unknown'
        tes_instances = load_tes_instances()
        for inst in tes_instances:
            if inst['url'] == tes_instance:
                tes_name = inst['name']
                break
        
        uploaded_files = []
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename:
                filename = f"{run_id}_{file.filename}"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                uploaded_files.append({'key': file_key, 'filename': filename, 'path': filepath})
        
        workflow_run = {
            'run_id': run_id,
            'type': workflow_type,
            'tes_url': tes_instance,
            'tes_name': tes_name,
            'status': 'RUNNING',
            'submitted_at': datetime.utcnow().isoformat(),
            'files': uploaded_files
        }
        
        add_workflow_run(workflow_run)
        
        global current_workflow_step, latest_workflow_path
        current_workflow_step = 2
        latest_workflow_path = [tes_name] if tes_name != 'Unknown' else []
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'message': f'{workflow_type.upper()} workflow submitted successfully to {tes_name}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@workflows_bp.route('/api/latest_workflow_status', methods=['GET'])
def latest_workflow_status():
    global current_workflow_step, latest_workflow_path
    return jsonify({
        'currentStep': current_workflow_step,
        'latestPath': latest_workflow_path
    })
