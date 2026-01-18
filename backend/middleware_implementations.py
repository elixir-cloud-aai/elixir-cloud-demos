"""
Middleware Implementations

This module contains concrete implementations of various middleware types
for the TES Gateway system.
"""

import time
import hashlib
import json
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import asyncio
from collections import defaultdict

from middleware_manager import (
    BaseMiddleware, MiddlewareConfig, MiddlewareResult, MiddlewareStatus, 
    MiddlewareType, logger
)

class AuthenticationMiddleware(BaseMiddleware):
    """Handles user authentication"""
    
    def __init__(self, config: MiddlewareConfig):
        super().__init__(config)
        self.valid_tokens = self.config.config.get('valid_tokens', {})
        self.require_auth = self.config.config.get('require_auth', True)
    
    async def execute(self, context: Dict[str, Any]) -> MiddlewareResult:
        try:
            request_data = context.get('request_data', {})
            headers = request_data.get('headers', {})
             
            auth_header = headers.get('authorization', '')
            token = None
            
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
            elif 'x-api-key' in headers:
                token = headers['x-api-key']
            
            if not self.require_auth:
                context['user_info'] = {'authenticated': False, 'user_id': 'anonymous'}
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.SUCCESS,
                    execution_time_ms=0,
                    message="Authentication not required"
                )
            
            if not token:
                context['user_info'] = {'authenticated': False, 'error': 'No token provided'}
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.FAILED,
                    execution_time_ms=0,
                    message="No authentication token provided"
                )
             
            user_info = self.valid_tokens.get(token)
            if user_info:
                context['user_info'] = {
                    'authenticated': True,
                    'token': token,
                    'user_id': user_info.get('user_id'),
                    'roles': user_info.get('roles', []),
                    'permissions': user_info.get('permissions', [])
                }
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.SUCCESS,
                    execution_time_ms=0,
                    message=f"User {user_info.get('user_id')} authenticated successfully",
                    data={'user_id': user_info.get('user_id')}
                )
            else:
                context['user_info'] = {'authenticated': False, 'error': 'Invalid token'}
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.FAILED,
                    execution_time_ms=0,
                    message="Invalid authentication token"
                )
                
        except Exception as e:
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.ERROR,
                execution_time_ms=0,
                message=f"Authentication error: {str(e)}"
            )

class AuthorizationMiddleware(BaseMiddleware):
    """Handles user authorization and permissions"""
    
    def __init__(self, config: MiddlewareConfig):
        super().__init__(config)
        self.role_permissions = self.config.config.get('role_permissions', {})
        self.endpoint_permissions = self.config.config.get('endpoint_permissions', {})
    
    async def execute(self, context: Dict[str, Any]) -> MiddlewareResult:
        try:
            user_info = context.get('user_info', {})
            request_data = context.get('request_data', {})
            
            if not user_info.get('authenticated', False):
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.SKIPPED,
                    execution_time_ms=0,
                    message="User not authenticated, skipping authorization"
                )
            
            endpoint = request_data.get('endpoint', '')
            method = request_data.get('method', 'GET')
            user_roles = user_info.get('roles', [])
            user_permissions = user_info.get('permissions', [])
             
            endpoint_key = f"{method}:{endpoint}"
            required_permissions = self.endpoint_permissions.get(endpoint_key, [])
            
            if not required_permissions: 
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.SUCCESS,
                    execution_time_ms=0,
                    message="No specific permissions required for this endpoint"
                )
             
            effective_permissions = set(user_permissions)
            for role in user_roles:
                role_perms = self.role_permissions.get(role, [])
                effective_permissions.update(role_perms)
            
            missing_permissions = set(required_permissions) - effective_permissions
            
            if missing_permissions:
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.FAILED,
                    execution_time_ms=0,
                    message=f"Insufficient permissions. Missing: {list(missing_permissions)}"
                )
            
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.SUCCESS,
                execution_time_ms=0,
                message="Authorization successful",
                data={'effective_permissions': list(effective_permissions)}
            )
            
        except Exception as e:
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.ERROR,
                execution_time_ms=0,
                message=f"Authorization error: {str(e)}"
            )

