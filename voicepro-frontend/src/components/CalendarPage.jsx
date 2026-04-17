import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Calendar as CalendarIcon, Target } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek,
  addWeeks, subWeeks, addDays, subDays
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import TaskModal from './TaskModal';
import './CalendarPage.css';

const CalendarPage = () => {
  const navigate = useNavigate();
  const { tasks, recentTimers } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Dynamic Goal History State for Streaks
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(() => {
    try {
      const saved = localStorage.getItem('voicepro_daily_goal_minutes');
      return saved ? parseInt(saved, 10) : 240; // Default 4 hours
    } catch { return 240; }
  });

  const [goalHistory, setGoalHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('voicepro_goal_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0 && !parsed['2000-01-01']) {
          const globalGoalNum = dailyGoalMinutes;
          parsed['2000-01-01'] = (globalGoalNum === 370) ? 250 : globalGoalNum;
        }
        return parsed;
      }
      return {};
    } catch { return {}; }
  });

  // Calculate Streak
  let currentStreak = 0;

  const getGoalForDateStr = (dateStr) => {
    const sortedDates = Object.keys(goalHistory).sort((a, b) => b.localeCompare(a));
    for (const d of sortedDates) {
      if (d <= dateStr) {
        return goalHistory[d];
      }
    }
    return dailyGoalMinutes;
  };

  const getLocalDayString = (dateObj) => {
    return dateObj.toLocaleDateString('en-US');
  };

  const todayStr = getLocalDayString(new Date());

  // Create a mapping of recent dates to their total minutes
  const recentMinsByDate = {};
  (recentTimers || []).forEach(t => {
    const rawTime = t.start_time;
    const parsedDate = new Date(rawTime.endsWith('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z');
    const dStr = getLocalDayString(parsedDate);
    recentMinsByDate[dStr] = (recentMinsByDate[dStr] || 0) + (t.duration_minutes || 0);
  });

  // Count streak backwards from today up to 30 days
  const tempDate = new Date();
  for (let i = 0; i < 30; i++) {
    const dayObj = new Date(tempDate);
    dayObj.setDate(dayObj.getDate() - i);
    const dStr = getLocalDayString(dayObj);
    const ymdStr = dayObj.toLocaleDateString('en-CA');
    const dayGoal = getGoalForDateStr(ymdStr);
    const dayMins = recentMinsByDate[dStr] || 0;

    if (dayMins >= dayGoal) {
      currentStreak++;
    } else if (i === 0 && dayMins < dayGoal) {
      // If today isn't met yet, we don't break the streak, we just look at yesterday
      continue;
    } else {
      break;
    }
  }

  // Dynamic Events mapping from tasks
  const events = tasks
    .filter(task => task.due_date && task.status !== 'completed') // Only show active tasks with deadlines
    .map(task => {
      const dateObj = new Date(task.due_date.endsWith('Z') ? task.due_date : task.due_date.replace('+00:00', 'Z'));

      // Map priority to color
      let color = 'primary';
      if (task.priority === 'High') color = 'danger';
      else if (task.priority === 'Medium') color = 'warning';
      else if (task.priority === 'Low') color = 'success';

      return {
        id: task.task_id,
        title: task.title,
        date: dateObj,
        time: dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        duration: task.duration || 'N/A',
        location: task.category, // Use category as location string
        color: color,
        priority: task.priority
      };
    });

  // View Navigation Logic
  const nextPeriod = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const prevPeriod = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Dynamic Header Text
  const getHeaderText = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'MMMM d, yyyy');
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (isSameMonth(start, end)) {
        return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
      } else {
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      }
    }
    return format(currentDate, 'MMMM yyyy');
  };

  // Generate Days to Render based on View
  let calendarDaysToRender = [];
  if (viewMode === 'month') {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    calendarDaysToRender = eachDayOfInterval({ 
      start: startOfWeek(monthStart, { weekStartsOn: 1 }), 
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }) 
    });
  } else if (viewMode === 'week') {
    calendarDaysToRender = eachDayOfInterval({ 
      start: startOfWeek(currentDate, { weekStartsOn: 1 }), 
      end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
    });
  }

  const getEventsForDate = (date) => events.filter(event => isSameDay(event.date, date));
  const selectedDateEvents = getEventsForDate(selectedDate);
  const dayViewEvents = getEventsForDate(currentDate);

  // Hours for Day View Timeline (8 AM to 6 PM)
  const timelineHours = Array.from({ length: 11 }, (_, i) => i + 8);

  return (
    <div className="calendar-page">
      {/* Header */}
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="header-left">
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Manage your schedule and upcoming tasks</p>
        </div>
        <div className="header-controls">
          {currentStreak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,107,53,0.1)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,107,53,0.2)' }}>
              <span style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 800 }}>🔥 {currentStreak} Day Streak</span>
            </div>
          )}
          <button className="btn-primary" onClick={() => setIsTaskModalOpen(true)}>
            <Plus size={20} />
            <span>Add Task</span>
          </button>
        </div>
      </motion.div>

      <div className="calendar-container">
        {/* Controls */}
        <motion.div className="calendar-controls glass-box" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="calendar-nav">
            <button className="btn-today" onClick={goToToday}>Today</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="nav-btn" onClick={prevPeriod}><ChevronLeft size={20} /></button>
              <h2 className="current-month" style={{ minWidth: 'auto', margin: 0 }}>{getHeaderText()}</h2>
              <button className="nav-btn" onClick={nextPeriod}><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="segmented-control">
            {['month', 'week', 'day'].map((mode) => (
              <button
                key={mode}
                className={`segment-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => { setViewMode(mode); setCurrentDate(selectedDate); }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                {viewMode === mode && <motion.div layoutId="segment-active" className="segment-active-bg" />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="calendar-content">
          <motion.div className="calendar-grid-container glass-box" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>

            {/* Conditional Rendering based on ViewMode */}
            {viewMode === 'day' ? (
              <div className="day-timeline">
                {timelineHours.map(hour => {
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const hour12 = hour > 12 ? hour - 12 : hour;
                  const timeString = `${hour12}:00 ${ampm}`;

                  // Simplistic matching for mock data
                  const eventsInHour = dayViewEvents.filter(e => e.time.startsWith(`${hour12}:`) && e.time.includes(ampm));

                  return (
                    <div key={hour} className="timeline-hour">
                      <div className="time-label">{timeString}</div>
                      <div className="timeline-divider">
                        {eventsInHour.map(event => (
                          <div
                            key={event.id}
                            className={`timeline-event border-${event.color}`}
                            onClick={() => navigate('/tasks')}
                            style={{ cursor: 'pointer' }}
                          >
                            <h4>{event.title}</h4>
                            <span>{event.time} - {event.location || 'No category'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="calendar-grid">
                <div className="weekdays">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="weekday">{day}</div>
                  ))}
                </div>

                <div className={`days-grid ${viewMode === 'week' ? 'week-view' : ''}`}>
                  {calendarDaysToRender.map((day, index) => {
                    const dayEvents = getEventsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                      <motion.div
                        key={day.toISOString()}
                        className={`calendar-day ${!isCurrentMonth && viewMode === 'month' ? 'other-month' : ''} ${isTodayDate ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedDate(day)}
                        title={`${format(day, 'PPPP')} - ${dayEvents.length} events`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.005 }}
                        whileHover={{ scale: 1.05, zIndex: 10 }}
                      >
                        <div className="day-number-wrapper">
                          <span className="day-number">{format(day, 'd')}</span>
                          {isTodayDate && <div className="today-dot" />}
                        </div>

                        {dayEvents.length > 0 && (
                          viewMode === 'week' ? (
                            <div className="event-pills">
                              {dayEvents.slice(0, 3).map(event => (
                                <div
                                  key={event.id}
                                  className={`event-pill bg-${event.color}`}
                                  onClick={(e) => { e.stopPropagation(); navigate('/tasks'); }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && <div className="event-pill-more">+{dayEvents.length - 3} more</div>}
                            </div>
                          ) : (
                            <div className="event-dots">
                              {dayEvents.slice(0, 3).map(event => (
                                <div key={event.id} className={`event-dot bg-${event.color}`} style={{ opacity: 1, background: event.color === 'success' ? '#2ecc71' : event.color === 'warning' ? '#f1c40f' : '#e74c3c' }} title={event.title} />
                              ))}
                              {dayEvents.length > 3 && <div className="event-dot event-more" />}
                            </div>
                          )
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div className="events-sidebar glass-box" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="sidebar-header">
              <h3 className="sidebar-title">{format(selectedDate, 'EEEE, MMMM d')}</h3>
              <span className="event-count">{selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'event' : 'events'}</span>
            </div>

            <div className="events-list">
              <AnimatePresence mode="popLayout">
                {selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      className={`event-card event-${event.color}`}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="event-header">
                        <div className={`event-indicator bg-${event.color}`} style={{ opacity: 1, background: event.color === 'success' ? '#2ecc71' : event.color === 'warning' ? '#f1c40f' : '#e74c3c' }} />
                        <h4 className="event-title">{event.title}</h4>
                      </div>

                      <div className="event-details">
                        <div className="event-detail">
                          <Clock size={16} />
                          <span>{event.time} · {event.duration}</span>
                        </div>
                        {event.location && (
                          <div className="event-detail">
                            <MapPin size={16} />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.priority && (
                          <div className="event-detail" style={{ marginTop: '4px' }}>
                            <span className={`task-badge priority priority-${event.priority.toLowerCase()}`}>
                              {event.priority}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="event-footer" style={{ marginTop: '12px', borderTop: 'none', paddingTop: 0 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}
                          onClick={() => navigate('/tasks')}
                        >
                          View in Tasks
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="empty-icon-wrapper">
                      <CalendarIcon size={32} />
                    </div>
                    <p className="empty-title">No tasks scheduled</p>
                    <p className="empty-subtitle">Set deadlines on your tasks to see them here</p>
                    <button className="btn-primary mt-md" style={{ marginTop: '24px' }} onClick={() => navigate('/tasks')}>
                      <Plus size={16} color="white" />
                      <span>Add Task</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>


      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        mode="create"
      />
    </div>
  );
};

export default CalendarPage;