import api from './api';

export const serviceStatusService = {
  getServiceStatus: async () => {
    try {
      const response = await api.get('/api/service-status');
      return response.data;
    } catch (error) {
      console.error('ServiceStatusService: Error fetching service status:', error.message);
      throw error;
    }
  },

  getServiceStatusById: async (serviceId) => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.services.find(service => service.id === serviceId);
  },

  checkCapabilities: async () => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.capabilities;
  },

  getHealthSummary: async () => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.summary;
  },

  getServicesByStatus: async (status) => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.services.filter(service => service.status === status);
  },

  getServicesByType: async (type) => {
    const statusData = await serviceStatusService.getServiceStatus();
    return statusData.services.filter(service => service.type === type);
  }
};
