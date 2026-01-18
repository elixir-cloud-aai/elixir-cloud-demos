import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api, { testConnection } from '../services/api';
import { taskService } from '../services/taskService';
import usePolling from '../hooks/usePolling';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, formatTaskStatus } from '../utils/formatters';
import { TASK_STATE_COLORS } from '../utils/constants';
import { 
  Activity, 
  Server, 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

const DashboardContainer = styled.div`
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border-left: 4px solid ${props => props.color || '#007bff'};
  transition: all 0.2s ease;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    ${props => props.clickable && `
      border-left-width: 6px;
    `}
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
`;

const StatIcon = styled.div`
  margin-right: 12px;
  color: ${props => props.color || '#007bff'};
`;

const StatTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: ${props => props.color || '#333'};
  margin-bottom: 5px;
`;

const StatSubtext = styled.div`
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ClickableHint = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  color: ${props => props.color || '#007bff'};
  opacity: 0.7;
  transition: opacity 0.2s ease;
  
  ${StatCard}:hover & {
    opacity: 1;
  }
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const HealthCard = styled(ContentCard)`
  margin-bottom: 20px;
`;

const HealthHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const HealthTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  color: #333;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HealthStatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  background: ${props => {
    if (props.status === 'healthy') return '#d4edda';
    if (props.status === 'warning') return '#fff3cd';
    return '#f8d7da';
  }};
  color: ${props => {
    if (props.status === 'healthy') return '#155724';
    if (props.status === 'warning') return '#856404';
    return '#721c24';
  }};
`;

const HealthContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const DonutChart = styled.svg`
  transform: rotate(-90deg);
`;

const ChartLabel = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
`;

const ChartPercentage = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: ${props => props.color || '#333'};
`;

const ChartText = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 4px;
`;

const HealthStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const HealthStatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid ${props => props.color || '#6c757d'};
`;

const HealthStatLabel = styled.div`
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HealthStatValue = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: ${props => props.color || '#333'};
`;

const HealthSummary = styled.div`
  margin-top: 15px;
  padding: 15px;
  background: ${props => {
    if (props.status === 'healthy') return '#d4edda';
    if (props.status === 'warning') return '#fff3cd';
    return '#f8d7da';
  }};
  border-radius: 8px;
  border-left: 4px solid ${props => {
    if (props.status === 'healthy') return '#28a745';
    if (props.status === 'warning') return '#ffc107';
    return '#dc3545';
  }};
  color: ${props => {
    if (props.status === 'healthy') return '#155724';
    if (props.status === 'warning') return '#856404';
    return '#721c24';
  }};
  font-size: 14px;
  line-height: 1.6;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  color: #333;
  font-weight: 600;
`;

const RefreshButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 12px;
  
  &:hover {
    background: #0056b3;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TasksList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const TaskItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f8f9fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TaskInfo = styled.div`
  flex-grow: 1;
`;

const TaskId = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
`;

const TaskMeta = styled.div`
  font-size: 12px;
  color: #666;
`;

