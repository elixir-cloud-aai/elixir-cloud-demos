import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { testConnection } from '../services/api';
import { taskService } from '../services/taskService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import useInstances from '../hooks/useInstances';
import { ArrowLeft, Play, Zap, RefreshCw } from 'lucide-react';

const PageContainer = styled.div`
  padding: 20px;
  background-color: #f8f9fa;
  min-height: calc(100vh - 80px);
`;

const BackButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-bottom: 20px;
  
  &:hover {
    background: #5a6268;
  }
`;

const FormCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  max-width: 800px;
`;

const Title = styled.h1`
  margin: 0 0 30px 0;
  font-size: 28px;
  color: #333;
  font-weight: 600;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 30px;
`;

const Button = styled.button`
  background: ${props => 
    props.variant === 'primary' ? '#007bff' : 
    props.variant === 'demo' ? '#28a745' :
    '#6c757d'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DemoButtonGroup = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
`;

const DemoTitle = styled.h3`
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
`;

const DemoDescription = styled.p`
  margin: 0 0 15px 0;
  color: #6c757d;
  font-size: 14px;
  line-height: 1.5;
`;

const StatusNotification = styled.div`
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
  color: #856404;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HelpText = styled.small`
  color: #6c757d;
  font-size: 12px;
  margin-top: 4px;
  display: block;
