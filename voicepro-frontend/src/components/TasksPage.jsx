import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { Plus, Edit2 } from 'lucide-react';
import TaskModal from './TaskModal';
import './TasksPage.css';

const TasksPage = () => {
  const { tasks, completeTask, deleteTask, updateTask } = useApp();

  // Task Modal Trigger State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [taskToReopen, setTaskToReopen] = useState(null);

  // Filter State
  const [filters, setFilters] = useState({
    priority: 'All',
    duration: 'All',
    category: 'All',
    deadline: 'All'
  });

  const categories = Array.from(new Set(['Client Work', 'Meeting', 'Admin', 'Bills & utilities', ...tasks.map(t => t.category).filter(Boolean)]));

  // Edit task handler - just sets the task and opens modal
  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  // Filter tasks based on active filters
  const getFilteredTasks = (tasksToFilter) => {
    return tasksToFilter.filter(task => {
      // Priority filter
      if (filters.priority !== 'All' && task.priority !== filters.priority) {
        return false;
      }

      // Category filter
      if (filters.category !== 'All' && task.category !== filters.category) {
        return false;
      }

      // Duration filter
      if (filters.duration !== 'All') {
        const raw = task.duration || '';
        // Parse duration string like "1h 30m", "45m", "2h" into total minutes
        const hourMatch = raw.match(/(\d+)h/);
        const minMatch = raw.match(/(\d+)m/);
        const totalMins = (hourMatch ? parseInt(hourMatch[1]) * 60 : 0) + (minMatch ? parseInt(minMatch[1]) : 0);
        if (totalMins === 0) return false; // no duration set — exclude from filtered results
        if (filters.duration === 'Short' && totalMins > 30) return false;              // ≤ 30m
        if (filters.duration === 'Medium' && (totalMins < 31 || totalMins > 60)) return false; // 31–60m
        if (filters.duration === 'Long' && (totalMins <= 60 || totalMins > 180)) return false;  // 1h1m–3h
        if (filters.duration === 'VeryLong' && totalMins <= 180) return false;          // > 3h
      }

      // Deadline filter
      if (filters.deadline !== 'All') {
        if (!task.due_date) return false;

        const now = new Date();
        const due = new Date(task.due_date);
        const todayStr = now.toLocaleDateString('en-CA');
        const dueStr = due.toLocaleDateString('en-CA');

        if (filters.deadline === 'Overdue') {
          if (due >= now || task.status === 'completed') return false;
        } else if (filters.deadline === 'Today') {
          if (dueStr !== todayStr) return false;
        } else if (filters.deadline === 'Tomorrow') {
          const tmrw = new Date();
          tmrw.setDate(tmrw.getDate() + 1);
          if (dueStr !== tmrw.toLocaleDateString('en-CA')) return false;
        } else if (filters.deadline === 'Upcoming') {
          if (dueStr < todayStr) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const tasksByStatus = {
    pending: getFilteredTasks(tasks.filter(t => t.status === 'pending')),
    in_progress: getFilteredTasks(tasks.filter(t => t.status === 'in_progress')),
    completed: getFilteredTasks(tasks.filter(t => t.status === 'completed')),
  };

  const totalFilteredTasks = Object.values(tasksByStatus).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="tasks-page">
      <motion.div
        className="page-header tasks-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-left">
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Organize your work with voice commands or manual input</p>
        </div>
        <button
          className="btn-add-task"
          onClick={() => setIsTaskModalOpen(true)}
        >
          <Plus size={20} /> Add Task
        </button>
      </motion.div>

      {/* Filters Section */}
      <motion.div
        className="filters-section glass-box"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="filters-container">
          {/* Priority Filter */}
          <div className="filter-group">
            <label>Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="filter-select"
            >
              <option value="All">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="filter-select"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Duration Filter */}
          <div className="filter-group">
            <label>Duration</label>
            <select
              value={filters.duration}
              onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
              className="filter-select"
            >
              <option value="All">All Durations</option>
              <option value="Short">Short (≤ 30m)</option>
              <option value="Medium">Medium (31m - 1h)</option>
              <option value="Long">Long (1h - 3h)</option>
              <option value="VeryLong">Very Long (&gt; 3h)</option>
            </select>
          </div>

          {/* Deadline Filter */}
          <div className="filter-group">
            <label>Deadline</label>
            <select
              value={filters.deadline}
              onChange={(e) => setFilters({ ...filters, deadline: e.target.value })}
              className="filter-select"
            >
              <option value="All">All Dates</option>
              <option value="Overdue">Overdue</option>
              <option value="Today">Today</option>
              <option value="Tomorrow">Tomorrow</option>
              <option value="Upcoming">Upcoming</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(filters.priority !== 'All' || filters.category !== 'All' || filters.duration !== 'All' || filters.deadline !== 'All') && (
            <button
              className="btn-clear-filters"
              onClick={() => setFilters({ priority: 'All', duration: 'All', category: 'All', deadline: 'All' })}
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="filter-result">
          Showing {totalFilteredTasks} task{totalFilteredTasks !== 1 ? 's' : ''}
        </div>
      </motion.div>

      <div className="kanban-board">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
          <motion.div
            key={status}
            className="kanban-column"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="column-header">
              <h3 className="column-title">
                {status === 'pending' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem', background: 'linear-gradient(135deg, #818cf8, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>◷</span>
                    <span style={{ background: 'linear-gradient(135deg, #818cf8, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>To Do</span>
                  </span>
                )}
                {status === 'in_progress' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚡</span>
                    <span style={{ background: 'linear-gradient(135deg, #f59e0b, #fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>In Progress</span>
                  </span>
                )}
                {status === 'completed' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem', background: 'linear-gradient(135deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>✦</span>
                    <span style={{ background: 'linear-gradient(135deg, #22c55e, #86efac)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>Completed</span>
                  </span>
                )}
              </h3>
              <span className="task-count">{statusTasks.length}</span>
            </div>

            <div className="column-content">
              {statusTasks.map((task, index) => (
                <motion.div
                  key={task.task_id}
                  className={`task-card priority-${task.priority?.toLowerCase() || 'medium'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <div className="task-card-compact">
                    <div className="task-card-header">
                      <h4 className="task-card-title">{task.title}</h4>
                      {task.priority && (
                        <span className={`task-badge priority priority-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      )}
                    </div>


                    <div className="task-card-actions-compact">
                      <button
                        className="btn-action btn-action-edit"
                        onClick={() => handleEditTask(task)}
                        title="Edit task"
                      >
                        <Edit2 size={14} />
                      </button>
                      {status === 'pending' && (
                        <button
                          className="btn-action btn-action-progress"
                          onClick={() => updateTask(task.task_id, { status: 'in_progress' })}
                          title="Start task"
                        >
                          ⚡
                        </button>
                      )}
                      {status !== 'completed' && (
                        <button
                          className="btn-action btn-action-complete"
                          onClick={() => completeTask(task.task_id)}
                          title="Mark complete"
                        >
                          ✓
                        </button>
                      )}
                      {status === 'completed' && (
                        <button
                          className="btn-action btn-action-progress"
                          onClick={() => setTaskToReopen(task)}
                          title="Reopen task"
                          style={{ fontSize: '1rem' }}
                        >
                          ↩
                        </button>
                      )}
                      <button
                        className="btn-action btn-action-delete"
                        onClick={() => setTaskToDelete(task)}
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="task-card-expanded">
                    {task.description && (
                      <p className="task-card-description">{task.description}</p>
                    )}

                    <div className="task-card-meta">
                      <span className="task-badge category">{task.category || 'Client Work'}</span>
                      {task.duration && (
                        <span className="task-badge duration">⏱ {task.duration}</span>
                      )}
                      {task.due_date && (
                        <span className="task-badge deadline" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          Due: {new Date(task.due_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: '0.65rem', color: '#666', fontFamily: 'monospace' }}>
                        Created: {new Date(task.created_at).toLocaleDateString()} {new Date(task.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {status === 'completed' && (
                        <div style={{ fontSize: '0.7rem', color: 'rgba(134, 239, 172, 0.45)', marginTop: '4px', fontFamily: 'monospace' }}>
                          Completed: {task.completed_at ? `${new Date(task.completed_at).toLocaleDateString()} ${new Date(task.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {statusTasks.length === 0 && (
                <div className="empty-column">
                  <span className="empty-icon">
                    {status === 'pending' && '🎯'}
                    {status === 'in_progress' && '⚡'}
                    {status === 'completed' && '🎉'}
                  </span>
                  <p>No tasks here</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
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

      {/* Reopen Confirmation Modal */}
      <AnimatePresence>
        {taskToReopen && (
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
                  <h2 style={{ color: '#4ade80' }}>Reopen Task</h2>
                  <p className="modal-subtitle">This will move the task back to To Do.</p>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '28px', lineHeight: '1.5', fontSize: '0.95rem' }}>
                Reopen <strong style={{ color: '#fff' }}>&#34;{taskToReopen.title}&#34;</strong>? The completion time will be cleared.
              </p>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setTaskToReopen(null)}>Cancel</button>
                <button
                  className="btn-primary-solid"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 20px rgba(34,197,94,0.3)' }}
                  onClick={() => { updateTask(taskToReopen.task_id, { status: 'pending', completed_at: null }); setTaskToReopen(null); }}
                >
                  Reopen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TasksPage;
