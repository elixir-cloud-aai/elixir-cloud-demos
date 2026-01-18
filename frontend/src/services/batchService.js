import api from './api';

export const batchService = {
  submitSnakemakeBatch: async (batchData) => {
    try {
      const formData = new FormData();
      
      formData.append('batch_mode', batchData.batchMode);
      if (batchData.snakefile) {
        formData.append('snakefile', batchData.snakefile);
      }
      if (batchData.smkDir) {
        formData.append('smk_dir', batchData.smkDir);
      }
      
      const response = await api.post('/api/batch_snakemake', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting Snakemake batch:', error);
      throw error;
    }
  },

  submitNextflowBatch: async (batchData) => {
    try {
      const formData = new FormData();
      formData.append('batch_mode', batchData.batchMode);
      if (batchData.nextflowFile) {
        formData.append('nextflow_file', batchData.nextflowFile);
      }
      if (batchData.nextflowConfig) {
        formData.append('nextflow_config', batchData.nextflowConfig);
      }
      formData.append('nextflow_params', batchData.nextflowParams || '{}');
      
      const response = await api.post('/api/batch_nextflow', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting Nextflow batch:', error);
      throw error;
    }
  },

  submitCwlBatch: async (batchData) => {
    try {
      const formData = new FormData();
      
      formData.append('batch_mode', batchData.batchMode);
      if (batchData.cwlFile) {
        formData.append('cwl_file', batchData.cwlFile);
      }
      if (batchData.inputsFile) {
        formData.append('inputs_file', batchData.inputsFile);
      }
      
      const response = await api.post('/api/batch_cwl', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting CWL batch:', error);
      throw error;
    }
  },

  getBatchLogs: async (runId) => {
    try {
      const encodedRunId = encodeURIComponent(runId);
      const response = await api.get(`/api/batch_log/${encodedRunId}`);
      if (response.data && response.data.success && response.data.log) {
        return response.data.log;
      } else if (response.data && response.data.log) {
        return response.data.log;
      } else {
        return 'No log content available for this batch run';
      }
    } catch (error) {
      console.error('Error fetching batch logs:', error);
      throw error;
    }
  },

  getBatchLog: async (runId) => {
    try {
      const encodedRunId = encodeURIComponent(runId);
      const response = await api.get(`/api/batch_log/${encodedRunId}`);
      if (response.data && response.data.success && response.data.log) {
        return response.data.log;
      } else if (response.data && response.data.log) {
        return response.data.log;
      } else {
        return 'No log content available for this batch run';
      }
    } catch (error) {
      console.error('Error fetching batch log:', error);
      throw error;
    }
  },

  getBatchRuns: async () => {
    try {
      const response = await api.get('/api/batch_runs');
      const batchRuns = response.data || [];
      const healthyBatchRuns = batchRuns.filter(run => {
        return run && 
               run.run_id && 
               run.tes_url &&
               run.status &&
               !run.connection_error &&
               !run.timeout_error &&
               run.status !== 'CONNECTION_ERROR' &&
               run.status !== 'TIMEOUT_ERROR' &&
               run.status !== 'SYSTEM_ERROR';
      });
      
      console.log(`BatchService: Filtered ${healthyBatchRuns.length} healthy batch runs out of ${batchRuns.length} total`);
      return healthyBatchRuns;
    } catch (error) {
      console.error('Error fetching batch runs:', error);
      if (error.response?.status === 504 || error.response?.status === 503) {
        console.warn('External services timeout/unavailable, returning empty batch runs');
        return [];
      }
      
      throw error;
    }
  }
};

export default batchService;
