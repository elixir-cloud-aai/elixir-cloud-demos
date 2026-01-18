import { apiClient } from './api';

export const statusService = {
  getTaskStatus: async (tesUrl, taskId) => {
    try {
      const response = await apiClient.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      const tasks = dashboardData.tasks || [];
      const task = tasks.find(t => t.task_id === taskId && t.tes_url === tesUrl);
      
      return task || { status: 'UNKNOWN', message: 'Task not found' };
    } catch (error) {
      console.error('Error fetching task status:', error);
      throw error;
    }
  },

  listTasks: async (tesUrl) => {
    try {
      const response = await apiClient.get('/api/dashboard_data');
      const dashboardData = response.data;
      
      let tasks = dashboardData.tasks || [];
      
      if (tesUrl) {
        tasks = tasks.filter(task => task.tes_url === tesUrl);
      }
      
      return tasks;
    } catch (error) {
      console.error('Error listing tasks:', error);
      throw error;
    }
  },

  getTopologyLogs: async () => {
    try {
      const response = await apiClient.get('/api/api/topology_logs');
      return response.data;
    } catch (error) {
      console.error('Error fetching topology logs:', error);
      throw error;
    }
  },

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
