// Service for monitoring TES service status
import api from './api';

export const serviceStatusService = {
  // Get status of all TES services and proTES nodes
  getServiceStatus: async () => {
    try {
      console.log('🔍 ServiceStatusService: Fetching service status');
      const response = await api.get('/api/service-status');
      console.log('✅ ServiceStatusService: Service status received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ ServiceStatusService: Error fetching service status:', error);
      throw error;
    }
  },

  // Get status of a specific service
  getServiceStatusById: async (serviceId) => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.services.find(service => service.id === serviceId);
  },

  // Check if services support specific capabilities
  checkCapabilities: async () => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.capabilities;
  },

  // Get service health summary
  getHealthSummary: async () => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.summary;
  },

  // Filter services by status
  getServicesByStatus: async (status) => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.services.filter(service => service.status === status);
  },

  // Get services by type (TES, Gateway, etc.)
  getServicesByType: async (type) => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.services.filter(service => service.type === type);
  }
};
