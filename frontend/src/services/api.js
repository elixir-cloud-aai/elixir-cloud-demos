import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Check for custom API URL first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // TEMPORARY WORKAROUND: Use direct backend URL while proxy is broken
  if (process.env.NODE_ENV === 'production') {
    return 'https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi';
  }
  
  // Development - use localhost
  return 'http://localhost:8000';
};

// Create axios instance with default config
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // Increased timeout for K8s
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message);
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