// Service for monitoring TES service status
import api from './api';

export const serviceStatusService = {
  // Get status of all TES services and proTES nodes
  getServiceStatus: async () => {
    try {
      const response = await api.get('/api/service-status');
      return response.data;
    } catch (error) {
      console.error('ServiceStatusService: Error fetching service status:', error.message);
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
