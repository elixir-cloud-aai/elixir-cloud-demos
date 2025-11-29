import api from './api';

// Service information API functions  
export const serviceService = {
  // Get service information
  getServiceInfo: async () => {
    try {
      // Use dashboard data to get service info
      const response = await api.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      return {
        name: 'TES Dashboard',
        version: '1.0.0',
        description: 'Task Execution Service Dashboard',
        organization: {
          name: 'Elixir Cloud',
          url: 'https://elixir-cloud.dcc.sib.swiss/'
        },
        contactUrl: 'mailto:cloud-service@elixir-europe.org',
        documentationUrl: 'https://ga4gh.github.io/task-execution-schemas/',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        statistics: {
          totalTasks: dashboardData.tasks?.length || 0,
          tesInstances: dashboardData.tes_instances?.length || 0,
          batchRuns: dashboardData.batch_runs?.length || 0
        }
      };
    } catch (error) {
      console.error('Error fetching service info:', error);
      throw error;
    }
  },

  // Get debug environment info
  getDebugEnv: async () => {
    try {
      // Return debug environment info
      return {
        environment: process.env.NODE_ENV || 'development',
        apiUrl: process.env.REACT_APP_API_URL || '',
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        }
      };
    } catch (error) {
      console.error('Error fetching debug env:', error);
      throw error;
    }
  },

  // Get topology logs
  getTopologyLogs: async () => {
    try {
      const response = await api.get('/api/topology_logs');
      return response.data;
    } catch (error) {
      console.error('Error fetching topology logs:', error);
      throw error;
    }
  }
};

export default serviceService;
