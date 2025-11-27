import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Admin credentials (in production, this should be handled securely)
  const ADMIN_CREDENTIALS = {
    username: 'tesadmin',
    password: 'admin@dashboard'
  };

  // Check if user is already logged in
  useEffect(() => {
    const authData = localStorage.getItem('tesAdminAuth');
    if (authData) {
      try {
        const { isAdmin: adminStatus, timestamp } = JSON.parse(authData);
        // Check if session is still valid (24 hours)
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
        const now = new Date().getTime();
        
        if (now - timestamp < sessionDuration && adminStatus) {
          setIsAuthenticated(true);
          setIsAdmin(true);
        } else {
          // Session expired
          localStorage.removeItem('tesAdminAuth');
        }
      } catch (error) {
        localStorage.removeItem('tesAdminAuth');
      }
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
          setIsAuthenticated(true);
          setIsAdmin(true);
          
          // Store auth state in localStorage
          const authData = {
            isAdmin: true,
            timestamp: new Date().getTime()
          };
          localStorage.setItem('tesAdminAuth', JSON.stringify(authData));
          
          resolve({ success: true, role: 'admin' });
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 500); // Simulate API delay
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('tesAdminAuth');
  };

  const value = {
    isAuthenticated,
    isAdmin,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
