import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Network, Server, MapPin, Globe, RefreshCw, Eye, EyeOff, Map, Layers, Route } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { statusService } from '../services/statusService';
import { TES_INSTANCES } from '../utils/constants';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TopologyContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.div``;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #4b5563;
  font-size: 1rem;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const RefreshButton = styled.button`
  background: #2563eb;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const ToggleButton = styled.button`
  background: ${props => props.active ? '#2563eb' : '#f3f4f6'};
  color: ${props => props.active ? 'white' : '#374151'};
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#1d4ed8' : '#e5e7eb'};
  }
`;

const TopologySection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const ViewButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.active ? '#2563eb' : '#f3f4f6'};
  color: ${props => props.active ? 'white' : '#374151'};

  &:hover {
    background: ${props => props.active ? '#1d4ed8' : '#e5e7eb'};
  }
`;

const MapSection = styled.div`
  height: 600px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  border: 1px solid #e5e7eb;
`;

const MapCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
`;

const MapLegend = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  font-size: 0.875rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const LegendMarker = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const WorkflowControls = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 200px;
`;

const WorkflowSelector = styled.select`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.875rem;
`;

const AnimationButton = styled.button`
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const NetworkDiagram = styled.div`
  width: 100%;
  height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  position: relative;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow: hidden;
`;

const NetworkNode = styled.div`
  position: absolute;
  width: ${props => props.size || 80}px;
  height: ${props => props.size || 80}px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'healthy':
        return 'linear-gradient(135deg, #22c55e, #16a34a)';
      case 'warning':
        return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'error':
        return 'linear-gradient(135deg, #ef4444, #dc2626)';
      default:
        return 'linear-gradient(135deg, #6b7280, #4b5563)';
    }
  }};
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  left: ${props => props.x || 0}px;
  top: ${props => props.y || 0}px;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
`;

const ConnectionLine = styled.div`
  position: absolute;
  background: ${props => props.status === 'active' ? '#22c55e' : '#e5e7eb'};
  height: 2px;
  transform-origin: left center;
  z-index: 1;
  transition: all 0.3s ease;
  opacity: ${props => props.visible ? 1 : 0.3};
`;

const NodeTooltip = styled.div`
  position: absolute;
  background: #222b45;
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  max-width: 200px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.2s;
`;

const InstanceList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
`;

const InstanceCard = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
`;

const InstanceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const InstanceStatus = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'healthy':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }};
`;

const InstanceName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #222b45;
`;

const InstanceDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InstanceDetail = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
`;

const DetailLabel = styled.span`
  color: #6b7280;
`;

const DetailValue = styled.span`
  color: #222b45;
  font-weight: 500;
`;

