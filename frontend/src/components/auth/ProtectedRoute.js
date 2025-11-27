import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLogin from './AdminLogin';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        color: '#6b7280'
      }}>
        Checking authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return children;
};

export default ProtectedRoute;
