import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Network, Server, Globe, RefreshCw, Eye, EyeOff, Route, Activity, Database, Timer } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import api from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const PageContainer = styled.div`
  padding: 0;
  max-width: 100vw;
  margin: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100vh;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const TopBar = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 1000;
  flex-shrink: 0;
  min-height: 80px;
  
  @media (max-width: 1200px) {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 12px;
    min-height: auto;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
  }
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
  }
  
  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #1a202c;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    letter-spacing: -0.025em;
    
    @media (max-width: 768px) {
      font-size: 20px;
    }
    
    .network-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      padding: 10px;
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      
      @media (max-width: 768px) {
        padding: 8px;
      }
    }
  }
`;

const NetworkStatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${props => {
    switch (props.variant) {
      case 'success': return 'rgba(56, 161, 105, 0.1)';
      case 'warning': return 'rgba(237, 137, 54, 0.1)';
      case 'error': return 'rgba(229, 62, 62, 0.1)';
      default: return 'rgba(56, 161, 105, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'success': return '#38a169';
      case 'warning': return '#ed8936';
      case 'error': return '#e53e3e';
      default: return '#38a169';
    }
  }};
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => {
    switch (props.variant) {
      case 'success': return '#22543d';
      case 'warning': return '#c05621';
      case 'error': return '#742a2a';
      default: return '#22543d';
    }
  }};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => {
      switch (props.variant) {
        case 'success': return '#38a169';
        case 'warning': return '#ed8936';
        case 'error': return '#e53e3e';
        default: return '#38a169';
      }
    }};
    box-shadow: 0 0 0 2px rgba(56, 161, 105, 0.3);
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

const QuickStats = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
  font-size: 14px;
  color: #4a5568;
  flex-wrap: wrap;
  
  @media (max-width: 1200px) {
    gap: 12px;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
    gap: 8px;
  }
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    min-width: 80px;
    
    @media (max-width: 768px) {
      flex-direction: column;
      text-align: center;
      padding: 8px 6px;
      min-width: 70px;
      gap: 2px;
    }
    
    .value {
      font-weight: 700;
      font-size: 14px;
      color: #2d3748;
      
      @media (max-width: 768px) {
        font-size: 16px;
      }
    }
    
    .label {
      font-size: 11px;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      
      @media (max-width: 768px) {
        font-size: 10px;
      }
    }
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
    gap: 6px;
  }
`;

const ControlButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid ${props => {
    if (props.variant === 'primary') return props.active ? '#4299e1' : '#4299e1';
    if (props.variant === 'success') return props.active ? '#38a169' : '#38a169';
    return props.active ? '#4299e1' : '#e2e8f0';
  }};
  border-radius: 8px;
  background: ${props => {
    if (props.active) {
      if (props.variant === 'primary') return 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
      if (props.variant === 'success') return 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)';
      return 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
    }
    return '#ffffff';
  }};
  color: ${props => props.active ? '#ffffff' : '#4a5568'};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: ${props => props.active ? '0 3px 8px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)'};
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 11px;
    gap: 4px;
  }
  
  @media (max-width: 480px) {
    padding: 6px 8px;
    font-size: 10px;
    
    .button-text {
      display: none;
    }
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: ${props => {
      if (props.variant === 'primary') return '#4299e1';
      if (props.variant === 'success') return '#38a169';
      return '#4299e1';
    }};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .icon-pulse {
    animation: pulse 2s infinite;
  }
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  padding: 20px 24px;
  height: calc(100vh - 100px);
  max-height: calc(100vh - 100px);
  flex: 1;
  overflow: hidden;
  
  @media (max-width: 1400px) {
    grid-template-columns: 1fr 350px;
    gap: 16px;
    padding: 16px 20px;
  }
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr 320px;
    height: calc(100vh - 120px);
    max-height: calc(100vh - 120px);
  }
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-rows: 60% 40%;
    height: calc(100vh - 140px);
    max-height: calc(100vh - 140px);
    gap: 12px;
    padding: 12px 16px;
  }
  
  @media (max-width: 768px) {
    grid-template-rows: 50% 50%;
    height: calc(100vh - 160px);
    max-height: calc(100vh - 160px);
    gap: 10px;
    padding: 10px 12px;
  }
`;

