import api from './api';

export const taskService = {
  
  getTaskDetails: async (tesUrl, taskId, viewLevel = 'FULL') => {
    try {
      const response = await api.get('/api/task_details', {
        params: { 
          tes_url: tesUrl, 
          task_id: taskId,
          view: viewLevel
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching task details:', error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Timeout: TES instance ${tesUrl} is taking too long to respond. The task details may be available later.`);
      }
      
      if (error.response?.status === 504) {
        const errorData = error.response?.data;
        if (errorData?.error_code === 'TIMEOUT') {
          throw new Error(`TES instance timeout: ${errorData.error} (waited ${errorData.timeout})`);
        }
        throw new Error(`TES instance taking too long to respond`);
      }

      if (error.response?.status === 503) {
        const errorData = error.response?.data;
        if (errorData?.error_code === 'CONNECTION_ERROR') {
          throw new Error(`TES instance unavailable: ${errorData.error}`);
        }
        throw new Error(`TES instance temporarily unavailable`);
      }
      
      if (error.response?.status === 500) {
        throw new Error(`Server error when fetching task ${taskId} from ${tesUrl}. The TES instance may be temporarily unavailable.`);
      }
      
      throw error;
    }
  },

  submitTask: async (taskData) => {
    try {
      const response = await api.post('/api/submit_task', taskData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('TaskService: Error submitting task:', error.message);
      console.error('TaskService: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      throw error;
    }
  },

  cancelTask: async (tesUrl, taskId) => {
    try {
      const formData = new FormData();
      formData.append('tes_url', tesUrl);
      formData.append('task_id', taskId);
      
      const response = await api.post('/api/cancel_task', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error canceling task:', error);
      throw error;
    }
  },

  listTasks: async () => {
    try {
      const response = await api.get('/api/dashboard_data');
      const dashboardData = response.data;
      

      const backendTasks = dashboardData.tasks || [];
      

      let tasks = [];
      try {
        tasks = backendTasks
          .filter(task => {
            const taskState = task.state || task.status;
            return task && 
                   (task.task_id || task.id) && 
                   task.tes_url && 
                   taskState &&
                   !task.connection_error &&
                   !task.timeout_error &&
                   taskState !== 'CONNECTION_ERROR' &&
                   taskState !== 'TIMEOUT_ERROR';
          })
          .map(task => {
            const taskState = task.state || task.status || 'UNKNOWN';
            const taskId = task.task_id || task.id;
            return {
              id: taskId,
              name: task.task_name || task.name || task.tes_name || 'Custom Task',
              state: taskState,
              tes_url: task.tes_url,
              type: task.type,
              creation_time: task.creation_time || new Date().toISOString(),
              end_time: task.end_time,
              tes_name: task.tes_name,
              task_name: task.task_name || task.name,
              instance_healthy: true
            };
          });
      } catch (taskError) {
        console.error('TaskService: Error transforming tasks, using empty array:', taskError);
        tasks = [];
      }
      
      const result = { 
        tasks, 
        dashboardData: {
          ...dashboardData,
          instances_count: dashboardData.instances_count || dashboardData.tes_instances?.length || 0
        }
      };
      
      return result;
    } catch (error) {
      console.error('TaskService: Error listing tasks:', error);
      

      if (error.response?.status === 504) {

        console.warn('TaskService: External TES instances timed out, returning partial data');
        return { 
          tasks: [], 
          dashboardData: { 
            message: 'Some external services are responding slowly',
            partial_data: true 
          } 
        };
      } else if (error.response?.status === 503) {
        console.warn('TaskService: External TES instances unavailable, returning partial data');
        return { 
          tasks: [], 
          dashboardData: { 
            message: 'Some external services are temporarily unavailable',
            partial_data: true 
          } 
        };
      }
      

      console.error('TaskService: Returning empty array due to error:', error.message);
      return [];
    }
  },

  getTaskLogs: async (taskId) => {
    try {
      const response = await api.get(`/api/task_log/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task logs:', error);
      throw error;
    }
  },

  getServiceStatus: async () => {
    try {
      const response = await api.get('/api/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching service status:', error);
      throw error;
    }
  },
  getDashboardData: async () => {
    const response = await api.get('/api/dashboard_data');
    return response.data;
  },


};

export default taskService;
