import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  RefreshCw, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
  Eye,
  Code,
  Info
} from 'lucide-react';
import LoadingSpinner from './common/LoadingSpinner';
import axios from 'axios';
import MiddlewareTester from './MiddlewareTester';
import { Play } from 'lucide-react';

// proTES API is running on port 8080
const PROTES_API_BASE = 'http://localhost:8080';
const API_BASE = '/api/middlewares';

// Create axios instance for proTES API
const protesApi = axios.create({
  baseURL: PROTES_API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinnerWrapper = styled.div`
  display: inline-flex;
  animation: ${spin} 1s linear infinite;
`;

const Container = styled.div`
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif;
  background-color: #f8f9fa;
  min-height: calc(100vh - 80px);
`;

const Header = styled.div`
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const Title = styled.h1`
  color: #1d2329;
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.025em;
`;

const ActionsBar = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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
    pointer-events: none;
  }
`;

const PrimaryButton = styled(Button)`
  background: #1e40af;
  color: white;
  border-color: #1e40af;
  
  &:hover:not(:disabled) {
    background: #1e3a8a;
    border-color: #1e3a8a;
    box-shadow: 0 2px 4px rgba(30, 64, 175, 0.2);
  }
`;

const SecondaryButton = styled(Button)`
  background: #ffffff;
  color: #374151;
  border-color: #d1d5db;
  
  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }
`;

const DangerButton = styled(Button)`
  background: #dc2626;
  color: white;
  border-color: #dc2626;
  
  &:hover:not(:disabled) {
    background: #b91c1c;
    border-color: #b91c1c;
  }
`;

const MessageContainer = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  animation: slideDown 0.3s ease;
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SuccessMessage = styled(MessageContainer)`
  background: #f0fdf4;
  border: 1px solid #22c55e;
  color: #166534;
`;

const ErrorMessageStyled = styled(MessageContainer)`
  background: #fef2f2;
  border: 1px solid #ef4444;
  color: #991b1b;
`;

const MessageText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: inherit;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 32px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
`;

const TableHeaderCell = styled.th`
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.15s ease;
  
  &:hover {
    background-color: #f9fafb;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 16px;
  font-size: 0.875rem;
  color: #1d2329;
  vertical-align: middle;
`;

const IDCell = styled(TableCell)`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.75rem;
  color: #6b7280;
`;

const OrderCell = styled(TableCell)`
  text-align: center;
  font-weight: 600;
  color: #1e40af;
`;

const SourceBadge = styled.span`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
  
  ${props => props.source === 'local' ? `
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #bfdbfe;
  ` : `
    background: #f3e8ff;
    color: #7c3aed;
    border: 1px solid #c4b5fd;
  `}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const IconButton = styled.button`
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  color: #374151;
  
  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const FormSection = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 32px;
  margin-bottom: 32px;
`;

const FormTitle = styled.h2`
  margin: 0 0 24px 0;
  color: #1d2329;
  font-size: 1.5rem;
  font-weight: 600;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
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
  padding: 12px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  background: #ffffff;
  
  &:focus {
    outline: none;
    border-color: #1e3a8a;
    box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
  }
  
  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
  
  &:invalid {
    border-color: #dc2626;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 64px 24px;
  color: #6b7280;
`;

const EmptyStateTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 0.875rem;
`;

const ConfirmationDialog = styled.div`
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
  z-index: 1000;
  padding: 24px;
`;

const DialogContent = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 24px;
`;

const DialogTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1d2329;
`;

const DialogMessage = styled.p`
  margin: 0 0 24px 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const DialogActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

// Detail Modal Styled Components
const DetailModal = styled.div`
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
  z-index: 1000;
  padding: 20px;
`;

const DetailContent = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const DetailHeader = styled.div`
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

const DetailTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DetailBody = styled.div`
  padding: 24px;
`;

const DetailSection = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
`;

const DetailLabel = styled.div`
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
`;

const DetailValue = styled.div`
  color: #111827;
  font-size: 0.875rem;
  word-break: break-word;
  
  &.code {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    background: #1f2937;
    color: #10b981;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.8125rem;
    overflow-x: auto;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch(props.type) {
      case 'local': return '#dbeafe';
      case 'github': return '#e0e7ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch(props.type) {
      case 'local': return '#1e40af';
      case 'github': return '#4338ca';
      default: return '#374151';
    }
  }};
`;

const MetadataBox = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
`;

const MetadataRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
`;

const MetadataLabel = styled.span`
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
`;

const MetadataValue = styled.span`
  color: #111827;
  font-size: 0.875rem;
`;

const CodePreview = styled.pre`
  background: #1f2937;
  color: #10b981;
  padding: 16px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  overflow-x: auto;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
`;

const CloseIconButton = styled.button`
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

const LoadingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
`;

const LoadingText = styled.div`
  color: #6b7280;
  font-size: 0.875rem;
`;

const SpinnerIcon = styled(Loader)`
  animation: ${spin} 1s linear infinite;
  color: #3b82f6;
`;

export default function MiddlewareManager() {
  const [middlewares, setMiddlewares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedList, setReorderedList] = useState([]);
  const [testModal, setTestModal] = useState(null);
  
  // Detail modal state
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const handleTestMiddleware = (middleware) => {
  setTestModal(middleware);
};

  const closeTestModal = () => {
    setTestModal(null);
  };
  
  const [form, setForm] = useState({
    name: '',
    class_path: '',
    order: 0,
    github_url: ''
  });

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);
 
  useEffect(() => {
    fetchMiddlewares();
  }, []);

  const fetchMiddlewares = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await protesApi.get(API_BASE);
      if (Array.isArray(response.data)) {
        const sorted = [...response.data].sort((a, b) => (a.order || 0) - (b.order || 0));
        setMiddlewares(sorted);
        setReorderedList(sorted);
      } else {
        setMiddlewares([]);
        setReorderedList([]);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch middlewares';
      setError(errorMsg);
      setMiddlewares([]);
      setReorderedList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch middleware details by ID
  const fetchMiddlewareDetails = async (middlewareId) => {
    setDetailLoading(true);
    setDetailData(null);
    
    try {
      console.log(`Fetching details for middleware: ${middlewareId}`);
      const response = await protesApi.get(`${API_BASE}/${middlewareId}`);
      console.log('Middleware details:', response.data);
      setDetailData(response.data);
    } catch (err) {
      console.error('Error fetching middleware details:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch middleware details';
      setError(errorMsg);
      setDetailModal(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetails = (middleware) => {
    setDetailModal(middleware);
    fetchMiddlewareDetails(middleware._id);
  };

  const closeDetailModal = () => {
    setDetailModal(null);
    setDetailData(null);
    setDetailLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'order' ? parseInt(value) || 0 : value
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!form.github_url && !form.class_path.trim()) {
      setError('Either class_path or github_url is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        class_path: form.class_path.trim(),
        order: form.order || 0
      };
      
      if (form.github_url.trim()) {
        payload.github_url = form.github_url.trim();
      }

      const response = await protesApi.post(API_BASE, payload);
      
      if (response.data._id) {
        setMessage(`Middleware "${form.name}" added successfully!`);
        setForm({ name: '', class_path: '', order: 0, github_url: '' });
        setShowForm(false);
        await fetchMiddlewares();
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to add middleware';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (middlewareId) => {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    
    try {
      const response = await protesApi.delete(`${API_BASE}/${middlewareId}`);
      
      if (response.data.status === 'deleted' || response.status === 200) {
        setMessage('Middleware deleted successfully');
        setDeleteConfirm(null);
        await fetchMiddlewares();
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete middleware';
      if (err.response?.status === 404) {
        setError('Middleware not found');
      } else {
        setError(errorMsg);
      }
      setDeleteConfirm(null);
    } finally {
      setSubmitting(false);
    }
  };

  const moveMiddleware = (index, direction) => {
    const newList = [...reorderedList];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    
    if (swapWith < 0 || swapWith >= newList.length) return;
    
    [newList[index], newList[swapWith]] = [newList[swapWith], newList[index]];
    setReorderedList(newList);
  };

  const handleSaveOrder = async () => {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    
    try {
      const order = reorderedList.map(mw => mw._id);
      const response = await protesApi.put(`${API_BASE}/order`, { order });
      
      if (response.data.status === 'reordered' || response.status === 200) {
        setMessage('Middleware order updated successfully');
        setReorderMode(false);
        await fetchMiddlewares();
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to reorder middlewares';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelReorder = () => {
    setReorderedList([...middlewares]);
    setReorderMode(false);
  };

  const displayList = reorderMode ? reorderedList : middlewares;

  return (
    <Container>
      <Header>
        <Title>Middleware Management</Title>
        <ActionsBar>
          <SecondaryButton 
            onClick={fetchMiddlewares} 
            disabled={loading || submitting}
          >
            <RefreshCw size={18} />
            Refresh
          </SecondaryButton>
          {reorderMode ? (
            <>
              <PrimaryButton 
                onClick={handleSaveOrder}
                disabled={submitting}
              >
                <Save size={18} />
                Save Order
              </PrimaryButton>
              <SecondaryButton 
                onClick={cancelReorder}
                disabled={submitting}
              >
                Cancel
              </SecondaryButton>
            </>
          ) : (
            <>
              <PrimaryButton 
                onClick={() => setShowForm(!showForm)}
                disabled={submitting}
              >
                <Plus size={18} />
                Add Middleware
              </PrimaryButton>
              {middlewares.length > 1 && (
                <SecondaryButton 
                  onClick={() => {
                    setReorderMode(true);
                    setReorderedList([...middlewares]);
                  }}
                  disabled={submitting}
                >
                  Reorder
                </SecondaryButton>
              )}
            </>
          )}
          
        </ActionsBar>
      </Header>

      {message && (
        <SuccessMessage>
          <MessageText>
            <CheckCircle size={20} />
            <span>{message}</span>
          </MessageText>
          <CloseButton onClick={() => setMessage(null)}>
            <X size={18} />
          </CloseButton>
        </SuccessMessage>
      )}

      {error && (
        <ErrorMessageStyled>
          <MessageText>
            <AlertCircle size={20} />
            <span>{error}</span>
          </MessageText>
          <CloseButton onClick={() => setError(null)}>
            <X size={18} />
          </CloseButton>
        </ErrorMessageStyled>
      )}

      {showForm && (
        
        <FormSection>
          <FormTitle>Add New Middleware</FormTitle>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <FormGroup>
                <Label required>Name</Label>
                <Input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  disabled={submitting}
                  placeholder="e.g., CustomMiddleware"
                />
              </FormGroup>
              <FormGroup>
                <Label required={!form.github_url}>Class Path</Label>
                <Input
                  type="text"
                  name="class_path"
                  value={form.class_path}
                  onChange={handleFormChange}
                  required={!form.github_url}
                  disabled={submitting || !!form.github_url}
                  placeholder="e.g., pro_tes.plugins.middlewares.custom.CustomMiddleware"
                />
              </FormGroup>
              <FormGroup>
                <Label required>Order</Label>
                <Input
                  type="number"
                  name="order"
                  value={form.order}
                  onChange={handleFormChange}
                  required
                  disabled={submitting}
                  min="0"
                  placeholder="0"
                />
              </FormGroup>
              <FormGroup>
                <Label>GitHub URL (optional)</Label>
                <Input
                  type="url"
                  name="github_url"
                  value={form.github_url}
                  onChange={handleFormChange}
                  disabled={submitting}
                  placeholder="https://raw.githubusercontent.com/user/repo/main/middleware.py"
                />
              </FormGroup>
            </FormGrid>
            <ActionsBar>
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? (
                  <SpinnerWrapper>
                    <Loader size={18} />
                  </SpinnerWrapper>
                ) : (
                  <Plus size={18} />
                )}
                Add Middleware
              </PrimaryButton>
              <SecondaryButton 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setForm({ name: '', class_path: '', order: 0, github_url: '' });
                  setError(null);
                }}
                disabled={submitting}
              >
                Cancel
              </SecondaryButton>
            </ActionsBar>
          </form>
        </FormSection>
      )}

      {loading ? (
        <LoadingSpinner text="Loading middlewares..." />
      ) : displayList.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No Middlewares Found</EmptyStateTitle>
          <EmptyStateText>
            Get started by adding your first middleware using the "Add Middleware" button above.
          </EmptyStateText>
        </EmptyState>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell>Order</TableHeaderCell>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Class Path</TableHeaderCell>
                <TableHeaderCell>Source</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {displayList.map((middleware, index) => (
                <TableRow key={middleware._id}>
                  <OrderCell>
                    {reorderMode ? (
                      <ActionButtons>
                        <IconButton
                          onClick={() => moveMiddleware(index, 'up')}
                          disabled={index === 0 || submitting}
                          title="Move up"
                        >
                          <ChevronUp size={16} />
                        </IconButton>
                        <span style={{ minWidth: '24px', display: 'inline-block', textAlign: 'center' }}>
                          {middleware.order}
                        </span>
                        <IconButton
                          onClick={() => moveMiddleware(index, 'down')}
                          disabled={index === displayList.length - 1 || submitting}
                          title="Move down"
                        >
                          <ChevronDown size={16} />
                        </IconButton>
                      </ActionButtons>
                    ) : (
                      middleware.order
                    )}
                  </OrderCell>
                  <IDCell>{middleware._id}</IDCell>
                  <TableCell>{middleware.name}</TableCell>
                  <TableCell style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {middleware.class_path}
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={middleware.source || 'local'}>
                      {middleware.source || 'local'}
                    </SourceBadge>
                  </TableCell>
                  <TableCell>
                    {!reorderMode && (
                      <ActionButtons>
                        <IconButton
                          onClick={() => handleTestMiddleware(middleware)}
                          disabled={submitting}
                          title="Test Middleware"
                          style={{ color: '#059669', borderColor: '#059669' }}
                        >
                          <Play size={16} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleViewDetails(middleware)}
                          disabled={submitting}
                          title="View Details"
                          style={{ color: '#3b82f6', borderColor: '#3b82f6' }}
                        >
                          <Eye size={16} />
                        </IconButton>
                        <IconButton
                          onClick={() => setDeleteConfirm(middleware)}
                          disabled={submitting}
                          title="Delete"
                          style={{ color: '#dc2626', borderColor: '#dc2626' }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </ActionButtons>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <DetailModal onClick={(e) => {
          if (e.target === e.currentTarget) closeDetailModal();
        }}>
          <DetailContent>
            <DetailHeader>
              <DetailTitle>
                <Info size={24} />
                Middleware Details
              </DetailTitle>
              <CloseIconButton onClick={closeDetailModal}>
                <X size={24} />
              </CloseIconButton>
            </DetailHeader>
            
            <DetailBody>
              {detailLoading ? (
                <LoadingOverlay>
                  <SpinnerIcon size={40} />
                  <LoadingText>Loading middleware details...</LoadingText>
                </LoadingOverlay>
              ) : detailData ? (
                <>
                  <DetailSection>
                    <SectionTitle>
                      <Info size={18} />
                      Basic Information
                    </SectionTitle>
                    <DetailGrid>
                      <DetailLabel>ID:</DetailLabel>
                      <DetailValue className="code">{detailData._id}</DetailValue>
                      
                      <DetailLabel>Name:</DetailLabel>
                      <DetailValue>{detailData.name}</DetailValue>
                      
                      <DetailLabel>Order:</DetailLabel>
                      <DetailValue>{detailData.order}</DetailValue>
                      
                      <DetailLabel>Source:</DetailLabel>
                      <DetailValue>
                        <Badge type={detailData.source || 'local'}>
                          {detailData.source || 'local'}
                        </Badge>
                      </DetailValue>
                      
                      <DetailLabel>Class Path:</DetailLabel>
                      <DetailValue className="code">{detailData.class_path}</DetailValue>
                      
                      {detailData.github_url && (
                        <>
                          <DetailLabel>GitHub URL:</DetailLabel>
                          <DetailValue>
                            <a 
                              href={detailData.github_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ color: '#3b82f6', textDecoration: 'underline' }}
                            >
                              {detailData.github_url}
                            </a>
                          </DetailValue>
                        </>
                      )}
                    </DetailGrid>
                  </DetailSection>

                  {detailData.metadata && Object.keys(detailData.metadata).length > 0 && (
                    <DetailSection>
                      <SectionTitle>
                        <Code size={18} />
                        Metadata
                      </SectionTitle>
                      <MetadataBox>
                        {Object.entries(detailData.metadata).map(([key, value]) => (
                          <MetadataRow key={key}>
                            <MetadataLabel>{key}:</MetadataLabel>
                            <MetadataValue>
                              {typeof value === 'object' 
                                ? JSON.stringify(value, null, 2) 
                                : String(value)}
                            </MetadataValue>
                          </MetadataRow>
                        ))}
                      </MetadataBox>
                    </DetailSection>
                  )}

                  {detailData.code && (
                    <DetailSection>
                      <SectionTitle>
                        <Code size={18} />
                        Source Code
                      </SectionTitle>
                      <CodePreview>{detailData.code}</CodePreview>
                    </DetailSection>
                  )}

                  <DetailSection>
                    <SectionTitle>
                      <Info size={18} />
                      Additional Information
                    </SectionTitle>
                    <MetadataBox>
                  {/*<MetadataRow>
                        <MetadataLabel>Created At:</MetadataLabel>
                        <MetadataValue>{formatDate(detailData.created_at)}</MetadataValue>
                      </MetadataRow>
                      <MetadataRow>
                        <MetadataLabel>Updated At:</MetadataLabel>
                        <MetadataValue>{formatDate(detailData.updated_at)}</MetadataValue>
                      </MetadataRow>
                      */}
                      <MetadataRow>
                      
                        <MetadataLabel>Status:</MetadataLabel>
                        <MetadataValue>
                          <Badge type={detailData.status === 'active' ? 'local' : 'github'}>
                            {detailData.status || 'active'}
                          </Badge>
                        </MetadataValue>
                      </MetadataRow>
                    </MetadataBox>
                  </DetailSection>
                </>
              ) : (
                <LoadingOverlay>
                  <AlertCircle size={40} color="#ef4444" />
                  <LoadingText>Failed to load middleware details</LoadingText>
                </LoadingOverlay>
              )}
            </DetailBody>
          </DetailContent>
        </DetailModal>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmationDialog onClick={(e) => {
          if (e.target === e.currentTarget) setDeleteConfirm(null);
        }}>
          <DialogContent>
            <DialogTitle>Delete Middleware</DialogTitle>
            <DialogMessage>
              Are you sure you want to delete middleware <strong>"{deleteConfirm.name}"</strong>?
              This action cannot be undone.
            </DialogMessage>
            <DialogActions>
              <SecondaryButton 
                onClick={() => setDeleteConfirm(null)}
                disabled={submitting}
              >
                Cancel
              </SecondaryButton>
              <DangerButton 
                onClick={() => handleDelete(deleteConfirm._id)}
                disabled={submitting}
              >
                {submitting ? (
                  <SpinnerWrapper>
                    <Loader size={18} />
                  </SpinnerWrapper>
                ) : (
                  <Trash2 size={18} />
                )}
                Delete
              </DangerButton>
            </DialogActions>
          </DialogContent>
        </ConfirmationDialog>
      )}
      {testModal && (
        <MiddlewareTester 
          middleware={testModal}
          onClose={closeTestModal}
        />
      )}
    </Container>
  );
}