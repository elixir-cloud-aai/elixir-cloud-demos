import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001'; // Your Flask backend port (changed from 5000 to avoid macOS Control Center conflict)

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Test connection to backend
export const testConnection = async () => {
  try {
    const response = await api.get('/api/test_connection');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

// Fetch all dashboard data
export const fetchDashboardData = async () => {
  try {
    const response = await api.get('/api/dashboard_data');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

export default api;

// Export as apiClient for consistency with other services
export const apiClient = api;