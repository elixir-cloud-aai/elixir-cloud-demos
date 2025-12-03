// Service for system status and monitoring
import { apiClient } from './api';

export const statusService = {
  // Get task status
  getTaskStatus: async (tesUrl, taskId) => {
    try {
      // Use dashboard data API to get task info
      const response = await apiClient.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      // Find the specific task in the dashboard data
      const tasks = dashboardData.tasks || [];
      const task = tasks.find(t => t.task_id === taskId && t.tes_url === tesUrl);
      
      return task || { status: 'UNKNOWN', message: 'Task not found' };
    } catch (error) {
      console.error('Error fetching task status:', error);
      throw error;
    }
  },

  // List all tasks for a TES instance
  listTasks: async (tesUrl) => {
    try {
      // Use dashboard data API to get all tasks, then filter by TES URL if needed
      const response = await apiClient.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      let tasks = dashboardData.tasks || [];
      
      // Filter by TES URL if provided
      if (tesUrl) {
        tasks = tasks.filter(task => task.tes_url === tesUrl);
      }
      
      return tasks;
    } catch (error) {
      console.error('Error listing tasks:', error);
      throw error;
    }
  },

  // Get system topology logs
  getTopologyLogs: async () => {
    try {
      const response = await apiClient.get('/api/topology_logs');
      return response.data;
    } catch (error) {
      console.error('Error fetching topology logs:', error);
      throw error;
    }
  },

  // Get task logs  
  getTaskLogs: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/task_log/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task logs:', error);
      throw error;
    }
  }
};
