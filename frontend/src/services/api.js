import axios from 'axios';
 
const getApiBaseUrl = () => { 
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
   
  if (process.env.NODE_ENV === 'production') { 
    if (window.location.origin.includes('tes-dashboard-frontend-route')) { 
      return '';
    } else { 
      return 'https://tes-dashboard-backend-route-federated-analytics-showcase.2.rahtiapp.fi';
    }
  }
   
  return 'http://localhost:8000';
};
 
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 45000,  
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
    const status = error.response?.status;
    const isServiceInfoRequest = error.config?.url?.includes('/api/service_info');
     
    if (isServiceInfoRequest && [503, 404, 403].includes(status)) { 
      return Promise.reject(error);
    }
     
    if (error.response?.status >= 500) {
      console.error('API Server Error:', error.message);
    } else if (error.request && !error.response) { 
      console.error('API Network Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);
 
export const testConnection = async () => {
  try {
    const response = await api.get('/api/test_connection');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};
 
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
 
export const apiClient = api;