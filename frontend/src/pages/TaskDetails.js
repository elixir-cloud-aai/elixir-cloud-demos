import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { taskService } from '../services/taskService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, formatTaskStatus } from '../utils/formatters';
import { TASK_STATE_COLORS } from '../utils/constants';
import { ArrowLeft, RefreshCw, StopCircle, FileText } from 'lucide-react';

const PageContainer = styled.div`
  padding: 20px;
  background-color: #f8f9fa;
  min-height: calc(100vh - 80px);
`;

const BackButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-bottom: 20px;
  
  &:hover {
    background: #5a6268;
  }
`;

const PageHeader = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

const Title = styled.h1`
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #333;
  font-weight: 600;
`;

const TaskId = styled.code`
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: #495057;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const CardTitle = styled.h2`
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f8f9fa;
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #495057;
  font-size: 14px;
`;

const InfoValue = styled.span`
  color: #333;
  font-size: 14px;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
`;

const TaskStatus = styled.span`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background-color: ${props => TASK_STATE_COLORS[props.status] || '#6c757d'};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const ActionButton = styled.button`
  background: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LogsSection = styled.div`
  grid-column: 1 / -1;
`;

const LogsContainer = styled.pre`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 15px;
  font-size: 12px;
  line-height: 1.4;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ViewSelector = styled.select`
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: #495057;
  margin-left: 10px;
`;

const StatsCard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  background: #343a40;
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
`;

const StatItem = styled.div`
  text-align: center;
  
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }
  
  .stat-label {
    font-size: 12px;
    opacity: 0.9;
    margin-top: 4px;
  }
`;

const JsonContainer = styled.pre`
  background: #282c34;
  color: #abb2bf;
  border-radius: 8px;
  padding: 16px;
  font-size: 11px;
  line-height: 1.4;
  max-height: 400px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const SectionDivider = styled.hr`
  margin: 15px 0;
  border: none;
  border-top: 1px solid #e9ecef;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  background: ${props => props.color || '#6c757d'};
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 5px;
  margin-bottom: 5px;
`;

const DetailValue = styled.div`
  color: #333;
  font-size: 14px;
  word-break: break-word;
  
  &.code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    background: #f8f9fa;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.4;
  }
  
  &.json {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    background: #f8f9fa;
    padding: 8px;
    border-radius: 4px;
    font-size: 11px;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
`;

