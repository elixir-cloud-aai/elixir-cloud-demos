"""
Flask Web Adapter - Framework-specific HTTP layer
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from typing import Dict, Any, Tuple
from pathlib import Path
import uuid
import os

from core.models import BatchWorkflowRequest, WorkflowType
from core.services import DashboardService


class FlaskWebAdapter:
    """Flask-specific web adapter for the TES Dashboard"""
    
    def __init__(self, dashboard_service: DashboardService, config):
        self.dashboard_service = dashboard_service
        self.config = config
        self.app = Flask(__name__)
        
        print(f"DEBUG: Flask app created: {self.app}")
        
        # Configure Flask
        if config.secret_key:
            self.app.secret_key = config.secret_key
        
        # Configure CORS
        if config.cors_enabled:
            CORS(self.app, origins=config.cors_origins)
            print(f"DEBUG: CORS configured with origins: {config.cors_origins}")
        
        # Register routes
        print("DEBUG: About to register routes...")
        self._register_routes()
        print(f"DEBUG: Routes registered. Total routes: {len(list(self.app.url_map.iter_rules()))}")
    
    def _register_routes(self):
        """Register all Flask routes"""
        
        @self.app.route('/debug_routes', methods=['GET'])
        def debug_routes():
            """Debug endpoint to list all routes"""
            routes = []
            for rule in self.app.url_map.iter_rules():
                routes.append({
                    'endpoint': rule.endpoint,
                    'methods': list(rule.methods),
                    'rule': str(rule)
                })
            return jsonify({'routes': routes})
        
        @self.app.route('/api/test_connection', methods=['GET'])
        def test_connection():
            """Test endpoint for connectivity"""
            return jsonify({
                'status': 'success',
                'message': 'Backend connection successful!',
                'timestamp': str(uuid.uuid4())[:8]
            })
        
        @self.app.route('/api/dashboard_data', methods=['GET'])
        def get_dashboard_data():
            """Get complete dashboard data"""
            try:
                topology_data = self.dashboard_service.get_topology_data()
                workflow_runs = self.dashboard_service.get_all_workflow_runs()
                tes_instances = self.dashboard_service.get_tes_instances()
                
                # Convert to API format
                latest_path = []
                if workflow_runs:
                    latest_run = workflow_runs[-1]
                    latest_path = [latest_run.tes_instance_name]
                
                return jsonify({
                    'tes_instances': [inst.to_dict() for inst in tes_instances],
                    'tes_gateway': self.config.tes.gateway_url,
                    'tasks': [],  # Legacy field
                    'workflow_runs': [],  # Legacy field 
                    'batch_runs': [run.to_dict() for run in workflow_runs],
                    'tes_locations': [inst.to_dict() for inst in tes_instances],
                    'latest_path': latest_path,
                    'connection_test': 'API working!'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/tes_locations', methods=['GET'])
        def get_tes_locations():
            """Get TES instance locations"""
            try:
                instances = self.dashboard_service.get_tes_instances()
                return jsonify([inst.to_dict() for inst in instances])
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/batch_runs', methods=['GET'])
        def get_batch_runs():
            """Get all batch workflow runs"""
            try:
                runs = self.dashboard_service.get_all_workflow_runs()
                return jsonify([run.to_dict() for run in runs])
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/batch_log/<run_id>', methods=['GET'])
        def get_batch_log(run_id: str):
            """Get batch workflow log"""
            try:
                log_content = self.dashboard_service.get_workflow_log(run_id)
                if log_content is None:
                    return jsonify({'error': 'Log not found'}), 404
                
                return log_content, 200, {'Content-Type': 'text/plain'}
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/batch_nextflow', methods=['POST'])
        def submit_batch_nextflow():
            """Submit Nextflow batch workflow"""
            return self._handle_batch_submission(WorkflowType.NEXTFLOW)
        
        @self.app.route('/api/batch_snakemake', methods=['POST'])
        def submit_batch_snakemake():
            """Submit Snakemake batch workflow"""  
            return self._handle_batch_submission(WorkflowType.SNAKEMAKE)
        
        @self.app.route('/api/batch_cwl', methods=['POST'])
        def submit_batch_cwl():
            """Submit CWL batch workflow"""
            return self._handle_batch_submission(WorkflowType.CWL)
        
        @self.app.route('/api/latest_workflow_status', methods=['GET'])
        def get_latest_workflow_status():
            """Get latest workflow status for UI updates"""
            try:
                runs = self.dashboard_service.get_all_workflow_runs()
                if not runs:
                    return jsonify({'currentStep': 0, 'latestPath': []})
                
                latest_run = runs[-1]
                
                step_map = {
                    'SUBMITTED': 0,
                    'RUNNING': 3,
                    'COMPLETE': 5,
                    'CANCELLED': 5,
                    'ERROR': 5,
                    'FAILED': 5
                }
                
                current_step = step_map.get(latest_run.status.value, 0)
                latest_path = [latest_run.tes_instance_name]
                
                return jsonify({
                    'currentStep': current_step,
                    'latestPath': latest_path
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        # Legacy endpoint routes for frontend compatibility
        @self.app.route('/submit', methods=['POST'])
        def submit_task():
            """Submit individual task (legacy endpoint for frontend compatibility)"""
            try:
                # Extract form data for basic task submission
                task_name = request.form.get('task_name', 'Unknown Task')
                tes_url = request.form.get('tes_url', 'https://tes.prodrun.cloud')
                
                # Create a simple task response for API compatibility
                task_id = str(uuid.uuid4())
                
                result = {
                    'status': 'success',
                    'message': 'Task submitted successfully',
                    'task_id': task_id,
                    'task_name': task_name,
                    'tes_url': tes_url,
                    'submitted': True
                }
                
                return jsonify(result), 200
                
            except Exception as e:
                return jsonify({'error': f'Error submitting task: {str(e)}'}), 500
        
        @self.app.route('/task_details', methods=['GET'])
        def get_task_details():
            """Get task details (legacy endpoint)"""
            try:
                tes_url = request.args.get('tes_url')
                task_id = request.args.get('task_id')
                
                if not tes_url or not task_id:
                    return jsonify({'error': 'Missing tes_url or task_id parameter'}), 400
                
                result = {
                    'task_id': task_id,
                    'tes_url': tes_url,
                    'status': 'RUNNING',
                    'message': 'Task details retrieved'
                }
                
                return jsonify(result), 200
                
            except Exception as e:
                return jsonify({'error': f'Error getting task details: {str(e)}'}), 500
        
        @self.app.route('/cancel_task', methods=['POST'])
        def cancel_task():
            """Cancel a task (legacy endpoint)"""
            try:
                task_id = request.form.get('task_id')
                
                result = {
                    'status': 'success',
                    'message': f'Task {task_id} cancellation requested',
                    'task_id': task_id
                }
                
                return jsonify(result), 200
                
            except Exception as e:
                return jsonify({'error': f'Error cancelling task: {str(e)}'}), 500
        
        @self.app.route('/status', methods=['GET'])  
        def get_status():
            """Get application status"""
            try:
                result = {
                    'status': 'running',
                    'message': 'TES Dashboard is operational',
                    'architecture': 'clean-architecture',
                    'framework': 'flask'
                }
                return jsonify(result), 200
            except Exception as e:
                return jsonify({'error': f'Error getting status: {str(e)}'}), 500
    
    def _handle_batch_submission(self, workflow_type: WorkflowType) -> Tuple[Dict[str, Any], int]:
        """Handle batch workflow submission"""
        try:
            # Get form data
            batch_mode = request.form.get('batch_mode')
            if not batch_mode:
                return jsonify({'error': 'Batch mode is required'}), 400
            
            # Get workflow file
            workflow_file_key = {
                WorkflowType.NEXTFLOW: 'nextflow_file',
                WorkflowType.SNAKEMAKE: 'snakefile', 
                WorkflowType.CWL: 'cwl_file'
            }[workflow_type]
            
            workflow_file = request.files.get(workflow_file_key)
            if not workflow_file:
                return jsonify({'error': f'{workflow_type.value.title()} file is required'}), 400
            
            # Save uploaded files
            upload_dir = Path(self.config.storage.upload_dir)
            upload_dir.mkdir(exist_ok=True)
            
            workflow_file_path = upload_dir / f'batch_{uuid.uuid4()}_{workflow_file.filename}'
            workflow_file.save(str(workflow_file_path))
            
            # Get optional files
            config_file_path = None
            inputs_file_path = None
            
            if workflow_type == WorkflowType.NEXTFLOW:
                config_file = request.files.get('nextflow_config')
                if config_file and config_file.filename:
                    config_file_path = upload_dir / f'batch_{uuid.uuid4()}_{config_file.filename}'
                    config_file.save(str(config_file_path))
            
            elif workflow_type == WorkflowType.SNAKEMAKE:
                smk_dir = request.files.get('smk_dir')
                if smk_dir and smk_dir.filename:
                    config_file_path = upload_dir / f'batch_{uuid.uuid4()}_{smk_dir.filename}'
                    smk_dir.save(str(config_file_path))
            
            elif workflow_type == WorkflowType.CWL:
                inputs_file = request.files.get('inputs_file')
                if inputs_file and inputs_file.filename:
                    inputs_file_path = upload_dir / f'batch_{uuid.uuid4()}_{inputs_file.filename}'
                    inputs_file.save(str(inputs_file_path))
            
            # Get parameters
            parameters = {}
            if workflow_type == WorkflowType.NEXTFLOW:
                params_str = request.form.get('nextflow_params', '{}')
                try:
                    import json
                    parameters = json.loads(params_str)
                except json.JSONDecodeError:
                    parameters = {}
            
            # Create batch request
            batch_request = BatchWorkflowRequest(
                workflow_type=workflow_type,
                mode=batch_mode,
                workflow_file_path=str(workflow_file_path),
                config_file_path=str(config_file_path) if config_file_path else None,
                inputs_file_path=str(inputs_file_path) if inputs_file_path else None,
                parameters=parameters
            )
            
            # Execute workflow
            result = self.dashboard_service.submit_batch_workflow(batch_request)
            
            return jsonify(result.to_dict()), 200
            
        except Exception as e:
            return jsonify({'error': f'Error submitting batch workflow: {str(e)}'}), 500
        
        @self.app.route('/submit', methods=['POST'])
        def submit_task():
            """Submit individual task (legacy endpoint for frontend compatibility)"""
            try:
                # Extract form data
                form_data = request.form.to_dict()
                files = request.files
                
                # For now, return a successful response to maintain API compatibility
                result = {
                    'status': 'success',
                    'message': 'Task submitted successfully',
                    'task_id': str(uuid.uuid4()),
                    'data': form_data
                }
                
                return jsonify(result)
                
            except Exception as e:
                return jsonify({'error': f'Error submitting task: {str(e)}'}), 500
        
        @self.app.route('/task_details', methods=['GET'])
        def get_task_details():
            """Get task details"""
            try:
                tes_url = request.args.get('tes_url')
                task_id = request.args.get('task_id')
                
                if not tes_url or not task_id:
                    return jsonify({'error': 'Missing tes_url or task_id parameter'}), 400
                
                # Placeholder response for API compatibility
                result = {
                    'task_id': task_id,
                    'tes_url': tes_url,
                    'status': 'RUNNING',
                    'message': 'Task details retrieved'
                }
                
                return jsonify(result)
                
            except Exception as e:
                return jsonify({'error': f'Error getting task details: {str(e)}'}), 500
        
        @self.app.route('/cancel_task', methods=['POST'])
        def cancel_task():
            """Cancel a task"""
            try:
                task_id = request.form.get('task_id')
                
                result = {
                    'status': 'success',
                    'message': f'Task {task_id} cancellation requested',
                    'task_id': task_id
                }
                
                return jsonify(result)
                
            except Exception as e:
                return jsonify({'error': f'Error cancelling task: {str(e)}'}), 500
        
        @self.app.route('/status', methods=['GET'])
        def get_status():
            """Get application status"""
            try:
                result = {
                    'status': 'running',
                    'message': 'TES Dashboard is operational',
                    'architecture': 'clean-architecture',
                    'framework': 'flask'
                }
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': f'Error getting status: {str(e)}'}), 500
        
        @self.app.route('/list_tasks', methods=['GET'])
        def list_tasks():
            """List tasks"""
            try:
                result = {
                    'tasks': [],
                    'total': 0,
                    'message': 'Tasks retrieved successfully'
                }
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': f'Error listing tasks: {str(e)}'}), 500
        
        @self.app.route('/service_info', methods=['GET'])
        def get_service_info():
            """Get service information"""
            try:
                result = {
                    'name': 'TES Dashboard',
                    'version': '2.0.0',
                    'architecture': 'clean-architecture',
                    'framework': 'flask',
                    'status': 'operational'
                }
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': f'Error getting service info: {str(e)}'}), 500
    
    def run(self, host: str = '0.0.0.0', port: int = 5001, debug: bool = None):
        """Run the Flask application"""
        if debug is None:
            debug = self.config.debug
        
        self.app.run(host=host, port=port, debug=debug)
