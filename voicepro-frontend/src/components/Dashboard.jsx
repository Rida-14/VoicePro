import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, Target, Play, Mic, DollarSign, Activity,
  Plus, X, Calendar as CalendarIcon, Edit2, Trash2, Flag
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import TaskModal from './TaskModal';
import './Dashboard.css';

import { Folder } from 'lucide-react';

const Dashboard = () => {
  const { createTask, updateTask, completeTask, deleteTask, tasks, user, recentTimers } = useApp();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [currentDateString, setCurrentDateString] = useState('');
  const [loading, setLoading] = useState(true);

  // Manual Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Real stats from task data - Memoized for performance
  const { completedToday, completionRate, inProgressCount } = useMemo(() => {
    const today = new Date().toDateString();

    const doneToday = tasks.filter(t => {
      if (t.status !== 'completed' || !t.completed_at) return false;
      return new Date(t.completed_at).toDateString() === today;
    }).length;

    const rate = tasks.length > 0
      ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
      : 0;

    const inProgress = tasks.filter(t => t.status === 'in_progress').length;

    return { completedToday: doneToday, completionRate: rate, inProgressCount: inProgress };
  }, [tasks]);

  const { sessionsToday, focusHoursToday } = useMemo(() => {
    if (!recentTimers) return { sessionsToday: 0, focusHoursToday: '0.0' };

    const today = new Date().toDateString();
    const todayTimers = recentTimers.filter(t => new Date(t.created_at).toDateString() === today);

    const sessions = todayTimers.length;
    const hours = (todayTimers.reduce((acc, t) => acc + (t.duration || 0), 0) / 60).toFixed(1);

    return { sessionsToday: sessions, focusHoursToday: hours };
  }, [recentTimers]);

  const highPriorityTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'in_progress')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [tasks]);

  const stats = useMemo(() => [
    { label: 'Tasks Left', value: tasks.filter(t => t.status === 'pending').length, icon: CheckSquare, color: 'primary', trend: `${tasks.filter(t => t.status === 'completed').length} completed` },
    { label: 'Completed Today', value: completedToday, icon: Clock, color: 'secondary', trend: `${completionRate}% completion rate` },
    { label: 'Focus Sessions', value: sessionsToday, icon: Target, color: 'purple', trend: 'Today' },
    { label: 'Focus Hours', value: focusHoursToday + 'h', icon: Activity, color: 'yellow', trend: 'Today' },
  ], [tasks, completedToday, completionRate, sessionsToday, focusHoursToday]);

  const { highPriorityCount, currMedPriorityCount, lowPriorityCount, noPriorityCount } = useMemo(() => {
    return {
      highPriorityCount: tasks.filter(t => t.status === 'pending' && t.priority === 'High').length,
      currMedPriorityCount: tasks.filter(t => t.status === 'pending' && t.priority === 'Medium').length,
      lowPriorityCount: tasks.filter(t => t.status === 'pending' && t.priority === 'Low').length,
      noPriorityCount: tasks.filter(t => t.status === 'pending' && !t.priority).length
    };
  }, [tasks]);

  const todayTasks = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      return new Date(t.due_date).toDateString() === today;
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }, [tasks]);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();

    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    setCurrentDateString(now.toLocaleDateString('en-US', options));

    // Instant load if we have data, otherwise a tiny delay (300ms) for smoother transition
    const dataReady = tasks.length > 0 || (recentTimers && recentTimers.length > 0);
    const delay = dataReady ? 0 : 300;

    const timer = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(timer);
  }, [tasks.length, recentTimers?.length]);

  // Edit task handler
  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };


  if (loading) {
    return (
      <div className="dashboard loading-state">
        <div className="shimmer shimmer-header"></div>
        <div className="dashboard-grid">
          <div className="shimmer shimmer-stats"></div>
          <div className="shimmer shimmer-glance"></div>
          <div className="shimmer shimmer-pomodoro"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">



      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0] || 'User'}</h1>
          <p className="page-subtitle">You have {tasks.filter(t => t.status === 'pending').length} tasks on your plate right now.</p>
        </div>
        <div className="header-controls">
          <div
            className="date-badge interactive"
            onClick={() => navigate('/calendar')}
            style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <CalendarIcon size={16} className="text-secondary" />
            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>{currentDateString}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Row 1: Left = Stats, Right = Triage */}
        <motion.div
          className="stats-grid-2x2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className={`stat-card glass-box border-${stat.color}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + (idx * 0.05) }}
              >
                <div className="stat-header" style={{ justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <span className="stat-trend">{stat.trend}</span>
                </div>
                <div className="stat-info">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="widget priority-matrix-widget glass-box"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="widget-header" style={{ marginBottom: '16px' }}>
            <h2 className="widget-title">
              <Flag size={20} className="text-secondary" />
              Task Triage
            </h2>
          </div>
          <div className="priority-grid">
            <div className="priority-block high">
              <span className="priority-count">{highPriorityCount}</span>
              <span className="priority-label">High Priority</span>
            </div>
            <div className="priority-block medium">
              <span className="priority-count">{currMedPriorityCount}</span>
              <span className="priority-label">Medium Priority</span>
            </div>
            <div className="priority-block low">
              <span className="priority-count">{lowPriorityCount}</span>
              <span className="priority-label">Low Priority</span>
            </div>
            <div className="priority-block none">
              <span className="priority-count">{noPriorityCount}</span>
              <span className="priority-label">Unprioritized</span>
            </div>
          </div>
        </motion.div>

        {/* Row 2: Left = Focus, Right = Schedule */}
        <motion.div
          className="widget glance-widget glass-box"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="widget-header">
            <h2 className="widget-title">
              <Activity size={20} className="text-primary" />
              Current Focus
            </h2>
            <div className="billable-badge">
              <span>{inProgressCount} In Progress</span>
            </div>
          </div>

          <div className="top-tasks-list custom-scrollbar">
            <AnimatePresence>
              {highPriorityTasks.map((task) => (
                <motion.div
                  key={task.task_id}
                  className="priority-task-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <label className="custom-checkbox">
                    <input type="checkbox" onClick={() => completeTask(task.task_id)} />
                    <span className="checkmark"></span>
                  </label>

                  <div className="task-info">
                    <div className="task-name-row">
                      <span className="task-name">{task.title}</span>
                    </div>
                    <div className="task-meta">
                      <span className="badge badge-category">
                        {task.category || 'Uncategorized'}
                      </span>
                      <span className="badge badge-duration">
                        <Clock size={12} /> {task.duration}
                      </span>
                      {task.priority && (
                        <span className={`badge badge-priority priority-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    className="btn-edit-task"
                    onClick={() => handleEditTask(task)}
                    title="Edit task"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#ff9966', marginLeft: 'auto' }}
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    className="btn-delete-task"
                    onClick={() => setTaskToDelete(task)}
                    title="Delete task"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#f87171', marginLeft: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {highPriorityTasks.length === 0 && (
              <div className="empty-state">
                <CheckSquare size={32} className="text-tertiary" />
                <p>No tasks in progress. Start working on a task!</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="widget timeline-widget glass-box"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="widget-header" style={{ marginBottom: '16px' }}>
            <h2 className="widget-title">
              <Clock size={20} className="text-purple" />
              Today's Schedule
            </h2>
          </div>
          <div className="timeline-container custom-scrollbar">
            {todayTasks.length > 0 ? (
              todayTasks.map((task, idx) => {
                const d = new Date(task.due_date);
                const timeString = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                return (
                  <div key={task.task_id} className="timeline-item">
                    <div className="timeline-time">{timeString}</div>
                    <div className="timeline-marker">
                      <div className={`marker-dot ${task.priority ? 'priority-' + task.priority.toLowerCase() : ''}`}></div>
                      {idx !== todayTasks.length - 1 && <div className="marker-line"></div>}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">{task.title}</div>
                      <div className="timeline-duration">{task.duration}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <CalendarIcon size={32} className="text-tertiary" />
                <p>Nothing strictly scheduled for today.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        mode="create"
      />

      <TaskModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingTask(null); }}
        mode="edit"
        taskToEdit={editingTask}
      />


      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="modal-overlay">
            <motion.div
              className="modal-container glass-box"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ maxWidth: '380px' }}
            >
              <div className="modal-header">
                <div>
                  <h2 style={{ color: '#f87171' }}>Delete Task</h2>
                  <p className="modal-subtitle">This action cannot be undone.</p>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '28px', lineHeight: '1.5', fontSize: '0.95rem' }}>
                Are you sure you want to delete <strong style={{ color: '#fff' }}>&#34;{taskToDelete.title}&#34;</strong>?
              </p>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setTaskToDelete(null)}>Cancel</button>
                <button
                  className="btn-primary-solid"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 20px rgba(239,68,68,0.3)' }}
                  onClick={() => { deleteTask(taskToDelete.task_id); setTaskToDelete(null); }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;