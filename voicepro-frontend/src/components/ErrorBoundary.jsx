import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      // window.Sentry?.captureException(error);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <AlertTriangle size={64} strokeWidth={1.5} />
            </div>

            <h1 className="error-title">Oops! Something went wrong</h1>
            <p className="error-message">
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleReset} className="btn btn-primary">
                <RefreshCcw size={20} />
                <span>Try Again</span>
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="btn btn-ghost"
              >
                <Home size={20} />
                <span>Go Home</span>
              </button>
            </div>

            <p className="error-help">
              If this problem persists, please contact support at{' '}
              <a href="mailto:support@voicepro.com">support@voicepro.com</a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
