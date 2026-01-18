import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import api from '../services/api';
import { 
  Wifi, Globe, Server, Clock, AlertCircle, CheckCircle, Shield, 
  Plus, Trash2, ArrowUp, ArrowDown, Github, Settings, 
  Play, Pause, RotateCcw, Eye, Code, ExternalLink, BarChart3
} from 'lucide-react';

const UtilitiesContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
`;

const PageSubtitle = styled.p`
  color: #6b7280;
  font-size: 1rem;
`;

const ServiceStatusSection = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  margin-bottom: 2rem;
`;

const MiddlewareSection = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  background: #f9fafb;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const SectionDescription = styled.p`
  color: #6b7280;
  font-size: 0.875rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: ${props => 
    props.$primary ? '#3b82f6' : 
    props.$success ? '#10b981' :
    props.$warning ? '#f59e0b' :
    props.$danger ? '#ef4444' : 'white'
  };
  color: ${props => 
    props.$primary || props.$success || props.$warning || props.$danger ? 'white' : '#374151'
  };
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
  font-size: 1rem;
`;

const ErrorState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #ef4444;
  font-size: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 1rem;
`;

const ServicesList = styled.div`
  padding: 1.5rem 2rem;
`;

const ServiceItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1rem;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const ServiceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-grow: 1;
`;

const ServiceIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => 
    props.$status === 'online' ? '#dcfce7' : '#fee2e2'
  };
  color: ${props => 
    props.$status === 'online' ? '#16a34a' : '#dc2626'
  };
`;

const ServiceDetails = styled.div`
  flex-grow: 1;
`;

const ServiceName = styled.div`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ServiceUrl = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-family: monospace;
`;

const ServiceBadge = styled.span`
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 12px;
  background: ${props => props.$isGateway ? '#dbeafe' : '#f3f4f6'};
  color: ${props => props.$isGateway ? '#2563eb' : '#374151'};
`;

const ServiceStatus = styled.div`
  text-align: right;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: ${props => 
    props.$status === 'online' ? '#16a34a' : '#dc2626'
  };
`;

const StatusIcon = styled.span`
  display: flex;
  align-items: center;
`;

const LastChecked = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
`;

const RefreshInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #6b7280;
`;

const MiddlewareList = styled.div`
  padding: 1.5rem 2rem;
`;

const MiddlewareItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border: 2px solid ${props => props.$enabled ? '#d1fae5' : '#fee2e2'};
  border-radius: 12px;
  margin-bottom: 1rem;
  background: ${props => props.$enabled ? '#f0fdf4' : '#fefcfc'};
  transition: all 0.3s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const MiddlewareOrder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const OrderNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.875rem;
`;

const OrderControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const OrderButton = styled.button`
  width: 24px;
  height: 24px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f3f4f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MiddlewareContent = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MiddlewareHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const MiddlewareIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.$type) {
      case 'authentication':
      case 'authorization':
        return '#fef3c7';
      case 'logging':
        return '#dbeafe';
      case 'monitoring':
        return '#d1fae5';
      default:
        return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'authentication':
      case 'authorization':
        return '#d97706';
      case 'logging':
        return '#2563eb';
      case 'monitoring':
        return '#059669';
      default:
        return '#374151';
    }
  }};
`;

const MiddlewareInfo = styled.div`
  flex-grow: 1;
`;

const MiddlewareName = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MiddlewareType = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: capitalize;
  margin-bottom: 0.5rem;
`;

const MiddlewareDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
`;

const SourceBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 12px;
  background: #f3f4f6;
  color: #374151;
`;

const MiddlewareStats = styled.div`
  display: flex;
  gap: 2rem;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 12px;
  background: ${props => props.$enabled ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.$enabled ? '#16a34a' : '#dc2626'};
`;

const MiddlewareActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;

  svg {
    color: #d1d5db;
    margin-bottom: 1rem;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  p {
    margin-bottom: 1.5rem;
  }
`;
 
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;

  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const ModalBody = styled.div`
  padding: 2rem;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormCheckbox = styled.input`
  width: 1rem;
  height: 1rem;
`;

const CodePreview = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 1rem;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  overflow-x: auto;

  pre {
    margin: 0;
    white-space: pre-wrap;
  }
`;

const Utilities = () => { 
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
 
  const [middlewares, setMiddlewares] = useState([]);
  const [middlewareLoading, setMiddlewareLoading] = useState(true);
  const [middlewareError, setMiddlewareError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMiddleware, setSelectedMiddleware] = useState(null);
  const [newMiddleware, setNewMiddleware] = useState({
    name: '',
    type: 'authentication',
    source: 'local',
    githubUrl: '',
    filePath: '',
    description: '',
    priority: 5,
    enabled: true,
    config: {}
  });

  const middlewareTypes = [
    'authentication',
    'authorization', 
    'rate_limiting',
    'logging',
    'validation',
    'caching',
    'monitoring'
  ];
 
  const checkServiceHealth = useCallback(async () => {
    try {
      const response = await api.get('/api/service-info');
      
      if (response.data && response.data.tesInstances) {
        const healthChecks = await Promise.allSettled(
          response.data.tesInstances.map(async (instance) => {
            try {
              const startTime = Date.now();
              const healthResponse = await fetch(`${instance.url}/api/service-info`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                },
                timeout: 5000
              });
              const responseTime = Date.now() - startTime;
              
              return {
                ...instance,
                status: healthResponse.ok ? 'online' : 'offline',
                responseTime: responseTime
              };
            } catch (err) {
              return {
                ...instance,
                status: 'offline',
                responseTime: null,
                error: err.message
              };
            }
          })
        );

        const servicesWithHealth = healthChecks.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              ...response.data.tesInstances[index],
              status: 'offline',
              responseTime: null,
              error: result.reason?.message || 'Unknown error'
            };
          }
        });

        setServices(servicesWithHealth);
        setLastChecked(new Date());
      } else {
        setServices([]);
      }
      
      setServicesError(null);
    } catch (err) {
      console.error('Health check error:', err);
      setServicesError(err.message || 'Failed to check service health');
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, []);
 
  const fetchMiddlewares = useCallback(async () => {
    try {
      setMiddlewareLoading(true);
      const response = await fetch('/api/middleware/status');
      const data = await response.json();
      
      if (data.status === 'success') {
        const middlewareList = Object.values(data.middlewares).map((middleware, index) => ({
          id: middleware.name,
          ...middleware,
          order: middleware.priority || index,
          source: 'local'  
        }));
         
        middlewareList.sort((a, b) => a.priority - b.priority);
        setMiddlewares(middlewareList);
        setMiddlewareError(null);
      } else {
        setMiddlewareError(data.error || 'Failed to fetch middlewares');
      }
    } catch (err) {
      setMiddlewareError('Network error: ' + err.message);
    } finally {
      setMiddlewareLoading(false);
    }
  }, []);

  const toggleMiddleware = async (middlewareName) => {
    try {
      const response = await fetch(`/api/middleware/${middlewareName}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setMiddlewares(prev => 
          prev.map(m => 
            m.name === middlewareName 
              ? { ...m, enabled: data.enabled }
              : m
          )
        );
      } else {
        alert('Error: ' + (data.error || 'Failed to toggle middleware'));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const moveMiddleware = (index, direction) => {
    const newMiddlewares = [...middlewares];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newMiddlewares.length) { 
      const currentPriority = newMiddlewares[index].priority;
      const targetPriority = newMiddlewares[targetIndex].priority;
      
      newMiddlewares[index].priority = targetPriority;
      newMiddlewares[targetIndex].priority = currentPriority;
       
      newMiddlewares.sort((a, b) => a.priority - b.priority);
      setMiddlewares(newMiddlewares);
       
      console.log(`Moving middleware ${newMiddlewares[index].name} ${direction}`);
    }
  };

  const addMiddleware = async () => {
    try { 
      if (!newMiddleware.name.trim()) {
        alert('Middleware name is required');
        return;
      }

      if (newMiddleware.source === 'github' && !newMiddleware.githubUrl) {
        alert('GitHub URL is required for external middlewares');
        return;
      }
 
      if (middlewares.some(m => m.name.toLowerCase() === newMiddleware.name.toLowerCase())) {
        alert('Middleware with this name already exists');
        return;
      }
 
      const middlewareToAdd = {
        ...newMiddleware,
        id: newMiddleware.name.toLowerCase().replace(/\s+/g, '_'),
        order: middlewares.length,
        metrics: {}
      };

      setMiddlewares(prev => {
        const updated = [...prev, middlewareToAdd];
        return updated.sort((a, b) => a.priority - b.priority);
      });
      
      setShowAddModal(false);
      setNewMiddleware({
        name: '',
        type: 'authentication',
        source: 'local',
        githubUrl: '',
        filePath: '',
        description: '',
        priority: 5,
        enabled: true,
        config: {}
      });
 
      console.log('Adding middleware:', middlewareToAdd);
    } catch (err) {
      alert('Error adding middleware: ' + err.message);
    }
  };

  const removeMiddleware = async (middlewareId) => {
    if (window.confirm(`Are you sure you want to remove middleware "${middlewareId}"?`)) {
      setMiddlewares(prev => prev.filter(m => m.id !== middlewareId)); 
      console.log('Removing middleware:', middlewareId);
    }
  };

  const viewMiddlewareCode = (middleware) => {
    if (middleware.source === 'github') {
      window.open(middleware.githubUrl, '_blank');
    } else { 
      setSelectedMiddleware(middleware);
    }
  };
 
  useEffect(() => {
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 3000);
    return () => clearInterval(interval);
  }, [checkServiceHealth]);

  useEffect(() => {
    fetchMiddlewares();
  }, [fetchMiddlewares]);
 
  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle size={16} />;
      case 'offline':
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  const getMiddlewareIcon = (type) => {
    switch (type) {
      case 'authentication':
      case 'authorization':
        return <Shield size={20} />;
      case 'logging':
        return <Eye size={20} />;
      case 'monitoring':
        return <BarChart3 size={20} />;
      default:
        return <Settings size={20} />;
    }
  };

  return (
    <UtilitiesContainer>
      <PageHeader>
        <PageTitle>Utilities</PageTitle>
        <PageSubtitle>System monitoring and gateway middleware management</PageSubtitle>
      </PageHeader>
 
      <ServiceStatusSection>
        <SectionHeader>
          <div>
            <SectionTitle>TES Instance Health</SectionTitle>
            <SectionDescription>
              Real-time health monitoring of all configured TES service instances
            </SectionDescription>
          </div>
        </SectionHeader>

        {servicesLoading && services.length === 0 ? (
          <LoadingState>Loading service information...</LoadingState>
        ) : servicesError && services.length === 0 ? (
          <ErrorState>{servicesError}</ErrorState>
        ) : (
          <>
            <ServicesList>
              {services.map((service, index) => (
                <ServiceItem key={`${service.url}-${index}`}>
                  <ServiceInfo>
                    <ServiceIcon $status={service.status}>
                      <Server size={20} />
                    </ServiceIcon>
                    <ServiceDetails>
                      <ServiceName>
                        {service.name || 'TES Service'}
                        {service.isGateway && (
                          <ServiceBadge $isGateway={true}>Gateway</ServiceBadge>
                        )}
                        {service.country && !service.isGateway && (
                          <ServiceBadge $isGateway={false}>{service.country}</ServiceBadge>
                        )}
                      </ServiceName>
                      <ServiceUrl>{service.url}</ServiceUrl>
                    </ServiceDetails>
                  </ServiceInfo>

                  <ServiceStatus>
                    <StatusIndicator $status={service.status}>
                      <StatusIcon>{getStatusIcon(service.status)}</StatusIcon>
                      {getStatusText(service.status)}
                    </StatusIndicator>
                    
                    <LastChecked>
                      {service.responseTime && (
                        <div>{service.responseTime}ms</div>
                      )}
                      {lastChecked && (
                        <div>
                          <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {lastChecked.toLocaleTimeString()}
                        </div>
                      )}
                    </LastChecked>
                  </ServiceStatus>
                </ServiceItem>
              ))}

              {services.length === 0 && !servicesLoading && (
                <ServiceItem>
                  <ServiceInfo>
                    <ServiceIcon>
                      <AlertCircle size={20} />
                    </ServiceIcon>
                    <ServiceDetails>
                      <ServiceName>No services configured</ServiceName>
                    </ServiceDetails>
                  </ServiceInfo>
                </ServiceItem>
              )}
            </ServicesList>

            <RefreshInfo>
              <Wifi size={14} />
              Checking service health every 3 seconds while this page is active
              {lastChecked && (
                <span style={{ marginLeft: 'auto' }}>
                  Last updated: {lastChecked.toLocaleString()}
                </span>
              )}
            </RefreshInfo>
          </>
        )}
      </ServiceStatusSection>
 
      <MiddlewareSection>
        <SectionHeader>
          <div>
            <SectionTitle>Gateway Middleware Management</SectionTitle>
            <SectionDescription>
              Manage, reorder, and configure middleware components for the TES Gateway. Supports external GitHub repositories.
            </SectionDescription>
          </div>
          <HeaderActions>
            <ActionButton onClick={() => setShowAddModal(true)} $primary>
              <Plus size={16} />
              Add Middleware
            </ActionButton>
            <ActionButton onClick={fetchMiddlewares}>
              <RotateCcw size={16} />
              Refresh
            </ActionButton>
          </HeaderActions>
        </SectionHeader>

        {middlewareLoading ? (
          <LoadingState>Loading middleware configuration...</LoadingState>
        ) : middlewareError ? (
          <ErrorState>{middlewareError}</ErrorState>
        ) : (
          <MiddlewareList>
            {middlewares.map((middleware, index) => (
              <MiddlewareItem key={middleware.id} $enabled={middleware.enabled}>
                <MiddlewareOrder>
                  <OrderNumber>{index + 1}</OrderNumber>
                  <OrderControls>
                    <OrderButton 
                      onClick={() => moveMiddleware(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp size={14} />
                    </OrderButton>
                    <OrderButton 
                      onClick={() => moveMiddleware(index, 'down')}
                      disabled={index === middlewares.length - 1}
                    >
                      <ArrowDown size={14} />
                    </OrderButton>
                  </OrderControls>
                </MiddlewareOrder>

                <MiddlewareContent>
                  <MiddlewareHeader>
                    <MiddlewareIcon $type={middleware.type}>
                      {getMiddlewareIcon(middleware.type)}
                    </MiddlewareIcon>
                    <MiddlewareInfo>
                      <MiddlewareName>
                        {middleware.name}
                        {middleware.source === 'github' && (
                          <SourceBadge>
                            <Github size={12} />
                            GitHub
                          </SourceBadge>
                        )}
                      </MiddlewareName>
                      <MiddlewareType>{middleware.type.replace('_', ' ')}</MiddlewareType>
                      {middleware.description && (
                        <MiddlewareDescription>{middleware.description}</MiddlewareDescription>
                      )}
                    </MiddlewareInfo>
                  </MiddlewareHeader>

                  <MiddlewareStats>
                    <StatItem>
                      <StatLabel>Priority</StatLabel>
                      <StatValue>{middleware.priority}</StatValue>
                    </StatItem>
                    <StatItem>
                      <StatLabel>Status</StatLabel>
                      <StatusBadge $enabled={middleware.enabled}>
                        {middleware.enabled ? 'Enabled' : 'Disabled'}
                      </StatusBadge>
                    </StatItem>
                    {middleware.source && (
                      <StatItem>
                        <StatLabel>Source</StatLabel>
                        <StatValue style={{ textTransform: 'capitalize' }}>{middleware.source}</StatValue>
                      </StatItem>
                    )}
                  </MiddlewareStats>
                </MiddlewareContent>

                <MiddlewareActions>
                  <ActionButton 
                    onClick={() => toggleMiddleware(middleware.name)}
                    $success={!middleware.enabled}
                    $warning={middleware.enabled}
                  >
                    {middleware.enabled ? <Pause size={16} /> : <Play size={16} />}
                    {middleware.enabled ? 'Disable' : 'Enable'}
                  </ActionButton>
                  <ActionButton onClick={() => viewMiddlewareCode(middleware)}>
                    {middleware.source === 'github' ? <ExternalLink size={16} /> : <Code size={16} />}
                    View Code
                  </ActionButton>
                  <ActionButton 
                    onClick={() => removeMiddleware(middleware.id)}
                    $danger
                  >
                    <Trash2 size={16} />
                    Remove
                  </ActionButton>
                </MiddlewareActions>
              </MiddlewareItem>
            ))}

            {middlewares.length === 0 && (
              <EmptyState>
                <Shield size={48} />
                <h3>No middlewares configured</h3>
                <p>Add your first middleware to start managing the gateway processing pipeline</p>
                <ActionButton onClick={() => setShowAddModal(true)} $primary>
                  <Plus size={16} />
                  Add Middleware
                </ActionButton>
              </EmptyState>
            )}
          </MiddlewareList>
        )}
      </MiddlewareSection>
 
      {showAddModal && (
        <ModalOverlay onClick={() => setShowAddModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Add New Middleware</h2>
              <CloseButton onClick={() => setShowAddModal(false)}>×</CloseButton>
            </ModalHeader>
            
            <ModalBody>
              <FormGroup>
                <FormLabel>Name *</FormLabel>
                <FormInput
                  type="text"
                  value={newMiddleware.name}
                  onChange={(e) => setNewMiddleware({...newMiddleware, name: e.target.value})}
                  placeholder="Enter middleware name"
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Type</FormLabel>
                <FormSelect
                  value={newMiddleware.type}
                  onChange={(e) => setNewMiddleware({...newMiddleware, type: e.target.value})}
                >
                  {middlewareTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </FormSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel>Source</FormLabel>
                <FormSelect
                  value={newMiddleware.source}
                  onChange={(e) => setNewMiddleware({...newMiddleware, source: e.target.value})}
                >
                  <option value="local">Local Implementation</option>
                  <option value="github">External GitHub Repository</option>
                </FormSelect>
              </FormGroup>

              {newMiddleware.source === 'github' && (
                <>
                  <FormGroup>
                    <FormLabel>GitHub Repository URL *</FormLabel>
                    <FormInput
                      type="url"
                      value={newMiddleware.githubUrl}
                      onChange={(e) => setNewMiddleware({...newMiddleware, githubUrl: e.target.value})}
                      placeholder="https://github.com/username/repo"
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <FormLabel>File Path (optional)</FormLabel>
                    <FormInput
                      type="text"
                      value={newMiddleware.filePath}
                      onChange={(e) => setNewMiddleware({...newMiddleware, filePath: e.target.value})}
                      placeholder="src/middleware/custom_middleware.py"
                    />
                  </FormGroup>
                </>
              )}

              <FormGroup>
                <FormLabel>Description</FormLabel>
                <FormTextarea
                  value={newMiddleware.description}
                  onChange={(e) => setNewMiddleware({...newMiddleware, description: e.target.value})}
                  placeholder="Brief description of middleware functionality"
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Priority (1-10, lower = higher priority)</FormLabel>
                <FormInput
                  type="number"
                  min="1"
                  max="10"
                  value={newMiddleware.priority}
                  onChange={(e) => setNewMiddleware({...newMiddleware, priority: parseInt(e.target.value)})}
                />
              </FormGroup>

              <CheckboxGroup>
                <FormCheckbox
                  type="checkbox"
                  checked={newMiddleware.enabled}
                  onChange={(e) => setNewMiddleware({...newMiddleware, enabled: e.target.checked})}
                />
                <FormLabel>Enable immediately after adding</FormLabel>
              </CheckboxGroup>
            </ModalBody>

            <ModalFooter>
              <ActionButton onClick={() => setShowAddModal(false)}>Cancel</ActionButton>
              <ActionButton onClick={addMiddleware} $primary>
                <Plus size={16} />
                Add Middleware
              </ActionButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
 
      {selectedMiddleware && (
        <ModalOverlay onClick={() => setSelectedMiddleware(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>{selectedMiddleware.name} - Source Code</h2>
              <CloseButton onClick={() => setSelectedMiddleware(null)}>×</CloseButton>
            </ModalHeader>
            
            <ModalBody>
              <CodePreview>
                <pre>
                  <code>
                    {`# ${selectedMiddleware.name} - ${selectedMiddleware.type}
# This is a placeholder for the actual middleware implementation
# In a real system, this would show the actual source code

class ${selectedMiddleware.name.replace(/\s+/g, '')}Middleware(BaseMiddleware):
    def __init__(self, config):
        super().__init__(config)
        self.enabled = ${selectedMiddleware.enabled}
        self.priority = ${selectedMiddleware.priority}
    
    async def process_request(self, context):
        """
        Process incoming request through ${selectedMiddleware.type} middleware
        
        Args:
            context: MiddlewareContext containing request information
            
        Returns:
            tuple: (should_continue: bool, response: dict or None)
        """
        if not self.enabled:
            return True, None
            
        # ${selectedMiddleware.type} implementation would go here
        print(f"Processing request through ${selectedMiddleware.name}")
        
        return True, None
    
    async def process_response(self, context, response):
        """
        Process outgoing response through ${selectedMiddleware.type} middleware
        
        Args:
            context: MiddlewareContext containing request information
            response: Response data to process
            
        Returns:
            response: Modified or original response
        """
        if not self.enabled:
            return response
            
        # Response processing implementation would go here
        return response`}
                  </code>
                </pre>
              </CodePreview>
            </ModalBody>

            <ModalFooter>
              <ActionButton onClick={() => setSelectedMiddleware(null)}>Close</ActionButton>
              {selectedMiddleware.source === 'github' && selectedMiddleware.githubUrl && (
                <ActionButton 
                  onClick={() => window.open(selectedMiddleware.githubUrl, '_blank')}
                  $primary
                >
                  <ExternalLink size={16} />
                  View on GitHub
                </ActionButton>
              )}
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </UtilitiesContainer>
  );
};

export default Utilities;
