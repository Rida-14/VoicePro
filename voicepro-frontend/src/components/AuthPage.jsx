import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './AuthPages.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  
  const from = location.state?.from?.pathname || '/';
  
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Check for Google OAuth errors from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    if (error) {
      const errorMessages = {
        google_denied: 'Google sign-in was cancelled',
        no_code: 'Google sign-in failed. Please try again.',
        token_exchange_failed: 'Google sign-in failed. Please try again.',
        no_access_token: 'Google sign-in failed. Please try again.',
        userinfo_failed: 'Could not get your Google profile. Please try again.',
        email_not_verified: 'Your Google email is not verified. Please verify it first.',
        server_error: 'Something went wrong. Please try again.',
      };
      setServerError(errorMessages[error] || 'Sign-in failed. Please try again.');
      window.history.replaceState({}, '', '/auth');
    }
  }, [location.search]);

  const handleGoogleLogin = () => {
    setServerError('');
    loginWithGoogle();
  };

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setServerError('');
    
    const result = await login('demo@voicepro.com', 'Demo1234', false);
    setLoading(false);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else if (result.error) {
      setServerError(result.error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-circle circle-1" />
        <div className="auth-circle circle-2" />
        <div className="auth-circle circle-3" />
      </div>

      <motion.div 
        className="auth-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="auth-logo">
          <Mic size={40} strokeWidth={2} />
          <span className="auth-logo-text">VoicePro</span>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Welcome to VoicePro</h1>
          <p className="auth-subtitle">Your voice-powered productivity assistant</p>
        </div>

        {/* Error Banner */}
        {serverError && (
          <div className="form-error-banner">{serverError}</div>
        )}

        {/* Auth Buttons */}
        <div className="auth-form">
          {/* Google Login */}
          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="btn google-btn btn-full"
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Demo Account Button */}
          <button 
            type="button"
            onClick={handleDemoLogin}
            className="btn btn-ghost btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Try Demo Account</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
