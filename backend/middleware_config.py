"""
Middleware Configuration and Factory

This module provides configuration management and factory methods
for creating and managing middleware instances.
"""

import json
import yaml
from typing import Dict, Any, List, Optional, Type
from pathlib import Path

from middleware_manager import (
    BaseMiddleware, MiddlewareConfig, MiddlewareType, MiddlewareManager
)
from middleware_implementations import (
    AuthenticationMiddleware,
    AuthorizationMiddleware,
    RateLimitingMiddleware,
    LoggingMiddleware,
    ValidationMiddleware,
    CachingMiddleware,
    MonitoringMiddleware
)

class MiddlewareFactory:
    """Factory for creating middleware instances"""
    
    MIDDLEWARE_CLASSES = {
        MiddlewareType.AUTHENTICATION: AuthenticationMiddleware,
        MiddlewareType.AUTHORIZATION: AuthorizationMiddleware,
        MiddlewareType.RATE_LIMITING: RateLimitingMiddleware,
        MiddlewareType.LOGGING: LoggingMiddleware,
        MiddlewareType.VALIDATION: ValidationMiddleware,
        MiddlewareType.CACHING: CachingMiddleware,
        MiddlewareType.MONITORING: MonitoringMiddleware,
    }
    
    @classmethod
    def create_middleware(cls, config: MiddlewareConfig) -> BaseMiddleware:
        """Create a middleware instance from configuration"""
        middleware_class = cls.MIDDLEWARE_CLASSES.get(config.type)
        if not middleware_class:
            raise ValueError(f"Unknown middleware type: {config.type}")
        
        return middleware_class(config)
    
    @classmethod
    def create_from_dict(cls, config_dict: Dict[str, Any]) -> BaseMiddleware:
        """Create middleware from dictionary configuration"""
        config = MiddlewareConfig(
            name=config_dict['name'],
            type=MiddlewareType(config_dict['type']),
            enabled=config_dict.get('enabled', True),
            priority=config_dict.get('priority', 100),
            config=config_dict.get('config', {}),
            metadata=config_dict.get('metadata', {})
        )
        return cls.create_middleware(config)

