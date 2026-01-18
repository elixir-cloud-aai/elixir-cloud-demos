import React, { useState, useEffect } from 'react';
import '../styles/MiddlewareManager.css';

const MiddlewareManager = () => {
  const [middlewares, setMiddlewares] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMiddleware, setSelectedMiddleware] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testData, setTestData] = useState({
    user_id: 'test_user',
    endpoint: '/api/test',
    method: 'GET',
    headers: {},
    data: {}
  });

  useEffect(() => {
    fetchMiddlewareStatus();
    fetchMiddlewareMetrics();
    
    const interval = setInterval(() => {
      fetchMiddlewareMetrics();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchMiddlewareStatus = async () => {
    try {
      const response = await fetch('/api/middleware/status');
      const data = await response.json();
      
      if (data.status === 'success') {
        setMiddlewares(Object.values(data.middlewares));
      } else {
        setError(data.error || 'Failed to fetch middleware status');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMiddlewareMetrics = async () => {
    try {
      const response = await fetch('/api/middleware/metrics');
      const data = await response.json();
      
      if (data.status === 'success') {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  };

  const toggleMiddleware = async (middlewareName) => {
    try {
      const response = await fetch(`/api/middleware/${middlewareName}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setMiddlewares(prev => 
          prev.map(m => 
            m.name === middlewareName 
              ? { ...m, enabled: data.enabled }
              : m
          )
        );
      } else {
        setError(data.error || 'Failed to toggle middleware');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  const testMiddlewareChain = async () => {
    try {
      const response = await fetch('/api/middleware/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        status: 'error',
        message: 'Network error: ' + err.message
      });
    }
  };

  const resetMiddleware = async () => {
    if (window.confirm('Are you sure you want to reset all middleware configurations and metrics?')) {
      try {
        const response = await fetch('/api/middleware/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
          fetchMiddlewareStatus();
          fetchMiddlewareMetrics();
          setTestResult(null);
        } else {
          setError(data.error || 'Failed to reset middleware');
        }
      } catch (err) {
        setError('Network error: ' + err.message);
      }
    }
  };

  const getStatusColor = (enabled) => {
    return enabled ? '#4CAF50' : '#f44336';
  };

  const getPriorityColor = (priority) => {
    if (priority <= 3) return '#f44336';
    if (priority <= 6) return '#ff9800';
    return '#4CAF50';
  };

  if (loading) {
    return (
      <div className="middleware-manager">
        <div className="loading">Loading middleware status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="middleware-manager">
        <div className="error">Error: {error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="middleware-manager">
      <div className="header">
        <h1>Middleware Manager</h1>
        <p>Monitor and control middleware components for end-to-end testing</p>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <h3>Total Middlewares</h3>
          <span className="stat-number">{middlewares.length}</span>
        </div>
        <div className="stat-card">
          <h3>Enabled</h3>
          <span className="stat-number enabled">
            {middlewares.filter(m => m.enabled).length}
          </span>
        </div>
        <div className="stat-card">
          <h3>Disabled</h3>
          <span className="stat-number disabled">
            {middlewares.filter(m => !m.enabled).length}
          </span>
        </div>
      </div>

      <div className="actions-bar">
        <button 
          className="btn-primary"
          onClick={testMiddlewareChain}
        >
          Test Middleware Chain
        </button>
        <button 
          className="btn-secondary"
          onClick={resetMiddleware}
        >
          Reset All
        </button>
        <button 
          className="btn-secondary"
          onClick={fetchMiddlewareStatus}
        >
          Refresh
        </button>
      </div>

      <div className="middleware-grid">
        {middlewares.map((middleware) => (
          <div 
            key={middleware.name} 
            className={`middleware-card ${middleware.enabled ? 'enabled' : 'disabled'} ${middleware.name === 'monitoring' ? 'monitoring-card' : ''}`}
            onClick={() => setSelectedMiddleware(
              selectedMiddleware?.name === middleware.name ? null : middleware
            )}
          >
            <div className="middleware-header">
              <div className="middleware-info">
                <h3>{middleware.name}</h3>
                <span className="middleware-type">{middleware.type}</span>
              </div>
              <div className="middleware-controls">
                <span 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(middleware.enabled) }}
                ></span>
                <button
                  className="toggle-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMiddleware(middleware.name);
                  }}
                >
                  {middleware.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
            
            <div className="middleware-details">
              <div className="detail-row">
                <span>Priority:</span>
                <span 
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(middleware.priority) }}
                >
                  {middleware.priority}
                </span>
              </div>
              
              {middleware.description && (
                <div className="detail-row">
                  <span>Description:</span>
                  <span className="description">{middleware.description}</span>
                </div>
              )}

              {metrics[middleware.name] && (
                <div className="metrics-section">
                  <h4>Metrics</h4>
                  <div className="metrics-grid">
                    {Object.entries(metrics[middleware.name]).map(([key, value]) => (
                      <div key={key} className="metric-item">
                        <span className="metric-label">{key}:</span>
                        <span className="metric-value">
                          {typeof value === 'object' ? JSON.stringify(value) : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Test Section */}
      <div className="test-section">
        <h2>Middleware Chain Testing</h2>
        
        <div className="test-form">
          <div className="form-group">
            <label>User ID:</label>
            <input
              type="text"
              value={testData.user_id}
              onChange={(e) => setTestData({...testData, user_id: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Endpoint:</label>
            <input
              type="text"
              value={testData.endpoint}
              onChange={(e) => setTestData({...testData, endpoint: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Method:</label>
            <select
              value={testData.method}
              onChange={(e) => setTestData({...testData, method: e.target.value})}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Headers (JSON):</label>
            <textarea
              value={JSON.stringify(testData.headers, null, 2)}
              onChange={(e) => {
                try {
                  setTestData({...testData, headers: JSON.parse(e.target.value)});
                } catch (err) {
                }
              }}
            />
          </div>
          
          <div className="form-group">
            <label>Data (JSON):</label>
            <textarea
              value={JSON.stringify(testData.data, null, 2)}
              onChange={(e) => {
                try {
                  setTestData({...testData, data: JSON.parse(e.target.value)});
                } catch (err) {
                }
              }}
            />
          </div>
        </div>

        {testResult && (
          <div className={`test-result ${testResult.status}`}>
            <h3>Test Result</h3>
            <pre>{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {selectedMiddleware && (
        <div className="modal-overlay" onClick={() => setSelectedMiddleware(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMiddleware.name} Details</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedMiddleware(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Configuration</h3>
                <div className="config-grid">
                  <div className="config-item">
                    <label>Type:</label>
                    <span>{selectedMiddleware.type}</span>
                  </div>
                  <div className="config-item">
                    <label>Priority:</label>
                    <span>{selectedMiddleware.priority}</span>
                  </div>
                  <div className="config-item">
                    <label>Status:</label>
                    <span className={selectedMiddleware.enabled ? 'enabled' : 'disabled'}>
                      {selectedMiddleware.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedMiddleware.description && (
                <div className="detail-section">
                  <h3>Description</h3>
                  <p>{selectedMiddleware.description}</p>
                </div>
              )}

              {metrics[selectedMiddleware.name] && (
                <div className="detail-section">
                  <h3>Real-time Metrics</h3>
                  <div className="metrics-display">
                    <pre>{JSON.stringify(metrics[selectedMiddleware.name], null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiddlewareManager;
