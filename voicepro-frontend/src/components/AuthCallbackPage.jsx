import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        handleGoogleCallback(token, userData);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Failed to parse auth callback data:', err);
        navigate('/auth?error=server_error', { replace: true });
      }
    } else {
      navigate('/auth?error=server_error', { replace: true });
    }
  }, [searchParams, navigate, handleGoogleCallback]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0D1117',
      color: 'rgba(255,255,255,0.6)',
      fontSize: '16px',
    }}>
      Signing you in...
    </div>
  );
};

export default AuthCallbackPage;
