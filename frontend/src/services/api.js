import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Check for custom API URL first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Production - determine if we're using proxy or direct backend access
  if (process.env.NODE_ENV === 'production') {
    // If we're on the same domain as the frontend (proxy scenario)
    if (window.location.origin.includes('tes-dashboard-frontend-route')) {
      // Use relative path - nginx will proxy /api to backend
      return '';
    } else {
      // Direct backend access (fallback)
      return 'https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi';
    }
  }
  
  // Development - use localhost (backend running on port 8000)
  return 'http://localhost:8000';
};

// Create axios instance with default config
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 45000, // Increased timeout for external TES instances
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status >= 500) {
      console.error('API Server Error:', error.message);
    }
    return Promise.reject(error);
  }
);

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