const MapContainerStyled = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
  border: 1px solid #e2e8f0;
  height: 100%;
  
  @media (max-width: 1024px) {
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  }
  
  .leaflet-container {
    height: 100% !important;
    width: 100% !important;
    border-radius: 12px;
    
    @media (max-width: 1024px) {
      border-radius: 10px;
    }
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
    z-index: 1000;
  }
`;

const Sidebar = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  max-height: 100%;
  position: relative;
  
  @media (max-width: 1024px) {
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  }
`;

const SidebarHeader = styled.div`
  padding: 16px 18px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 12px 16px 10px;
  }
  
  h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 700;
    color: #2d3748;
    display: flex;
    align-items: center;
    gap: 8px;
    
    @media (max-width: 768px) {
      font-size: 14px;
    }
  }
  
  p {
    margin: 0;
    font-size: 12px;
    color: #718096;
    font-weight: 500;
    
    @media (max-width: 768px) {
      font-size: 11px;
    }
  }
  
  .last-updated {
    margin-top: 8px;
    font-size: 11px;
    color: #a0aec0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    
    @media (max-width: 768px) {
      font-size: 10px;
      padding: 3px 6px;
      margin-top: 6px;
    }
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #f1f5f9;
  background: #fafafa;
  flex-shrink: 0;
`;

const Tab = styled.button`
  flex: 1;
  padding: 12px 8px;
  border: none;
  background: ${props => props.active ? '#ffffff' : 'transparent'};
  color: ${props => props.active ? '#3182ce' : '#718096'};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 2px solid ${props => props.active ? '#3182ce' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    padding: 10px 6px;
    font-size: 10px;
    gap: 4px;
  }
  
  &:hover {
    background: ${props => props.active ? '#ffffff' : '#f7fafc'};
    color: #3182ce;
  }
`;

const TabContent = styled.div`
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  
  @media (max-width: 768px) {
    padding: 12px;
  }
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f7fafc;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #a0aec0 0%, #718096 100%);
  }
`;

const StatusIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => 
    props.status === 'healthy' ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' :
    props.status === 'processing' ? 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)' : 
    'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)'
  };
  margin-right: 10px;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px ${props => 
    props.status === 'healthy' ? 'rgba(56, 161, 105, 0.2)' :
    props.status === 'processing' ? 'rgba(237, 137, 54, 0.2)' : 'rgba(229, 62, 62, 0.2)'
  };
  
  ${props => props.status === 'processing' && `
    animation: pulse 2s infinite;
  `}
`;

const InstanceCard = styled.div`
  background: ${props => props.selected ? 
    'linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%)' : 
    'linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)'
  };
  border: 1px solid ${props => props.selected ? '#4299e1' : '#e2e8f0'};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 10px;
    margin-bottom: 8px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: ${props => props.selected ? 
      'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)' : 
      'transparent'
    };
  }
  
  &:hover {
    border-color: #4299e1;
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(66, 153, 225, 0.1);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    
    .title {
      display: flex;
      align-items: center;
      font-weight: 700;
      font-size: 13px;
      color: #2d3748;
      
      @media (max-width: 768px) {
        font-size: 12px;
      }
    }
    
    .actions {
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
  }
  
  &:hover .actions {
    opacity: 1;
  }
  
  .card-content {
    font-size: 11px;
    color: #718096;
    line-height: 1.4;
    
    @media (max-width: 768px) {
      font-size: 10px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      padding: 4px 0;
      border-bottom: 1px solid #f7fafc;
      
      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      .label {
        color: #a0aec0;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 10px;
        
        @media (max-width: 768px) {
          font-size: 9px;
        }
      }
      
      .value {
        font-weight: 600;
        color: #4a5568;
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 11px;
        
        @media (max-width: 768px) {
          font-size: 10px;
        }
      }
    }
  }
  
  .progress-bar {
    margin-top: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    height: 4px;
    overflow: hidden;
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4299e1 0%, #3182ce 100%);
      transition: width 0.5s ease;
      border-radius: 4px;
    }
  }
