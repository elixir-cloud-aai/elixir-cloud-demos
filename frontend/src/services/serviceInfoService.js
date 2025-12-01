// Service for TES service information
import { apiClient } from './api';

export const serviceInfoService = {
  // Get service info for a TES instance
  getServiceInfo: async (tesUrl) => {
    try {
      // First try to get real service info from the backend API
      try {
        console.log('Fetching service info for:', tesUrl);
        const response = await apiClient.get('/api/service_info', {
          params: { tes_url: tesUrl }
        });
        
        if (response.data) {
          console.log('Got real service info:', response.data);
          return response.data;
        }
      } catch (apiError) {
        console.warn('Failed to get real service info, falling back to mock data:', apiError);
      }
      
      // Fallback: Use dashboard data to get TES instances info
      const dashboardResponse = await apiClient.get('/api/dashboard_data');
      const dashboardData = dashboardResponse.data;
      
      // Find the TES instance info
      const tesInstances = dashboardData.tes_instances || [];
      const serviceInfo = tesInstances.find(instance => instance.url === tesUrl);
      
      if (serviceInfo) {
        return {
          name: serviceInfo.name,
          version: serviceInfo.version || '1.1.0',
          id: serviceInfo.id,
          description: serviceInfo.description || 'TES service',
          organization: {
            name: 'Elixir Cloud',
            url: 'https://elixir-cloud.dcc.sib.swiss/'
          },
          contactUrl: 'mailto:cloud-service@elixir-europe.org',
          documentationUrl: 'https://ga4gh.github.io/task-execution-schemas/',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          type: {
            group: 'org.ga4gh',
            artifact: 'tes',
            version: serviceInfo.version || '1.1.0'
          }
        };
      }
      
      // Default service info if not found
      return {
        name: 'TES Service',
        version: '1.1.0',
        id: 'tes-service',
        description: 'Task Execution Service',
        organization: {
          name: 'Elixir Cloud',
          url: 'https://elixir-cloud.dcc.sib.swiss/'
        },
        contactUrl: 'mailto:cloud-service@elixir-europe.org',
        documentationUrl: 'https://ga4gh.github.io/task-execution-schemas/',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        type: {
          group: 'org.ga4gh',
          artifact: 'tes',
          version: '1.1.0'
        }
      };
    } catch (error) {
      console.error('Error fetching service info:', error);
      throw error;
    }
  },

  // Get debug environment info
  getDebugInfo: async () => {
    try {
      // Return debug info from dashboard data
      const response = await apiClient.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      return {
        environment: process.env.NODE_ENV || 'development',
        apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        tesInstances: dashboardData.tes_instances?.length || 0,
        tasks: dashboardData.tasks?.length || 0
      };
    } catch (error) {
      console.error('Error fetching debug info:', error);
      throw error;
    }
  }
};
