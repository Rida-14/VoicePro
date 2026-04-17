import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('📤 Request to', config.url, 'with token:', token.substring(0, 20) + '...');
    } else {
      console.log('⚠️  Request to', config.url, 'NO TOKEN FOUND');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const suppressErrorToast = !!originalRequest?.suppressErrorToast;

    // Network error
    if (!error.response) {
      if (!suppressErrorToast) {
        if (!navigator.onLine) {
          toast.error('No internet connection');
        } else {
          toast.error('Network error. Please try again.');
        }
      }
      return Promise.reject(error);
    }

    // Token expired - attempt refresh (ignore credential-check endpoints)
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/password') ||
      originalRequest.url?.includes('/auth/account');

    if (error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      console.error('🚨 Got 401 Unauthorized:', error.response.data);

      // Clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');

      // Only redirect if we're not already on the auth page
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
      return Promise.reject(error);
    }

    // Handle specific error codes
    if (!suppressErrorToast) {
      switch (error.response.status) {
        case 400:
          toast.error(error.response.data.message || 'Bad request');
          break;
        case 403:
          toast.error('Access denied');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 429:
          toast.error('Too many requests. Please slow down.');
          break;
        case 500:
          toast.error(error.response.data?.message || 'Server error. Please try again later.');
          break;
        case 503:
          toast.error('Service unavailable. Please try again later.');
          break;
        default:
          if (error.response.data.message) {
            toast.error(error.response.data.message);
          }
      }
    }

    return Promise.reject(error);
  }
);

// Retry logic for failed requests
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || error.response?.status < 500) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

// Task API
export const taskAPI = {
  getAll: (userId) => retryRequest(() => api.get(`/tasks`, { params: { user_id: userId } })),
  getById: (taskId) => retryRequest(() => api.get(`/tasks/${taskId}`)),
  create: (taskData) => api.post('/tasks', taskData),
  update: (taskId, updates) => api.put(`/tasks/${taskId}`, updates),
  delete: (taskId) => api.delete(`/tasks/${taskId}`),
  complete: (taskId) => api.patch(`/tasks/${taskId}/complete`),
};

// Timer API
export const timerAPI = {
  start: (timerData) => api.post('/timers/start', timerData),
  stop: (timerId) => api.post(`/timers/${timerId}/stop`),
  log: (timerData) => api.post('/timers/log', timerData),
  delete: (timerId) => api.delete(`/timers/${timerId}`),
  clearAll: () => api.delete('/timers/clear-all'),
  getActive: () => retryRequest(() => api.get('/timers/active')),
  getTodaySummary: () => retryRequest(() => api.get('/timers/summary/today')),
  getHistory: (days = 7) => retryRequest(() => api.get('/timers/history', { params: { days } })),
};

// Voice API
export const voiceAPI = {
  transcribe: (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    return api.post('/voice/transcribe', formData, {
      suppressErrorToast: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  processCommand: (command) => api.post('/voice/command', { command }),
  assistantCommand: (command, context = {}, history = []) =>
    api.post('/voice/assistant-command', {
      command,
      context,
      history,
      now_iso: new Date().toISOString(),
    }),
};

// Reminder API
export const reminderAPI = {
  getAll: () => retryRequest(() => api.get('/reminders')),
  create: (reminderData) => api.post('/reminders', reminderData),
  update: (reminderId, updates) => api.put(`/reminders/${reminderId}`, updates),
  dismiss: (reminderId) => api.post(`/reminders/${reminderId}/dismiss`),
  getHistory: () => retryRequest(() => api.get('/reminders/history')),
  clearHistory: () => api.delete('/reminders/history'),
  deleteOne: (reminderId) => api.delete(`/reminders/${reminderId}`),
};

// Analytics API
export const analyticsAPI = {
  getProductivityInsights: (userId, period = 'week') =>
    retryRequest(() => api.get('/analytics/insights', {
      params: { user_id: userId, period }
    })),
  getTimeBreakdown: (userId, startDate, endDate) =>
    retryRequest(() => api.get('/analytics/time-breakdown', {
      params: { user_id: userId, start_date: startDate, end_date: endDate }
    })),
  getWeeklyReport: (userId) =>
    retryRequest(() => api.get('/analytics/weekly-report', { params: { user_id: userId } })),
};

// Integration API
export const integrationAPI = {
  connectGoogle: (authCode) => api.post('/integrations/google/connect', { code: authCode }),
  disconnectGoogle: () => api.post('/integrations/google/disconnect'),
  getCalendarEvents: (startDate, endDate) =>
    retryRequest(() => api.get('/integrations/google/calendar/events', {
      params: { start_date: startDate, end_date: endDate }
    })),
  syncToNotion: (taskId) => api.post(`/integrations/notion/sync/${taskId}`),
};

export default api;