`;

const MapOverlay = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
  max-width: 280px;
  
  @media (max-width: 1024px) {
    top: 12px;
    left: 12px;
    max-width: 240px;
    padding: 10px 12px;
  }
  
  @media (max-width: 768px) {
    max-width: 200px;
    padding: 8px 10px;
  }
  
  .overlay-title {
    font-size: 14px;
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    
    @media (max-width: 768px) {
      font-size: 12px;
      margin-bottom: 6px;
    }
  }
  
  .overlay-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 11px;
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 6px;
      font-size: 10px;
    }
    
    .stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid #f7fafc;
      
      &:last-child {
        border-bottom: none;
      }
      
      .label {
        color: #718096;
        font-weight: 500;
      }
      
      .value {
        font-weight: 700;
        color: #2d3748;
        padding: 1px 6px;
        border-radius: 4px;
        background: #f7fafc;
        font-size: 10px;
        
        @media (max-width: 768px) {
          font-size: 9px;
          padding: 1px 4px;
        }
      }
    }
  }
`;

const NetworkTopology = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instances, setInstances] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  const [workflowPaths, setWorkflowPaths] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [showConnections, setShowConnections] = useState(true);
  const [showStorage, setShowStorage] = useState(true);
  const [currentView, setCurrentView] = useState('map'); 
  const [activeTab, setActiveTab] = useState('instances');
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('success');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimePolling, setRealTimePolling] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [dataTransfers, setDataTransfers] = useState([]);
  const [realTimeData, setRealTimeData] = useState({
    activeInstances: 0,
    totalTasks: 0,
    totalWorkflows: 0,
    totalStorage: 0,
    lastUpdated: new Date()
  });

  const loadNetworkTopology = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [locationsResponse, dashboardResponse] = await Promise.all([
        api.get('/api/tes_locations'),
        api.get('/api/dashboard_data')
      ]);

      const locations = Array.isArray(locationsResponse.data) ? locationsResponse.data : [];
      const dashboardData = dashboardResponse.data || {};
      
      const enhancedInstances = locations.map((loc, idx) => ({
        id: loc.id || `instance-${idx}`,
        name: loc.name || loc.tes_name || loc.url || `Instance ${idx + 1}`,
        country: loc.country || 'Unknown',
        status: loc.status || 'unreachable',
        lat: loc.lat,
        lng: loc.lng,
        url: loc.url,
        region: loc.region || 'Unknown',
        instanceType: loc.instanceType || 'compute',
        version: loc.version || 'unknown',
        taskCount: loc.taskCount != null ? loc.taskCount : (loc.tasks || 0),
        cpuUsage: loc.cpuUsage != null ? loc.cpuUsage : 0,
        memoryUsage: loc.memoryUsage != null ? loc.memoryUsage : 0,
        latency: loc.latency != null ? loc.latency : 0,
        throughput: loc.throughput || 'N/A',
        uptime: loc.uptime || 'N/A',
      }));

