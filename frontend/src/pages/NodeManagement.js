import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Server,
  Plus,
  Trash2,
  Edit3,
  TestTube,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate } from '../utils/formatters';

const NodeManagementContainer = styled.div`
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

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
`;

const TitleIcon = styled.div`
  margin-right: 12px;
  color: #007bff;
`;

const Subtitle = styled.p`
  color: #4b5563;
  font-size: 1rem;
`;

const AddNodeButton = styled.button`
  background: #007bff;
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
    background: #0056b3;
  }
`;

const NodesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const NodeCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
  position: relative;
`;

const NodeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const NodeInfo = styled.div`
  flex-grow: 1;
`;

const NodeName = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 0.25rem;
`;

const NodeUrl = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  word-break: break-all;
  margin-bottom: 0.5rem;
`;

const NodeLocation = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
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
    switch (props.status) {
      case 'healthy':
      case 'reachable':
        return '#28a745';
      case 'unreachable':
      case 'offline':
        return '#dc3545';
      case 'unknown':
      default:
        return '#6c757d';
    }
  }};
`;

const NodeActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  ${props => {
    switch (props.variant) {
      case 'test':
        return `
          background: #17a2b8;
          color: white;
          &:hover { background: #138496; }
        `;
      case 'edit':
        return `
          background: #ffc107;
          color: #212529;
          &:hover { background: #e0a800; }
        `;
      case 'delete':
        return `
          background: #dc3545;
          color: white;
          &:hover { background: #c82333; }
        `;
      default:
        return `
          background: #6c757d;
          color: white;
          &:hover { background: #545b62; }
        `;
    }
  }}