`;

const SubmitTask = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    tes_instance: '',
    task_name: '',
    docker_image: '',
    command: '',
    input_url: '',
    output_url: '',
    cpu_cores: '1',
    ram_gb: '2',
    disk_gb: '10',
    description: ''
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
 
  const { 
    instances, 
    loading: instancesLoading, 
    error: instancesError,
    refresh: refreshInstances 
  } = useInstances();

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setError(null);
       
      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      const testUrl = apiBaseUrl ? `${apiBaseUrl}/api/test_connection` : '/api/test_connection';
      const fetchResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('Fetch response status:', fetchResponse.status);
      const fetchData = await fetchResponse.json();
      console.log('Fetch data:', fetchData);
       
      const result = await testConnection();
      console.log('Axios result:', result);
      
      alert(`Connection Test SUCCESS: ${result.message} (${result.timestamp})`);
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(new Error(`Connection test failed: ${err.message}`));
    } finally {
      setTestingConnection(false);
    }
  };
 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
 
  const getDemoTaskData = (demoType = 'basic') => { 
    const defaultTesInstance = instances.length > 0 
      ? instances[0].url 
      : 'https://csc-tesk-noauth.rahtiapp.fi/v1/tasks';
    
    const demoTasks = {
      basic: {
        tes_instance: defaultTesInstance,
        task_name: 'Demo Hello World Task',
        docker_image: 'ubuntu:20.04',
        command: 'echo "Hello from TES Demo Task!" && echo "Current time: $(date)" && echo "System info: $(uname -a)" && echo "Task completed successfully"',
        input_url: '',
        output_url: '',
        cpu_cores: '1',
        ram_gb: '1',
        disk_gb: '5',
        description: 'A simple demo task that prints system information and a hello message. Safe to run and completes quickly for testing purposes.'
      },
      python: {
        tes_instance: defaultTesInstance,
        task_name: 'Demo Python Script Task',
        docker_image: 'python:3.9-slim',
        command: 'python3 -c "import sys; import datetime; print(f\'Hello from Python {sys.version}\'); print(f\'Current time: {datetime.datetime.now()}\'); print(\'Demo task completed successfully!\')"',
        input_url: '',
        output_url: '',
        cpu_cores: '1',
        ram_gb: '1',
        disk_gb: '5',
        description: 'A Python demo task that prints version info and timestamp using a Python container.'
      },
      fileops: {
        tes_instance: defaultTesInstance,
        task_name: 'Demo File Operations Task',
        docker_image: 'ubuntu:20.04',
        command: 'echo "Creating demo files..." && echo "Hello World" > /tmp/output.txt && echo "File contents:" && cat /tmp/output.txt && ls -la /tmp/',
        input_url: '',
        output_url: '',
        cpu_cores: '1',
        ram_gb: '1',
        disk_gb: '5',
        description: 'A demo task that creates and reads files, demonstrating basic file operations within the container.'
      }
    };
    
    return demoTasks[demoType] || demoTasks.basic;
  };

  const handleRunDemo = (demoType = 'basic') => {
    const demoData = getDemoTaskData(demoType);
    setFormData(demoData);
    setError(null);  
     
    const taskNames = {
      basic: 'Basic Hello World',
      python: 'Python Script',
      fileops: 'File Operations'
    };
    
    alert(`${taskNames[demoType] || 'Demo'} task data loaded! Review the form and click "Submit Task" when ready.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tes_instance || !formData.docker_image) {
      setError(new Error('TES instance and Docker image are required'));
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const submitData = {
        tes_instance: formData.tes_instance,
        task_type: 'custom', 
        task_name: formData.task_name,
        docker_image: formData.docker_image,
        command: formData.command,
        input_url: formData.input_url,
        output_url: formData.output_url,
        cpu_cores: formData.cpu_cores,
        ram_gb: formData.ram_gb,
        disk_gb: formData.disk_gb,
        description: formData.description
      };
      
      console.log('Submitting task with data:', submitData);
      
      const result = await taskService.submitTask(submitData);
      
      console.log('Task submission result:', result);
       
      if (result && result.message) {
        alert(`Success: ${result.message}`);
      } else {
        alert('Task submitted successfully!');
      }
      navigate('/tasks');
    } catch (err) {
      console.error('Task submission error:', err);
       
      let errorMessage = 'Failed to submit task';
      let errorReason = '';
      let errorType = 'unknown';
      let errorCode = '';
      
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        errorMessage = errorData.error || errorData.message || errorMessage;
        errorReason = errorData.reason || '';
        errorType = errorData.error_type || errorType;
        errorCode = errorData.error_code || '';
         
        if (errorReason) {
          errorMessage = `${errorMessage}\n\nReason: ${errorReason}`;
        }
         
        if (errorData.tes_name) {
          errorMessage = `${errorMessage}\n\nInstance: ${errorData.tes_name}`;
        }
        if (errorData.tes_url) {
          errorMessage = `${errorMessage}\nURL: ${errorData.tes_url}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
       
      const detailedError = new Error(errorMessage);
      detailedError.reason = errorReason;
      detailedError.errorType = errorType;
      detailedError.errorCode = errorCode;
      
      setError(detailedError);
       
    } finally {
      setSubmitting(false);
    }
  };

  if (instancesLoading) {
    return (
      <PageContainer>
        <LoadingSpinner text="Loading healthy TES instances..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton onClick={() => navigate('/tasks')}>
        <ArrowLeft size={16} style={{ marginRight: '8px' }} />
        Back to Tasks
      </BackButton>

      <FormCard>
        <Title>Submit New Task</Title>
        
        <DemoButtonGroup>
          <DemoTitle>🚀 Quick Start Demo Tasks</DemoTitle>
          <DemoDescription>
            New to TES? Try one of our demo tasks! These will auto-populate all fields with safe, working examples that complete quickly.
          </DemoDescription>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button type="button" variant="demo" onClick={() => handleRunDemo('basic')}>
              <Zap size={16} style={{ marginRight: '8px' }} />
              Basic Hello World
            </Button>
            <Button type="button" variant="demo" onClick={() => handleRunDemo('python')}>
              <Zap size={16} style={{ marginRight: '8px' }} />
              Python Script
            </Button>
            <Button type="button" variant="demo" onClick={() => handleRunDemo('fileops')}>
              <Zap size={16} style={{ marginRight: '8px' }} />
              File Operations
            </Button>
          </div>
        </DemoButtonGroup>
        
        {error && <ErrorMessage error={error} />}
        {instancesError && <ErrorMessage error={instancesError} />}
        
        {instances.length === 0 && !instancesLoading && (
          <StatusNotification>
            ⚠️ No healthy TES instances found. 
            <Button type="button" variant="demo" onClick={refreshInstances} style={{marginLeft: '10px', padding: '5px 10px'}}>
              <RefreshCw size={14} style={{ marginRight: '5px' }} />
              Refresh Instances
            </Button>
          </StatusNotification>
        )}
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="tes_instance">TES Instance *</Label>
            <Select
              id="tes_instance"
              name="tes_instance"
              value={formData.tes_instance}
              onChange={handleChange}
              required
            >
              <option value="">Select TES Instance</option>
              {instances.map((instance, index) => (
                <option key={index} value={instance.url}>
                  {instance.name} 
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="task_name">Task Name</Label>
            <Input
              id="task_name"
              name="task_name"
              type="text"
              value={formData.task_name}
              onChange={handleChange}
              placeholder="My awesome task"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="docker_image">Docker Image *</Label>
            <Input
              id="docker_image"
              name="docker_image"
              type="text"
              value={formData.docker_image}
              onChange={handleChange}
              placeholder="ubuntu:20.04"
              required
            />
            <HelpText>Docker image to run the task (e.g., ubuntu:20.04, python:3.9)</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="command">Command</Label>
            <TextArea
              id="command"
              name="command"
              value={formData.command}
              onChange={handleChange}
              placeholder="echo 'Hello World'"
            />
            <HelpText>Command to execute in the container</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="input_url">Input URL</Label>
            <Input
              id="input_url"
              name="input_url"
              type="url"
              value={formData.input_url}
              onChange={handleChange}
              placeholder="ftp://example.com/input.txt"
            />
            <HelpText>URL to input files (optional)</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="output_url">Output URL</Label>
            <Input
              id="output_url"
              name="output_url"
              type="url"
              value={formData.output_url}
              onChange={handleChange}
              placeholder="ftp://example.com/output/"
            />
            <HelpText>URL where outputs should be stored (optional)</HelpText>
          </FormGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <FormGroup>
              <Label htmlFor="cpu_cores">CPU Cores</Label>
              <Input
                id="cpu_cores"
                name="cpu_cores"
                type="number"
                min="1"
                max="32"
                value={formData.cpu_cores}
                onChange={handleChange}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="ram_gb">RAM (GB)</Label>
              <Input
                id="ram_gb"
                name="ram_gb"
                type="number"
                min="1"
                max="128"
                value={formData.ram_gb}
                onChange={handleChange}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="disk_gb">Disk (GB)</Label>
              <Input
                id="disk_gb"
                name="disk_gb"
                type="number"
                min="1"
                max="1000"
                value={formData.disk_gb}
                onChange={handleChange}
              />
            </FormGroup>
          </div>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <TextArea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Task description..."
            />
          </FormGroup>

          <ButtonGroup>
            <Button type="button" onClick={handleTestConnection} disabled={testingConnection}>
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            
            <Button type="submit" variant="primary" disabled={submitting}>
              <Play size={16} style={{ marginRight: '8px' }} />
              {submitting ? 'Submitting...' : 'Submit Task'}
            </Button>
            
            <Button type="button" onClick={() => navigate('/tasks')}>
              Cancel
            </Button>
          </ButtonGroup>
        </form>
      </FormCard>
    </PageContainer>
  );
};

export default SubmitTask;