setInstances(enhancedInstances);
      
      const batchRuns = Array.isArray(dashboardData.batch_runs) ? dashboardData.batch_runs : [];
      const workflowRuns = Array.isArray(dashboardData.workflow_runs) ? dashboardData.workflow_runs : [];

      const allWorkflows = [
        ...batchRuns.map(run => ({
          id: run.run_id,
          type: run.workflow_type,
          name: `${(run.workflow_type || 'workflow').toUpperCase()} - ${run.tes_name}`,
          status: run.status,
          tes_name: run.tes_name,
          submitted_at: run.submitted_at,
          mode: run.mode,
        })),
        ...workflowRuns.map(run => ({
          id: run.run_id,
          type: run.type,
          name: `${(run.type || 'workflow').toUpperCase()} - ${run.tes_name}`,
          status: run.status,
          tes_name: run.tes_name,
          submitted_at: run.submitted_at,
        }))
      ];
      
      setWorkflowPaths(allWorkflows);

      const totalStorage = storageLocations.reduce((sum, storage) => {
        if (!storage.capacity) return sum;
        const capacityNum = parseFloat(String(storage.capacity).replace(/[^\d.]/g, '')) || 0;
        const unitMultiplier = String(storage.capacity).includes('PB') ? 1000 : 1;
        return sum + capacityNum * unitMultiplier;
      }, 0);

      setRealTimeData({
        activeInstances: enhancedInstances.filter(i => i.status === 'healthy').length,
        totalTasks: enhancedInstances.reduce((sum, inst) => sum + (inst.taskCount || 0), 0),
        totalWorkflows: allWorkflows.length,
        totalStorage: totalStorage,
        lastUpdated: new Date()
      });

      setLastRefresh(new Date());
      setNetworkStatus(enhancedInstances.every(i => i.status === 'healthy') ? 'success' : 'warning');

    } catch (err) {
      setError('Failed to load network topology: ' + err.message);
      setNetworkStatus('error');
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    loadNetworkTopology();
  }, []);

  useEffect(() => {
    if (!realTimePolling) return;

      const interval = setInterval(() => {
        loadNetworkTopology();
      }, 15000); 

      return () => clearInterval(interval);
  }, [realTimePolling, loadNetworkTopology]);

  const generateDataTransfers = (instances, storage) => {
    const transfers = [];
    for (let i = 0; i < 5; i++) {
      const sourceInstance = instances[Math.floor(Math.random() * instances.length)];
      const targetStorage = storage[Math.floor(Math.random() * storage.length)];
      
      transfers.push({
        id: `transfer-${i}`,
        source: { lat: sourceInstance.lat, lng: sourceInstance.lng, name: sourceInstance.name },
        target: { lat: targetStorage.lat, lng: targetStorage.lng, name: targetStorage.name },
        status: Math.random() > 0.3 ? 'active' : 'completed',
        speed: `${(Math.random() * 100).toFixed(1)} MB/s`,
        size: `${(Math.random() * 50).toFixed(1)} GB`,
        progress: Math.floor(Math.random() * 100)
      });
    }
    return transfers;
  };

  const filteredInstances = instances.filter(instance => {
    const matchesSearch = instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         instance.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || instance.status === filterStatus;
    const matchesRegion = filterRegion === 'all' || instance.region === filterRegion;
    
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const regions = [...new Set(instances.map(i => i.region))];

  const createTESIcon = (status, instanceType, isSelected = false) => {
    const color = status === 'healthy' ? '#38a169' : 
                  status === 'processing' ? '#ed8936' : '#e53e3e';
    
    const borderColor = status === 'healthy' ? '#22543d' :
                        status === 'processing' ? '#c05621' : '#c53030';
    
    const size = isSelected ? 32 : instanceType === 'gateway' ? 28 : 24;
    const iconSymbol = instanceType === 'gateway' ? '⚡' :
                      status === 'healthy' ? '✓' : 
                      status === 'processing' ? '⟳' : '✗';
    
    return L.divIcon({
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, ${color} 0%, ${borderColor} 100%);
        border: 3px solid ${isSelected ? '#4299e1' : borderColor};
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3), ${isSelected ? '0 0 0 4px rgba(66, 153, 225, 0.3)' : ''};
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: ${size > 24 ? '14px' : '12px'};
        transition: all 0.3s ease;
        z-index: ${isSelected ? 1000 : 100};
      ">
        ${iconSymbol}
      </div>`,
      className: 'tes-marker',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };

  const createStorageIcon = (storage) => {
    const usageColor = storage.usage > 80 ? '#e53e3e' : 
                      storage.usage > 60 ? '#ed8936' : '#38a169';
    
    return L.divIcon({
      html: `<div style="
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, ${usageColor} 0%, ${usageColor}CC 100%);
        border: 2px solid white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 10px;
      ">
        📦
      </div>`,
      className: 'storage-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

const FilterSection = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 10px 12px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 8px;
  
  @media (max-width: 768px) {
    font-size: 11px;
    padding: 5px 8px;
  }
  
  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.1);
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  
  @media (max-width: 768px) {
    gap: 4px;
    flex-direction: column;
  }
`;

const FilterSelect = styled.select`
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  font-size: 11px;
  background: white;
  
  @media (max-width: 768px) {
    font-size: 10px;
    padding: 5px 6px;
  }
  
  &:focus {
    outline: none;
    border-color: #4299e1;
  }
`;

const MetricCard = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  
  @media (max-width: 768px) {
    padding: 10px;
    margin-bottom: 8px;
  }
  
  .metric-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    
    .metric-title {
      font-size: 12px;
      font-weight: 700;
      color: #2d3748;
      display: flex;
      align-items: center;
      gap: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      
      @media (max-width: 768px) {
        font-size: 11px;
        gap: 4px;
      }
    }
    
    .metric-value {
      font-size: 18px;
      font-weight: 800;
      color: #3182ce;
      
      @media (max-width: 768px) {
        font-size: 16px;
      }
    }
  }
  
  .metric-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 10px;
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    
    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #718096;
      padding: 4px 0;
      border-bottom: 1px solid #f7fafc;
      
      .detail-value {
        font-weight: 700;
        color: #4a5568;
        font-size: 10px;
      }
    }
  }