class MiddlewareConfigManager:
    """Manages middleware configurations"""
    
    def __init__(self, config_file: str = None):
        self.config_file = config_file
        self.default_configs = self._get_default_configurations()
    
    def _get_default_configurations(self) -> List[Dict[str, Any]]:
        """Get default middleware configurations"""
        return [
            {
                'name': 'authentication',
                'type': 'authentication',
                'enabled': True,
                'priority': 10,
                'config': {
                    'require_auth': False,  
                    'valid_tokens': {
                        'test_token_123': {
                            'user_id': 'test_user',
                            'roles': ['user', 'tester'],
                            'permissions': ['read', 'write', 'test']
                        },
                        'admin_token_456': {
                            'user_id': 'admin_user',
                            'roles': ['admin'],
                            'permissions': ['read', 'write', 'admin', 'test']
                        },
                        'readonly_token_789': {
                            'user_id': 'readonly_user',
                            'roles': ['readonly'],
                            'permissions': ['read']
                        }
                    }
                }
            },
            {
                'name': 'authorization',
                'type': 'authorization',
                'enabled': True,
                'priority': 20,
                'config': {
                    'role_permissions': {
                        'admin': ['read', 'write', 'admin', 'test', 'delete'],
                        'user': ['read', 'write', 'test'],
                        'tester': ['read', 'write', 'test'],
                        'readonly': ['read']
                    },
                    'endpoint_permissions': {
                        'POST:/api/tasks': ['write'],
                        'DELETE:/api/tasks': ['delete'],
                        'POST:/api/workflows': ['write'],
                        'GET:/api/admin': ['admin'],
                        'POST:/api/middleware/config': ['admin']
                    }
                }
            },
            {
                'name': 'rate_limiting',
                'type': 'rate_limiting',
                'enabled': True,
                'priority': 30,
                'config': {
                    'global_limit': 1000,
                    'window_size_minutes': 60,
                    'rate_limits': {
                        'test_user': 500,
                        'admin_user': 2000,
                        'readonly_user': 100
                    }
                }
            },
            {
                'name': 'validation',
                'type': 'validation',
                'enabled': True,
                'priority': 40,
                'config': {
                    'strict_mode': False,
                    'validation_rules': {
                        'POST:/api/tasks': {
                            'required_fields': ['tes_url'],
                            'field_types': {
                                'tes_url': 'string',
                                'task_name': 'string'
                            },
                            'required_headers': ['content-type']
                        },
                        'POST:/api/workflows': {
                            'required_fields': ['workflow_type', 'tes_name'],
                            'field_types': {
                                'workflow_type': 'string',
                                'tes_name': 'string'
                            }
                        }
                    }
                }
            },
            {
                'name': 'logging',
                'type': 'logging',
                'enabled': True,
                'priority': 50,
                'config': {
                    'log_level': 'INFO',
                    'log_requests': True,
                    'log_responses': True,
                    'log_sensitive_data': False
                }
            },
            {
                'name': 'caching',
                'type': 'caching',
                'enabled': True,
                'priority': 60,
                'config': {
                    'cache_ttl_seconds': 300,
                    'cacheable_methods': ['GET'],
                    'cache_patterns': [
                        r'/api/instances',
                        r'/api/service_info',
                        r'/api/tes_locations'
                    ]
                }
            },
            {
                'name': 'monitoring',
                'type': 'monitoring',
                'enabled': True,
                'priority': 70,
                'config': {
                    'collect_detailed_metrics': True
                }
            }
        ]
    
    def load_config(self) -> List[Dict[str, Any]]:
        """Load middleware configuration"""
        if self.config_file and Path(self.config_file).exists():
            return self._load_from_file()
        else:
            return self.default_configs
    
    def _load_from_file(self) -> List[Dict[str, Any]]:
        """Load configuration from file"""
        with open(self.config_file, 'r') as f:
            if self.config_file.endswith('.yaml') or self.config_file.endswith('.yml'):
                return yaml.safe_load(f)
            else:
                return json.load(f)
    
    def save_config(self, configs: List[Dict[str, Any]]):
        """Save configuration to file"""
        if not self.config_file:
            return
        
        with open(self.config_file, 'w') as f:
            if self.config_file.endswith('.yaml') or self.config_file.endswith('.yml'):
                yaml.dump(configs, f, default_flow_style=False)
            else:
                json.dump(configs, f, indent=2)
    
    def get_config_template(self) -> Dict[str, Any]:
        """Get a template for creating new middleware configurations"""
        return {
            'name': 'new_middleware',
            'type': 'logging',  # Default type
            'enabled': True,
            'priority': 100,
            'config': {},
            'metadata': {
                'description': 'New middleware configuration',
                'created_at': 'auto-generated'
            }
        }

def setup_default_middleware(manager: MiddlewareManager, config_file: str = None) -> MiddlewareManager:
    """Set up default middleware configuration"""
    config_manager = MiddlewareConfigManager(config_file)
    configs = config_manager.load_config()
    
    for config_dict in configs:
        try:
            middleware = MiddlewareFactory.create_from_dict(config_dict)
            manager.register_middleware(middleware)
            print(f"✅ Registered middleware: {middleware.name}")
        except Exception as e:
            print(f"❌ Failed to register middleware {config_dict.get('name', 'unknown')}: {str(e)}")
    
    return manager
 
def get_test_configurations() -> List[Dict[str, Any]]:
    """Get test-friendly middleware configurations"""
    configs = MiddlewareConfigManager().default_configs.copy()
     
    for config in configs:
        if config['name'] == 'authentication':
            config['config']['require_auth'] = False 
        elif config['name'] == 'rate_limiting':
            config['config']['global_limit'] = 10000 
            config['config']['window_size_minutes'] = 1 
        elif config['name'] == 'validation':
            config['config']['strict_mode'] = False 
    
    return configs

def create_test_manager() -> MiddlewareManager:
    """Create a middleware manager with test configurations"""
    manager = MiddlewareManager()
    configs = get_test_configurations()
    
    for config_dict in configs:
        middleware = MiddlewareFactory.create_from_dict(config_dict)
        manager.register_middleware(middleware)
    
    return manager
