import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Check for existing token on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    let token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (token && userData) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.valid) {
          const freshUserData = response.data.user;
          if (localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify(freshUserData));
          } else if (sessionStorage.getItem('user')) {
            sessionStorage.setItem('user', JSON.stringify(freshUserData));
          }
          setUser(freshUserData);
          setIsAuthenticated(true);
        } else {
          logout();
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        logout();
        setLoading(false);
        return;
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  };

  // Google OAuth — redirect to backend which redirects to Google
  const loginWithGoogle = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  // Called from the /auth/callback route after Google redirect
  const handleGoogleCallback = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    setUser(userData);
    setIsAuthenticated(true);

    toast.success(`Welcome, ${userData.name}!`);
  };

  // Demo account login (email/password)
  const login = async (email, password, remember = false) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userData);
      setIsAuthenticated(true);

      toast.success(`Welcome back, ${userData.name}!`);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    delete axios.defaults.headers.common['Authorization'];

    setUser(null);
    setIsAuthenticated(false);

    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const updateProfile = async (updates) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, updates);
      const updatedUser = response.data.user;

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