class RateLimitingMiddleware(BaseMiddleware):
    """Implements rate limiting based on various criteria"""
    
    def __init__(self, config: MiddlewareConfig):
        super().__init__(config)
        self.rate_limits = self.config.config.get('rate_limits', {})
        self.request_counts = defaultdict(lambda: defaultdict(list))
        self.global_limit = self.config.config.get('global_limit', 1000)
        self.window_size = self.config.config.get('window_size_minutes', 60)
    
    async def execute(self, context: Dict[str, Any]) -> MiddlewareResult:
        try:
            user_info = context.get('user_info', {})
            request_data = context.get('request_data', {})
            
            current_time = datetime.now()
            window_start = current_time - timedelta(minutes=self.window_size)
             
            user_id = user_info.get('user_id', 'anonymous')
            client_ip = request_data.get('client_ip', 'unknown')
            
            rate_limit_key = user_id if user_id != 'anonymous' else client_ip
             
            self._clean_old_entries(window_start)
             
            current_requests = len(self.request_counts[rate_limit_key]['requests'])
             
            user_limit = self.rate_limits.get(user_id, self.global_limit)
            
            if current_requests >= user_limit:
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.FAILED,
                    execution_time_ms=0,
                    message=f"Rate limit exceeded: {current_requests}/{user_limit} requests in {self.window_size} minutes"
                )
             
            self.request_counts[rate_limit_key]['requests'].append(current_time)
            
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.SUCCESS,
                execution_time_ms=0,
                message=f"Rate limit check passed: {current_requests + 1}/{user_limit}",
                data={'requests_remaining': user_limit - current_requests - 1}
            )
            
        except Exception as e:
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.ERROR,
                execution_time_ms=0,
                message=f"Rate limiting error: {str(e)}"
            )
    
    def _clean_old_entries(self, cutoff_time: datetime):
        """Remove entries older than the window"""
        for key in self.request_counts:
            self.request_counts[key]['requests'] = [
                req_time for req_time in self.request_counts[key]['requests']
                if req_time > cutoff_time
            ]

class LoggingMiddleware(BaseMiddleware):
    """Logs request and response information"""
    
    def __init__(self, config: MiddlewareConfig):
        super().__init__(config)
        self.log_level = self.config.config.get('log_level', 'INFO')
        self.log_requests = self.config.config.get('log_requests', True)
        self.log_responses = self.config.config.get('log_responses', True)
        self.log_sensitive_data = self.config.config.get('log_sensitive_data', False)
    
    async def execute(self, context: Dict[str, Any]) -> MiddlewareResult:
        try:
            request_data = context.get('request_data', {})
            user_info = context.get('user_info', {})
            
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'user_id': user_info.get('user_id', 'anonymous'),
                'endpoint': request_data.get('endpoint', ''),
                'method': request_data.get('method', 'GET'),
                'client_ip': request_data.get('client_ip', 'unknown')
            }
            
            if self.log_requests:
                if self.log_sensitive_data:
                    log_entry['request_headers'] = request_data.get('headers', {})
                    log_entry['request_body'] = request_data.get('body', {})
                else: 
                    safe_headers = {
                        k: v for k, v in request_data.get('headers', {}).items()
                        if k.lower() not in ['authorization', 'x-api-key', 'cookie']
                    }
                    log_entry['request_headers'] = safe_headers
             
            context['log_entry'] = log_entry 
            self.logger.info(f"Request logged: {json.dumps(log_entry, indent=2)}")
            
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.SUCCESS,
                execution_time_ms=0,
                message="Request logged successfully",
                data={'log_entry_id': hashlib.md5(str(log_entry).encode()).hexdigest()[:8]}
            )
            
        except Exception as e:
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.ERROR,
                execution_time_ms=0,
                message=f"Logging error: {str(e)}"
            )

