import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api, { testConnection, fetchDashboardData } from '../services/api';
import { taskService } from '../services/taskService';
import { statusService } from '../services/statusService';
import { serviceInfoService } from '../services/serviceInfoService';
import { workflowService } from '../services/workflowService';
import { batchService } from '../services/batchService';
import { mapService } from '../services/mapService';
import { serviceService } from '../services/serviceService';
import { logService } from '../services/logService';

const TestContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const TestSection = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const TestTitle = styled.h2`
  color: #2c3e50;
  margin-bottom: 15px;
`;

const TestResult = styled.div`
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
  background: ${props => props.$success ? '#d4edda' : props.$error ? '#f8d7da' : '#fff3cd'};
  color: ${props => props.$success ? '#155724' : props.$error ? '#721c24' : '#856404'};
  border: 1px solid ${props => props.$success ? '#c3e6cb' : props.$error ? '#f5c6cb' : '#ffeaa7'};
`;

const ApiTest = () => {
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setResults(prev => ({
      ...prev,
      [test]: { success, message, data, timestamp: new Date().toISOString() }
    }));
  };

  const runApiTests = async () => {
    setTesting(true);
    setResults({});

    // Test 1: Basic connection
    try {
      await testConnection();
      addResult('connection', true, 'Backend connection successful');
    } catch (error) {
      addResult('connection', false, `Connection failed: ${error.message}`);
    }

    // Test 2: Dashboard data
    try {
      const data = await fetchDashboardData();
      addResult('dashboardData', true, `Dashboard data loaded: ${Object.keys(data).join(', ')}`, data);
    } catch (error) {
      addResult('dashboardData', false, `Dashboard data failed: ${error.message}`);
    }

    // Test 3: Task service
    try {
      const tasks = await taskService.listTasks();
      addResult('tasks', true, `Tasks loaded: ${tasks.length} tasks found`);
    } catch (error) {
      addResult('tasks', false, `Tasks failed: ${error.message}`);
    }

    // Test 4: Service info
    try {
      const info = await serviceInfoService.getServiceInfo('http://localhost:8000');
      addResult('serviceInfo', true, 'Service info loaded successfully');
    } catch (error) {
      addResult('serviceInfo', false, `Service info failed: ${error.message}`);
    }

    // Test 6: TES locations
    try {
      const locations = await mapService.getTesLocations();
      addResult('tesLocations', true, `TES locations loaded: ${locations.length} locations`);
    } catch (error) {
      addResult('tesLocations', false, `TES locations failed: ${error.message}`);
    }

    // Test 7: Batch runs
    try {
      const runs = await batchService.getBatchRuns();
      addResult('batchRuns', true, `Batch runs loaded: ${runs.length} runs`);
    } catch (error) {
      addResult('batchRuns', false, `Batch runs failed: ${error.message}`);
    }

    // Test 8: Workflow runs
    try {
      const runs = await workflowService.getWorkflowRuns();
      addResult('workflowRuns', true, `Workflow runs loaded: ${runs.length} runs`);
    } catch (error) {
      addResult('workflowRuns', false, `Workflow runs failed: ${error.message}`);
    }

    // Test 9: All logs
    try {
      const logs = await logService.getAllLogs();
      addResult('logs', true, `Logs loaded: ${logs.length} log sources`);
    } catch (error) {
      addResult('logs', false, `Logs failed: ${error.message}`);
    }

    // Test 10: Nodes
    try {
      const response = await api.get('/api/nodes');
      addResult('nodes', true, `Nodes loaded: ${response.data.length} nodes`);
    } catch (error) {
      addResult('nodes', false, `Nodes failed: ${error.message}`);
    }

    setTesting(false);
  };

  useEffect(() => {
    runApiTests();
  }, []);

  return (
    <TestContainer>
      <TestSection>
        <TestTitle>🧪 API Endpoint Testing Dashboard</TestTitle>
        <p>This page tests all API endpoints to identify connectivity issues.</p>
        <button 
          onClick={runApiTests} 
          disabled={testing}
          style={{
            padding: '10px 20px',
            background: testing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testing ? 'not-allowed' : 'pointer'
          }}
        >
          {testing ? 'Testing...' : 'Run Tests'}
        </button>
      </TestSection>

      {Object.entries(results).map(([test, result]) => (
        <TestSection key={test}>
          <TestTitle>
            {result.success ? '✅' : '❌'} {test.charAt(0).toUpperCase() + test.slice(1)}
          </TestTitle>
          <TestResult 
            $success={result.success} 
            $error={!result.success}
          >
            {result.message}
          </TestResult>
          {result.data && (
            <details>
              <summary>Show Data</summary>
              <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          )}
        </TestSection>
      ))}
    </TestContainer>
  );
};

export default ApiTest;
