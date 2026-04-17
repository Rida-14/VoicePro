import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { taskAPI, timerAPI, analyticsAPI, reminderAPI } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { user: authUser, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [recentTimers, setRecentTimers] = useState([]);
  const [taskReminders, setTaskReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = authUser;

  // Load tasks
  const loadTasks = useCallback(async () => {
    if (!user?.user_id && !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const response = await taskAPI.getAll(user.user_id);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, isAuthenticated]);

  // Load today's summary
  const loadTodaySummary = useCallback(async () => {
    if (!user?.user_id && !isAuthenticated) return;
    try {
      const response = await timerAPI.getTodaySummary();
      setTodaySummary(response.data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }, [user?.user_id, isAuthenticated]);

  // Load recent timers (last 7 days)
  const loadRecentTimers = useCallback(async () => {
    if (!user?.user_id && !isAuthenticated) return;
    try {
      const response = await timerAPI.getHistory(7);
      setRecentTimers(response.data);
    } catch (error) {
      console.error('Error loading recent timers:', error);
    }
  }, [user?.user_id, isAuthenticated]);

  // Load active timer on mount (in case page was refreshed mid-session)
  const loadActiveTimer = useCallback(async () => {
    if (!user?.user_id && !isAuthenticated) return;
    try {
      const response = await timerAPI.getActive();
      setActiveTimer(response.data?.timer || null);
    } catch (error) {
      console.error('Error loading active timer:', error);
    }
  }, [user?.user_id, isAuthenticated]);

  // Load reminders
  const loadReminders = useCallback(async () => {
    if (!user?.user_id && !isAuthenticated) return;
    try {
      const response = await reminderAPI.getAll();
      setTaskReminders(response.data);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  }, [user?.user_id, isAuthenticated]);

  // Initial load
  useEffect(() => {
    if (user?.user_id && isAuthenticated) {
      loadTasks();
      loadTodaySummary();
      loadRecentTimers();
      loadActiveTimer();
      loadReminders();
    }
  }, [user?.user_id, isAuthenticated, loadTasks, loadTodaySummary, loadRecentTimers, loadActiveTimer, loadReminders]);

  // Task operations
  const createTask = async (taskData) => {
    try {
      const taskWithTimestamp = {
        ...taskData,
        user_id: user.user_id,
        created_at: new Date().toISOString()
      };
      const response = await taskAPI.create(taskWithTimestamp);
      await loadTasks();
      await loadReminders();
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      await taskAPI.update(taskId, updates);
      await loadTasks();
      await loadReminders();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await taskAPI.delete(taskId);
      await loadTasks();
      await loadReminders();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const completeTask = async (taskId) => {
    try {
      await taskAPI.update(taskId, { status: 'completed' });
      await loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  };

  // Timer operations
  const startTimer = async (timerData) => {
    try {
      // Backend expects: type, duration (in minutes), task_id (optional)
      const payload = {
        user_id: user.user_id,
        type: timerData.type || 'manual',
        duration: timerData.duration, // minutes
        task_id: timerData.task_id || null,
        title: timerData.title || undefined,
      };
      const response = await timerAPI.start(payload);
      const timer = response.data?.timer || response.data;
      setActiveTimer(timer);
      return timer;
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    try {
      await timerAPI.stop(activeTimer.timer_id);
      setActiveTimer(null);
      // Refresh both summary and recent list
      await Promise.all([loadTodaySummary(), loadRecentTimers()]);
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  };

  const logTimer = async (timerData) => {
    try {
      const payload = {
        user_id: user.user_id,
        type: timerData.type || 'manual',
        duration: timerData.duration, // minutes
        task_id: timerData.task_id || null,
      };
      await timerAPI.log(payload);
      await Promise.all([loadTodaySummary(), loadRecentTimers()]);
    } catch (error) {
      console.error('Error logging timer:', error);
      throw error;
    }
  };

  const deleteTimer = async (timerId) => {
    try {
      await timerAPI.delete(timerId);
      await Promise.all([loadTodaySummary(), loadRecentTimers()]);
    } catch (error) {
      console.error('Error deleting timer:', error);
      throw error;
    }
  };

  const clearAllTimers = async () => {
    try {
      await timerAPI.clearAll();
      await Promise.all([loadTodaySummary(), loadRecentTimers()]);
    } catch (error) {
      console.error('Error clearing timer history:', error);
      throw error;
    }
  };

  // Analytics
  const getInsights = async (period = 'week') => {
    try {
      const response = await analyticsAPI.getProductivityInsights(user.user_id, period);
      return response.data;
    } catch (error) {
      console.error('Error loading insights:', error);
      throw error;
    }
  };

  const value = {
    user,
    tasks,
    activeTimer,
    todaySummary,
    recentTimers,
    taskReminders,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    startTimer,
    stopTimer,
    logTimer,
    deleteTimer,
    refreshTasks: loadTasks,
    refreshSummary: loadTodaySummary,
    refreshTimers: loadRecentTimers,
    refreshReminders: loadReminders,
    getInsights,
    clearAllTimers,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export default AppContext;
