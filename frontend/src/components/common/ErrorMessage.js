import React from 'react';
import styled from 'styled-components';
import { AlertCircle, X } from 'lucide-react';

const ErrorContainer = styled.div`
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  display: flex;
  align-items: center;
  color: #721c24;
`;

const IconContainer = styled.div`
  margin-right: 10px;
  flex-shrink: 0;
`;

const MessageContainer = styled.div`
  flex-grow: 1;
`;

const Title = styled.h4`
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
`;

const Message = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 10px;
  color: #721c24;
  
  &:hover {
    opacity: 0.7;
  }
`;

const ReasonText = styled.div`
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
`;

const ErrorCode = styled.span`
  display: inline-block;
  background-color: rgba(114, 28, 36, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
  font-family: monospace;
`;

const InstanceInfo = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(114, 28, 36, 0.2);
  font-size: 12px;
  opacity: 0.9;
`;

const ErrorMessage = ({ 
  title = 'Error', 
  message, 
  error, 
  onClose,
  className = '' 
}) => {
  const displayMessage = message || (error && error.message) || 'An unexpected error occurred';
  
  let errorReason = null;
  let errorCode = null;
  let errorType = null;
  let instanceInfo = null;
  
  if (error) {
    errorReason = error.reason || (error.response && error.response.data && error.response.data.reason);
    errorCode = error.errorCode || (error.response && error.response.data && error.response.data.error_code);
    errorType = error.errorType || (error.response && error.response.data && error.response.data.error_type);
    
    if (error.response && error.response.data) {
      const data = error.response.data;
      if (data.tes_name || data.tes_url) {
        instanceInfo = {
          name: data.tes_name,
          url: data.tes_url
        };
      }
    }
  }
  
  const displayTitle = errorCode ? `${title} ${errorCode ? `(${errorCode})` : ''}` : title;
  
  return (
    <ErrorContainer className={className}>
      <IconContainer>
        <AlertCircle size={20} />
      </IconContainer>
      <MessageContainer>
        <Title>
          {displayTitle}
          {errorCode && <ErrorCode>{errorCode}</ErrorCode>}
        </Title>
        <Message>{displayMessage}</Message>
        {errorReason && (
          <ReasonText>
            <strong>Reason:</strong> {errorReason}
          </ReasonText>
        )}
        {instanceInfo && (
          <InstanceInfo>
            <strong>Instance:</strong> {instanceInfo.name || 'Unknown'}<br/>
            {instanceInfo.url && <><strong>URL:</strong> {instanceInfo.url}</>}
          </InstanceInfo>
        )}
      </MessageContainer>
      {onClose && (
        <CloseButton onClick={onClose}>
          <X size={18} />
        </CloseButton>
      )}
    </ErrorContainer>
  );
};

export default ErrorMessage;
