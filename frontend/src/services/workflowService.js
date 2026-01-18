import api from './api';

export const workflowService = {
  submitWorkflow: async (workflowData) => {
    try {
      const formData = new FormData();
      Object.keys(workflowData).forEach(key => {
        if (workflowData[key] instanceof File) {
          formData.append(key, workflowData[key]);
        } else {
          formData.append(key, workflowData[key]);
        }
      });
      
      const response = await api.post('/api/submit_workflow', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting workflow:', error);
      throw error;
    }
  },

  getWorkflowLogs: async (runId) => {
    try {
      const response = await api.get(`/api/workflow_log/${runId}`);
      if (response.data && response.data.success && response.data.log) {
        return response.data.log;
      } else if (response.data && response.data.log) {
        return response.data.log;
      } else {
        return 'No log content available';
      }
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      throw error;
    }
  },

  getLatestWorkflowStatus: async () => {
    try {
      const response = await api.get('/api/latest_workflow_status');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest workflow status:', error);
      throw error;
    }
  },

  getWorkflowRuns: async () => {
    try {
      const response = await api.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      const workflowRuns = dashboardData.workflow_runs || [];
      
      const healthyWorkflowRuns = workflowRuns.filter(run => {
        return run && 
               run.run_id && 
               run.tes_url &&
               run.status &&
               !run.connection_error &&
               !run.timeout_error &&
               run.status !== 'CONNECTION_ERROR' &&
               run.status !== 'TIMEOUT_ERROR' &&
               run.status !== 'SYSTEM_ERROR';
      });
      
      console.log(`WorkflowService: Filtered ${healthyWorkflowRuns.length} healthy workflow runs out of ${workflowRuns.length} total`);
      return healthyWorkflowRuns;
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      
      if (error.response?.status === 504 || error.response?.status === 503) {
        console.warn('External services timeout/unavailable, returning empty workflow runs');
        return [];
      }
      
      throw error;
    }
  }
};

export default workflowService;
