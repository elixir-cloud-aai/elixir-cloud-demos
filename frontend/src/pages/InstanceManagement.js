import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Globe, 
  Server, 
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 30px;
  gap: 20px;
`;

const Title = styled.h1`
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
  margin: 0;
  flex: 1;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #2980b9;
    transform: translateY(-2px);
  }
`;

const InstanceList = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  overflow: hidden;
`;

const InstanceItem = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ecf0f1;
  background: ${props => props.$isDragging ? '#f8f9fa' : 'white'};
  transition: all 0.3s ease;
  user-select: none; /* Prevent text selection during drag */
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f8f9fa;
  }

  /* Drag and drop visual feedback */
  ${props => props.$isDragging && `
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    transform: rotate(2deg);
    border-radius: 8px;
    z-index: 1000;
  `}
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  margin-right: 15px;
  color: #95a5a6;
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
`;

const InstanceInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InstanceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const InstanceName = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
`;

const StatusBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => props.$status === 'healthy' ? `
    background: rgba(46, 204, 113, 0.1);
    color: #27ae60;
  ` : `
    background: rgba(231, 76, 60, 0.1);
    color: #e74c3c;
  `}
`;

const InstanceDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 14px;
  color: #7f8c8d;
`;

const CountryInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const UrlInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 300px;
`;

const UrlText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  
  &:hover {
    background: rgba(231, 76, 60, 0.2);
    transform: scale(1.1);
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
`;

const ModalTitle = styled.h2`
  color: #2c3e50;
  margin: 0 0 20px 0;
  font-size: 24px;
  font-weight: 600;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 30px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => props.$primary ? `
    background: #3498db;
    color: white;
    
    &:hover {
      background: #2980b9;
    }
  ` : `
    background: #95a5a6;
    color: white;
    
    &:hover {
      background: #7f8c8d;
    }
  `}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
`;

const EmptyText = styled.p`
  font-size: 18px;
  margin: 0 0 10px 0;
`;

const EmptySubtext = styled.p`
  font-size: 14px;
  margin: 0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 30px 0 20px 0;
`;

const SectionTitle = styled.h2`
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  flex: 1;
`;

const SectionBadge = styled.span`
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
`;

const SectionDescription = styled.p`
  color: #7f8c8d;
  font-size: 14px;
  margin: 0 0 15px 0;
  line-height: 1.4;
`;

const AvailableInstanceItem = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ecf0f1;
  background: white;
  transition: all 0.3s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f8f9fa;
  }
`;

const InstanceIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  margin-right: 15px;
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
`;

const ReadOnlyBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  background: rgba(149, 165, 166, 0.1);
  color: #95a5a6;
