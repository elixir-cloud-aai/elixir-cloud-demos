import os
from flask import Flask, g, request
from flask_cors import CORS
from config import CORS_ORIGINS, SECRET_KEY, UPLOAD_FOLDER
from services.task_service import start_task_status_updater

try:
    from middleware_manager import MiddlewareManager, MiddlewareContext
    from middleware_config import create_test_manager
    from middleware.middleware_api import middleware_bp
    MIDDLEWARE_AVAILABLE = True
except Exception as e:
    print(f"⚠️ Middleware system not available: {e}")
    MIDDLEWARE_AVAILABLE = False

# Create Flask app
app = Flask(__name__)

# Configure CORS - MUST be done before any routes or blueprints are registered
CORS(app,
     origins=CORS_ORIGINS,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     expose_headers=['Content-Type', 'X-Cache', 'X-Middleware-Processed'])

# App configuration
app.secret_key = SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SESSION_TYPE'] = 'filesystem'

# Initialize middleware
middleware_manager = None
if MIDDLEWARE_AVAILABLE:
    try:
        middleware_manager = create_test_manager()
        print("✅ Middleware system initialized successfully")
        print(f"📊 Registered {len(middleware_manager.middlewares)} middleware components")
        app.config['middleware_manager'] = middleware_manager
        app.config['MIDDLEWARE_AVAILABLE'] = True
        app.register_blueprint(middleware_bp)
        print("✅ Registered middleware API blueprint at /api/middleware")
    except Exception as e:
        print(f"❌ Failed to initialize middleware system: {e}")
        import traceback
        traceback.print_exc()
        MIDDLEWARE_AVAILABLE = False
        app.config['MIDDLEWARE_AVAILABLE'] = False
else:
    print("⚠️ Running without middleware system")
    app.config['MIDDLEWARE_AVAILABLE'] = False

# Register blueprints
from routes.health import health_bp
from routes.instances import instances_bp
from routes.tasks import tasks_bp
from routes.workflows import workflows_bp
from routes.batch import batch_bp
from routes.dashboard import dashboard_bp
from routes.network import network_bp
from routes.logs import logs_bp
from routes.nodes import nodes_bp

app.register_blueprint(health_bp)
app.register_blueprint(instances_bp)
app.register_blueprint(tasks_bp)
app.register_blueprint(workflows_bp)
app.register_blueprint(batch_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(network_bp)
app.register_blueprint(logs_bp)
app.register_blueprint(nodes_bp)

# Middleware request/response handlers
if MIDDLEWARE_AVAILABLE and middleware_manager:
    def create_middleware_context():
        """Create middleware context from current request"""
        if not MIDDLEWARE_AVAILABLE:
            return None
        
        request_data = {
            'endpoint': request.endpoint or request.path,
            'method': request.method,
            'headers': dict(request.headers),
            'query_params': dict(request.args),
            'client_ip': request.remote_addr,
            'body': {}
        }
        
        if request.is_json:
            try:
                request_data['body'] = request.get_json() or {}
            except:
                request_data['body'] = {}
        elif request.form:
            request_data['body'] = dict(request.form)
        
        return MiddlewareContext(request_data)

    def run_async_middleware(coro):
        """Run async middleware in sync context"""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, coro)
                    return future.result()
            else:
                return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)

    @app.before_request
    def before_request():
        """Process request through middleware chain"""
        # Skip middleware routes to avoid recursion
        if request.path.startswith('/api/middleware'):
            return None
        
        if not MIDDLEWARE_AVAILABLE or not middleware_manager:
            return None
        
        context = create_middleware_context()
        if not context:
            return None
        
        try:
            results = run_async_middleware(middleware_manager.execute_chain(context))
            g.middleware_context = context
            g.middleware_results = results
            
            # Check for blocking middleware
            for result in results:
                if result.status.value in ['failed'] and result.middleware_name in ['authentication', 'authorization']:
                    from flask import jsonify
                    from datetime import datetime
                    error_response = jsonify({
                        'error': 'Middleware blocked request',
                        'middleware': result.middleware_name,
                        'message': result.message,
                        'timestamp': datetime.now().isoformat()
                    })
                    error_response.status_code = 401 if result.middleware_name == 'authentication' else 403
                    return error_response
            
            # Check for cached response
            if hasattr(context, 'cached_response') and context.cached_response:
                from flask import jsonify
                cached_response = jsonify(context.cached_response)
                cached_response.headers['X-Cache'] = 'HIT'
                return cached_response
        except Exception as e:
            print(f"❌ Middleware processing error: {e}")
            import traceback
            traceback.print_exc()

    @app.after_request
    def after_request(response):
        """Process response through middleware"""
        if not MIDDLEWARE_AVAILABLE or not hasattr(g, 'middleware_context'):
            return response
        
        try:
            context = g.middleware_context
            
            # Cache response if needed
            if hasattr(context, 'should_cache') and context.should_cache and hasattr(context, 'cache_key'):
                for middleware in middleware_manager.middlewares.values():
                    if hasattr(middleware, 'cache_response'):
                        middleware.cache_response(context.cache_key, response.get_json())
                        break
            
            # Record metrics
            status_code = response.status_code
            for middleware in middleware_manager.middlewares.values():
                if hasattr(middleware, 'record_response_metrics'):
                    middleware.record_response_metrics(context.__dict__, status_code)
            
            # Add middleware headers
            response.headers['X-Middleware-Processed'] = 'true'
            response.headers['X-Middleware-Count'] = str(len(g.middleware_results))
            
            total_time = context.get_execution_time()
            response.headers['X-Middleware-Time'] = f"{total_time:.2f}ms"
        except Exception as e:
            print(f"❌ Middleware response processing error: {e}")
            import traceback
            traceback.print_exc()
        
        return response

if __name__ == '__main__':
    from datetime import datetime
    
    port = int(os.getenv('PORT', '8000'))
    debug_mode = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    
    # Start task status updater
    start_task_status_updater()
    
    print("\n" + "="*60)
    print("🚀 TES Dashboard Backend Server")
    print("="*60)
    print(f"📍 Server URL: http://localhost:{port}")
    print(f"🌐 CORS enabled for: {', '.join(CORS_ORIGINS)}")
    print(f"🔧 Environment: {'development' if debug_mode else 'production'}")
    print(f"🔒 Middleware: {'enabled ✅' if MIDDLEWARE_AVAILABLE else 'disabled ⚠️'}")
    print(f"⏱️  Task auto-update: enabled (every 30s)")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug_mode,
        use_reloader=False
    )