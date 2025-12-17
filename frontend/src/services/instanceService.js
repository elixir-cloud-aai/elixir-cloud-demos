import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class InstanceService {
  constructor() {
    this.healthyInstances = [];
    this.loading = false;
    this.error = null;
    this.lastUpdate = null;
    this.listeners = new Set();
    
    // Start health checking every 5 seconds
    this.startHealthChecking();
  }

  // Add listener for instance updates
  addListener(callback) {
    this.listeners.add(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
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

  // Get current healthy instances
  getHealthyInstances() {
    return {
      instances: this.healthyInstances,
      loading: this.loading,
      error: this.error,
      lastUpdate: this.lastUpdate
    };
  }

  // Fetch healthy instances from backend - no loading states!
  async fetchHealthyInstances() {
    try {
      // Don't show loading for subsequent requests - only log
      const isInitialLoad = this.healthyInstances.length === 0;
      
      if (isInitialLoad) {
        this.loading = true;
        this.notifyListeners();
        console.log('🔄 Loading initial healthy TES instances...');
      } else {
        console.log('🔄 Refreshing cached healthy TES instances...');
      }
      
      const response = await axios.get(`${API_BASE_URL}/healthy-instances`, {
        timeout: 5000 // Fast 5 second timeout since backend returns cached data
      });

      // Handle new API response format
      const data = response.data;
      this.healthyInstances = data.instances || [];
      this.lastUpdate = data.last_updated ? new Date(data.last_updated) : new Date();
      this.error = null;
      
      console.log(`✅ Got ${this.healthyInstances.length} cached healthy TES instances (updated: ${this.lastUpdate.toLocaleTimeString()})`);
      
    } catch (err) {
      console.error('Error fetching healthy instances:', err);
      
      // More specific error handling
      if (err.code === 'ECONNABORTED') {
        this.error = 'Connection timeout - using cached data';
        console.warn('Connection timed out, keeping existing instances');
      } else if (err.response?.status === 500) {
        this.error = 'Server error - using cached data';
      } else {
        this.error = err.response?.data?.error || err.message || 'Failed to fetch instances';
      }
      
      // Always keep previous data if available
      if (this.healthyInstances.length === 0) {
        console.warn('No cached instances available');
      } else {
        console.log(`Using ${this.healthyInstances.length} cached healthy instances during error`);
      }
    } finally {
      // Only show loading on initial load
      if (this.healthyInstances.length === 0) {
        this.loading = false;
      } else {
        this.loading = false; // Always false after we have data
      }
      this.notifyListeners();
    }
  }

  // Start periodic health checking
  startHealthChecking() {
    // Initial fetch
    this.fetchHealthyInstances();
    
    // Set up interval for every 60 seconds (backend updates every 30s)
    this.healthCheckInterval = setInterval(() => {
      this.fetchHealthyInstances();
    }, 60000);
    
    console.log('🔄 Started cache refresh every 60 seconds');
  }

  // Stop health checking
  stopHealthChecking() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('⏹️ Stopped health checking');
    }
  }

  // Force refresh instances
  async refresh() {
    console.log('🔄 Force refreshing healthy instances...');
    await this.fetchHealthyInstances();
  }
}

// Create singleton instance
const instanceService = new InstanceService();

export default instanceService;
