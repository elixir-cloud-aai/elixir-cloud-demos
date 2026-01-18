export const TASK_STATES = {
  UNKNOWN: 'UNKNOWN',
  QUEUED: 'QUEUED',
  INITIALIZING: 'INITIALIZING',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETE: 'COMPLETE',
  EXECUTOR_ERROR: 'EXECUTOR_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CANCELED: 'CANCELED',
  PREEMPTED: 'PREEMPTED'
};

export const TASK_STATE_COLORS = {
  [TASK_STATES.UNKNOWN]: '#6c757d',
  [TASK_STATES.QUEUED]: '#ffc107',
  [TASK_STATES.INITIALIZING]: '#17a2b8',
  [TASK_STATES.RUNNING]: '#007bff',
  [TASK_STATES.PAUSED]: '#fd7e14',
  [TASK_STATES.COMPLETE]: '#28a745',
  [TASK_STATES.EXECUTOR_ERROR]: '#dc3545',
  [TASK_STATES.SYSTEM_ERROR]: '#dc3545',
  [TASK_STATES.CANCELED]: '#6c757d',
  [TASK_STATES.PREEMPTED]: '#e83e8c'
};

export const WORKFLOW_TYPES = {
  SNAKEMAKE: 'snakemake',
  NEXTFLOW: 'nextflow',
  CWL: 'cwl'
};

export const API_ENDPOINTS = {
  TEST_CONNECTION: '/api/test_connection',
  DASHBOARD_DATA: '/api/dashboard_data',
  TASK_DETAILS: '/task_details',
  SUBMIT_TASK: '/submit',
  CANCEL_TASK: '/cancel_task',
  LIST_TASKS: '/list_tasks',
  TASK_LOG: '/task_log',
  SUBMIT_WORKFLOW: '/submit_workflow',
  WORKFLOW_LOG: '/workflow_log',
  BATCH_SNAKEMAKE: '/batch_snakemake',
  BATCH_NEXTFLOW: '/batch_nextflow',
  BATCH_LOG: '/batch_log',
  SERVICE_INFO: '/api/service_info',
  STATUS: '/status',
  DEBUG_ENV: '/debug_env',
  TOPOLOGY_LOGS: '/api/topology_logs'
};

export const POLLING_INTERVALS = {
  FAST: 2000,
  NORMAL: 5000,
  SLOW: 10000,
  VERY_SLOW: 30000
};

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, 
  ALLOWED_TYPES: [
    'text/plain',
    'application/yaml',
    'application/x-yaml',
    'text/yaml',
    'text/x-yaml',
    '.nf',
    '.smk',
    '.cwl',
    '.py'
  ]
};

export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100]
};

export const THEME = {
  PRIMARY: '#007bff',
  SECONDARY: '#6c757d',
  SUCCESS: '#28a745',
  DANGER: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#17a2b8',
  LIGHT: '#f8f9fa',
  DARK: '#343a40'
};

export const TES_INSTANCES = [
  { name: 'Funnel/OpenPBS @ ELIXIR-CZ', url: 'https://funnel.cloud.e-infra.cz', id: 'funnel-cz' },
  { name: 'Funnel/Slurm @ ELIXIR-FI', url: 'https://vm4816.kaj.pouta.csc.fi', id: 'funnel-fi' },
  { name: 'TESK/Kubernetes @ ELIXIR-CZ (Prod)', url: 'https://tesk-prod.cloud.e-infra.cz', id: 'elixir-cz-prod' },
  { name: 'TESK/Kubernetes @ ELIXIR-CZ (NA)', url: 'https://tesk-na.cloud.e-infra.cz', id: 'elixir-cz-na' },
  { name: 'TESK/Kubernetes @ ELIXIR-DE', url: 'https://tesk.elixir-cloud.bi.denbi.de', id: 'elixir-de' },
  { name: 'TESK/Kubernetes @ ELIXIR-GR', url: 'https://tesk-eu.hypatia-comp.athenarc.gr', id: 'elixir-gr' },
  { name: 'TESK/OpenShift @ ELIXIR-FI', url: 'https://csc-tesk-noauth.rahtiapp.fi', id: 'elixir-fi' },
  { name: 'TESK North America', url: 'https://tesk-na.cloud.e-infra.cz', id: 'tesk-na' },
  { name: 'Local TES', url: 'http://localhost:8080', id: 'local-tes' }
];