const TaskDetails = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewLevel, setViewLevel] = useState(searchParams.get('view') || 'FULL');

  const tesUrl = searchParams.get('tes_url');
  const taskId = searchParams.get('task_id');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching task details for:', { tesUrl, taskId, viewLevel });
        const data = await taskService.getTaskDetails(tesUrl, taskId, viewLevel);
        console.log('Received task details:', data);
        setTaskDetails(data);
      } catch (err) {
        console.error('Error in fetchTaskDetails:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (tesUrl && taskId) {
      fetchData();
    }
  }, [tesUrl, taskId, viewLevel]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Refreshing task details for:', { tesUrl, taskId, viewLevel });
      const data = await taskService.getTaskDetails(tesUrl, taskId, viewLevel);
      console.log('Received task details:', data);
      setTaskDetails(data);
    } catch (err) {
      console.error('Error in fetchTaskDetails:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLevelChange = (newViewLevel) => {
    setViewLevel(newViewLevel);
    const currentParams = new URLSearchParams(window.location.search);
    if (newViewLevel !== 'FULL') {
      currentParams.set('view', newViewLevel);
    } else {
      currentParams.delete('view');
    }
    setSearchParams(currentParams);
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this task?')) return;
    
    try {
      setActionLoading(true);
      await taskService.cancelTask(tesUrl, taskId);
      await fetchTaskDetails(); // Refresh data
    } catch (err) {
      setError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewLogs = () => {
    navigate(`/logs?type=task&taskId=${taskId}`);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner text="Loading task details..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <BackButton onClick={() => navigate('/tasks')}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back to Tasks
        </BackButton>
        <ErrorMessage error={error} title="Failed to load task details" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton onClick={() => navigate('/tasks')}>
        <ArrowLeft size={16} style={{ marginRight: '8px' }} />
        Back to Tasks
      </BackButton>

      <PageHeader>
        <Title>Comprehensive Task Details</Title>
        <TaskId>{taskId}</TaskId>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <ActionButtons>
            <ActionButton onClick={fetchTaskDetails}>
              <RefreshCw size={16} style={{ marginRight: '8px' }} />
              Refresh
            </ActionButton>
            
            <ActionButton onClick={handleViewLogs}>
              <FileText size={16} style={{ marginRight: '8px' }} />
              View Logs
            </ActionButton>
            
            {((taskDetails?.task_json?.state === 'RUNNING') || 
              (taskDetails?.task?.status === 'RUNNING') ||
              (taskDetails?.task?.status === 'QUEUED')) && (
              <ActionButton 
                variant="danger" 
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <StopCircle size={16} style={{ marginRight: '8px' }} />
                Cancel Task
              </ActionButton>
            )}
          </ActionButtons>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#666', marginRight: '8px' }}>Detail Level:</span>
            <ViewSelector 
              value={viewLevel} 
              onChange={(e) => handleViewLevelChange(e.target.value)}
            >
              <option value="MINIMAL">Minimal</option>
              <option value="BASIC">Basic</option>
              <option value="FULL">Full (All Details)</option>
            </ViewSelector>
          </div>
        </div>
      </PageHeader>

      {taskDetails && taskDetails.comprehensive_metadata && (
        <StatsCard>
          <StatItem>
            <div className="stat-value">{taskDetails.comprehensive_metadata.input_count || 0}</div>
            <div className="stat-label">Input Files</div>
          </StatItem>
          <StatItem>
            <div className="stat-value">{taskDetails.comprehensive_metadata.output_count || 0}</div>
            <div className="stat-label">Output Files</div>
          </StatItem>
          <StatItem>
            <div className="stat-value">{taskDetails.comprehensive_metadata.executor_count || 0}</div>
            <div className="stat-label">Executors</div>
          </StatItem>
          <StatItem>
            <div className="stat-value">{taskDetails.comprehensive_metadata.volume_count || 0}</div>
            <div className="stat-label">Volumes</div>
          </StatItem>
          <StatItem>
            <div className="stat-value">{taskDetails.comprehensive_metadata.log_entries || 0}</div>
            <div className="stat-label">Log Entries</div>
          </StatItem>
          <StatItem>
            <div className="stat-value">{taskDetails.comprehensive_metadata.total_cpu_cores || 0}</div>
            <div className="stat-label">CPU Cores</div>
          </StatItem>
          <StatItem>
            <div className="stat-value">{taskDetails.comprehensive_metadata.total_ram_gb || 0}</div>
            <div className="stat-label">RAM (GB)</div>
          </StatItem>
        </StatsCard>
      )}

      {taskDetails && (
        <ContentGrid>
          {/* Basic Information */}
          <ContentCard>
            <CardTitle>Basic Information</CardTitle>
            <InfoRow>
              <InfoLabel>Task ID:</InfoLabel>
              <InfoValue>{(taskDetails.task_json?.id || taskDetails.task?.task_id || taskDetails.task?.id) || 'N/A'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Name:</InfoLabel>
              <InfoValue>{(taskDetails.task_json?.name || taskDetails.task?.task_name || taskDetails.task?.name) || 'Unnamed Task'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>State/Status:</InfoLabel>
              <InfoValue>
                <TaskStatus status={taskDetails.task_json?.state || taskDetails.task?.status || taskDetails.task?.state}>
                  {formatTaskStatus(taskDetails.task_json?.state || taskDetails.task?.status || taskDetails.task?.state)}
                </TaskStatus>
                {taskDetails.comprehensive_metadata?.is_terminal_state && <Badge color="#28a745">Terminal</Badge>}
                {taskDetails.comprehensive_metadata?.is_running && <Badge color="#17a2b8">Active</Badge>}
                {taskDetails.comprehensive_metadata?.is_queued && <Badge color="#ffc107">Queued</Badge>}
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>TES Instance:</InfoLabel>
              <InfoValue>{taskDetails.instance_name || taskDetails.task?.tes_name || 'Unknown'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>TES URL:</InfoLabel>
              <InfoValue style={{ fontSize: '12px', wordBreak: 'break-all' }}>{tesUrl}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Description:</InfoLabel>
              <InfoValue>{(taskDetails.task_json?.description || taskDetails.task?.description) || 'No description'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Data Source:</InfoLabel>
              <InfoValue>
                <Badge color={taskDetails.source === 'tes_instance' ? '#28a745' : '#6f42c1'}>
                  {taskDetails.source === 'tes_instance' ? 'TES Instance API' : 'Dashboard Submission'}
                </Badge>
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>View Level:</InfoLabel>
              <InfoValue><Badge color="#6c757d">{taskDetails.view_level || 'FULL'}</Badge></InfoValue>
            </InfoRow>
          </ContentCard>

          {/* Timing Information */}
          <ContentCard>
            <CardTitle>Timing Information</CardTitle>
            <InfoRow>
              <InfoLabel>Creation Time:</InfoLabel>
              <InfoValue>{formatDate(taskDetails.task_json?.creation_time || taskDetails.task?.submitted_at || taskDetails.task?.creation_time) || 'N/A'}</InfoValue>
            </InfoRow>
            {taskDetails.comprehensive_metadata?.duration_seconds && (
              <InfoRow>
                <InfoLabel>Duration:</InfoLabel>
                <InfoValue>
                  {(() => {
                    const seconds = taskDetails.comprehensive_metadata.duration_seconds;
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    if (hours > 0) return `${hours}h ${minutes % 60}m ${Math.floor(seconds % 60)}s`;
                    if (minutes > 0) return `${minutes}m ${Math.floor(seconds % 60)}s`;
                    return `${Math.floor(seconds)}s`;
                  })()}
                </InfoValue>
              </InfoRow>
            )}
            <InfoRow>
              <InfoLabel>Last Fetched:</InfoLabel>
              <InfoValue>{formatDate(taskDetails.fetch_timestamp) || 'N/A'}</InfoValue>
            </InfoRow>
          </ContentCard>

          {/* Resources */}
          {(taskDetails.task_json?.resources || taskDetails.task?.resources) && (
            <ContentCard>
              <CardTitle>Resource Requirements</CardTitle>
              <InfoRow>
                <InfoLabel>CPU Cores:</InfoLabel>
                <InfoValue>{(taskDetails.task_json?.resources?.cpu_cores || taskDetails.task?.resources?.cpu_cores) || 'N/A'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>RAM (GB):</InfoLabel>
                <InfoValue>{(taskDetails.task_json?.resources?.ram_gb || taskDetails.task?.resources?.ram_gb) || 'N/A'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Disk Space (GB):</InfoLabel>
                <InfoValue>{(taskDetails.task_json?.resources?.disk_gb || taskDetails.task?.resources?.disk_gb) || 'N/A'}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Preemptible:</InfoLabel>
                <InfoValue>
                  {(taskDetails.task_json?.resources?.preemptible || taskDetails.task?.resources?.preemptible) ? 
                    <Badge color="#dc3545">Yes</Badge> : 
                    <Badge color="#28a745">No</Badge>
                  }
                </InfoValue>
              </InfoRow>
              {taskDetails.task_json?.resources?.zones && taskDetails.task_json.resources.zones.length > 0 && (
                <InfoRow>
                  <InfoLabel>Zones:</InfoLabel>
                  <InfoValue>
                    {taskDetails.task_json.resources.zones.map(zone => 
                      <Badge key={zone} color="#17a2b8">{zone}</Badge>
                    )}
                  </InfoValue>
                </InfoRow>
              )}
            </ContentCard>
          )}

          {/* Input Files */}
          {((taskDetails.task_json?.inputs && taskDetails.task_json.inputs.length > 0) || 
            (taskDetails.task?.inputs && taskDetails.task.inputs.length > 0)) && (
            <ContentCard>
              <CardTitle>Input Files ({taskDetails.comprehensive_metadata?.input_count || 0})</CardTitle>
              {(taskDetails.task_json?.inputs || taskDetails.task?.inputs || []).map((input, index) => (
                <div key={index}>
                  <InfoRow>
                    <InfoLabel>Name:</InfoLabel>
                    <InfoValue>{input.name || `Input ${index + 1}`}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>URL:</InfoLabel>
                    <InfoValue className="code">{input.url || 'N/A'}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Path:</InfoLabel>
                    <InfoValue className="code">{input.path || 'N/A'}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Type:</InfoLabel>
                    <InfoValue><Badge color="#6f42c1">{input.type || 'FILE'}</Badge></InfoValue>
                  </InfoRow>
                  {input.content && (
                    <InfoRow>
                      <InfoLabel>Content:</InfoLabel>
                      <DetailValue className="json">{input.content}</DetailValue>
                    </InfoRow>
                  )}
                  {index < ((taskDetails.task_json?.inputs || taskDetails.task?.inputs || []).length - 1) && <SectionDivider />}
                </div>
              ))}
            </ContentCard>
          )}

          {/* Output Files */}
          {((taskDetails.task_json?.outputs && taskDetails.task_json.outputs.length > 0) || 
            (taskDetails.task?.outputs && taskDetails.task.outputs.length > 0)) && (
            <ContentCard>
              <CardTitle>Output Files ({taskDetails.comprehensive_metadata?.output_count || 0})</CardTitle>
              {(taskDetails.task_json?.outputs || taskDetails.task?.outputs || []).map((output, index) => (
                <div key={index}>
                  <InfoRow>
                    <InfoLabel>Name:</InfoLabel>
                    <InfoValue>{output.name || `Output ${index + 1}`}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>URL:</InfoLabel>
                    <InfoValue className="code">{output.url || 'N/A'}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Path:</InfoLabel>
                    <InfoValue className="code">{output.path || 'N/A'}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Type:</InfoLabel>
                    <InfoValue><Badge color="#6f42c1">{output.type || 'FILE'}</Badge></InfoValue>
                  </InfoRow>
                  {output.path_prefix && (
                    <InfoRow>
                      <InfoLabel>Path Prefix:</InfoLabel>
                      <InfoValue className="code">{output.path_prefix}</InfoValue>
                    </InfoRow>
                  )}
                  {index < ((taskDetails.task_json?.outputs || taskDetails.task?.outputs || []).length - 1) && <SectionDivider />}
                </div>
              ))}
            </ContentCard>
          )}

          {/* Executors */}
          {((taskDetails.task_json?.executors && taskDetails.task_json.executors.length > 0) || 
            (taskDetails.task?.executors && taskDetails.task.executors.length > 0)) && (
            <ContentCard>
              <CardTitle>Executors ({taskDetails.comprehensive_metadata?.executor_count || 0})</CardTitle>
              {(taskDetails.task_json?.executors || taskDetails.task?.executors || []).map((executor, index) => (
                <div key={index}>
                  <InfoRow>
                    <InfoLabel>Docker Image:</InfoLabel>
                    <InfoValue className="code">{executor.image || 'N/A'}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Command:</InfoLabel>
                    <DetailValue className="code">
                      {Array.isArray(executor.command) ? executor.command.join(' ') : (executor.command || 'N/A')}
                    </DetailValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Working Directory:</InfoLabel>
                    <InfoValue className="code">{executor.workdir || '/tmp'}</InfoValue>
                  </InfoRow>
                  {executor.env && Object.keys(executor.env).length > 0 && (
                    <InfoRow>
                      <InfoLabel>Environment Variables:</InfoLabel>
                      <DetailValue className="json">
                        {JSON.stringify(executor.env, null, 2)}
                      </DetailValue>
                    </InfoRow>
                  )}
                  <InfoRow>
                    <InfoLabel>STDIN:</InfoLabel>
                    <InfoValue className="code">{executor.stdin || 'None'}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>STDOUT:</InfoLabel>
                    <InfoValue className="code">{executor.stdout || 'None'}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>STDERR:</InfoLabel>
                    <InfoValue className="code">{executor.stderr || 'None'}</InfoValue>
                  </InfoRow>
                  {executor.ignore_error !== undefined && (
                    <InfoRow>
                      <InfoLabel>Ignore Errors:</InfoLabel>
                      <InfoValue>
                        {executor.ignore_error ? 
                          <Badge color="#ffc107">Yes</Badge> : 
                          <Badge color="#28a745">No</Badge>
                        }
                      </InfoValue>
                    </InfoRow>
                  )}
                  {index < ((taskDetails.task_json?.executors || taskDetails.task?.executors || []).length - 1) && <SectionDivider />}
                </div>
              ))}
            </ContentCard>
          )}

          {/* Volumes */}
          {((taskDetails.task_json?.volumes && taskDetails.task_json.volumes.length > 0) || 
            (taskDetails.task?.volumes && taskDetails.task.volumes.length > 0)) && (
            <ContentCard>
              <CardTitle>Volumes ({taskDetails.comprehensive_metadata?.volume_count || 0})</CardTitle>
              {(taskDetails.task_json?.volumes || taskDetails.task?.volumes || []).map((volume, index) => (
                <div key={index}>
                  <InfoRow>
                    <InfoLabel>Name:</InfoLabel>
                    <InfoValue>{volume.name || `Volume ${index + 1}`}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Size (GB):</InfoLabel>
                    <InfoValue>{volume.size_gb || 'N/A'}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Mount Path:</InfoLabel>
                    <InfoValue className="code">{volume.mount_path || 'N/A'}</InfoValue>
                  </InfoRow>
                  {volume.source && (
                    <InfoRow>
                      <InfoLabel>Source:</InfoLabel>
                      <InfoValue className="code">{volume.source}</InfoValue>
                    </InfoRow>
                  )}
                  {index < ((taskDetails.task_json?.volumes || taskDetails.task?.volumes || []).length - 1) && <SectionDivider />}
                </div>
              ))}
            </ContentCard>
          )}

          {/* Tags */}
          {taskDetails.task_json?.tags && Object.keys(taskDetails.task_json.tags).length > 0 && (
            <ContentCard>
              <CardTitle>Tags ({Object.keys(taskDetails.task_json.tags).length})</CardTitle>
              <DetailValue className="json">
                {JSON.stringify(taskDetails.task_json.tags, null, 2)}
              </DetailValue>
            </ContentCard>
          )}

          {/* Task Logs */}
          <LogsSection>
            <ContentCard>
              <CardTitle>Task Logs ({taskDetails.comprehensive_metadata?.log_entries || 0} entries)</CardTitle>
              {((taskDetails.task_json?.logs && taskDetails.task_json.logs.length > 0) ||
                (taskDetails.task?.logs && taskDetails.task.logs.length > 0)) ? (
                <div>
                  {(taskDetails.task_json?.logs || taskDetails.task?.logs || []).map((log, index) => (
                    <div key={index} style={{ marginBottom: '20px', border: '1px solid #eee', padding: '15px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: '600', color: '#333' }}>Log Entry {index + 1}</span>
                        {log.start_time && (
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {formatDate(log.start_time)} - {formatDate(log.end_time) || 'Running'}
                          </span>
                        )}
                      </div>
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Metadata:</strong>
                          <DetailValue className="json">
                            {JSON.stringify(log.metadata, null, 2)}
                          </DetailValue>
                        </div>
                      )}
                      
                      {(log.stdout || log.system_logs) && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong>STDOUT:</strong>
                          <LogsContainer style={{ marginTop: '5px', maxHeight: '200px' }}>
                            {log.stdout || log.system_logs || 'No stdout available'}
                          </LogsContainer>
                        </div>
                      )}
                      
                      {log.stderr && (
                        <div>
                          <strong>STDERR:</strong>
                          <LogsContainer style={{ marginTop: '5px', maxHeight: '200px', borderColor: '#dc3545' }}>
                            {log.stderr}
                          </LogsContainer>
                        </div>
                      )}
                      
                      {log.exit_code !== undefined && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: log.exit_code === 0 ? '#28a745' : '#dc3545' }}>
                          <strong>Exit Code:</strong> <Badge color={log.exit_code === 0 ? '#28a745' : '#dc3545'}>{log.exit_code}</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No logs available for this task
                  {taskDetails.source === 'dashboard_submitted' && (
                    <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
                      Note: This task was submitted through the dashboard. 
                      Full TES logs may be available directly from the TES instance.
                    </div>
                  )}
                </div>
              )}
            </ContentCard>
          </LogsSection>

          {/* Raw Task JSON */}
          <LogsSection>
            <ContentCard>
              <CardTitle>Complete Task JSON ({(taskDetails.raw_response_size || 0).toLocaleString()} characters)</CardTitle>
              <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Badge color={taskDetails.source === 'tes_instance' ? '#28a745' : '#6f42c1'}>
                  {taskDetails.source === 'tes_instance' ? 'TES Instance API' : 'Dashboard Submission'}
                </Badge>
                {taskDetails.tes_endpoint && (
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    Endpoint: {taskDetails.tes_endpoint}
                  </span>
                )}
              </div>
              <JsonContainer>
                {JSON.stringify(taskDetails.task_json || taskDetails.task || {}, null, 2)}
              </JsonContainer>
            </ContentCard>
          </LogsSection>
        </ContentGrid>
      )}
    </PageContainer>
  );
};

export default TaskDetails;