const TaskStatus = styled.div`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background-color: ${props => TASK_STATE_COLORS[props.status] || '#6c757d'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [connectionTest, setConnectionTest] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const [apiHealth, setApiHealth] = useState({
    loading: true,
    healthy: 0,
    unhealthy: 0,
    total: 0,
    percentage: 0,
    status: 'unknown',
    services: [],
    error: null,
    lastUpdated: null,
    loaded: false
  });

  const fetchApiHealthRef = useRef(null);
  
  const fetchApiHealth = useCallback(async () => {
  try {
    setApiHealth(prev => ({ ...prev, loading: true }));
    
    const dashboardResponse = await api.get('/api/dashboard_data');
    const allInstances = dashboardResponse.data.tes_instances || [];
    
    console.log('📋 Checking health for', allInstances.length, 'instances');
    
    const healthCheckPromises = allInstances.map(async (instance) => {
      try {
        const startTime = Date.now();
        await api.get('/api/service_info', {
          params: { tes_url: instance.url },
          timeout: 5000 
        });
        
        const responseTime = Date.now() - startTime;
        
        return {
          name: instance.name,
          url: instance.url,
          status: 'online',
          health: 'healthy',
          response_time: responseTime,
          last_checked: new Date().toISOString()
        };
      } catch (error) {
        return {
          name: instance.name,
          url: instance.url,
          status: 'offline',
          health: 'unhealthy',
          response_time: null,
          last_checked: new Date().toISOString(),
          error: error.message
        };
      }
    });
    
    const healthResults = await Promise.all(healthCheckPromises);
    
    const total = healthResults.length;
    const healthy = healthResults.filter(r => r.health === 'healthy').length;
    const unhealthy = total - healthy;
    const percentage = total > 0 ? Math.round((healthy / total) * 100) : 0;
    
    let status = 'unknown';
    if (total === 0) {
      status = 'unknown';
    } else if (percentage >= 80) {
      status = 'healthy';
    } else if (percentage >= 50) {
      status = 'warning';
    } else {
      status = 'error';
    }
    
    console.log('📈 Health check results:', {
      total,
      healthy,
      unhealthy,
      percentage,
      status
    });
    
    setApiHealth({
      loading: false,
      loaded: true,
      healthy: healthy || 0,
      unhealthy: unhealthy || 0,
      total: total || 0,
      percentage: percentage || 0,
      status,
      services: healthResults,
      lastUpdated: new Date().toISOString(),
      error: null
    });
    
  } catch (error) {
    console.error('❌ Error fetching API health status:', error);
    
    const errorMessage = error.response?.data?.error || error.message || 'Unable to connect to health monitoring service';
    
    setApiHealth(prev => ({
      ...prev,
      loading: false,
      loaded: true,
      status: 'error',
      error: errorMessage,
      healthy: 0,
      unhealthy: 0,
      total: 0,
      percentage: 0
    }));
  }
}, []);
  
  fetchApiHealthRef.current = fetchApiHealth;

  useEffect(() => {
    if (fetchApiHealthRef.current) {
      fetchApiHealthRef.current();
    }
  }, []);

  const refetchDashboardRef = useRef(null);

  const { 
    data: combinedData, 
    loading: dashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard 
  } = usePolling(() => taskService.listTasks(), 3600000);

  refetchDashboardRef.current = refetchDashboard;

  let tasksData, dashboardData;
  
  if (Array.isArray(combinedData)) {
    tasksData = combinedData;
    dashboardData = null;
  } else if (combinedData && typeof combinedData === 'object') {
    tasksData = combinedData.tasks || [];
    dashboardData = combinedData.dashboardData || null;
  } else {
    tasksData = [];
    dashboardData = null;
  }
  
  const tasksLoading = dashboardLoading;
  const tasksError = dashboardError;
  const refetchTasks = refetchDashboard;

  const handleRefresh = useCallback(() => {
    if (refetchDashboardRef.current) {
      refetchDashboardRef.current();
    }
    if (fetchApiHealthRef.current) {
      fetchApiHealthRef.current();
    }
  }, []);

  const [directDashboardData, setDirectDashboardData] = React.useState(null);
  
  React.useEffect(() => {
    const fetchDirectDashboardData = async () => {
      try {
        const apiBaseUrl = process.env.REACT_APP_API_URL || '';
        const url = apiBaseUrl ? `${apiBaseUrl}/api/dashboard_data` : '/api/dashboard_data';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setDirectDashboardData(data);
        }
      } catch (error) {
      }
    };
    
    const timer = setTimeout(() => {
      fetchDirectDashboardData();
    }, 3600000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleTestConnection = async () => {
    setTestLoading(true);
    try {
      const result = await testConnection();
      setConnectionTest(result);
    } catch (error) {
      setConnectionTest({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };




  const tasksArray = Array.isArray(tasksData) ? tasksData : [];
  const stats = {
    totalTasks: tasksArray.length || 0,
    runningTasks: tasksArray.filter(task => task.state === 'RUNNING').length || 0,
    completedTasks: tasksArray.filter(task => task.state === 'COMPLETE').length || 0,
    failedTasks: tasksArray.filter(task => 
      task.state === 'EXECUTOR_ERROR' || task.state === 'SYSTEM_ERROR'
    ).length || 0,
    tesInstances: dashboardData?.instances_count || directDashboardData?.instances_count || dashboardData?.tes_instances?.length || directDashboardData?.tes_instances?.length || dashboardData?.healthy_instances?.length || 9,
    workflowRuns: dashboardData?.workflow_runs?.length || 0,
    batchRuns: dashboardData?.batch_runs?.length || 0
  };

  if (dashboardLoading && !dashboardData) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const getHealthColor = (status) => {
    if (status === 'healthy') return '#28a745';
    if (status === 'warning') return '#ffc107';
    return '#dc3545';
  };

  const renderDonutChart = () => {
    try {
      const size = 120;
      const strokeWidth = 12;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const total = apiHealth?.total || 0;
      const healthy = apiHealth?.healthy || 0;
      const unhealthy = apiHealth?.unhealthy || 0;
      const healthyPercentage = total > 0 ? (healthy / total) : 0;
      const unhealthyPercentage = total > 0 ? (unhealthy / total) : 0;
      
      const healthyLength = Math.max(0, healthyPercentage * circumference);
      const unhealthyLength = Math.max(0, unhealthyPercentage * circumference);
      
      return (
        <ChartContainer>
          <div style={{ position: 'relative', width: size, height: size }}>
            <DonutChart width={size} height={size}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e9ecef"
                strokeWidth={strokeWidth}
              />
              {healthy > 0 && healthyLength > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#28a745"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${healthyLength} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                />
              )}
              {unhealthy > 0 && unhealthyLength > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#dc3545"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${unhealthyLength} ${circumference}`}
                  strokeDashoffset={-healthyLength}
                  strokeLinecap="round"
                />
              )}
            </DonutChart>
            <ChartLabel>
              <ChartPercentage color={getHealthColor(apiHealth?.status || 'unknown')}>
                {apiHealth?.percentage || 0}%
              </ChartPercentage>
              <ChartText>Healthy</ChartText>
            </ChartLabel>
          </div>
        </ChartContainer>
      );
    } catch (error) {
      console.error('Error rendering donut chart:', error);
      return (
        <ChartContainer>
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Chart unavailable
          </div>
        </ChartContainer>
      );
    }
  };

  return (
    <DashboardContainer>
      <StatsGrid>
        <StatCard 
          color="#007bff" 
          clickable 
          onClick={() => navigate('/tasks')}
        >
          <StatHeader>
            <StatIcon color="#007bff">
              <Activity size={24} />
            </StatIcon>
            <StatTitle>Total Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#007bff">{stats.totalTasks}</StatValue>
          <StatSubtext>
            <span>Across all TES instances</span>
            <ClickableHint color="#007bff">
              View all <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </ClickableHint>
          </StatSubtext>
        </StatCard>

        <StatCard 
          color="#28a745" 
          clickable 
          onClick={() => navigate('/tasks')}
        >
          <StatHeader>
            <StatIcon color="#28a745">
              <PlayCircle size={24} />
            </StatIcon>
            <StatTitle>Running Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#28a745">{stats.runningTasks}</StatValue>
          <StatSubtext>
            <span>Currently executing</span>
            <ClickableHint color="#28a745">
              View tasks <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </ClickableHint>
          </StatSubtext>
        </StatCard>

        <StatCard 
          color="#28a745" 
          clickable 
          onClick={() => navigate('/tasks')}
        >
          <StatHeader>
            <StatIcon color="#28a745">
              <CheckCircle size={24} />
            </StatIcon>
            <StatTitle>Completed</StatTitle>
          </StatHeader>
          <StatValue color="#28a745">{stats.completedTasks}</StatValue>
          <StatSubtext>
            <span>Successfully finished</span>
            <ClickableHint color="#28a745">
              View tasks <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </ClickableHint>
          </StatSubtext>
        </StatCard>

        <StatCard 
          color="#dc3545" 
          clickable 
          onClick={() => navigate('/tasks')}
        >
          <StatHeader>
            <StatIcon color="#dc3545">
              <XCircle size={24} />
            </StatIcon>
            <StatTitle>Failed Tasks</StatTitle>
          </StatHeader>
          <StatValue color="#dc3545">{stats.failedTasks}</StatValue>
          <StatSubtext>
            <span>Execution errors</span>
            <ClickableHint color="#dc3545">
              View tasks <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </ClickableHint>
          </StatSubtext>
        </StatCard>

        <StatCard 
          color="#17a2b8" 
          clickable 
          onClick={() => navigate('/utilities')}
        >
          <StatHeader>
            <StatIcon color="#17a2b8">
              <Server size={24} />
            </StatIcon>
            <StatTitle>TES Instances</StatTitle>
          </StatHeader>
          <StatValue color="#17a2b8">{stats.tesInstances}</StatValue>
          <StatSubtext>
            <span>Available services</span>
            <ClickableHint color="#17a2b8">
              Manage <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </ClickableHint>
          </StatSubtext>
        </StatCard>

        <StatCard 
          color="#ffc107" 
          clickable 
          onClick={() => navigate('/batch')}
        >
          <StatHeader>
            <StatIcon color="#ffc107">
              <Clock size={24} />
            </StatIcon>
            <StatTitle>Batch Runs</StatTitle>
          </StatHeader>
          <StatValue color="#ffc107">{stats.batchRuns}</StatValue>
          <StatSubtext>
            <span>Batch executions</span>
            <ClickableHint color="#ffc107">
              View batch <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </ClickableHint>
          </StatSubtext>
        </StatCard>
      </StatsGrid>

      <HealthCard>
  <HealthHeader>
    <HealthTitle>
      <Server size={24} />
      API Health Status
    </HealthTitle>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {apiHealth.loading ? (
        <LoadingSpinner size="small" />
      ) : (
        <HealthStatusBadge status={apiHealth?.status || 'unknown'}>
          {apiHealth?.status === 'healthy' && <CheckCircle size={16} />}
          {apiHealth?.status === 'warning' && <AlertTriangle size={16} />}
          {apiHealth?.status === 'error' && <XCircle size={16} />}
          {apiHealth?.status === 'healthy' ? 'All Systems Operational' : 
           apiHealth?.status === 'warning' ? 'Degraded Performance' : 
           apiHealth?.status === 'error' ? 'Service Issues Detected' : 'Status Unknown'}
        </HealthStatusBadge>
      )}
      <RefreshButton 
        onClick={() => {
          if (fetchApiHealthRef.current) {
            fetchApiHealthRef.current();
          }
        }} 
        disabled={apiHealth.loading}
        title="Refresh API health status"
      >
        <RefreshCw size={14} style={{ marginRight: '5px' }} />
        {apiHealth.loading ? 'Checking...' : 'Refresh'}
      </RefreshButton>
    </div>
  </HealthHeader>
  
  {apiHealth.loading && (
    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
      <LoadingSpinner size="small" text="Checking API health status..." />
    </div>
  )}
  {!apiHealth.loading && apiHealth.loaded && (
    <>
      {apiHealth.error ? (
        <div style={{ padding: '20px' }}>
          <ErrorMessage message={apiHealth.error} />
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <RefreshButton 
              onClick={() => {
                if (fetchApiHealthRef.current) {
                  fetchApiHealthRef.current();
                }
              }}
            >
              <RefreshCw size={14} style={{ marginRight: '5px' }} />
              Retry
            </RefreshButton>
          </div>
        </div>
      ) : (
        <HealthContent>
          {renderDonutChart()}
          <HealthStats>
            <HealthStatRow color="#28a745">
              <HealthStatLabel>
                <CheckCircle size={18} color="#28a745" />
                Healthy Services
              </HealthStatLabel>
              <HealthStatValue color="#28a745">
                {apiHealth.healthy} / {apiHealth.total}
              </HealthStatValue>
            </HealthStatRow>
            
            <HealthStatRow color="#dc3545">
              <HealthStatLabel>
                <XCircle size={18} color="#dc3545" />
                Unhealthy Services
              </HealthStatLabel>
              <HealthStatValue color="#dc3545">
                {apiHealth.unhealthy} / {apiHealth.total}
              </HealthStatValue>
            </HealthStatRow>
            
            <HealthStatRow color="#17a2b8">
              <HealthStatLabel>
                <Server size={18} color="#17a2b8" />
                Total Services
              </HealthStatLabel>
              <HealthStatValue color="#17a2b8">
                {apiHealth.total}
              </HealthStatValue>
            </HealthStatRow>
            
            <HealthSummary status={apiHealth?.status || 'unknown'}>
              {apiHealth?.status === 'healthy' && (
                <>
                  <strong>✓ All Systems Operational</strong><br />
                  All {apiHealth.total} TES service instances are online and responding normally. System health is optimal.
                </>
              )}
              {apiHealth?.status === 'warning' && (
                <>
                  <strong>⚠ Degraded Performance</strong><br />
                  {apiHealth.unhealthy} of {apiHealth.total} TES instances are currently unavailable. {apiHealth.healthy} instances remain operational. Some services may experience delays.
                </>
              )}
              {apiHealth?.status === 'error' && (
                <>
                  <strong>✗ Service Issues Detected</strong><br />
                  {apiHealth.unhealthy} of {apiHealth.total} TES instances are currently unavailable. Only {apiHealth.healthy} instances are operational. Please check the System Status page for detailed information.
                </>
              )}
              {apiHealth?.status === 'unknown' && apiHealth.total === 0 && (
                <>
                  <strong>⚠️ No Services Configured</strong><br />
                  No TES instances are currently configured or available. Please check the backend configuration or add TES instances in the Utilities section.
                </>
              )}
            </HealthSummary>
            {apiHealth?.lastUpdated && (
              <div style={{ marginTop: '15px', fontSize: '12px', color: '#999', textAlign: 'right' }}>
                Last updated: {formatDate(new Date(apiHealth.lastUpdated))}
              </div>
            )}
          </HealthStats>
        </HealthContent>
      )}
    </>
  )}
</HealthCard>

      <ContentCard style={{ marginBottom: '20px' }}>
        <CardHeader>
          <CardTitle>🔗 Connection Status</CardTitle>
          <RefreshButton onClick={handleTestConnection} disabled={testLoading}>
            <RefreshCw size={14} style={{ marginRight: '5px' }} />
            Test Connection
          </RefreshButton>
        </CardHeader>
        
        {testLoading && <LoadingSpinner size="small" text="Testing connection..." />}
        
        {connectionTest && !testLoading && (
          <div>
            {connectionTest.error ? (
              <div>
                <ErrorMessage message={`Connection test failed: ${connectionTest.error}`} />
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                  Please verify that the backend API is running and accessible. Check the API URL configuration if the issue persists.
                </div>
              </div>
            ) : (
              <div style={{ color: '#28a745', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle size={20} />
                  <span>Backend API Connection Successful</span>
                </div>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: '400', marginLeft: '28px' }}>
                  {connectionTest.message || 'API is responding normally'}
                  {connectionTest.timestamp && (
                    <span style={{ display: 'block', marginTop: '4px' }}>
                      Test ID: {connectionTest.timestamp}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {!connectionTest && !testLoading && (
          <div style={{ color: '#666', fontSize: '14px' }}>
            Click "Test Connection" to verify backend API connectivity.
          </div>
        )}
        

      </ContentCard>

      <ContentGrid>
        <ContentCard>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <RefreshButton onClick={refetchTasks} disabled={tasksLoading}>
              <RefreshCw size={14} style={{ marginRight: '5px' }} />
              Refresh
            </RefreshButton>
          </CardHeader>

          {tasksError && <ErrorMessage error={tasksError} />}
          
          {tasksLoading && <LoadingSpinner size="small" text="Loading tasks..." />}
          
          {tasksArray && tasksArray.length > 0 ? (
            <TasksList>
              {tasksArray.slice(0, 10).map((task, index) => (
                <TaskItem key={task.id || index}>
                  <TaskInfo>
                    <TaskId>{task.id || `Task ${index + 1}`}</TaskId>
                    <TaskMeta>
                      Created: {formatDate(task.creation_time)} | 
                      TES: {task.tes_url || 'Unknown'}
                    </TaskMeta>
                  </TaskInfo>
                  <TaskStatus status={task.state}>
                    {formatTaskStatus(task.state)}
                  </TaskStatus>
                </TaskItem>
              ))}
            </TasksList>
          ) : (
            <EmptyState>No tasks found</EmptyState>
          )}
        </ContentCard>
        <ContentCard>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <RefreshButton onClick={handleRefresh}>
              <RefreshCw size={14} style={{ marginRight: '5px' }} />
              Refresh
            </RefreshButton>
          </CardHeader>

          {dashboardError && <ErrorMessage error={dashboardError} />}
          
          {dashboardData && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <strong>TES Instances Available:</strong> {stats.tesInstances}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>TES Gateway:</strong> {dashboardData.tes_gateway || 'Not configured'}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>Workflow Runs:</strong> {stats.workflowRuns}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>Latest Path:</strong> {dashboardData.latest_path?.join(', ') || 'None'}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>Instance Source:</strong> Dashboard Data with Fresh Instances
              </div>
              <div>
                <strong>Last Updated:</strong> {formatDate(new Date())}
              </div>
            </div>
          )}
        </ContentCard>
      </ContentGrid>
    </DashboardContainer>
  );
};

export default Dashboard;
