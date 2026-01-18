import api from './api';

export const mapService = {
  getTesLocations: async () => {
    try {
      const response = await api.get('/api/tes_locations');
      return response.data;
    } catch (error) {
      console.error('Error fetching TES locations:', error);
      throw error;
    }
  },

  getWorkflowPaths: async () => {
    try {
      const response = await api.get('/api/dashboard_data');
      const { batch_runs, workflow_runs } = response.data;
      
      const allWorkflows = [
        ...batch_runs.map(run => ({
          id: run.run_id,
          type: run.workflow_type,
          name: `${run.workflow_type} - ${run.tes_name}`,
          status: run.status,
          tes_name: run.tes_name,
          submitted_at: run.submitted_at,
          mode: run.mode
        })),
        ...workflow_runs.map(run => ({
          id: run.run_id,
          type: run.type,
          name: `${run.type} - ${run.tes_name}`,
          status: run.status,
          tes_name: run.tes_name,
          submitted_at: new Date().toISOString()
        }))
      ];
      
      return allWorkflows;
    } catch (error) {
      console.error('Error fetching workflow paths:', error);
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
  }
};

export default mapService;
