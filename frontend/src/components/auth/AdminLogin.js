import React, { useState } from 'react';
import styled from 'styled-components';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  padding: 2rem;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 25% 25%, rgba(75, 85, 99, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(55, 65, 81, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const LoginCard = styled.div`
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 16px;
  padding: 3rem;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
  max-width: 450px;
  width: 100%;
  position: relative;
  z-index: 1;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #4f46e5, transparent);
    border-radius: 16px 16px 0 0;
  }
`;

const LoginHeader = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
`;

const LoginIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: #21262d;
  border: 2px solid #30363d;
  color: #f0f6fc;
  margin-bottom: 1.5rem;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 20px;
    background: linear-gradient(45deg, #4f46e5, #7c3aed, #4f46e5);
    z-index: -1;
    opacity: 0.7;
  }
`;

const LoginTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #f0f6fc;
  margin-bottom: 0.5rem;
  letter-spacing: -0.025em;
`;

const LoginSubtitle = styled.p`
  color: #8b949e;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const FormGroup = styled.div`
  position: relative;
  
  &:last-of-type {
    margin-bottom: 0.5rem;
  }
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  letter-spacing: 0.025em;
`;

const InputWrapper = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 90%;
  padding: 1rem 1rem;
  background: #0d1117;
  border: 2px solid #30363d;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #f0f6fc;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #4673e5ff;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
    background: #161b22;
  }
  
  &::placeholder {
    color: #6e7681;
  }
  
  &:hover:not(:focus) {
    border-color: #484f58;
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  z-index: 2;
  
  &:hover {
    color: #f0f6fc;
    background: #21262d;
  }
`;

const LoginButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: #4673e5ff;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover {
    background: #304fa3ff;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
`;

const ErrorMessage = styled.div`
  background: #21262d;
  color: #f85149;
  padding: 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  text-align: center;
  border: 1px solid #da3633;
  margin-bottom: 1rem;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: underline;
  margin-top: 1.5rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    color: #f0f6fc;
    background: #21262d;
    text-decoration: none;
  }
`;

const AdminCredentialsNote = styled.div`
  margin-top: 2rem;
  padding: 1.25rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #8b949e;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #2352a3ff, #2f6cc9ff, #4680e5ff);
    border-radius: 12px 12px 0 0;
  }
  
  .title {
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: #f0f6fc;
    font-size: 0.85rem;
  }
  
  div:not(.title) {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    background: #21262d;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    border: 1px solid #30363d;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const AdminLogin = ({ onBack }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.username, formData.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');  
  };

  return (
    <LoginContainer>
      <LoginCard>
        <LoginHeader>
          <LoginIcon>
            <Shield size={32} />
          </LoginIcon>
          <LoginTitle>Administrator Login</LoginTitle>
          <LoginSubtitle>Access to Node Management requires admin privileges</LoginSubtitle>
        </LoginHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <LoginForm onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Username</Label>
            <InputWrapper>
              <Input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter admin username"
                required
                autoComplete="username"
              />
            </InputWrapper>
          </FormGroup>

          <FormGroup>
            <Label>Password</Label>
            <InputWrapper>
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter admin password"
                required
                autoComplete="current-password"
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </PasswordToggle>
            </InputWrapper>
          </FormGroup>

          <LoginButton type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </LoginButton>
        </LoginForm>

        {onBack && (
          <BackButton onClick={onBack}>
            ← Back to Dashboard
          </BackButton>
        )}

        <AdminCredentialsNote>
          <div className="title">Demo Credentials:</div>
          <div>Username: tesadmin</div>
          <div>Password: admin@dashboard</div>
        </AdminCredentialsNote>
      </LoginCard>
    </LoginContainer>
  );
};

export default AdminLogin;
