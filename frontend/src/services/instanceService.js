import api from './api';

class InstanceService {
  constructor() {
    this.healthyInstances = [];
    this.allInstancesWithStatus = [];
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
          allInstances: this.allInstancesWithStatus,
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

  getAllInstancesWithStatus() {
    return {
      instances: this.allInstancesWithStatus,
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
        console.log('🔄 Loading TES instances with status...');
      } else {
        console.log('🔄 Refreshing TES instances with status...');
      }
      
      const response = await api.get('/api/instances-with-status', {
        timeout: 10000
      });

      const data = response.data;
      const allInstances = data.instances || [];
      
      // Filter to only healthy instances, but keep status info
      this.healthyInstances = allInstances.filter(inst => inst.status === 'healthy');
      
      // Store all instances (including unhealthy) for dropdown display
      this.allInstancesWithStatus = allInstances;
      
      this.lastUpdate = data.last_updated ? new Date(data.last_updated) : new Date();
      this.error = null;
      
      console.log(`✅ Got ${this.healthyInstances.length} healthy instances out of ${allInstances.length} total (updated: ${this.lastUpdate.toLocaleTimeString()})`);
      
    } catch (err) {
      console.error('Error fetching instances with status:', err);
      
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
      this.loading = false;
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