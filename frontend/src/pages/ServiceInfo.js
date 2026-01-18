import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Info, Server, Database, Code, RefreshCw, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { serviceInfoService } from '../services/serviceInfoService';
import { TES_INSTANCES } from '../utils/constants';

const ServiceInfoContainer = styled.div`
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

const InstanceSelector = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  color: #374151;
  min-width: 300px;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
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
  margin-left: 1rem;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const ServiceInfoCard = styled.div`
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

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const InfoSection = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
`;

const InfoSectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #222b45;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-weight: 500;
  color: #222b45;
  text-align: right;
  max-width: 200px;
  word-break: break-all;
`;



const NoDataMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const ErrorCard = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
`;

const ServiceInfo = () => {
  const [selectedInstance, setSelectedInstance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serviceInfo, setServiceInfo] = useState(null);
  const [tesInstances, setTesInstances] = useState([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
 
  useEffect(() => {
    loadTesInstances();
  }, []);
 
  useEffect(() => {
    if (tesInstances.length > 0 && !selectedInstance) {
      setSelectedInstance(tesInstances[0].url);
    }
  }, [tesInstances, selectedInstance]);
 
  const loadTesInstances = async () => {
    try {
      setLoadingInstances(true); 
      const response = await serviceInfoService.getHealthyInstances();
      if (response && response.instances && response.instances.length > 0) {
        setTesInstances(response.instances);
      } else { 
        const allInstances = await serviceInfoService.getTesInstances();
        setTesInstances(allInstances);
      }
    } catch (err) {
      console.error('Failed to load TES instances:', err); 
      setTesInstances(TES_INSTANCES);
    } finally {
      setLoadingInstances(false);
    }
  };

  const loadServiceInfo = async () => {
  if (!selectedInstance) return;

  try {
    setLoading(true);
    setError('');
    const info = await serviceInfoService.getServiceInfo(selectedInstance);
     
    if (info.error) { 
      setError(`⚠️ ${info.errorStatus}: ${info.errorMessage}`);
    }
    
    setServiceInfo(info);
  } catch (err) {
    console.error('Unexpected error fetching service info:', err);
    setError('❌ An unexpected error occurred while fetching service information. Please try again.');
    setServiceInfo(null);
  } finally {
    setLoading(false);
  }
};

  const formatServiceInfo = (info) => {
    if (!info) return null;

    const basicInfo = {
      'Service Name': info.name || 'Unknown',
      'Service Version': info.version || 'Unknown',
      'Service ID': info.id || 'Unknown',
      'Organization Name': info.organization?.name || 'Unknown',
      'Created At': info.createdAt || 'Unknown',
      'Description': info.description || 'N/A',
      'Organization URL': info.organization?.url || 'Unknown',
      'Contact URL': info.contactUrl || 'Unknown',
      'Documentation URL': info.documentationUrl || 'Unknown',
    };

    const apiInfo = {
      'API Version': info.type?.version || 'Unknown',
      'API Group': info.type?.group || 'Unknown',
      'API Artifact': info.type?.artifact || 'Unknown',
    };

    const storageInfo = {
      'Storage Type': info.storage?.join(', ') || 'Unknown',
      'Environment': info.environment || 'Unknown',
      'Version': info.version || 'Unknown',
    };

    return { basicInfo, apiInfo, storageInfo };
  };

  const selectedInstanceName = tesInstances.find(i => i.url === selectedInstance)?.name || 'Unknown';

  return (
    <ServiceInfoContainer>
      <Header>
        <HeaderLeft>
          <Title>Service Information</Title>
          <Subtitle>View detailed information about TES service instances</Subtitle>
        </HeaderLeft>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <InstanceSelector
            value={selectedInstance}
            onChange={(e) => setSelectedInstance(e.target.value)}
            disabled={loadingInstances}
          >
            <option value="">{loadingInstances ? 'Loading instances...' : 'Select TES Instance'}</option>
            {tesInstances.map((instance, idx) => (
              <option key={idx} value={instance.url}>
                {instance.name} ({instance.url})
              </option>
            ))}
          </InstanceSelector>
          <RefreshButton onClick={loadServiceInfo} disabled={loading || !selectedInstance}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </div>
      </Header>

      {error && (
        <ErrorCard>
          <AlertTriangle size={16} />
          <div>{error}</div>
        </ErrorCard>
      )}

      {selectedInstance && (
        <ServiceInfoCard>
          <SectionTitle>
            <Info size={20} />
            Service Information - {selectedInstanceName}
          </SectionTitle>

          {loading ? (
            <LoadingSpinner text="Fetching service information..." />
          ) : serviceInfo ? (
            (() => {
              const formattedInfo = formatServiceInfo(serviceInfo);
              return (
                <InfoGrid>
                  <InfoSection>
                    <InfoSectionTitle>
                      <Server size={16} />
                      Basic Information
                    </InfoSectionTitle>
                    {Object.entries(formattedInfo.basicInfo).map(([key, value]) => (
                      <InfoItem key={key}>
                        <InfoLabel>{key}</InfoLabel>
                        <InfoValue>{value}</InfoValue>
                      </InfoItem>
                    ))}
                  </InfoSection>

                  <InfoSection>
                    <InfoSectionTitle>
                      <Code size={16} />
                      API Information
                    </InfoSectionTitle>
                    {Object.entries(formattedInfo.apiInfo).map(([key, value]) => (
                      <InfoItem key={key}>
                        <InfoLabel>{key}</InfoLabel>
                        <InfoValue>{value}</InfoValue>
                      </InfoItem>
                    ))}
                  </InfoSection>

                  <InfoSection>
                    <InfoSectionTitle>
                      <Database size={16} />
                      Storage Information
                    </InfoSectionTitle>
                    {Object.entries(formattedInfo.storageInfo).map(([key, value]) => (
                      <InfoItem key={key}>
                        <InfoLabel>{key}</InfoLabel>
                        <InfoValue>{value}</InfoValue>
                      </InfoItem>
                    ))}
                  </InfoSection>
                </InfoGrid>
              );
            })()
          ) : !error ? (
            <NoDataMessage>
              Click "Refresh" to load service information for this instance
            </NoDataMessage>
          ) : null}

        </ServiceInfoCard>
      )}
    </ServiceInfoContainer>
  );
};

export default ServiceInfo;