class ValidationMiddleware(BaseMiddleware):
    """Validates request data against schemas"""
    
    def __init__(self, config: MiddlewareConfig):
        super().__init__(config)
        self.validation_rules = self.config.config.get('validation_rules', {})
        self.strict_mode = self.config.config.get('strict_mode', False)
    
    async def execute(self, context: Dict[str, Any]) -> MiddlewareResult:
        try:
            request_data = context.get('request_data', {})
            endpoint = request_data.get('endpoint', '')
            method = request_data.get('method', 'GET')
            
            validation_key = f"{method}:{endpoint}"
            rules = self.validation_rules.get(validation_key, {})
            
            if not rules:
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.SKIPPED,
                    execution_time_ms=0,
                    message="No validation rules defined for this endpoint"
                )
            
            errors = []
            body = request_data.get('body', {})
            headers = request_data.get('headers', {})
             
            required_fields = rules.get('required_fields', [])
            for field in required_fields:
                if field not in body:
                    errors.append(f"Required field '{field}' is missing")
             
            field_types = rules.get('field_types', {})
            for field, expected_type in field_types.items():
                if field in body:
                    actual_value = body[field]
                    if expected_type == 'string' and not isinstance(actual_value, str):
                        errors.append(f"Field '{field}' must be a string")
                    elif expected_type == 'integer' and not isinstance(actual_value, int):
                        errors.append(f"Field '{field}' must be an integer")
                    elif expected_type == 'array' and not isinstance(actual_value, list):
                        errors.append(f"Field '{field}' must be an array")
             
            field_patterns = rules.get('field_patterns', {})
            for field, pattern in field_patterns.items():
                if field in body and isinstance(body[field], str):
                    if not re.match(pattern, body[field]):
                        errors.append(f"Field '{field}' does not match required pattern")
             
            required_headers = rules.get('required_headers', [])
            for header in required_headers:
                if header.lower() not in {k.lower(): k for k in headers.keys()}:
                    errors.append(f"Required header '{header}' is missing")
            
            if errors:
                status = MiddlewareStatus.FAILED if self.strict_mode else MiddlewareStatus.SUCCESS
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=status,
                    execution_time_ms=0,
                    message=f"Validation {'failed' if self.strict_mode else 'warnings'}: {'; '.join(errors)}",
                    data={'validation_errors': errors}
                )
            
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.SUCCESS,
                execution_time_ms=0,
                message="Validation passed",
                data={'validated_fields': len(body)}
            )
            
        except Exception as e:
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.ERROR,
                execution_time_ms=0,
                message=f"Validation error: {str(e)}"
            )

class CachingMiddleware(BaseMiddleware):
    """Implements response caching"""
    
    def __init__(self, config: MiddlewareConfig):
        super().__init__(config)
        self.cache = {}
        self.cache_ttl = self.config.config.get('cache_ttl_seconds', 300)
        self.cacheable_methods = self.config.config.get('cacheable_methods', ['GET'])
        self.cache_patterns = self.config.config.get('cache_patterns', [])
    
    async def execute(self, context: Dict[str, Any]) -> MiddlewareResult:
        try:
            request_data = context.get('request_data', {})
            method = request_data.get('method', 'GET')
            endpoint = request_data.get('endpoint', '')
            
            if method not in self.cacheable_methods:
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.SKIPPED,
                    execution_time_ms=0,
                    message=f"Method {method} is not cacheable"
                )
             
            should_cache = any(re.match(pattern, endpoint) for pattern in self.cache_patterns)
            if not should_cache and self.cache_patterns:
                return MiddlewareResult(
                    middleware_name=self.name,
                    status=MiddlewareStatus.SKIPPED,
                    execution_time_ms=0,
                    message="Endpoint does not match cache patterns"
                )
             
            cache_key = self._generate_cache_key(request_data)
             
            if cache_key in self.cache:
                cached_entry = self.cache[cache_key]
                if time.time() - cached_entry['timestamp'] < self.cache_ttl:
                    context['cached_response'] = cached_entry['response']
                    return MiddlewareResult(
                        middleware_name=self.name,
                        status=MiddlewareStatus.SUCCESS,
                        execution_time_ms=0,
                        message="Cache hit - returning cached response",
                        data={'cache_key': cache_key, 'cached': True}
                    )
                else: 
                    del self.cache[cache_key]
             
            context['cache_key'] = cache_key
            context['should_cache'] = True
            
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.SUCCESS,
                execution_time_ms=0,
                message="Cache miss - will cache response",
                data={'cache_key': cache_key, 'cached': False}
            )
            
        except Exception as e:
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.ERROR,
                execution_time_ms=0,
                message=f"Caching error: {str(e)}"
            )
    
    def _generate_cache_key(self, request_data: Dict[str, Any]) -> str:
        """Generate a cache key from request data"""
        key_parts = [
            request_data.get('method', 'GET'),
            request_data.get('endpoint', ''),
            str(sorted(request_data.get('query_params', {}).items()))
        ]
        return hashlib.md5('|'.join(key_parts).encode()).hexdigest()
    
    def cache_response(self, cache_key: str, response_data: Any):
        """Cache a response"""
        self.cache[cache_key] = {
            'response': response_data,
            'timestamp': time.time()
        }

