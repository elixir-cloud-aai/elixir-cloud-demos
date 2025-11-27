import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  RefreshCw,
  Globe,
  Zap,
  Activity
} from 'lucide-react';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { formatDate } from '../../utils/formatters';

const ServiceStatusContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

const StatusHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
`;

const StatusTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  color: #333;
  font-weight: 600;
  display: flex;
  align-items: center;
`;

const StatusIcon = styled.div`
  margin-right: 10px;
  color: #007bff;
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
  margin-left: auto;
  
  &:hover {
    background: #0056b3;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HealthSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
`;

const HealthCard = styled.div`
  background: ${props => props.bgColor || '#f8f9fa'};
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  border-left: 4px solid ${props => props.borderColor || '#007bff'};
`;

const HealthValue = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.color || '#333'};
  margin-bottom: 5px;
`;

const HealthLabel = styled.div`
  font-size: 14px;
  color: #666;
  font-weight: 500;
`;

const ServicesGrid = styled.div`
  display: grid;
  gap: 15px;
  margin-bottom: 20px;
`;

const ServiceCard = styled.div`
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  background: ${props => {
    switch(props.status) {
      case 'online': return '#f8fff8';
      case 'offline': return '#fff5f5';
      case 'error': return '#fff8f0';
      case 'timeout': return '#f0f0ff';
      default: return '#ffffff';
    }
  }};
  border-left: 4px solid ${props => {
    switch(props.status) {
      case 'online': return '#28a745';
      case 'offline': return '#dc3545';
      case 'error': return '#ffc107';
      case 'timeout': return '#6c757d';
      default: return '#dee2e6';
    }
  }};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
`;

const ServiceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
`;

const ServiceInfo = styled.div`
  flex-grow: 1;
`;

const ServiceName = styled.h3`
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
`;

const ServiceType = styled.span`
  background: #007bff;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 8px;
`;

const ServiceUrl = styled.div`
  font-size: 12px;
  color: #666;
  word-break: break-all;
  margin-bottom: 5px;
`;

const ServiceLocation = styled.div`
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: ${props => {
    switch(props.status) {
      case 'online': return '#28a745';
      case 'offline': return '#dc3545';
      case 'error': return '#ffc107';
      case 'timeout': return '#6c757d';
      default: return '#6c757d';
    }
  }};
  margin-left: 10px;
`;

const ServiceDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
`;

const DetailItem = styled.div`
  text-align: center;
`;

const DetailValue = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #333;
`;

const DetailLabel = styled.div`
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
`;

const ErrorDetails = styled.div`
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 8px;
  margin-top: 10px;
  font-size: 12px;
  color: #721c24;
`;

const CapabilityStatus = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
`;

const CapabilityCard = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  background: ${props => props.available ? '#f8fff8' : '#fff5f5'};
  border: 1px solid ${props => props.available ? '#c3e6cb' : '#f1aeb5'};
`;

const CapabilityIcon = styled.div`
  margin-right: 10px;
  color: ${props => props.available ? '#28a745' : '#dc3545'};
`;