`;

const InstanceManagement = () => {
  const [managedInstances, setManagedInstances] = useState([]);
  const [availableInstances, setAvailableInstances] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newInstance, setNewInstance] = useState({
    name: '',
    url: '',
    country: '',
    description: ''
  });

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      setLoading(true);
      try {
        console.log('🔄 Loading managed instances from /api/nodes');
        const managedResponse = await api.get('/api/nodes');
        const managedData = managedResponse.data;
        console.log('✅ Loaded managed instances data:', managedData);
        
        if (Array.isArray(managedData)) {
          setManagedInstances(managedData);
          console.log(`📋 Set ${managedData.length} managed instances`);
        } else if (managedData && managedData.nodes && Array.isArray(managedData.nodes)) {
          setManagedInstances(managedData.nodes);
          console.log(`📋 Set ${managedData.nodes.length} managed instances from .nodes property`);
        } else {
          console.warn('Managed instances API returned non-array data:', managedData);
          setManagedInstances([]);
        }
      } catch (managedError) {
        console.error('❌ Failed to load managed instances:', managedError);
        setManagedInstances([]);
      }

      try {
        console.log('🔄 Loading available instances from /api/instances');
        const availableResponse = await api.get('/api/instances');
        const availableData = availableResponse.data;
        console.log('✅ Loaded available instances data:', availableData);
        
        if (Array.isArray(availableData)) {
          setAvailableInstances(availableData);
          console.log(`📋 Set ${availableData.length} available instances`);
        } else {
          console.warn('Available instances API returned non-array data:', availableData);
          setAvailableInstances([]);
        }
      } catch (availableError) {
        console.error('❌ Failed to load available instances:', availableError);
        console.log('💡 Note: Available instances endpoint may not be implemented yet');
        setAvailableInstances([]);
      }
    } catch (error) {
      console.error('Failed to load instances:', error);
      setManagedInstances([]);
      setAvailableInstances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstance = async () => {
    if (!newInstance.name || !newInstance.url) {
      alert('Please fill in required fields (Name and URL)');
      return;
    }

    try {
      const instanceData = {
        id: Date.now().toString(),
        name: newInstance.name,
        url: newInstance.url,
        country: newInstance.country || 'Unknown',
        description: newInstance.description || '',
        status: 'unknown',
        lat: 0,
        lng: 0
      };

      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      const url = apiBaseUrl ? `${apiBaseUrl}/api/nodes` : '/api/nodes';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(instanceData)
      });

      if (response.ok) {
        await loadInstances();
        setShowModal(false);
        setNewInstance({ name: '', url: '', country: '', description: '' });
      } else {
        throw new Error('Failed to add instance');
      }
    } catch (error) {
      console.error('Error adding instance:', error);
      alert('Failed to add instance. Please try again.');
    }
  };

  const handleRemoveInstance = async (instanceId) => {
    if (!window.confirm('Are you sure you want to remove this instance?')) {
      return;
    }

    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      const url = apiBaseUrl ? `${apiBaseUrl}/api/nodes/${instanceId}` : `/api/nodes/${instanceId}`;
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadInstances();
      } else {
        throw new Error('Failed to remove instance');
      }
    } catch (error) {
      console.error('Error removing instance:', error);
      alert('Failed to remove instance. Please try again.');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(managedInstances);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setManagedInstances(items);
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Instance Management</Title>
        </Header>
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Instance Management</Title>
        <AddButton onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add Instance
        </AddButton>
      </Header>

      <SectionHeader>
        <SectionTitle>Available TES Instances</SectionTitle>
        <SectionBadge>{availableInstances.length}</SectionBadge>
      </SectionHeader>
      <SectionDescription>
        Discovered TES instances in the federation network. These are read-only and automatically detected.
      </SectionDescription>

      {availableInstances.length === 0 ? (
        <InstanceList>
          <EmptyState>
            <EmptyIcon>🔍</EmptyIcon>
            <EmptyText>No available instances discovered</EmptyText>
            <EmptySubtext>The system will automatically detect available TES instances in the network</EmptySubtext>
          </EmptyState>
        </InstanceList>
      ) : (
        <InstanceList>
          {availableInstances.map((instance, index) => (
            <AvailableInstanceItem key={`available-${index}`}>
              <InstanceIcon>
                <Server size={20} />
              </InstanceIcon>
              
              <InstanceInfo>
                <InstanceHeader>
                  <InstanceName>{instance.name}</InstanceName>
                  <ReadOnlyBadge>
                    <Globe size={10} />
                    Available
                  </ReadOnlyBadge>
                </InstanceHeader>
                
                <InstanceDetails>
                  <UrlInfo>
                    <Server size={14} />
                    <UrlText>{instance.url}</UrlText>
                    <ExternalLink size={12} />
                  </UrlInfo>
                </InstanceDetails>
              </InstanceInfo>
            </AvailableInstanceItem>
          ))}
        </InstanceList>
      )}

      <SectionHeader>
        <SectionTitle>Managed TES Instances</SectionTitle>
        <SectionBadge>{managedInstances.length}</SectionBadge>
      </SectionHeader>
      <SectionDescription>
        User-configured TES instances that you can add, remove, and reorder. Drag to change priority order.
      </SectionDescription>

      {managedInstances.length === 0 ? (
        <InstanceList>
          <EmptyState>
            <EmptyIcon>🏥</EmptyIcon>
            <EmptyText>No managed TES instances configured</EmptyText>
            <EmptySubtext>Add your first TES instance to start managing your federation</EmptySubtext>
          </EmptyState>
        </InstanceList>
      ) : (
        <InstanceList>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="managed-instances">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {Array.isArray(managedInstances) && managedInstances.map((instance, index) => (
                    <Draggable key={instance.id} draggableId={instance.id} index={index}>
                      {(provided, snapshot) => (
                        <InstanceItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          $isDragging={snapshot.isDragging}
                        >
                          <DragHandle {...provided.dragHandleProps}>
                            <GripVertical size={20} />
                          </DragHandle>
                          
                          <InstanceInfo>
                            <InstanceHeader>
                              <InstanceName>{instance.name}</InstanceName>
                              <StatusBadge $status={instance.status}>
                                {instance.status === 'healthy' ? (
                                  <CheckCircle size={12} />
                                ) : (
                                  <AlertCircle size={12} />
                                )}
                                {instance.status || 'Unknown'}
                              </StatusBadge>
                            </InstanceHeader>
                            
                            <InstanceDetails>
                              {instance.country && (
                                <CountryInfo>
                                  <Globe size={14} />
                                  {instance.country}
                                </CountryInfo>
                              )}
                              
                              <UrlInfo>
                                <Server size={14} />
                                <UrlText>{instance.url}</UrlText>
                                <ExternalLink size={12} />
                              </UrlInfo>
                            </InstanceDetails>
                          </InstanceInfo>
                          
                          <ActionButton onClick={() => handleRemoveInstance(instance.id)}>
                            <Trash2 size={18} />
                          </ActionButton>
                        </InstanceItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </InstanceList>
      )}

      {showModal && (
        <Modal onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <ModalContent>
            <ModalTitle>Add TES Instance</ModalTitle>
            
            <FormGroup>
              <Label>Instance Name *</Label>
              <Input
                type="text"
                value={newInstance.name}
                onChange={(e) => setNewInstance({...newInstance, name: e.target.value})}
                placeholder="e.g., Primary TES Node"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>URL *</Label>
              <Input
                type="url"
                value={newInstance.url}
                onChange={(e) => setNewInstance({...newInstance, url: e.target.value})}
                placeholder="https://tes-node.example.com"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>Country</Label>
              <Input
                type="text"
                value={newInstance.country}
                onChange={(e) => setNewInstance({...newInstance, country: e.target.value})}
                placeholder="e.g., Switzerland"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>Description</Label>
              <Input
                type="text"
                value={newInstance.description}
                onChange={(e) => setNewInstance({...newInstance, description: e.target.value})}
                placeholder="Optional description"
              />
            </FormGroup>
            
            <ButtonGroup>
              <Button onClick={() => setShowModal(false)}>Cancel</Button>
              <Button $primary onClick={handleAddInstance}>Add Instance</Button>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default InstanceManagement;
