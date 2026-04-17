import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * PublicRoute component for pages that should only be accessible to unauthenticated users.
 * If a user is logged in, it redirects them to the Dashboard (/).
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#0a0a0c'
      }}>
        <div className="spinner" />
        <p style={{ marginTop: '16px', color: 'rgba(255,255,255,0.6)' }}>Syncing session...</p>
      </div>
    );
  }

  // Check both context state and localStorage to handle async state updates
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const actuallyAuthenticated = isAuthenticated || (!!token && !!user);

  if (actuallyAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;
