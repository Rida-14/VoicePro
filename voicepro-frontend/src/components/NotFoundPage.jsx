import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import './NotFoundPage.css';

const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <motion.div 
        className="not-found-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="not-found-illustration">
          <div className="error-code">404</div>
          <div className="error-circle" />
        </div>

        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-message">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            <Home size={20} />
            <span>Go to Dashboard</span>
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-ghost">
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </button>
        </div>

        <div className="helpful-links">
          <h3>Need help finding something?</h3>
          <ul>
            <li><Link to="/tasks">View Tasks</Link></li>
            <li><Link to="/timer">Time Tracker</Link></li>
            <li><Link to="/calendar">Calendar</Link></li>
            <li><Link to="/analytics">Productivity Insights</Link></li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