const NetworkTopology = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instances, setInstances] = useState([]);
  const [tesLocations, setTesLocations] = useState([]);
  const [workflowPaths, setWorkflowPaths] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [showConnections, setShowConnections] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [currentView, setCurrentView] = useState('network'); // 'network' or 'map'
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = React.useRef(null);
  const mapRef = React.useRef(null);

  useEffect(() => {
    loadNetworkTopology();
  }, []);

  const loadNetworkTopology = async () => {
    try {
      setLoading(true);
      setError('');

      // Load TES locations with geographic data
      const locationsPromise = fetch('http://localhost:5001/api/tes_locations').then(r => r.json());
      const workflowsPromise = fetch('http://localhost:5001/api/dashboard_data').then(r => r.json());

      const [locations, dashboardData] = await Promise.all([locationsPromise, workflowsPromise]);
      
      setTesLocations(locations);
      
      // Process workflow paths
      const allWorkflows = [
        ...dashboardData.batch_runs.map(run => ({
          id: run.run_id,
          type: run.workflow_type,
          name: `${run.workflow_type.toUpperCase()} - ${run.tes_name}`,
          status: run.status,
          tes_name: run.tes_name,
          submitted_at: run.submitted_at,
          mode: run.mode
        })),
        ...dashboardData.workflow_runs.map(run => ({
          id: run.run_id,
          type: run.type,
          name: `${run.type.toUpperCase()} - ${run.tes_name}`,
          status: run.status,
          tes_name: run.tes_name,
          submitted_at: new Date().toISOString()
        }))
      ];
      
      setWorkflowPaths(allWorkflows);

      // Check status of each TES instance
      const instancePromises = locations.map(async (location, index) => {
        try {
          const tasks = await statusService.listTasks(location.url);
          return {
            ...location,
            id: location.name.replace(/\s+/g, '-').toLowerCase(),
            status: 'healthy',
            taskCount: tasks?.tasks?.length || 0,
            lastChecked: new Date().toISOString(),
            position: calculateNodePosition(index, locations.length),
            connections: [],
            latency: Math.floor(Math.random() * 100) + 20,
            region: location.country
          };
        } catch (err) {
          return {
            ...location,
            id: location.name.replace(/\s+/g, '-').toLowerCase(),
            status: 'error',
            taskCount: 0,
            lastChecked: new Date().toISOString(),
            position: calculateNodePosition(index, locations.length),
            connections: [],
            latency: 0,
            region: location.country,
            error: err.message
          };
        }
      });

      const instanceResults = await Promise.all(instancePromises);
      
      // Add a central gateway node
      const gatewayNode = {
        id: 'gateway',
        name: 'TES Gateway',
        url: 'gateway',
        status: 'healthy',
        taskCount: instanceResults.reduce((sum, inst) => sum + inst.taskCount, 0),
        position: { x: 350, y: 200 },
        connections: instanceResults.map(inst => inst.id),
        latency: 5,
        region: 'Central',
        lat: 50.1109,
        lon: 8.6821, // Frankfurt - Central Europe
        isGateway: true
      };

      setInstances([gatewayNode, ...instanceResults]);
    } catch (err) {
      setError('Failed to load network topology: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateNodePosition = (index, total) => {
    const radius = 150;
    const centerX = 350;
    const centerY = 200;
    const angle = (index / total) * 2 * Math.PI;
    
    return {
      x: centerX + radius * Math.cos(angle) - 40,
      y: centerY + radius * Math.sin(angle) - 40
    };
  };

  const getRegionFromUrl = (url) => {
    if (url.includes('eu-west')) return 'EU West';
    if (url.includes('us-east')) return 'US East';
    if (url.includes('ap-south')) return 'Asia Pacific';
    if (url.includes('tesk-prod')) return 'EU Central';
    if (url.includes('tesk-na')) return 'North America';
    if (url.includes('127.0.0.1') || url.includes('localhost')) return 'Local';
    return 'Unknown';
  };

  // Custom Leaflet icons
  const createCustomIcon = (status, isGateway = false) => {
    const color = status === 'healthy' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444';
    const size = isGateway ? 30 : 20;
    
    return L.divIcon({
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: ${isGateway ? '16px' : '12px'};
      ">
        ${isGateway ? '🌐' : '🖥️'}
      </div>`,
      className: 'custom-marker',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };

  // Draw workflow paths on canvas
  const drawWorkflowPaths = (selectedWorkflowId) => {
    const canvas = canvasRef.current;
    if (!canvas || !mapRef.current) return;

    const ctx = canvas.getContext('2d');
    const map = mapRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!selectedWorkflowId) return;

    const selectedWf = workflowPaths.find(w => w.id === selectedWorkflowId);
    if (!selectedWf) return;

    // Find source and destination
    const gateway = instances.find(i => i.isGateway);
    const targetInstance = instances.find(i => i.name === selectedWf.tes_name);

    if (!gateway || !targetInstance || !gateway.lat || !targetInstance.lat) return;

    // Convert lat/lng to pixel coordinates
    const gatewayPoint = map.latLngToContainerPoint([gateway.lat, gateway.lon]);
    const targetPoint = map.latLngToContainerPoint([targetInstance.lat, targetInstance.lon]);

    // Draw animated path
    ctx.strokeStyle = getWorkflowColor(selectedWf.type);
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    // Animate the dash offset
    ctx.lineDashOffset = -animationStep * 2;
    
    ctx.beginPath();
    ctx.moveTo(gatewayPoint.x, gatewayPoint.y);
    ctx.lineTo(targetPoint.x, targetPoint.y);
    ctx.stroke();

    // Draw workflow status indicators
    const midX = (gatewayPoint.x + targetPoint.x) / 2;
    const midY = (gatewayPoint.y + targetPoint.y) / 2;
    
    ctx.fillStyle = selectedWf.status === 'SUBMITTED' ? '#2563eb' : 
                   selectedWf.status === 'RUNNING' ? '#f59e0b' : '#22c55e';
    ctx.beginPath();
    ctx.arc(midX, midY, 6, 0, 2 * Math.PI);
    ctx.fill();
  };

  const getWorkflowColor = (type) => {
    switch (type) {
      case 'nextflow': return '#0055cc';
      case 'snakemake': return '#0a7d1c';
      case 'cwl': return '#ff6b35';
      default: return '#6b7280';
    }
  };

  const startAnimation = () => {
    setIsAnimating(true);
    const animate = () => {
      setAnimationStep(step => (step + 1) % 100);
      if (isAnimating) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  };

  const stopAnimation = () => {
    setIsAnimating(false);
  };

  // Update canvas when map moves or workflow changes
  React.useEffect(() => {
    if (currentView === 'map' && selectedWorkflow) {
      drawWorkflowPaths(selectedWorkflow);
    }
  }, [selectedWorkflow, animationStep, currentView, instances, workflowPaths]);

  // Map event handlers
  const MapEvents = () => {
    const map = useMap();
    
    React.useEffect(() => {
      mapRef.current = map;
      
      const handleMoveEnd = () => {
        if (selectedWorkflow) {
          drawWorkflowPaths(selectedWorkflow);
        }
      };
      
      map.on('moveend', handleMoveEnd);
      map.on('zoomend', handleMoveEnd);
      
      return () => {
        map.off('moveend', handleMoveEnd);
        map.off('zoomend', handleMoveEnd);
      };
    }, [map]);
    
    return null;
  };

  const renderConnections = () => {
    if (!showConnections) return null;

    const gateway = instances.find(inst => inst.isGateway);
    if (!gateway) return null;

    return instances
      .filter(inst => !inst.isGateway)
      .map((instance) => {
        const dx = instance.position.x + 40 - (gateway.position.x + 40);
        const dy = instance.position.y + 40 - (gateway.position.y + 40);
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <ConnectionLine
            key={`connection-${instance.id}`}
            style={{
              left: gateway.position.x + 40,
              top: gateway.position.y + 39,
              width: length,
              transform: `rotate(${angle}deg)`,
            }}
            status={instance.status === 'healthy' ? 'active' : 'inactive'}
            visible={showConnections}
          />
        );
      });
  };

  const handleNodeHover = (instance, event) => {
    setHoveredNode(instance);
    setTooltipPosition({
      x: event.clientX + 10,
      y: event.clientY - 10
    });
  };

  const handleNodeLeave = () => {
    setHoveredNode(null);
  };

  return (
    <TopologyContainer>
      <Header>
        <HeaderLeft>
          <Title>Network Topology & Geographic Visualization</Title>
          <Subtitle>Interactive map view of TES instances and workflow execution paths</Subtitle>
        </HeaderLeft>
        <Controls>
          <ViewToggle>
            <ViewButton 
              active={currentView === 'network'} 
              onClick={() => setCurrentView('network')}
            >
              Network Diagram
            </ViewButton>
            <ViewButton 
              active={currentView === 'map'} 
              onClick={() => setCurrentView('map')}
            >
              Geographic Map
            </ViewButton>
          </ViewToggle>
          <ToggleButton
            active={showConnections}
            onClick={() => setShowConnections(!showConnections)}
          >
            {showConnections ? <Eye size={16} /> : <EyeOff size={16} />}
            {showConnections ? 'Hide' : 'Show'} Connections
          </ToggleButton>
          <RefreshButton onClick={loadNetworkTopology} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </Controls>
      </Header>

      {error && <ErrorMessage message={error} />}

      <TopologySection>
        <SectionTitle>
          {currentView === 'map' ? <Globe size={20} /> : <Network size={20} />}
          {currentView === 'map' ? 'Interactive Geographic Map' : 'Network Diagram'}
        </SectionTitle>

        {loading ? (
          <LoadingSpinner />
        ) : currentView === 'map' ? (
          <MapSection>
            <MapContainer
              center={[52.5200, 13.4050]} // Berlin center
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapEvents />
              
              {/* Render TES instance markers */}
              {instances.map((instance) => (
                instance.lat && instance.lon && (
                  <Marker
                    key={instance.id}
                    position={[instance.lat, instance.lon]}
                    icon={createCustomIcon(instance.status, instance.isGateway)}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#222b45' }}>
                          {instance.name}
                        </h3>
                        <div><strong>Status:</strong> {instance.status}</div>
                        <div><strong>Tasks:</strong> {instance.taskCount}</div>
                        <div><strong>Region:</strong> {instance.region}</div>
                        <div><strong>Latency:</strong> {instance.latency}ms</div>
                        {instance.url !== 'gateway' && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                            {instance.url}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* Render workflow paths as polylines */}
              {selectedWorkflow && (() => {
                const workflow = workflowPaths.find(w => w.id === selectedWorkflow);
                const gateway = instances.find(i => i.isGateway);
                const targetInstance = instances.find(i => i.name === workflow?.tes_name);
                
                if (workflow && gateway && targetInstance && gateway.lat && targetInstance.lat) {
                  return (
                    <Polyline
                      positions={[
                        [gateway.lat, gateway.lon],
                        [targetInstance.lat, targetInstance.lon]
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

            {/* Canvas overlay for animations */}
            <MapCanvas ref={canvasRef} />

            {/* Map Controls */}
            <WorkflowControls>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                Workflow Visualization
              </div>
              <WorkflowSelector
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
              >
                <option value="">Select a workflow...</option>
                {workflowPaths.map(workflow => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name} ({workflow.status})
                  </option>
                ))}
              </WorkflowSelector>
              <AnimationButton
                onClick={isAnimating ? stopAnimation : startAnimation}
                disabled={!selectedWorkflow}
              >
                {isAnimating ? 'Stop Animation' : 'Start Animation'}
              </AnimationButton>
            </WorkflowControls>

            {/* Map Legend */}
            <MapLegend>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Legend</div>
              <LegendItem>
                <LegendMarker color="#22c55e" />
                <span>Healthy TES Instance</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="#f59e0b" />
                <span>Warning</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="#ef4444" />
                <span>Error</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="#0055cc" />
                <span>Nextflow Path</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="#0a7d1c" />
                <span>Snakemake Path</span>
              </LegendItem>
              <LegendItem>
                <LegendMarker color="#ff6b35" />
                <span>CWL Path</span>
              </LegendItem>
            </MapLegend>
          </MapSection>
        ) : (
          <NetworkDiagram>
            {renderConnections()}
            
            {instances.map((instance) => (
              <NetworkNode
                key={instance.id}
                status={instance.status}
                size={instance.isGateway ? 100 : 80}
                x={instance.position.x}
                y={instance.position.y}
                onMouseEnter={(e) => handleNodeHover(instance, e)}
                onMouseLeave={handleNodeLeave}
                onMouseMove={(e) => {
                  if (hoveredNode && hoveredNode.id === instance.id) {
                    setTooltipPosition({
                      x: e.clientX + 10,
                      y: e.clientY - 10
                    });
                  }
                }}
              >
                {instance.isGateway ? (
                  <>
                    <Globe size={24} />
                    <div style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>Gateway</div>
                  </>
                ) : (
                  <>
                    <Server size={20} />
                    <div style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>
                      {instance.name.length > 10 
                        ? instance.name.substring(0, 10) + '...' 
                        : instance.name
                      }
                    </div>
                  </>
                )}
              </NetworkNode>
            ))}

            {hoveredNode && (
              <NodeTooltip
                visible={true}
                style={{
                  left: tooltipPosition.x,
                  top: tooltipPosition.y,
                  position: 'fixed'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  {hoveredNode.name}
                </div>
                <div>Status: {hoveredNode.status}</div>
                <div>Tasks: {hoveredNode.taskCount}</div>
                <div>Region: {hoveredNode.region}</div>
                <div>Latency: {hoveredNode.latency}ms</div>
                {hoveredNode.url !== 'gateway' && (
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                    {hoveredNode.url}
                  </div>
                )}
              </NodeTooltip>
            )}
          </NetworkDiagram>
        )}
      </TopologySection>

      <TopologySection>
        <SectionTitle>
          <MapPin size={20} />
          TES Instance Details & Workflow Statistics
        </SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#222b45' }}>Workflow Summary</h3>
            <div>Total Workflows: {workflowPaths.length}</div>
            <div>Active Instances: {instances.filter(i => i.status === 'healthy').length}</div>
            <div>Geographic Coverage: {tesLocations.length} countries</div>
          </div>
          
          <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#222b45' }}>Recent Activity</h3>
            {workflowPaths.slice(-3).map(wf => (
              <div key={wf.id} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: getWorkflowColor(wf.type), fontWeight: '600' }}>
                  {wf.type.toUpperCase()}
                </span> → {wf.tes_name}
              </div>
            ))}
          </div>
        </div>

        <InstanceList>
          {instances.filter(inst => !inst.isGateway).map((instance) => (
            <InstanceCard key={instance.id}>
              <InstanceHeader>
                <InstanceStatus status={instance.status} />
                <InstanceName>{instance.name}</InstanceName>
              </InstanceHeader>
              <InstanceDetails>
                <InstanceDetail>
                  <DetailLabel>Location:</DetailLabel>
                  <DetailValue>{instance.country}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>URL:</DetailLabel>
                  <DetailValue style={{ fontSize: '0.75rem' }}>{instance.url}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>Status:</DetailLabel>
                  <DetailValue>{instance.status}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>Tasks:</DetailLabel>
                  <DetailValue>{instance.taskCount}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>Coordinates:</DetailLabel>
                  <DetailValue>{instance.lat?.toFixed(2)}, {instance.lon?.toFixed(2)}</DetailValue>
                </InstanceDetail>
                <InstanceDetail>
                  <DetailLabel>Latency:</DetailLabel>
                  <DetailValue>{instance.latency}ms</DetailValue>
                </InstanceDetail>
                {instance.error && (
                  <InstanceDetail>
                    <DetailLabel>Error:</DetailLabel>
                    <DetailValue style={{ color: '#ef4444' }}>{instance.error}</DetailValue>
                  </InstanceDetail>
                )}
              </InstanceDetails>
            </InstanceCard>
          ))}
        </InstanceList>
      </TopologySection>
    </TopologyContainer>
  );
};

export default NetworkTopology;
