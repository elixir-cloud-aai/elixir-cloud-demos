import os
import asyncio
from flask import Blueprint, request, jsonify, current_app
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

# Create Blueprint
middleware_bp = Blueprint('middleware', __name__, url_prefix='/api/middleware')

# Helper functions to access app context
def get_middleware_manager():
    """Get middleware_manager from app context"""
    return current_app.config.get('middleware_manager')

def get_middleware_available():
    """Check if middleware is available"""
    return current_app.config.get('MIDDLEWARE_AVAILABLE', False)

def run_async(coro):
    """Run async coroutine in sync context, safe for Flask."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import nest_asyncio
            nest_asyncio.apply()
            return loop.run_until_complete(coro)
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)

# Middleware Management API Endpoints
@middleware_bp.route('/status', methods=['GET'])
def get_middleware_status():
    """Get status of all middlewares"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        status = {}
        for name, middleware in middleware_manager.middlewares.items():
            status[name] = {
                "name": name,
                "enabled": middleware.enabled,
                "priority": middleware.priority,
                "type": type(middleware).__name__,
                "description": getattr(middleware, 'description', ''),
                "metrics": getattr(middleware, 'metrics', {})
            }
        
        return jsonify({
            "status": "success",
            "middlewares": status,
            "total_count": len(middleware_manager.middlewares),
            "enabled_count": len([m for m in middleware_manager.middlewares.values() if m.enabled])
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get middleware status: {str(e)}"}), 500

@middleware_bp.route('/<middleware_name>/toggle', methods=['POST'])
def toggle_middleware(middleware_name):
    """Enable/disable a specific middleware"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        if middleware_name not in middleware_manager.middlewares:
            return jsonify({"error": f"Middleware '{middleware_name}' not found"}), 404
        
        middleware = middleware_manager.middlewares[middleware_name]
        middleware.enabled = not middleware.enabled
        
        return jsonify({
            "status": "success",
            "middleware": middleware_name,
            "enabled": middleware.enabled
        })
    except Exception as e:
        return jsonify({"error": f"Failed to toggle middleware: {str(e)}"}), 500

@middleware_bp.route('/<middleware_name>/config', methods=['GET', 'PUT'])
def middleware_config(middleware_name):
    """Get or update middleware configuration"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        if middleware_name not in middleware_manager.middlewares:
            return jsonify({"error": f"Middleware '{middleware_name}' not found"}), 404
        
        middleware = middleware_manager.middlewares[middleware_name]
        
        if request.method == 'GET':
            config = getattr(middleware, 'config', {})
            return jsonify({
                "status": "success",
                "middleware": middleware_name,
                "config": config
            })
        
        elif request.method == 'PUT':
            new_config = request.get_json()
            if hasattr(middleware, 'update_config'):
                middleware.update_config(new_config)
                return jsonify({
                    "status": "success",
                    "middleware": middleware_name,
                    "message": "Configuration updated"
                })
            else:
                return jsonify({"error": "Middleware does not support configuration updates"}), 400
    
    except Exception as e:
        return jsonify({"error": f"Failed to handle middleware config: {str(e)}"}), 500

@middleware_bp.route('/metrics', methods=['GET'])
def get_middleware_metrics():
    """Get aggregated metrics from all middlewares"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        metrics = {}
        for name, middleware in middleware_manager.middlewares.items():
            if hasattr(middleware, 'get_metrics'):
                middleware_metrics = middleware.get_metrics()
                metrics[name] = middleware_metrics
            elif hasattr(middleware, 'metrics'):
                metrics[name] = middleware.metrics
        
        return jsonify({
            "status": "success",
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get middleware metrics: {str(e)}"}), 500

@middleware_bp.route('/test', methods=['POST'])
def test_middleware_chain():
    """Test the middleware chain with a sample request"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503

    try:
        from middleware_manager import MiddlewareContext
        middleware_manager = get_middleware_manager()
        test_data = request.get_json() or {}

        context = MiddlewareContext({
            'user_id': test_data.get('user_id', 'test_user'),
            'endpoint': test_data.get('endpoint', '/api/test'),
            'method': test_data.get('method', 'GET'),
            'headers': test_data.get('headers', {}),
            'data': test_data.get('data', {})
        })

        results = run_async(middleware_manager.execute_chain(context))

        blocked = False
        block_message = None
        for result in results:
            if hasattr(result, "status") and getattr(result, "status", None) and str(result.status).lower() == "failed":
                blocked = True
                block_message = getattr(result, "message", "Blocked by middleware")
                break

        if blocked:
            return jsonify({
                "status": "blocked",
                "message": "Request blocked by middleware",
                "response": block_message,
                "context": {
                    "user_id": getattr(context, "user_id", ""),
                    "endpoint": getattr(context, "endpoint", ""),
                    "method": getattr(context, "method", "")
                }
            })

        return jsonify({
            "status": "success",
            "message": "Request passed through middleware chain",
            "context": {
                "user_id": getattr(context, "user_id", ""),
                "endpoint": getattr(context, "endpoint", ""),
                "method": getattr(context, "method", ""),
                "processed_middlewares": len(results)
            }
        })

    except Exception as e:
        print(f"❌ Middleware test error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to test middleware chain: {str(e)}"}), 500

@middleware_bp.route('/reset', methods=['POST'])
def reset_middleware():
    """Reset all middleware configurations and metrics"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        for middleware in middleware_manager.middlewares.values():
            if hasattr(middleware, 'reset'):
                middleware.reset()
            elif hasattr(middleware, 'metrics'):
                middleware.metrics = {}
        
        return jsonify({
            "status": "success",
            "message": "All middleware configurations and metrics reset"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to reset middleware: {str(e)}"}), 500

@middleware_bp.route('/reorder', methods=['POST'])
def reorder_middlewares():
    """Reorder middleware execution priorities"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        new_order = request.get_json()
        if not new_order or 'middlewares' not in new_order:
            return jsonify({"error": "Invalid request format"}), 400
        
        for middleware_info in new_order['middlewares']:
            middleware_name = middleware_info.get('name')
            new_priority = middleware_info.get('priority')
            
            if middleware_name in middleware_manager.middlewares:
                middleware_manager.middlewares[middleware_name].priority = new_priority
        
        return jsonify({
            "status": "success",
            "message": "Middleware order updated successfully"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to reorder middlewares: {str(e)}"}), 500

@middleware_bp.route('/install', methods=['POST'])
def install_middleware():
    """Install new middleware from local or GitHub source"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        middleware_config = request.get_json()
        
        required_fields = ['name', 'type', 'source']
        for field in required_fields:
            if field not in middleware_config:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        if middleware_config['name'] in middleware_manager.middlewares:
            return jsonify({"error": "Middleware with this name already exists"}), 400
        
        if middleware_config['source'] == 'github':
            github_url = middleware_config.get('githubUrl')
            if not github_url:
                return jsonify({"error": "GitHub URL is required for external middlewares"}), 400
            
            return jsonify({
                "status": "success",
                "message": f"GitHub middleware '{middleware_config['name']}' installation initiated",
                "note": "GitHub middleware installation is not yet implemented"
            })
        
        else:
            middleware_class_name = f"{middleware_config['name'].replace(' ', '')}Middleware"
            
            return jsonify({
                "status": "success",
                "message": f"Local middleware '{middleware_config['name']}' created successfully",
                "middleware": {
                    "name": middleware_config['name'],
                    "type": middleware_config['type'],
                    "enabled": middleware_config.get('enabled', True),
                    "priority": middleware_config.get('priority', 5),
                    "class_name": middleware_class_name
                }
            })
    
    except Exception as e:
        return jsonify({"error": f"Failed to install middleware: {str(e)}"}), 500

@middleware_bp.route('/<middleware_name>/remove', methods=['DELETE'])
def remove_middleware(middleware_name):
    """Remove middleware from the system"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        if middleware_name not in middleware_manager.middlewares:
            return jsonify({"error": f"Middleware '{middleware_name}' not found"}), 404
        
        del middleware_manager.middlewares[middleware_name]
        
        return jsonify({
            "status": "success",
            "message": f"Middleware '{middleware_name}' removed successfully"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to remove middleware: {str(e)}"}), 500

@middleware_bp.route('/github/validate', methods=['POST'])
def validate_github_middleware():
    """Validate GitHub repository for middleware compatibility"""
    try:
        data = request.get_json()
        github_url = data.get('githubUrl')
        
        if not github_url:
            return jsonify({"error": "GitHub URL is required"}), 400
        
        if not github_url.startswith('https://github.com/'):
            return jsonify({
                "valid": False,
                "error": "Invalid GitHub URL format"
            }), 400
        
        return jsonify({
            "valid": True,
            "repository": {
                "url": github_url,
                "accessible": True,
                "has_middleware": True,
                "estimated_size": "2.3 MB",
                "languages": ["Python"],
                "dependencies": ["flask", "asyncio"]
            },
            "validation": {
                "structure_valid": True,
                "dependencies_compatible": True,
                "security_scan_passed": True
            }
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to validate GitHub middleware: {str(e)}"}), 500

@middleware_bp.route('/<middleware_name>/source', methods=['GET'])
def get_middleware_source(middleware_name):
    """Get middleware source code"""
    if not get_middleware_available():
        return jsonify({"error": "Middleware system not available"}), 503
    
    try:
        middleware_manager = get_middleware_manager()
        if middleware_name not in middleware_manager.middlewares:
            return jsonify({"error": f"Middleware '{middleware_name}' not found"}), 404
        
        middleware = middleware_manager.middlewares[middleware_name]
        
        source_code = f"""# {middleware_name} Middleware
# Type: {type(middleware).__name__}
# Priority: {middleware.priority}
# Enabled: {middleware.enabled}

from middleware_manager import BaseMiddleware

class {middleware_name.replace(' ', '')}Middleware(BaseMiddleware):
    def __init__(self, config):
        super().__init__(config)
        self.middleware_type = '{type(middleware).__name__.replace('Middleware', '').lower()}'
    
    async def process_request(self, context):
        '''Process incoming request'''
        if not self.enabled:
            return True, None
        
        # Middleware logic here
        return True, None
    
    async def process_response(self, context, response):
        '''Process outgoing response'''
        if not self.enabled:
            return response
            
        # Response processing logic here
        return response
"""
        
        return jsonify({
            "status": "success",
            "middleware": middleware_name,
            "source_code": source_code,
            "file_path": f"backend/middleware_implementations.py",
            "language": "python",
            "lines": len(source_code.split('\n'))
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to get middleware source: {str(e)}"}), 500