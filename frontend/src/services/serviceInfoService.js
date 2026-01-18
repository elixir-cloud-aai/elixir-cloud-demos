import { apiClient } from './api';

export const serviceInfoService = {
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

  getHealthyInstances: async () => {
    try {
      const response = await apiClient.get('/api/healthy-instances');
      return response.data;
    } catch (error) {
      console.error('Error fetching healthy instances:', error);
      return { instances: [], count: 0 };
    }
  },

  getServiceInfo: async (tesUrl) => {
    const getInstanceName = async () => {
      try {
        const dashboardResponse = await apiClient.get('/api/dashboard_data');
        const tesInstances = dashboardResponse.data.tes_instances || [];
        const instanceInfo = tesInstances.find(instance => instance.url === tesUrl);
        return instanceInfo?.name || tesUrl;
      } catch {
        return tesUrl;
      }
    };

    try {
      console.log('Fetching service info for:', tesUrl);
      
      const response = await apiClient.get('/api/service_info', {
        params: { tes_url: tesUrl }
      });
      
      console.log('Got service info response:', response.data);
      return response.data;
      
    } catch (error) {
      console.log('Caught error, formatting response...', error.response?.status);
      
      const instanceName = await getInstanceName();
      let errorStatus = 'Service Error';
      let errorMessage = error.message;
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data || {};
        
        switch (status) {
          case 503:
            errorStatus = 'Service Unavailable';
            errorMessage = 'The TES instance is currently offline or not responding. It may be down for maintenance or experiencing connectivity issues.';
            break;
          case 404:
            errorStatus = 'Not Found';
            errorMessage = 'The service-info endpoint was not found. This instance may not support the GA4GH TES API standard.';
            break;
          case 403:
            errorStatus = 'Authentication Required';
            errorMessage = 'This TES instance requires authentication. The service is running but cannot provide information without proper credentials.';
            break;
          case 500:
            errorStatus = 'Server Error';
            errorMessage = 'The TES instance encountered an internal error while processing the request.';
            break;
          default:
            errorStatus = `HTTP Error (${status})`;
            errorMessage = errorData.message || errorData.error || error.message;
        }
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorStatus = 'Connection Timeout';
        errorMessage = 'The TES instance did not respond within the expected time. It may be overloaded or experiencing network issues.';
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorStatus = 'Network Error';
        errorMessage = 'Unable to connect to the TES instance. Please check your internet connection.';
      }
      
      console.log('Returning formatted error response');
      return {
        name: instanceName,
        url: tesUrl,
        id: 'error',
        description: errorMessage,
        organization: {
          name: errorStatus,
          url: tesUrl
        },
        contactUrl: 'N/A',
        documentationUrl: 'N/A',
        createdAt: 'N/A',
        type: {
          group: 'ga4gh',
          artifact: 'tes',
          version: 'Unknown'
        },
        storage: ['Unknown'],
        environment: 'Unavailable',
        version: 'Unknown',
        error: true,
        errorStatus: errorStatus,
        errorMessage: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }
};