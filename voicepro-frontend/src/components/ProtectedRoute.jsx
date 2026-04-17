import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Check both context state and localStorage to handle async state updates
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const actuallyAuthenticated = isAuthenticated || (!!token && !!user);

  if (!actuallyAuthenticated) {
    // Redirect to login and save the attempted URL
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