const CapabilityText = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.available ? '#155724' : '#721c24'};
`;

const getStatusIcon = (status) => {
  switch(status) {
    case 'online': return <CheckCircle size={16} />;
    case 'offline': return <XCircle size={16} />;
    case 'error': return <AlertTriangle size={16} />;
    case 'timeout': return <Clock size={16} />;
    default: return <Server size={16} />;
  }
};

const ServiceStatus = () => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchServiceStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching service status from:', 'http://localhost:8000/api/service_status');
      const response = await axios.get('http://localhost:8000/api/service_status');
      setStatusData(response.data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err.message);
      console.error('Error fetching service status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch service status on component mount and set up auto-refresh
  useEffect(() => {
    fetchServiceStatus();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchServiceStatus, 30000);
    
    return () => clearInterval(interval);
  }, []); // Empty dependencies array

  const handleRefresh = () => {
    fetchServiceStatus();
  };

  if (loading && !statusData) {
    return (
      <ServiceStatusContainer>
        <LoadingSpinner text="Loading service status..." />
      </ServiceStatusContainer>
    );
  }

  if (error && !statusData) {
    return (
      <ServiceStatusContainer>
        <ErrorMessage message={`Error loading service status: ${error}`} />
      </ServiceStatusContainer>
    );
  }

  const { services = [], summary = {} } = statusData || {};
  
  // Calculate error services count for display
  const errorServices = services.filter(s => s.status === 'error' || s.status === 'timeout').length;

  return (
    <ServiceStatusContainer>
      <StatusHeader>
        <StatusTitle>
          <StatusIcon>
            <Activity size={24} />
          </StatusIcon>
          Service Status
        </StatusTitle>
        <RefreshButton onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={14} style={{ marginRight: '5px' }} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </RefreshButton>
      </StatusHeader>

      {/* Health Summary */}
      <HealthSummary>
        <HealthCard 
          bgColor="#f8fff8" 
          borderColor="#28a745"
        >
          <HealthValue color="#28a745">
            {summary.online_services || 0}
          </HealthValue>
          <HealthLabel>Online Services</HealthLabel>
        </HealthCard>

        <HealthCard 
          bgColor="#fff5f5" 
          borderColor="#dc3545"
        >
          <HealthValue color="#dc3545">
            {summary.offline_services || 0}
          </HealthValue>
          <HealthLabel>Offline Services</HealthLabel>
        </HealthCard>

        <HealthCard 
          bgColor="#fff8f0" 
          borderColor="#ffc107"
        >
          <HealthValue color="#ffc107">
            {errorServices}
          </HealthValue>
          <HealthLabel>Error Services</HealthLabel>
        </HealthCard>

        <HealthCard 
          bgColor="#f0f8ff" 
          borderColor="#007bff"
        >
          <HealthValue color="#007bff">
            {Math.round(summary.health_percentage || 0)}%
          </HealthValue>
          <HealthLabel>Overall Health</HealthLabel>
        </HealthCard>
      </HealthSummary>

      {/* Services List */}
      <ServicesGrid>
        {services.map((service, index) => (
          <ServiceCard key={service.name || index} status={service.status}>
            <ServiceHeader>
              <ServiceInfo>
                <ServiceName>
                  {service.name}
                  <ServiceType>{service.type}</ServiceType>
                </ServiceName>
                <ServiceUrl>{service.url}</ServiceUrl>
                <ServiceLocation>
                  <Globe size={12} style={{ marginRight: '4px' }} />
                  {service.location}
                </ServiceLocation>
              </ServiceInfo>
              <StatusBadge status={service.status}>
                {getStatusIcon(service.status)}
                <span style={{ marginLeft: '5px' }}>
                  {service.status.toUpperCase()}
                </span>
              </StatusBadge>
            </ServiceHeader>

            <ServiceDetails>
              <DetailItem>
                <DetailValue>{service.details?.version || 'Unknown'}</DetailValue>
                <DetailLabel>Version</DetailLabel>
              </DetailItem>
              <DetailItem>
                <DetailValue>{service.health}</DetailValue>
                <DetailLabel>Health</DetailLabel>
              </DetailItem>
              <DetailItem>
                <DetailValue>
                  {service.response_time ? `${Math.round(service.response_time * 1000)}ms` : 'N/A'}
                </DetailValue>
                <DetailLabel>Response Time</DetailLabel>
              </DetailItem>
              <DetailItem>
                <DetailValue>
                  {formatDate(service.last_checked)}
                </DetailValue>
                <DetailLabel>Last Checked</DetailLabel>
              </DetailItem>
            </ServiceDetails>

            {service.details?.error && (
              <ErrorDetails>
                <strong>Error:</strong> {service.details.error}
              </ErrorDetails>
            )}
          </ServiceCard>
        ))}
      </ServicesGrid>

      {/* System Capabilities based on overall status */}
      <CapabilityStatus>
        <CapabilityCard available={summary.online_services > 0}>
          <CapabilityIcon available={summary.online_services > 0}>
            <Zap size={20} />
          </CapabilityIcon>
          <CapabilityText available={summary.online_services > 0}>
            Task Submission {summary.online_services > 0 ? 'Available' : 'Unavailable'}
          </CapabilityText>
        </CapabilityCard>

        <CapabilityCard available={summary.online_services > 1}>
          <CapabilityIcon available={summary.online_services > 1}>
            <Activity size={20} />
          </CapabilityIcon>
          <CapabilityText available={summary.online_services > 1}>
            Workflow Execution {summary.online_services > 1 ? 'Available' : 'Limited'}
          </CapabilityText>
        </CapabilityCard>

        <CapabilityCard available={summary.health_percentage >= 60}>
          <CapabilityIcon available={summary.health_percentage >= 60}>
            <Server size={20} />
          </CapabilityIcon>
          <CapabilityText available={summary.health_percentage >= 60}>
            Batch Processing {summary.health_percentage >= 60 ? 'Available' : 'Degraded'}
          </CapabilityText>
        </CapabilityCard>

        <CapabilityCard available={summary.health_percentage >= 80}>
          <CapabilityIcon available={summary.health_percentage >= 80}>
            <Globe size={20} />
          </CapabilityIcon>
          <CapabilityText available={summary.health_percentage >= 80}>
            Federated Execution {summary.health_percentage >= 80 ? 'Available' : 'Limited'}
          </CapabilityText>
        </CapabilityCard>
      </CapabilityStatus>

      {lastUpdated && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '15px', 
          fontSize: '12px', 
          color: '#666' 
        }}>
          Last updated: {formatDate(lastUpdated)}
        </div>
      )}
    </ServiceStatusContainer>
  );
};

export default ServiceStatus;
