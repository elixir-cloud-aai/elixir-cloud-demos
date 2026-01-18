import { apiClient } from './api';

export const logService = {
  getTaskLogs: async (taskId, tesUrl = null) => {
    try {
      if (tesUrl) {
        const response = await apiClient.get('/api/task_details', {
          params: { 
            task_id: taskId,
            tes_url: tesUrl,
            view: 'FULL'
          }
        });
        
        if (response.data.success && response.data.task_json) {
          return {
            success: true,
            log: formatTaskLog(response.data.task_json),
            task: response.data.task_json
          };
        }
      }
      
      const response = await apiClient.get(`/api/task_log/${encodeURIComponent(taskId)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task logs:', error);
      return {
        success: false,
        log: `Error fetching logs: ${error.message}`
      };
    }
  },

  getWorkflowLogs: async (runId) => {
    try {
      const response = await apiClient.get(`/api/workflow_log/${encodeURIComponent(runId)}`);
      return response.data.log || 'No workflow logs available';
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      return `Error fetching workflow logs: ${error.message}`;
    }
  },

  getBatchLogs: async (runId) => {
    try {
      const response = await apiClient.get(`/api/batch_log/${encodeURIComponent(runId)}`);
      return response.data.log || 'No batch logs available';
    } catch (error) {
      console.error('Error fetching batch logs:', error);
      return `Error fetching batch logs: ${error.message}`;
    }
  },

  getTopologyLogs: async () => {
    try {
      const response = await apiClient.get('/api/topology_logs');
      return response.data.logs || [];
    } catch (error) {
      console.error('Error fetching topology logs:', error);
      return [];
    }
  }
};

function formatTaskLog(taskJson) {
  let logContent = `=== Task Execution Log ===
Task ID: ${taskJson.id}
Task Name: ${taskJson.name || 'Unknown'}
State: ${taskJson.state}
Created: ${taskJson.creation_time || 'Unknown'}

`;

  if (taskJson.executors && taskJson.executors.length > 0) {
    logContent += `=== Executor Configuration ===\n`;
    taskJson.executors.forEach((executor, idx) => {
      logContent += `\nExecutor ${idx + 1}:
  Image: ${executor.image}
  Command: ${Array.isArray(executor.command) ? executor.command.join(' ') : executor.command}
  Working Directory: ${executor.workdir || 'N/A'}
`;
    });
    logContent += '\n';
  }

  if (taskJson.logs && taskJson.logs.length > 0) {
    logContent += `=== Execution Logs ===\n\n`;
    
    taskJson.logs.forEach((logEntry, logIdx) => {
      logContent += `Log Entry ${logIdx + 1}:
  Start Time: ${logEntry.start_time || 'N/A'}
  End Time: ${logEntry.end_time || 'N/A'}
`;

      if (logEntry.metadata && Object.keys(logEntry.metadata).length > 0) {
        logContent += `  Metadata:\n`;
        Object.entries(logEntry.metadata).forEach(([key, value]) => {
          logContent += `    ${key}: ${value}\n`;
        });
      }

      if (logEntry.logs && logEntry.logs.length > 0) {
        logEntry.logs.forEach((execLog, execIdx) => {
          logContent += `\n  === Executor ${execIdx + 1} Output ===\n`;
          logContent += `  Start: ${execLog.start_time || 'N/A'}\n`;
          logContent += `  End: ${execLog.end_time || 'N/A'}\n`;
          logContent += `  Exit Code: ${execLog.exit_code !== undefined ? execLog.exit_code : 'N/A'}\n`;
          
          if (execLog.stdout) {
            logContent += `\n  --- STDOUT ---\n${execLog.stdout}\n`;
          }
          
          if (execLog.stderr) {
            logContent += `\n  --- STDERR ---\n${execLog.stderr}\n`;
          }
        });
      }
      
      logContent += '\n';
    });
  } else {
    logContent += `=== No Execution Logs Available ===
The task may still be running or logs were not captured.
`;
  }

  if (taskJson.resources) {
    logContent += `\n=== Resource Configuration ===
CPU Cores: ${taskJson.resources.cpu_cores || 'N/A'}
RAM (GB): ${taskJson.resources.ram_gb || 'N/A'}
Disk (GB): ${taskJson.resources.disk_gb || 'N/A'}
`;
  }

  if (taskJson.inputs && taskJson.inputs.length > 0) {
    logContent += `\n=== Inputs ===\n`;
    taskJson.inputs.forEach((input, idx) => {
      logContent += `Input ${idx + 1}: ${input.url || input.path}\n`;
    });
  }

  if (taskJson.outputs && taskJson.outputs.length > 0) {
    logContent += `\n=== Outputs ===\n`;
    taskJson.outputs.forEach((output, idx) => {
      logContent += `Output ${idx + 1}: ${output.url || output.path}\n`;
    });
  }

  return logContent;
}

export default logService;