// Service for TES service information
import { apiClient } from './api';

export const serviceInfoService = {
  // Get TES instances from dashboard
  getTesInstances: async () => {
    try {
      const response = await apiClient.get('/api/dashboard_data');
      const tesInstances = response.data.tes_instances || [];
      return tesInstances.map(instance => ({
        name: instance.name,
        url: instance.url,
        id: instance.url.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      }));
    } catch (error) {
      console.error('Error fetching TES instances:', error);
      throw error;
    }
  },

  // Get service info for a TES instance
  getServiceInfo: async (tesUrl) => {
    try {
      console.log('Fetching service info for:', tesUrl);
      
      // Try to get service info from the backend
      const response = await apiClient.get('/api/service_info', {
        params: { tes_url: tesUrl }
      });
      
      if (response.data) {
        console.log('Got service info response:', response.data);
        
        // Check if it's an error response
        if (response.data.error) {
          // Get TES instance name from dashboard for better display
          const dashboardResponse = await apiClient.get('/api/dashboard_data');
          const tesInstances = dashboardResponse.data.tes_instances || [];
          const instanceInfo = tesInstances.find(instance => instance.url === tesUrl);
          
          // Return formatted info even for unavailable services
          return {
            name: instanceInfo?.name || 'Unknown Service',
            url: tesUrl,
            id: 'unavailable',
            organization: {
              name: 'Service Unavailable',
              url: tesUrl
            },
            contactUrl: 'N/A',
            documentationUrl: 'N/A',
            type: {
              group: 'ga4gh',
              artifact: 'tes',
              version: 'Unknown'
            },
            storage: ['Unknown'],
            status: response.data.error,
            message: response.data.message,
            timestamp: response.data.timestamp
          };
        }
        
        return response.data;
      }
      
      throw new Error('No response data received');
    } catch (error) {
      console.error('Error fetching service info:', error);
      
      // Handle 503 and other HTTP errors gracefully
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        
        // Get TES instance name for better error display
        try {
          const dashboardResponse = await apiClient.get('/api/dashboard_data');
          const tesInstances = dashboardResponse.data.tes_instances || [];
          const instanceInfo = tesInstances.find(instance => instance.url === tesUrl);
          
          return {
            name: instanceInfo?.name || 'Unknown Service',
            url: tesUrl,
            id: 'error',
            organization: {
              name: 'Service Error',
              url: tesUrl
            },
            contactUrl: 'N/A',
            documentationUrl: 'N/A',
            type: {
              group: 'ga4gh',
              artifact: 'tes',
              version: 'Unknown'
            },
            storage: ['Unknown'],
            status: errorData.error || 'Service Error',
            message: errorData.message || error.message,
            timestamp: errorData.timestamp || new Date().toISOString()
          };
        } catch (dashboardError) {
          throw new Error(`TES instance not found: ${tesUrl}`);
        }
      }
      
      throw error;
    }
  },


};
