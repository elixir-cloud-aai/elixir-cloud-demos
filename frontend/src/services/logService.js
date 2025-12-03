import api from './api';

// Log service for fetching various types of logs
export const logService = {
  // Get task logs (for individual tasks)
  getTaskLogs: async (taskId) => {
    try {
      const response = await api.get(`/api/task_log/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task logs:', error);
      // Return empty logs if not found
      return { logs: [], message: 'No logs available' };
    }
  },

  // Get workflow logs  
  getWorkflowLogs: async (runId) => {
    try {
      const encodedRunId = encodeURIComponent(runId);
      const response = await api.get(`/api/workflow_log/${encodedRunId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      return { logs: [], message: 'No logs available' };
    }
  },

  // Get batch logs
  getBatchLogs: async (runId) => {
    try {
      const encodedRunId = encodeURIComponent(runId);
      const response = await api.get(`/api/batch_log/${encodedRunId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching batch logs:', error);
      return { logs: [], message: 'No logs available' };
    }
  },

  // Get topology logs
  getTopologyLogs: async () => {
    try {
      const response = await api.get('/api/topology_logs');
      return response.data;
    } catch (error) {
      console.error('Error fetching topology logs:', error);
      return { logs: [], message: 'No topology logs available' };
    }
  },

  // Get all logs (combined)
  getAllLogs: async () => {
    try {
      // Fetch dashboard data to get available runs
      const dashboardResponse = await api.get('/api/dashboard_data');
      const dashboardData = dashboardResponse.data;
      
      const allLogs = [];
      
      // Add batch logs
      if (dashboardData.batch_runs) {
        for (const run of dashboardData.batch_runs) {
          try {
            const logs = await logService.getBatchLogs(run.run_id);
            allLogs.push({
              type: 'batch',
              runId: run.run_id,
              name: `${run.workflow_type} - ${run.tes_name}`,
              timestamp: run.submitted_at,
              logs: logs.logs || []
            });
          } catch (error) {
            console.log(`No logs for batch run ${run.run_id}`);
          }
        }
      }
      
      // Add topology logs
      try {
        const topologyLogs = await logService.getTopologyLogs();
        if (topologyLogs.logs && topologyLogs.logs.length > 0) {
          allLogs.push({
            type: 'topology',
            name: 'Network Topology',
            timestamp: new Date().toISOString(),
            logs: topologyLogs.logs
          });
        }
      } catch (error) {
        console.log('No topology logs available');
      }
      
      return allLogs;
    } catch (error) {
      console.error('Error fetching all logs:', error);
      return [];
    }
  }
};

export default logService;