`;

const TooltipContainer = styled.div`
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  max-width: 300px;
  pointer-events: none;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 20px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid rgba(0, 0, 0, 0.9);
  }
`;

const WorkflowSteps = styled.div`
  margin-top: 12px;
  
  .steps-header {
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const WorkflowStep = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: ${props => 
    props.status === 'completed' ? '#f0fff4' :
    props.status === 'running' ? '#fef5e7' :
    props.status === 'failed' ? '#fed7d7' : '#f7fafc'
  };
  
  .step-indicator {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    background: ${props => 
      props.status === 'completed' ? '#48bb78' :
      props.status === 'running' ? '#ed8936' :
      props.status === 'failed' ? '#f56565' : '#cbd5e0'
    };
    color: white;
  }
  
  .step-details {
    flex: 1;
    
    .step-name {
      font-weight: 600;
      color: #2d3748;
    }
    
    .step-time {
      color: #a0aec0;
      font-size: 11px;
    }
  }
`;

const MapControls = styled.div`
  position: absolute;
  top: 80px;
  left: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
  min-width: 250px;
  
  .controls-title {
    font-size: 14px;
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const ControlGroup = styled.div`
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .control-label {
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .control-buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
`;

const MiniControlButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${props => props.active ? '#4299e1' : '#e2e8f0'};
  border-radius: 6px;
  background: ${props => props.active ? '#ebf8ff' : 'white'};
  color: ${props => props.active ? '#4299e1' : '#4a5568'};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    border-color: #4299e1;
    color: #4299e1;
    background: #ebf8ff;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 6px;
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4299e1 0%, #3182ce 100%);
    transition: width 0.5s ease;
  }
`;

const ConnectionLine = styled.div`
  position: absolute;
  background: ${props => 
    props.status === 'active' ? 'linear-gradient(90deg, #4299e1, #3182ce)' :
    props.status === 'transferring' ? 'linear-gradient(90deg, #ed8936, #dd6b20)' :
    '#e2e8f0'
  };
  height: 3px;
  transform-origin: left center;
  z-index: 500;
  opacity: ${props => props.visible ? 0.8 : 0.3};
  transition: all 0.3s ease;
  
  ${props => props.animated && `
    background-size: 20px 20px;
    background-image: linear-gradient(
      45deg,
      transparent 25%,
      rgba(255, 255, 255, 0.3) 25%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 50%,
      transparent 75%,
      rgba(255, 255, 255, 0.3) 75%
    );
    animation: moveStripes 1s linear infinite;
  `}
  
  @keyframes moveStripes {
    0% { background-position: 0 0; }
    100% { background-position: 20px 0; }
  }
`;

  const getWorkflowColor = (type) => {
    switch (type) {
      case 'nextflow': return '#0055cc';
      case 'snakemake': return '#0a7d1c'; 
      case 'cwl': return '#ff6b35';
      default: return '#6b7280';
    }
  };

  const formatStorageSize = (size) => {
    const numericValue = parseFloat(size.replace(/[^\d.]/g, ''));
    const unit = size.replace(/[\d.]/g, '');
    return `${numericValue.toFixed(1)}${unit}`;
  };

  const getNetworkHealthScore = () => {
    const healthyCount = instances.filter(i => i.status === 'healthy').length;
    const totalCount = instances.length;
    return totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0;
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TopBar>
        
        <HeaderSection>
          <h1>
            <div className="network-icon">
              <Network size={24} />
            </div>
            Real-Time Network Topology
          </h1>
          <NetworkStatusBadge variant={networkStatus}>
            <div className="status-dot"></div>
            Network {networkStatus === 'success' ? 'Healthy' : networkStatus === 'warning' ? 'Warning' : 'Error'}
          </NetworkStatusBadge>
        </HeaderSection>

        

        
        
      </TopBar>
      <div style={{ padding: '0 16px', borderBottom: '1px solid #e2e8f0', marginTop: '8px' }}>
        <Controls>
          <ControlButton
            active={currentView === 'topology'}
            onClick={() => setCurrentView('topology')}
          >
            <Network size={16} />
            <span className="button-text">Topology View</span>
          </ControlButton>
          <ControlButton
            active={currentView === 'map'}
            onClick={() => setCurrentView('map')}
          >
            <Globe size={16} />
            <span className="button-text">Geographic Map</span>
          </ControlButton>
          <ControlButton
            active={showConnections}
            onClick={() => setShowConnections(!showConnections)}
            variant="secondary"
          >
            {showConnections ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="button-text">Connections</span>
          </ControlButton>
          <ControlButton
            active={realTimePolling}
            onClick={() => setRealTimePolling(!realTimePolling)}
            variant="secondary"
          >
            <Timer size={16} className={realTimePolling ? 'icon-pulse' : ''} />
            <span className="button-text">Real-time</span>
          </ControlButton>
          <ControlButton
            onClick={loadNetworkTopology}
            disabled={loading}
            variant="success"
          >
            <RefreshCw size={16} className={loading ? 'icon-pulse' : ''} />
            <span className="button-text">Refresh</span>
          </ControlButton>
        </Controls>
      </div>
      <div style={{ padding: '16px' }} className='p-10'>
<QuickStats>
          <div className="stat-item">
            <Server size={16} />
            <div>
              <div className="value">{realTimeData.activeInstances}</div>
              <div className="label">Active Instances</div>
            </div>
          </div>
          <div className="stat-item">
            <Activity size={16} />
            <div>
              <div className="value">{realTimeData.totalTasks}</div>
              <div className="label">Total Tasks</div>
            </div>
          </div>
          <div className="stat-item">
            <Route size={16} />
            <div>
              <div className="value">{realTimeData.totalWorkflows}</div>
              <div className="label">Workflows</div>
            </div>
          </div>
          <div className="stat-item">
            <Database size={16} />
            <div>
              <div className="value">{realTimeData.totalStorage.toFixed(1)}TB</div>
              <div className="label">Storage</div>
            </div>
          </div>
        </QuickStats>
        </div>
      {error && <ErrorMessage message={error} />}

      <MainContent>
        <MapContainerStyled>
          {currentView === 'map' ? (
            <MapContainer
              center={[52.5200, 13.4050]}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {instances.map((instance) => {
                const hasValidCoords = instance.lat && instance.lng && 
                                      (instance.lat !== 0 || instance.lng !== 0);
                if (!hasValidCoords) return null;
                
                return (
                  <Marker
                    key={instance.id || `${instance.name}-${instance.url}`}
                    position={[instance.lat, instance.lng]}
                    icon={createTESIcon(
                      instance.status, 
                      instance.instanceType || 'compute',
                      selectedInstance?.id === instance.id
                    )}
                    eventHandlers={{
                      click: () => setSelectedInstance(instance)
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '250px' }}>
                        <h3 style={{ margin: '0 0 0.75rem 0', color: '#222b45', fontSize: '16px' }}>
                          {instance.name}
                        </h3>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>Status:</strong> 
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '12px',
                            background: instance.status === 'healthy' ? '#f0fff4' : 
                                      instance.status === 'processing' ? '#fef5e7' : '#fed7d7',
                            color: instance.status === 'healthy' ? '#22543d' : 
                                  instance.status === 'processing' ? '#c05621' : '#742a2a'
                          }}>
                            {instance.status}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '14px' }}>
                          <div><strong>Tasks:</strong> {instance.taskCount}</div>
                          <div><strong>CPU:</strong> {instance.cpuUsage}%</div>
                          <div><strong>Region:</strong> {instance.region}</div>
                          <div><strong>Memory:</strong> {instance.memoryUsage}%</div>
                          <div><strong>Latency:</strong> {instance.latency}ms</div>
                          <div><strong>Uptime:</strong> {instance.uptime}</div>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#6b7280' }}>
                          <div><strong>Version:</strong> {instance.version}</div>
                          <div><strong>Throughput:</strong> {instance.throughput}</div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                          {instance.url}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {storageLocations.map((storage) => (
                <Marker
                  key={storage.id}
                  position={[storage.lat, storage.lng]}
                  icon={createStorageIcon(storage)}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#222b45' }}>
                        {storage.name}
                      </h3>
                      <div><strong>Type:</strong> {storage.type}</div>
                      <div><strong>Location:</strong> {storage.location}</div>
                      <div><strong>Capacity:</strong> {storage.capacity}</div>
                      <div><strong>Usage:</strong> {storage.usage}%</div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#e2e8f0',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${storage.usage}%`,
                            height: '100%',
                            background: storage.usage > 80 ? '#e53e3e' : 
                                       storage.usage > 60 ? '#ed8936' : '#38a169',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {selectedWorkflow && (() => {
                const workflow = workflowPaths.find(w => w.id === selectedWorkflow);
                const sourceInstance = instances.find(i => i.name === workflow?.tes_name);
                const targetInstance = instances[0]; 
                
                if (workflow && sourceInstance && targetInstance) {
                  return (
                    <Polyline
                      positions={[
                        [sourceInstance.lat, sourceInstance.lng],
                        [targetInstance.lat, targetInstance.lng]
                      ]}
                      color={getWorkflowColor(workflow.type)}
                      weight={4}
                      opacity={0.8}
                      dashArray={workflow.status === 'RUNNING' ? "10, 10" : undefined}
                    />
                  );
                }
                return null;
              })()}
            </MapContainer>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              color: '#4a5568',
              fontSize: '18px'
            }}>
              Network Topology Diagram View
              <br />
              <small>Interactive network diagram will be displayed here</small>
            </div>
          )}

          <MapOverlay>
            <div className="overlay-title">
              <Activity size={16} />
              Network Overview
            </div>
            <div className="overlay-stats">
              <div className="stat">
                <span className="label">Active</span>
                <span className="value">{instances.filter(i => i.status === 'healthy').length}</span>
              </div>
              <div className="stat">
                <span className="label">Warning</span>
                <span className="value">{instances.filter(i => i.status === 'processing').length}</span>
              </div>
              <div className="stat">
                <span className="label">Offline</span>
                <span className="value">{instances.filter(i => i.status === 'unhealthy').length}</span>
              </div>
              <div className="stat">
                <span className="label">Total Tasks</span>
                <span className="value">{realTimeData.totalTasks}</span>
              </div>
            </div>
          </MapOverlay>
        </MapContainerStyled>

        <Sidebar>
          <SidebarHeader>
            <h3>
              <Server size={18} />
              Network Dashboard
            </h3>
            <p>Real-time monitoring and controls</p>
            <div className="last-updated">
              <Timer size={12} />
              Updated: {realTimeData.lastUpdated.toLocaleTimeString()}
            </div>
          </SidebarHeader>

          <FilterSection>
            <SearchInput
              type="text"
              placeholder="Search instances..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FilterRow>
              <FilterSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="healthy">Healthy</option>
                <option value="processing">Processing</option>
                <option value="unhealthy">Unhealthy</option>
              </FilterSelect>
              <FilterSelect value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                <option value="all">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </FilterSelect>
            </FilterRow>
          </FilterSection>

          <TabContainer>
            <Tab
              active={activeTab === 'instances' ? "true" : undefined}
              onClick={() => setActiveTab('instances')}
            >
              <Server size={14} />
              Instances
            </Tab>
            <Tab
              active={activeTab === 'workflows'}
              onClick={() => setActiveTab('workflows')}
            >
              <Route size={14} />
              Workflows
            </Tab>
            <Tab
              active={activeTab === 'metrics'}
              onClick={() => setActiveTab('metrics')}
            >
              <Activity size={14} />
              Metrics
            </Tab>
          </TabContainer>

          <TabContent>
            {activeTab === 'instances' ? (
              <div>
                {filteredInstances.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0' }}>
                    <Server size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem' }}>
                      No instances found
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Try adjusting your search or filters
                    </div>
                  </div>
                ) : (
                  filteredInstances.map((instance) => (
                    <InstanceCard
                      key={instance.id || `${instance.name}-${instance.url}`}
                      selected={selectedInstance?.id === instance.id}
                      onClick={() => setSelectedInstance(instance)}
                    >
                      <div className="card-header">
                        <div className="title">
                          <StatusIndicator status={instance.status} />
                          {instance.name}
                        </div>
                      </div>
                      <div className="card-content">
                        <div className="info-row">
                          <span className="label">Status</span>
                          <span className="value">{instance.status}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Tasks</span>
                          <span className="value">{instance.taskCount}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">CPU Usage</span>
                          <span className="value">{instance.cpuUsage}%</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Memory</span>
                          <span className="value">{instance.memoryUsage}%</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Latency</span>
                          <span className="value">{instance.latency}ms</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Throughput</span>
                          <span className="value">{instance.throughput}</span>
                        </div>
                        <ProgressBar>
                          <div 
                            className="progress-fill" 
                            style={{ width: `${instance.cpuUsage}%` }}
                          ></div>
                        </ProgressBar>
                      </div>
                    </InstanceCard>
                  ))
                )}
              </div>
            ) : activeTab === 'workflows' ? (
              <div>
                {workflowPaths.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0' }}>
                    <Route size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem' }}>
                      No workflows running
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Submit a workflow to see it here
                    </div>
                  </div>
                ) : (
                  workflowPaths.map((workflow) => (
                    <InstanceCard
                      key={workflow.id}
                      selected={selectedWorkflow === workflow.id}
                      onClick={() => setSelectedWorkflow(selectedWorkflow === workflow.id ? '' : workflow.id)}
                    >
                      <div className="card-header">
                        <div className="title">
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: getWorkflowColor(workflow.type),
                            marginRight: '8px'
                          }}></div>
                          {workflow.name}
                        </div>
                      </div>
                      <div className="card-content">
                        <div className="info-row">
                          <span className="label">Type</span>
                          <span className="value">{workflow.type}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Status</span>
                          <span className="value">{workflow.status}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Instance</span>
                          <span className="value">{workflow.tes_name}</span>
                        </div>
                        {workflow.progress !== undefined && (
                          <div className="info-row">
                            <span className="label">Progress</span>
                            <span className="value">{workflow.progress}%</span>
                          </div>
                        )}
                        {workflow.dataSize && (
                          <div className="info-row">
                            <span className="label">Data Size</span>
                            <span className="value">{workflow.dataSize}</span>
                          </div>
                        )}
                        {workflow.progress !== undefined && (
                          <ProgressBar>
                            <div 
                              className="progress-fill" 
                              style={{ width: `${workflow.progress}%` }}
                            ></div>
                          </ProgressBar>
                        )}
                      </div>
                    </InstanceCard>
                  ))
                )}
              </div>
            ) : (
              <div>
                <MetricCard>
                  <div className="metric-header">
                    <div className="metric-title">
                      <Activity size={16} />
                      Network Health
                    </div>
                    <div className="metric-value">{getNetworkHealthScore()}%</div>
                  </div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Active Instances</span>
                      <span className="detail-value">{realTimeData.activeInstances}</span>
                    </div>
                    <div className="detail-item">
                      <span>Total Tasks</span>
                      <span className="detail-value">{realTimeData.totalTasks}</span>
                    </div>
                    <div className="detail-item">
                      <span>Running Workflows</span>
                      <span className="detail-value">{realTimeData.totalWorkflows}</span>
                    </div>
                    <div className="detail-item">
                      <span>Storage Used</span>
                      <span className="detail-value">{realTimeData.totalStorage.toFixed(1)}TB</span>
                    </div>
                  </div>
                </MetricCard>

                <MetricCard>
                  <div className="metric-header">
                    <div className="metric-title">
                      <Database size={16} />
                      Storage Overview
                    </div>
                    <div className="metric-value">{storageLocations.length}</div>
                  </div>
                  <div className="metric-details">
                    {storageLocations.map(storage => (
                      <div key={storage.id} className="detail-item">
                        <span>{storage.name}</span>
                        <span className="detail-value">{storage.usage}%</span>
                      </div>
                    ))}
                  </div>
                </MetricCard>

                <MetricCard>
                  <div className="metric-header">
                    <div className="metric-title">
                      <Timer size={16} />
                      Performance
                    </div>
                  </div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Avg Latency</span>
                      <span className="detail-value">
                        {instances.length > 0 ? 
                          Math.round(instances.reduce((sum, i) => sum + i.latency, 0) / instances.length) 
                          : 0}ms
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Avg CPU Usage</span>
                      <span className="detail-value">
                        {instances.length > 0 ? 
                          Math.round(instances.reduce((sum, i) => sum + i.cpuUsage, 0) / instances.length) 
                          : 0}%
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Last Refresh</span>
                      <span className="detail-value">{lastRefresh.toLocaleTimeString()}</span>
                    </div>
                    <div className="detail-item">
                      <span>Auto Refresh</span>
                      <span className="detail-value">{realTimePolling ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                </MetricCard>
              </div>
            )}
          </TabContent>
        </Sidebar>
      </MainContent>
    </PageContainer>
  );
};

export default NetworkTopology;
