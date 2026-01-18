import api from './api';

class InstanceService {
  constructor() {
    this.healthyInstances = [];
    this.loading = false;
    this.error = null;
    this.lastUpdate = null;
    this.listeners = new Set();
    
    this.startHealthChecking();
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          instances: this.healthyInstances,
          loading: this.loading,
          error: this.error,
          lastUpdate: this.lastUpdate
        });
      } catch (err) {
        console.error('Error notifying listener:', err);
      }
    });
  }

  getHealthyInstances() {
    return {
      instances: this.healthyInstances,
      loading: this.loading,
      error: this.error,
      lastUpdate: this.lastUpdate
    };
  }

  async fetchHealthyInstances() {
    try {
      const isInitialLoad = this.healthyInstances.length === 0;
      
      if (isInitialLoad) {
        this.loading = true;
        this.notifyListeners();
        console.log('🔄 Loading initial healthy TES instances...');
      } else {
        console.log('🔄 Refreshing cached healthy TES instances...');
      }
      
      const response = await api.get('/api/healthy-instances', {
        timeout: 5000
      });

      const data = response.data;
      this.healthyInstances = data.instances || [];
      this.lastUpdate = data.last_updated ? new Date(data.last_updated) : new Date();
      this.error = null;
      
      console.log(`✅ Got ${this.healthyInstances.length} cached healthy TES instances (updated: ${this.lastUpdate.toLocaleTimeString()})`);
      
    } catch (err) {
      console.error('Error fetching healthy instances:', err);
      
      if (err.code === 'ECONNABORTED') {
        this.error = 'Connection timeout - using cached data';
        console.warn('Connection timed out, keeping existing instances');
      } else if (err.response?.status === 500) {
        this.error = 'Server error - using cached data';
      } else {
        this.error = err.response?.data?.error || err.message || 'Failed to fetch instances';
      }
      
      if (this.healthyInstances.length === 0) {
        console.warn('No cached instances available');
      } else {
        console.log(`Using ${this.healthyInstances.length} cached healthy instances during error`);
      }
    } finally {
      if (this.healthyInstances.length === 0) {
        this.loading = false;
      } else {
        this.loading = false;
      }
      this.notifyListeners();
    }
  }

  startHealthChecking() {
    this.fetchHealthyInstances();
    
    this.healthCheckInterval = setInterval(() => {
      this.fetchHealthyInstances();
    }, 60000);
    
    console.log('🔄 Started cache refresh every 60 seconds');
  }

  stopHealthChecking() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('⏹️ Stopped health checking');
    }
  }

  async refresh() {
    console.log('🔄 Force refreshing healthy instances...');
    await this.fetchHealthyInstances();
  }
}

const instanceService = new InstanceService();

export default instanceService;
