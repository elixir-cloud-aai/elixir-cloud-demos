"""
TES Gateway Middleware Manager

This module provides a comprehensive middleware management system for the TES Gateway,
allowing easy testing and integration of various middleware components.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import json
import time
import logging
from datetime import datetime
import asyncio
from flask import request, jsonify, g
 
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MiddlewareType(Enum):
    """Types of middleware available in the system"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    RATE_LIMITING = "rate_limiting"
    LOGGING = "logging"
    CACHING = "caching"
    VALIDATION = "validation"
    TRANSFORMATION = "transformation"
    MONITORING = "monitoring"
    SECURITY = "security"
    LOAD_BALANCING = "load_balancing"

class MiddlewareStatus(Enum):
    """Status of middleware execution"""
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"

@dataclass
class MiddlewareConfig:
    """Configuration for a middleware instance"""
    name: str
    type: MiddlewareType
    enabled: bool = True
    priority: int = 100
    config: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class MiddlewareResult:
    """Result of middleware execution"""
    middleware_name: str
    status: MiddlewareStatus
    execution_time_ms: float
    message: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

class BaseMiddleware(ABC):
    """Base class for all middleware implementations"""
    
    def __init__(self, config: MiddlewareConfig):
        self.config = config
        self.name = config.name
        self.type = config.type
        self.enabled = config.enabled
        self.priority = config.priority
        self.logger = logging.getLogger(f"middleware.{self.name}")
    
    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> MiddlewareResult:
        """Execute the middleware logic"""
        pass
    
    def is_enabled(self) -> bool:
        """Check if middleware is enabled"""
        return self.enabled
    
    def get_priority(self) -> int:
        """Get middleware priority (lower number = higher priority)"""
        return self.priority

class MiddlewareContext:
    """Context object passed through middleware chain"""
    
    def __init__(self, request_data: Dict[str, Any] = None):
        self.request_data = request_data or {}
        self.response_data = {}
        self.metadata = {}
        self.user_info = {}
        self.errors = []
        self.middleware_results = []
        self.start_time = time.time()
    
    def add_error(self, error: str):
        """Add an error to the context"""
        self.errors.append(error)
    
    def add_metadata(self, key: str, value: Any):
        """Add metadata to the context"""
        self.metadata[key] = value
    
    def get_execution_time(self) -> float:
        """Get total execution time in milliseconds"""
        return (time.time() - self.start_time) * 1000

class MiddlewareManager:
    """Main middleware management system"""
    
    def __init__(self):
        self.middlewares: Dict[str, BaseMiddleware] = {}
        self.middleware_chain: List[BaseMiddleware] = []
        self.enabled = True
        self.metrics = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'middleware_executions': {},
            'average_execution_time': 0.0
        }
    
    def register_middleware(self, middleware: BaseMiddleware):
        """Register a new middleware"""
        self.middlewares[middleware.name] = middleware
        self._rebuild_chain()
        logger.info(f"Registered middleware: {middleware.name} ({middleware.type.value})")
    
    def unregister_middleware(self, name: str):
        """Unregister a middleware"""
        if name in self.middlewares:
            del self.middlewares[name]
            self._rebuild_chain()
            logger.info(f"Unregistered middleware: {name}")
    
    def _rebuild_chain(self):
        """Rebuild the middleware execution chain based on priorities"""
        enabled_middlewares = [m for m in self.middlewares.values() if m.is_enabled()]
        self.middleware_chain = sorted(enabled_middlewares, key=lambda x: x.get_priority())
    
    async def execute_chain(self, context: MiddlewareContext) -> List[MiddlewareResult]:
        """Execute the complete middleware chain"""
        if not self.enabled:
            return []
        
        results = []
        self.metrics['total_requests'] += 1
        
        try:
            for middleware in self.middleware_chain:
                start_time = time.time()
                
                try:
                    result = await middleware.execute(context.__dict__)
                    execution_time = (time.time() - start_time) * 1000
                    result.execution_time_ms = execution_time
                    
                    results.append(result)
                    context.middleware_results.append(result)
                     
                    if middleware.name not in self.metrics['middleware_executions']:
                        self.metrics['middleware_executions'][middleware.name] = {
                            'count': 0,
                            'total_time': 0.0,
                            'errors': 0
                        }
                    
                    stats = self.metrics['middleware_executions'][middleware.name]
                    stats['count'] += 1
                    stats['total_time'] += execution_time
                    
                    if result.status == MiddlewareStatus.ERROR:
                        stats['errors'] += 1
                        context.add_error(f"Middleware {middleware.name} failed: {result.message}")
                    
                except Exception as e:
                    error_result = MiddlewareResult(
                        middleware_name=middleware.name,
                        status=MiddlewareStatus.ERROR,
                        execution_time_ms=(time.time() - start_time) * 1000,
                        message=str(e)
                    )
                    results.append(error_result)
                    context.add_error(f"Middleware {middleware.name} exception: {str(e)}")
                    logger.error(f"Error in middleware {middleware.name}: {str(e)}")
            
            if context.errors:
                self.metrics['failed_requests'] += 1
            else:
                self.metrics['successful_requests'] += 1
                
        except Exception as e:
            logger.error(f"Error in middleware chain execution: {str(e)}")
            self.metrics['failed_requests'] += 1
        
        return results
    
    def get_middleware_info(self) -> Dict[str, Any]:
        """Get information about all registered middlewares"""
        return {
            'total_middlewares': len(self.middlewares),
            'enabled_middlewares': len([m for m in self.middlewares.values() if m.is_enabled()]),
            'middleware_chain': [
                {
                    'name': m.name,
                    'type': m.type.value,
                    'priority': m.priority,
                    'enabled': m.enabled
                }
                for m in self.middleware_chain
            ],
            'metrics': self.metrics
        }
    
    def enable_middleware(self, name: str):
        """Enable a specific middleware"""
        if name in self.middlewares:
            self.middlewares[name].enabled = True
            self._rebuild_chain()
    
    def disable_middleware(self, name: str):
        """Disable a specific middleware"""
        if name in self.middlewares:
            self.middlewares[name].enabled = False
            self._rebuild_chain()
    
    def update_middleware_config(self, name: str, config: Dict[str, Any]):
        """Update middleware configuration"""
        if name in self.middlewares:
            self.middlewares[name].config.config.update(config)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get middleware execution metrics"""
        return self.metrics.copy()
    
    def reset_metrics(self):
        """Reset all metrics"""
        self.metrics = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'middleware_executions': {},
            'average_execution_time': 0.0
        }
 
middleware_manager = MiddlewareManager()
