import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  Play, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Loader,
  Zap,
  Settings,
  DollarSign,
  FileText,
  Info
} from 'lucide-react';
import axios from 'axios';

const TES_API_BASE = 'http://localhost:8080';

const tesApi = axios.create({
  baseURL: TES_API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled Components
const TestModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
`;

const TestContent = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

const TestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
`;

const TestTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
`;

const TestBody = styled.div`
  padding: 24px;
`;

const TestSection = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PrioritySelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const PriorityCard = styled.button`
  padding: 20px;
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? props.borderColor : '#e5e7eb'};
  background: ${props => props.selected ? props.bgColor : 'white'};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  
  &:hover {
    border-color: ${props => props.borderColor};
    background: ${props => props.bgColorHover};
  }
`;

const PriorityIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 8px;
`;

const PriorityLabel = styled.div`
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const PriorityDescription = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 500;
  margin-bottom: 8px;
  color: #374151;
  font-size: 0.875rem;
  
  ${props => props.required && `
    &::after {
      content: ' *';
      color: #dc2626;
    }
  `}
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.15s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: 'SF Mono', 'Monaco', monospace;
  transition: border-color 0.15s ease;
  min-height: 120px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: #1e40af;
  color: white;
  border-color: #1e40af;
  
  &:hover:not(:disabled) {
    background: #1e3a8a;
  }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #374151;
  border-color: #d1d5db;
  
  &:hover:not(:disabled) {
    background: #f9fafb;
  }
`;

const SpinnerWrapper = styled.div`
  display: inline-flex;
  animation: ${spin} 1s linear infinite;
`;

const ResultSection = styled.div`
  margin-top: 24px;
  animation: ${slideDown} 0.3s ease;
`;

const ResultCard = styled.div`
  background: ${props => {
    if (props.type === 'success') return '#f0fdf4';
    if (props.type === 'error') return '#fef2f2';
    return '#f9fafb';
  }};
  border: 1px solid ${props => {
    if (props.type === 'success') return '#22c55e';
    if (props.type === 'error') return '#ef4444';
    return '#e5e7eb';
  }};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
`;

const ResultTitle = styled.div`
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ResultContent = styled.pre`
  background: #1f2937;
  color: #10b981;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: 'SF Mono', 'Monaco', monospace;
  overflow-x: auto;
  margin: 8px 0 0 0;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
`;

const InfoBox = styled.div`
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  font-size: 0.875rem;
  color: #1e40af;
`;

const TagInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TagRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const SmallInput = styled(Input)`
  flex: 1;
  min-width: 0;
`;

const AddButton = styled.button`
  padding: 8px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  
  &:hover {
    background: #2563eb;
  }
`;

const RemoveButton = styled.button`
  padding: 8px 12px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  
  &:hover {
    background: #b91c1c;
  }
`;

const TagsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const Tag = styled.span`
  background: #e5e7eb;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #374151;
`;

export default function MiddlewareTester({ middleware, onClose }) {
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    image: 'alpine:latest',
    command: '',
    cpuCores: 1,
    ramGb: 2,
    diskGb: 10,
    customTags: {}
  });

  const [newTag, setNewTag] = useState({ key: '', value: '' });

  const priorities = [
    {
      value: 'high',
      icon: '⚡',
      label: 'High Priority',
      description: 'Routes to fastest service',
      color: '#dc2626',
      bgColor: '#fee2e2',
      bgColorHover: '#fecaca',
      borderColor: '#dc2626'
    },
    {
      value: 'medium',
      icon: '⚖️',
      label: 'Medium Priority',
      description: 'Routes to balanced service',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      bgColorHover: '#fde68a',
      borderColor: '#f59e0b'
    },
    {
      value: 'low',
      icon: '💰',
      label: 'Low Priority',
      description: 'Routes to cheapest service',
      color: '#059669',
      bgColor: '#d1fae5',
      bgColorHover: '#a7f3d0',
      borderColor: '#059669'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskForm(prev => ({
      ...prev,
      [name]: name.includes('Cores') || name.includes('Gb') 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const addCustomTag = () => {
    if (newTag.key && newTag.value) {
      setTaskForm(prev => ({
        ...prev,
        customTags: {
          ...prev.customTags,
          [newTag.key]: newTag.value
        }
      }));
      setNewTag({ key: '', value: '' });
    }
  };

  const removeCustomTag = (key) => {
    setTaskForm(prev => {
      const tags = { ...prev.customTags };
      delete tags[key];
      return { ...prev, customTags: tags };
    });
  };

  const parseCommand = (commandStr) => {
    if (!commandStr.trim()) {
      return ['echo', 'Hello World'];
    }
    
    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(commandStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Not JSON, treat as shell command
    }
    
    // If it starts with sh -c, parse it properly
    if (commandStr.trim().startsWith('sh -c')) {
      const match = commandStr.match(/sh\s+-c\s+["'](.+)["']/) || 
                   commandStr.match(/sh\s+-c\s+(.+)/);
      if (match) {
        return ['sh', '-c', match[1]];
      }
    }
    
    // Otherwise split by spaces (simple approach)
    return commandStr.trim().split(/\s+/);
  };

  const handleTest = async () => {
    if (!taskForm.name.trim()) {
      setTestResult({
        type: 'error',
        message: 'Task name is required',
        response: null
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const taskPayload = {
        name: taskForm.name.trim(),
        description: taskForm.description.trim() || `Testing middleware with ${selectedPriority} priority`,
        tags: {
          priority: selectedPriority,
          middleware_test: 'true',
          middleware_id: middleware._id,
          ...taskForm.customTags
        },
        executors: [
          {
            image: taskForm.image.trim() || 'alpine:latest',
            command: parseCommand(taskForm.command)
          }
        ],
        resources: {
          cpu_cores: taskForm.cpuCores || 1,
          ram_gb: taskForm.ramGb || 2,
          disk_gb: taskForm.diskGb || 10
        }
      };

      console.log('Submitting task:', JSON.stringify(taskPayload, null, 2));

      // Correct API endpoint
      const response = await tesApi.post('/ga4gh/tes/v1/tasks', taskPayload);

      console.log('Task response:', response.data);

      if (response.data.id) {
        // Wait a bit and fetch task details
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const taskDetails = await tesApi.get(`/ga4gh/tes/v1/tasks/${response.data.id}`);
        
        setTestResult({
          type: 'success',
          message: `Task submitted successfully with ${selectedPriority} priority`,
          taskId: response.data.id,
          response: taskDetails.data
        });
      } else {
        setTestResult({
          type: 'error',
          message: 'Unexpected response format',
          response: response.data
        });
      }
    } catch (err) {
      console.error('Test error:', err);

      let errorMessage = 'Failed to submit task';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      

      setTestResult({
        type: 'error',
        message: errorMessage,
        response: err.response?.data || { error: err.message }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <TestModal onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <TestContent>
        <TestHeader>
          <TestTitle>
            <Play size={24} />
            Test Middleware: {middleware.name}
          </TestTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </TestHeader>

        <TestBody>
          <InfoBox>
            <Info size={20} />
            <div>
              <strong>Testing {middleware.class_path}</strong>
              <br />
              Submit a test task to verify the middleware routes it correctly based on priority.
            </div>
          </InfoBox>

          <TestSection>
            <SectionTitle>
              <Settings size={18} />
              Select Priority Level
            </SectionTitle>
            <PrioritySelector>
              {priorities.map(priority => (
                <PriorityCard
                  key={priority.value}
                  selected={selectedPriority === priority.value}
                  borderColor={priority.borderColor}
                  bgColor={priority.bgColor}
                  bgColorHover={priority.bgColorHover}
                  onClick={() => setSelectedPriority(priority.value)}
                  type="button"
                >
                  <PriorityIcon>{priority.icon}</PriorityIcon>
                  <PriorityLabel>{priority.label}</PriorityLabel>
                  <PriorityDescription>{priority.description}</PriorityDescription>
                </PriorityCard>
              ))}
            </PrioritySelector>
          </TestSection>

          <TestSection>
            <SectionTitle>
              <FileText size={18} />
              Task Configuration
            </SectionTitle>
            
            <FormGrid>
              <FormGroup>
                <Label required>Task Name</Label>
                <Input
                  type="text"
                  name="name"
                  value={taskForm.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Test Task"
                  disabled={testing}
                />
              </FormGroup>

              <FormGroup>
                <Label>Description</Label>
                <Input
                  type="text"
                  name="description"
                  value={taskForm.description}
                  onChange={handleInputChange}
                  placeholder="Optional description"
                  disabled={testing}
                />
              </FormGroup>

              <FormGroup>
                <Label>Docker Image</Label>
                <Input
                  type="text"
                  name="image"
                  value={taskForm.image}
                  onChange={handleInputChange}
                  placeholder="alpine:latest"
                  disabled={testing}
                />
              </FormGroup>

              <FormGroup style={{ gridColumn: '1 / -1' }}>
                <Label>Command</Label>
                <TextArea
                  name="command"
                  value={taskForm.command}
                  onChange={handleInputChange}
                  placeholder={'["sh", "-c", "echo \'Hello World\'; sleep 5"]'}
                  disabled={testing}
                />
              </FormGroup>

              <FormGroup>
                <Label>CPU Cores</Label>
                <Input
                  type="number"
                  name="cpuCores"
                  value={taskForm.cpuCores}
                  onChange={handleInputChange}
                  min="1"
                  step="1"
                  disabled={testing}
                />
              </FormGroup>

              <FormGroup>
                <Label>RAM (GB)</Label>
                <Input
                  type="number"
                  name="ramGb"
                  value={taskForm.ramGb}
                  onChange={handleInputChange}
                  min="0.5"
                  step="0.5"
                  disabled={testing}
                />
              </FormGroup>

              <FormGroup>
                <Label>Disk (GB)</Label>
                <Input
                  type="number"
                  name="diskGb"
                  value={taskForm.diskGb}
                  onChange={handleInputChange}
                  min="1"
                  step="1"
                  disabled={testing}
                />
              </FormGroup>
            </FormGrid>

            <FormGroup>
              <Label>Custom Tags (Optional)</Label>
              <TagInput>
                <TagRow>
                  <SmallInput
                    type="text"
                    value={newTag.key}
                    onChange={(e) => setNewTag(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="Tag key"
                    disabled={testing}
                  />
                  <SmallInput
                    type="text"
                    value={newTag.value}
                    onChange={(e) => setNewTag(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Tag value"
                    disabled={testing}
                  />
                  <AddButton onClick={addCustomTag} type="button" disabled={testing}>
                    Add Tag
                  </AddButton>
                </TagRow>
                
                {Object.keys(taskForm.customTags).length > 0 && (
                  <TagsList>
                    {Object.entries(taskForm.customTags).map(([key, value]) => (
                      <Tag key={key}>
                        {key}: {value}
                        <RemoveButton 
                          onClick={() => removeCustomTag(key)}
                          style={{ marginLeft: '8px', padding: '2px 6px' }}
                          disabled={testing}
                        >
                          ×
                        </RemoveButton>
                      </Tag>
                    ))}
                  </TagsList>
                )}
              </TagInput>
            </FormGroup>
          </TestSection>

          <ButtonGroup>
            <SecondaryButton onClick={onClose} disabled={testing}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleTest} disabled={testing}>
              {testing ? (
                <>
                  <SpinnerWrapper>
                    <Loader size={18} />
                  </SpinnerWrapper>
                  Testing...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Run Test
                </>
              )}
            </PrimaryButton>
          </ButtonGroup>

          {testResult && (
            <ResultSection>
              <ResultCard type={testResult.type}>
                <ResultTitle>
                  {testResult.type === 'success' ? (
                    <CheckCircle size={20} color="#22c55e" />
                  ) : (
                    <AlertCircle size={20} color="#ef4444" />
                  )}
                  {testResult.message}
                </ResultTitle>
                
                {testResult.taskId && (
                  <div style={{ marginTop: '8px', fontSize: '0.875rem' }}>
                    <strong>Task ID:</strong> <code>{testResult.taskId}</code>
                  </div>
                )}
                
                {testResult.response && (
                  <ResultContent>
                    {JSON.stringify(testResult.response, null, 2)}
                  </ResultContent>
                )}
              </ResultCard>
            </ResultSection>
          )}
        </TestBody>
      </TestContent>
    </TestModal>
  );
}