class MonitoringMiddleware(BaseMiddleware):
    """Collects metrics and monitoring data"""
    
    def __init__(self, config: MiddlewareConfig):
        super().__init__(config)
        self.metrics = defaultdict(lambda: defaultdict(int))
        self.response_times = defaultdict(list)
        self.error_rates = defaultdict(int)
        self.collect_detailed_metrics = self.config.config.get('collect_detailed_metrics', True)
    
    async def execute(self, context: Dict[str, Any]) -> MiddlewareResult:
        try:
            request_data = context.get('request_data', {})
            user_info = context.get('user_info', {})
            
            endpoint = request_data.get('endpoint', '')
            method = request_data.get('method', 'GET')
            user_id = user_info.get('user_id', 'anonymous')
             
            metric_key = f"{method}:{endpoint}"
            self.metrics[metric_key]['total_requests'] += 1
            self.metrics[metric_key]['requests_by_user'][user_id] += 1
             
            context['monitoring_start_time'] = time.time()
            context['monitoring_endpoint'] = metric_key
            
            if self.collect_detailed_metrics:
                context['collect_response_metrics'] = True
            
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.SUCCESS,
                execution_time_ms=0,
                message="Monitoring initialized",
                data={
                    'endpoint': metric_key,
                    'user_id': user_id,
                    'request_count': self.metrics[metric_key]['total_requests']
                }
            )
            
        except Exception as e:
            return MiddlewareResult(
                middleware_name=self.name,
                status=MiddlewareStatus.ERROR,
                execution_time_ms=0,
                message=f"Monitoring error: {str(e)}"
            )
    
    def record_response_metrics(self, context: Dict[str, Any], status_code: int):
        """Record response metrics after request completion"""
        if 'monitoring_start_time' in context:
            response_time = (time.time() - context['monitoring_start_time']) * 1000
            endpoint = context.get('monitoring_endpoint', 'unknown')
            
            self.response_times[endpoint].append(response_time)
            self.metrics[endpoint][f'status_{status_code}'] += 1
            
            if status_code >= 400:
                self.error_rates[endpoint] += 1
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of collected metrics"""
        summary = {}
        for endpoint, metrics in self.metrics.items():
            total_requests = metrics['total_requests']
            error_count = self.error_rates[endpoint]
            response_times = self.response_times[endpoint]
            
            summary[endpoint] = {
                'total_requests': total_requests,
                'error_rate': (error_count / total_requests * 100) if total_requests > 0 else 0,
                'avg_response_time': sum(response_times) / len(response_times) if response_times else 0,
                'status_codes': {k: v for k, v in metrics.items() if k.startswith('status_')},
                'unique_users': len(metrics.get('requests_by_user', {}))
            }
        
        return summary
