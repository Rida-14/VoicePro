import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Home, CheckSquare, Timer, BarChart3, Calendar, Mic, LogOut, Settings, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineDetector from './components/OfflineDetector';
import AuthPage from './components/AuthPage';
import AuthCallbackPage from './components/AuthCallbackPage';
import LandingPage from './components/LandingPage';
import PublicRoute from './components/PublicRoute';
import Dashboard from './components/Dashboard';
import TasksPage from './components/TasksPage';
import TimerPage from './components/TimerPage';
import CalendarPage from './components/CalendarPage';
import AnalyticsPage from './components/AnalyticsPage';
import ProfilePage from './components/ProfilePage';
import NotFoundPage from './components/NotFoundPage';
import ChatbotAssistant from './components/ChatbotAssistant';
import './styles/App.css';
import './App.css';

// Main App Layout with Sidebar
const AppLayout = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className={`app ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      {/* Mobile Header (visible only on small screens) */}
      <div className="mobile-header">
        <div className="logo">
          <Mic className="logo-icon" size={24} />
          <span className="logo-text">VoicePro</span>
        </div>
        <button 
          className="menu-toggle-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-overlay animate-fadeIn" 
          onClick={closeMenu}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Mic className="logo-icon" size={28} />
            <span className="logo-text">VoicePro</span>
          </div>
          {/* Close button for mobile inside sidebar */}
          <button className="mobile-close-btn" onClick={closeMenu}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className="nav-item" end onClick={closeMenu}>
            <Home className="nav-icon" size={20} />
            <span className="nav-label">Dashboard</span>
          </NavLink>
          
          <NavLink to="/tasks" className="nav-item" onClick={closeMenu}>
            <CheckSquare className="nav-icon" size={20} />
            <span className="nav-label">Tasks</span>
          </NavLink>
          
          <NavLink to="/timer" className="nav-item" onClick={closeMenu}>
            <Timer className="nav-icon" size={20} />
            <span className="nav-label">Time Tracker</span>
          </NavLink>
          
          <NavLink to="/calendar" className="nav-item" onClick={closeMenu}>
            <Calendar className="nav-icon" size={20} />
            <span className="nav-label">Calendar</span>
          </NavLink>
          
          <NavLink to="/analytics" className="nav-item" onClick={closeMenu}>
            <BarChart3 className="nav-icon" size={20} />
            <span className="nav-label">Insights</span>
          </NavLink>

          <NavLink to="/settings" className="nav-item" onClick={closeMenu}>
            <Settings className="nav-icon" size={20} />
            <span className="nav-label">Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar" style={{ padding: user?.profile_picture ? 0 : '', overflow: 'hidden' }}>
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt={user.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-status">{user?.email || ''}</div>
            </div>
          </div>
          <button onClick={logout} className="logout-btn" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <ChatbotAssistant />
    </div>
  );
};

const RootRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Landing Page logic: show Landing for guests, Dashboard for users */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <ProtectedRoute><AppLayout /></ProtectedRoute>
          ) : (
            <LandingPage />
          )
        } 
      />

      {/* Public Auth Routes: Redirect logged-in users away */}
      <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/signup" element={<Navigate to="/auth" replace />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Protected Internal Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppProvider>
            <OfflineDetector />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                },
                success: {
                  iconTheme: {
                    primary: '#2ECC71',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#E74C3C',
                    secondary: '#fff',
                  },
                },
              }}
            />

            <RootRoutes />
          </AppProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