`;

const Modal = styled.div`
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
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #222b45;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  
  &:hover {
    color: #374151;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  ${props => {
    if (props.primary) {
      return `
        background: #007bff;
        color: white;
        &:hover { background: #0056b3; }
      `;
    } else {
      return `
        background: #6c757d;
        color: white;
        &:hover { background: #545b62; }
      `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TestResults = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
`;

const TestResultItem = styled.div`
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const NodeManagement = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [testingNodes, setTestingNodes] = useState(new Set());
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    url: '',
    country: '',
    description: '',
    region: '',
    ip: '',
    lat: '',
    lng: '',
    cpu: '',
    memory: '',
    storage: '',
    version: ''
  });

  const fetchNodes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/nodes');
      setNodes(response.data.nodes || []);
    } catch (err) {
      setError('Failed to load nodes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      url: '',
      country: '',
      description: '',
      region: '',
      ip: '',
      lat: '',
      lng: '',
      cpu: '',
      memory: '',
      storage: '',
      version: ''
    });
  };

  const handleAddNode = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditNode = (node) => {
    setFormData({
      id: node.id,
      name: node.name,
      url: node.url,
      country: node.country,
      description: node.description || '',
      region: node.region || '',
      ip: node.ip || '',
      lat: node.lat?.toString() || '',
      lng: node.lng?.toString() || '',
      cpu: node.capacity?.cpu?.toString() || '',
      memory: node.capacity?.memory || '',
      storage: node.capacity?.storage || '',
      version: node.version || ''
    });
    setEditingNode(node);
    setShowEditModal(true);
  };

  const handleSubmit = async (isEdit = false) => {
    try {
      const payload = {
        ...formData,
        lat: formData.lat ? parseFloat(formData.lat) : 0,
        lng: formData.lng ? parseFloat(formData.lng) : 0,
        cpu: formData.cpu ? parseInt(formData.cpu) : 100,
        capacity: {
          cpu: formData.cpu ? parseInt(formData.cpu) : 100,
          memory: formData.memory || '100GB',
          storage: formData.storage || '1TB'
        }
      };

      if (isEdit) {
        await api.put(`/api/nodes/${editingNode.id}`, payload);
        setShowEditModal(false);
      } else {
        await api.post('/api/nodes', payload);
        setShowAddModal(false);
      }
      
      resetForm();
      fetchNodes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save node');
    }
  };

  const handleDeleteNode = async (nodeId) => {
    if (window.confirm('Are you sure you want to remove this node? This action cannot be undone.')) {
      try {
        await api.delete(`/api/nodes/${nodeId}`);
        fetchNodes();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete node');
      }
    }
  };

  const handleTestNode = async (nodeId) => {
    try {
      setTestingNodes(prev => new Set([...prev, nodeId]));
      const response = await api.post(`/api/nodes/${nodeId}/test`);
      setTestResults(prev => ({ ...prev, [nodeId]: response.data }));
    } catch (err) {
      setError('Failed to test node connectivity: ' + err.message);
    } finally {
      setTestingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'reachable':
        return <CheckCircle size={16} />;
      case 'unreachable':
      case 'offline':
        return <XCircle size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  if (loading && nodes.length === 0) {
    return <LoadingSpinner text="Loading nodes..." />;
  }

  return (
    <NodeManagementContainer>
      <Header>
        <div>
          <Title>
            <TitleIcon>
              <Server size={24} />
            </TitleIcon>
            Node Management
          </Title>
          <Subtitle>Manage nodes in the federated TES network</Subtitle>
        </div>
        <AddNodeButton onClick={handleAddNode}>
          <Plus size={16} />
          Add Node
        </AddNodeButton>
      </Header>

      {error && <ErrorMessage message={error} />}

      <NodesGrid>
        {nodes.map((node) => (
          <NodeCard key={node.id}>
            <NodeHeader>
              <NodeInfo>
                <NodeName>{node.name}</NodeName>
                <NodeUrl>{node.url}</NodeUrl>
                <NodeLocation>
                  <Globe size={12} style={{ marginRight: '4px' }} />
                  {node.country} • {node.region}
                </NodeLocation>
              </NodeInfo>
              <StatusBadge status={node.connectivity_test || node.status || 'unknown'}>
                {getStatusIcon(node.connectivity_test || node.status)}
                <span style={{ marginLeft: '4px' }}>
                  {(node.connectivity_test || node.status || 'unknown').toUpperCase()}
                </span>
              </StatusBadge>
            </NodeHeader>

            {node.description && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                {node.description}
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
              <div>Version: {node.version || 'Unknown'}</div>
              <div>Capacity: {node.capacity?.cpu || 'Unknown'} CPU, {node.capacity?.memory || 'Unknown'} Memory</div>
            </div>

            {testResults[node.id] && (
              <TestResults>
                <strong>Test Results:</strong>
                <TestResultItem>
                  Overall Status: {testResults[node.id].overall_status}
                </TestResultItem>
                {testResults[node.id].fastest_response_time && (
                  <TestResultItem>
                    Response Time: {Math.round(testResults[node.id].fastest_response_time * 1000)}ms
                  </TestResultItem>
                )}
                <TestResultItem>
                  Tested: {formatDate(testResults[node.id].timestamp)}
                </TestResultItem>
              </TestResults>
            )}

            <NodeActions>
              <ActionButton 
                variant="test" 
                onClick={() => handleTestNode(node.id)}
                disabled={testingNodes.has(node.id)}
                title="Test connectivity"
              >
                {testingNodes.has(node.id) ? <RefreshCw size={16} /> : <TestTube size={16} />}
              </ActionButton>
              <ActionButton 
                variant="edit" 
                onClick={() => handleEditNode(node)}
                title="Edit node"
              >
                <Edit3 size={16} />
              </ActionButton>
              <ActionButton 
                variant="delete" 
                onClick={() => handleDeleteNode(node.id)}
                title="Delete node"
              >
                <Trash2 size={16} />
              </ActionButton>
            </NodeActions>
          </NodeCard>
        ))}
      </NodesGrid>

      {/* Add Node Modal */}
      {showAddModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Add New Node</ModalTitle>
              <CloseButton onClick={() => setShowAddModal(false)}>
                <X />
              </CloseButton>
            </ModalHeader>

            <FormGroup>
              <Label>Node ID *</Label>
              <Input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g., elixir-de"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Node Name *</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., TESK @ ELIXIR-DE"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>URL *</Label>
              <Input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://tesk.example.org"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Country *</Label>
              <Input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., Germany"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Region</Label>
              <Input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="e.g., EU-Central"
              />
            </FormGroup>

            <FormGroup>
              <Label>Description</Label>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of this TES instance..."
              />
            </FormGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormGroup>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  placeholder="52.5200"
                />
              </FormGroup>

              <FormGroup>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  placeholder="13.4050"
                />
              </FormGroup>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <FormGroup>
                <Label>CPU Cores</Label>
                <Input
                  type="number"
                  value={formData.cpu}
                  onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                  placeholder="100"
                />
              </FormGroup>

              <FormGroup>
                <Label>Memory</Label>
                <Input
                  type="text"
                  value={formData.memory}
                  onChange={(e) => setFormData({ ...formData, memory: e.target.value })}
                  placeholder="100GB"
                />
              </FormGroup>

              <FormGroup>
                <Label>Storage</Label>
                <Input
                  type="text"
                  value={formData.storage}
                  onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                  placeholder="1TB"
                />
              </FormGroup>
            </div>

            <FormActions>
              <Button onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button primary onClick={() => handleSubmit(false)}>
                <Save size={16} />
                Add Node
              </Button>
            </FormActions>
          </ModalContent>
        </Modal>
      )}

      {/* Edit Node Modal */}
      {showEditModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Edit Node</ModalTitle>
              <CloseButton onClick={() => setShowEditModal(false)}>
                <X />
              </CloseButton>
            </ModalHeader>

            <FormGroup>
              <Label>Node Name *</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>URL *</Label>
              <Input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Country *</Label>
              <Input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Region</Label>
              <Input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </FormGroup>

            <FormGroup>
              <Label>Description</Label>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </FormGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormGroup>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                />
              </FormGroup>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <FormGroup>
                <Label>CPU Cores</Label>
                <Input
                  type="number"
                  value={formData.cpu}
                  onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Memory</Label>
                <Input
                  type="text"
                  value={formData.memory}
                  onChange={(e) => setFormData({ ...formData, memory: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Storage</Label>
                <Input
                  type="text"
                  value={formData.storage}
                  onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                />
              </FormGroup>
            </div>

            <FormActions>
              <Button onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button primary onClick={() => handleSubmit(true)}>
                <Save size={16} />
                Save Changes
              </Button>
            </FormActions>
          </ModalContent>
        </Modal>
      )}
    </NodeManagementContainer>
  );
};

export default NodeManagement;
