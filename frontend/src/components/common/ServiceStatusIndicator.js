import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '../../services/api';

const StatusIndicatorContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['clickable', 'status'].includes(prop),
})`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  background: ${props => {
    switch(props.status) {
      case 'healthy': return '#f0f9f0';
      case 'degraded': return '#fff8f0';
      case 'unhealthy': return '#fff5f5';
      default: return '#f8f9fa';
    }
  }};
  color: ${props => {
    switch(props.status) {
      case 'healthy': return '#28a745';
      case 'degraded': return '#ffc107';
      case 'unhealthy': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  border: 1px solid ${props => {
    switch(props.status) {
      case 'healthy': return '#c3e6cb';
      case 'degraded': return '#ffeaa7';
      case 'unhealthy': return '#f1aeb5';
      default: return '#dee2e6';
    }
  }};

  &:hover {
    opacity: ${props => props.clickable ? '0.8' : '1'};
  }
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
`;

const StatusText = styled.span`
  white-space: nowrap;
`;

const StatusCount = styled.span`
  font-size: 12px;
  opacity: 0.8;
  margin-left: 4px;
`;

const getStatusIcon = (status) => {
  switch(status) {
    case 'healthy':
      return <CheckCircle size={16} />;
    case 'degraded':
      return <AlertTriangle size={16} />;
    case 'unhealthy':
      return <XCircle size={16} />;
    default:
      return <Clock size={16} />;
  }
};

const getStatusText = (status, onlineServices, totalServices) => {
  switch(status) {
    case 'healthy':
      return `All Services Online`;
    case 'degraded':
      return `${onlineServices}/${totalServices} Services`;
    case 'unhealthy':
      return `System Issues`;
    default:
      return 'Checking...';
  }
};

const ServiceStatusIndicator = ({ 
  onClick, 
  showDetails = true, 
  refreshInterval = 30000 
}) => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/api/service_status');
        const data = response.data;
        const summaryData = {
          overall_health: data.summary?.overall_status || 'unhealthy',
          online_services: data.summary?.online_services || 0,
          total_services: data.summary?.total_services || 0
        };
        setStatusData(summaryData);
      } catch (error) {
        console.error('Failed to fetch service status:', error);
        setStatusData({ overall_health: 'unhealthy', online_services: 0, total_services: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return (
      <StatusIndicatorContainer status="loading">
        <StatusIcon>
          <Clock size={16} />
        </StatusIcon>
        <StatusText>Checking Services...</StatusText>
      </StatusIndicatorContainer>
    );
  }

  const { overall_health, online_services, total_services } = statusData || {};

  return (
    <StatusIndicatorContainer 
      status={overall_health}
      clickable={!!onClick}
      onClick={onClick}
      title={onClick ? 'Click to view detailed service status' : undefined}
    >
      <StatusIcon>
        {getStatusIcon(overall_health)}
      </StatusIcon>
      <StatusText>
        {getStatusText(overall_health, online_services, total_services)}
        {showDetails && (
          <StatusCount>
            ({online_services}/{total_services})
          </StatusCount>
        )}
      </StatusText>
    </StatusIndicatorContainer>
  );
};

export default ServiceStatusIndicator;
