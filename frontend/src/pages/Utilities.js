import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import api from '../services/api';
import { Wifi, Globe, Server, Clock, AlertCircle, CheckCircle } from 'lucide-react';

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
`;

const SectionHeader = styled.div`
  background: #f9fafb;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
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

const ServicesList = styled.div`
  padding: 1rem;
`;

const ServiceItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: ${props => props.$isGateway ? '#f0f9ff' : '#ffffff'};
  transition: all 0.2s ease;
  
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
  flex: 1;
`;

const ServiceIcon = styled.div`
  margin-right: 1rem;
  color: ${props => props.$isGateway ? '#0369a1' : '#4b5563'};
`;

const ServiceDetails = styled.div`
  flex: 1;
`;

const ServiceName = styled.div`
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
`;

const ServiceUrl = styled.div`
  color: #6b7280;
  font-size: 0.8rem;
  font-family: monospace;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
`;

const ServiceBadge = styled.div`
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => props.$isGateway ? '#dbeafe' : '#f3f4f6'};
  color: ${props => props.$isGateway ? '#1e40af' : '#6b7280'};
`;

const ServiceStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'online': return '#dcfce7';
      case 'offline': return '#fee2e2';
      case 'checking': return '#fef3c7';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'online': return '#166534';
      case 'offline': return '#991b1b';
      case 'checking': return '#92400e';
      default: return '#374151';
    }
  }};
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
`;

const LastChecked = styled.div`
  color: #6b7280;
  font-size: 0.75rem;
  text-align: right;
`;

const RefreshInfo = styled.div`
  padding: 1rem 2rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Utilities = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const checkServiceHealth = async (service) => {
    const startTime = performance.now();
    
    try {
      // For the gateway, check the test connection endpoint
      if (service.isGateway) {
        const response = await api.get('/api/test_connection', { timeout: 5000 });
        const responseTime = Math.round(performance.now() - startTime);
        return {
          ...service,
          status: response.status === 200 ? 'online' : 'offline',
          responseTime,
          endpoint: service.url
        };
      } else {
        // For TES nodes, use backend proxy to avoid CORS issues
        const response = await api.get(`/api/service-health/${encodeURIComponent(service.id)}`, { timeout: 10000 });
        
        const responseTime = Math.round(performance.now() - startTime);
        
        if (response.status === 200 && response.data) {
          return {
            ...service,
            status: response.data.status || 'offline',
            responseTime: response.data.responseTime || responseTime,
            endpoint: response.data.endpoint,
            serviceInfo: response.data.serviceInfo,
            error: response.data.error
          };
        } else {
          return {
            ...service,
            status: 'offline',
            responseTime,
            error: 'Invalid response from backend'
          };
        }
      }
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      return {
        ...service,
        status: 'offline',
        responseTime,
        error: error.message
      };
    }
  };

  const checkAllServices = useCallback(async () => {
    setLoading(true);
    
    // Gateway service configuration
    const gatewayService = {
      id: 'gateway',
      name: 'TES Gateway',
      url: 'http://localhost:8000',
      isGateway: true
    };
    
    try {
      // Load TES nodes from backend
      const nodesResponse = await api.get('/api/nodes');
      console.log('🔍 Nodes response:', nodesResponse.data);
      
      // Ensure we have an array of nodes
      let tesNodes = [];
      if (Array.isArray(nodesResponse.data)) {
        tesNodes = nodesResponse.data.map(node => ({
          ...node,
          isGateway: false
        }));
      } else if (nodesResponse.data && Array.isArray(nodesResponse.data.nodes)) {
        tesNodes = nodesResponse.data.nodes.map(node => ({
          ...node,
          isGateway: false
        }));
      } else {
        console.warn('⚠️ No valid nodes array found in response');
        tesNodes = [];
      }

      // Create list with gateway first, then TES nodes in configured order
      const allServices = [gatewayService, ...tesNodes];

      // Check health for all services
      const healthChecks = allServices.map(service => ({
        ...service,
        status: 'checking'
      }));
      
      setServices(healthChecks);

      // Perform actual health checks
      const healthResults = await Promise.all(
        allServices.map(service => checkServiceHealth(service))
      );

      setServices(healthResults);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking services:', error);
      // If we can't load the nodes, at least check the gateway
      const gatewayResult = await checkServiceHealth(gatewayService);
      setServices([gatewayResult]);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkAllServices();

    // Set up interval for continuous checking while page is visible
    const interval = setInterval(checkAllServices, 3000); // Check every 3 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [checkAllServices]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle size={16} />;
      case 'offline':
        return <AlertCircle size={16} />;
      case 'checking':
        return <LoadingSpinner />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return '🟢 Online';
      case 'offline':
        return '🔴 Offline';
      case 'checking':
        return '🟡 Checking...';
      default:
        return '⚪ Unknown';
    }
  };

  return (
    <UtilitiesContainer>
      <PageHeader>
        <PageTitle>Utilities</PageTitle>
        <PageSubtitle>System utilities and service monitoring tools</PageSubtitle>
      </PageHeader>

      <ServiceStatusSection>
        <SectionHeader>
          <SectionTitle>Service Status</SectionTitle>
          <SectionDescription>
            Real-time health monitoring of the TES gateway and all configured TES nodes
          </SectionDescription>
        </SectionHeader>

        <ServicesList>
          {services.map((service) => (
            <ServiceItem key={service.id} $isGateway={service.isGateway}>
              <ServiceInfo>
                <ServiceIcon $isGateway={service.isGateway}>
                  {service.isGateway ? <Globe size={20} /> : <Server size={20} />}
                </ServiceIcon>
                
                <ServiceDetails>
                  <ServiceName>
                    {service.name}
                    {service.isGateway && (
                      <ServiceBadge $isGateway={true}>GATEWAY</ServiceBadge>
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

          {services.length === 0 && !loading && (
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
      </ServiceStatusSection>
    </UtilitiesContainer>
  );
};

export default Utilities;