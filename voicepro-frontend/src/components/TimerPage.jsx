import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Pause, RotateCcw, Plus, Bell, Mic, Coffee, Wind, Target, Calendar, X, Trash2, Settings, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { reminderAPI } from '../services/api';
import toast from 'react-hot-toast';
import './TimerPage.css';

const TimerPage = () => {
  const { user, activeTimer, startTimer, stopTimer, logTimer, deleteTimer, clearAllTimers, todaySummary, recentTimers, refreshTimers, createTask, getInsights, taskReminders, refreshReminders } = useApp();
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerType, setTimerType] = useState('pomodoro');
  const [showLogModal, setShowLogModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Custom modals (replacing browser dialogs)
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [timerTitleInput, setTimerTitleInput] = useState('');
  const [pendingTimerStart, setPendingTimerStart] = useState(null);
  const [timerToDelete, setTimerToDelete] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  const [goalHour, setGoalHour] = useState(2);
  const [goalMinute, setGoalMinute] = useState(0);
  const goalHourRef = useRef(null);
  const goalMinuteRef = useRef(null);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(() => {
    const saved = localStorage.getItem('voicepro_daily_goal_minutes');
    return saved ? parseInt(saved, 10) : 240;
  });
  const [goalHistory, setGoalHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('voicepro_goal_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Auto-heal corrupted state lacking a deep past baseline
        if (Object.keys(parsed).length > 0 && !parsed['2000-01-01']) {
          const rawGlobal = localStorage.getItem('voicepro_daily_goal_minutes');
          const globalGoalNum = rawGlobal ? parseInt(rawGlobal, 10) : 240;
          parsed['2000-01-01'] = (globalGoalNum === 370) ? 250 : globalGoalNum;
          localStorage.setItem('voicepro_goal_history', JSON.stringify(parsed));
        }
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  });

  // Log time entry form
  const [logForm, setLogForm] = useState({
    title: '',
    duration: 30,
  });

  // Log Duration Picker state
  const [showLogDurationPicker, setShowLogDurationPicker] = useState(false);
  const [logHour, setLogHour] = useState(0);
  const [logMinute, setLogMinute] = useState(30);
  const logHourRef = useRef(null);
  const logMinuteRef = useRef(null);

  // Reminder form and tracking
  const [reminderForm, setReminderForm] = useState({
    message: '',
    minutes: 25,
  });
  const [activeReminders, setActiveReminders] = useState([]);
  const [ringingAlarm, setRingingAlarm] = useState(null);
  const [reminderHistory, setReminderHistory] = useState([]); // fired reminders
  const [showReminderHistory, setShowReminderHistory] = useState(false); // toggle between active & history

  // Week Chart pagination
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedWeekDay, setSelectedWeekDay] = useState(null);

  // Clear selected day when changing weeks
  useEffect(() => {
    setSelectedWeekDay(null);
  }, [weekOffset]);

  // Sync log duration wheels to logForm state
  useEffect(() => {
    const mins = (logHour * 60) + logMinute;
    setLogForm(prev => ({ ...prev, duration: mins || 30 }));
  }, [logHour, logMinute]);

  // Reminder Duration Picker state
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [reminderHour, setReminderHour] = useState(0);
  const [reminderMinute, setReminderMinute] = useState(25);
  const reminderHourRef = useRef(null);
  const reminderMinuteRef = useRef(null);
  const reminderDuration = (reminderHour * 60 + reminderMinute) || 25;
  const reminderLabel = reminderDuration >= 60
    ? `${Math.floor(reminderDuration / 60)}h ${reminderDuration % 60}m`
    : `${reminderDuration}m`;

  // Manual duration picker
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [manualHour, setManualHour] = useState(0);
  const [manualMinute, setManualMinute] = useState(30);
  const manualHourRef = useRef(null);
  const manualMinuteRef = useRef(null);
  const manualDuration = (manualHour * 60 + manualMinute) || 30;
  const manualLabel = manualDuration >= 60
    ? `${Math.floor(manualDuration / 60)}h${manualDuration % 60 ? ' ' + manualDuration % 60 + 'm' : ''}`
    : `${manualDuration}m`;

  // Sync scroll when manual picker modal opens
  useEffect(() => {
    if (showManualPicker) {
      setTimeout(() => {
        if (manualHourRef.current) manualHourRef.current.scrollTop = manualHour * 50;
        if (manualMinuteRef.current) manualMinuteRef.current.scrollTop = manualMinute * 50;
      }, 50);
    }
  }, [showManualPicker]);

  // Load reminder history from backend (fired reminders)
  const loadReminderHistory = async () => {
    try {
      const res = await reminderAPI.getHistory();
      setReminderHistory(res.data || []);
    } catch (e) {
      console.error('Error loading reminder history', e);
    }
  };

  // Load history on mount
  useEffect(() => {
    loadReminderHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll when reminder picker modal opens
  useEffect(() => {
    if (showReminderPicker) {
      setTimeout(() => {
        if (reminderHourRef.current) reminderHourRef.current.scrollTop = reminderHour * 50;
        if (reminderMinuteRef.current) reminderMinuteRef.current.scrollTop = reminderMinute * 50;
      }, 50);
    }
  }, [showReminderPicker]);

  // Audio & Notification loop for ringing alarm
  useEffect(() => {
    if (!ringingAlarm) return;

    let audio = null;
    if (user?.focus_sounds !== false) {
      // Use a reliable, persistent digital alarm sound (Google standard public sound)
      audio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
      audio.loop = true;
      audio.play().catch(e => console.log('Audio autoplay blocked by browser', e));
    }

    let notif;
    if ('Notification' in window && Notification.permission === 'granted') {
      notif = new Notification(ringingAlarm.title, {
        body: ringingAlarm.message,
        icon: '/logo192.png',
        requireInteraction: true // Keeps the notification on screen until dismissed
      });
      notif.onclick = () => {
        window.focus();
        setRingingAlarm(null);
      };
    }

    return () => {
      if (audio) audio.pause();
      if (notif) notif.close();
    };
  }, [ringingAlarm, user?.focus_sounds]);

  // Timer countdown
  useEffect(() => {
    if (!activeTimer) { setTimeLeft(0); return; }

    const durationSecs = (activeTimer.duration_minutes || activeTimer.duration || 25) * 60;
    const elapsed = Math.floor((Date.now() - new Date(activeTimer.start_time).getTime()) / 1000);
    const remaining = Math.max(0, durationSecs - elapsed);

    // Stale timer: already expired in DB — auto-stop so user isn't stuck at 00:00
    if (remaining === 0) {
      stopTimer();
      return;
    }

    setTimeLeft(remaining);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimerComplete(activeTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer?.timer_id]); // key on timer_id so effect only re-runs when timer changes

  // Keep a ref to the latest taskReminders so the interval always sees fresh data
  // without needing to re-register on every reminders change.
  const taskRemindersRef = React.useRef(taskReminders);
  React.useEffect(() => {
    taskRemindersRef.current = taskReminders;
  }, [taskReminders]);

  // Global reminder checker — fires every 15 seconds and rings ONLY if the
  // reminder_time falls within the current 15-second window (i.e. it just became due).
  // This prevents the alarm from firing immediately on page load for reminders
  // that were set in the future.
  useEffect(() => {
    const INTERVAL_MS = 15000;

    const checkReminders = async () => {
      const reminders = taskRemindersRef.current;
      if (!reminders || reminders.length === 0) return;

      const now = new Date();
      const windowStart = new Date(now.getTime() - INTERVAL_MS); // 15 s ago

      for (const rem of reminders) {
        if (rem.is_sent) continue; // already fired, skip
        // Parse reminder_time as UTC regardless of format (handles bare, Z, or +00:00)
        const raw = rem.reminder_time;
        if (!raw) continue;
        const remTime = new Date(raw.includes('+') || raw.endsWith('Z') ? raw : raw + 'Z');
        if (isNaN(remTime)) continue;
        // Only ring if the reminder just became due within the last 15 seconds
        if (remTime >= windowStart && remTime <= now) {
          setRingingAlarm({
            id: rem.reminder_id,
            title: 'Task Reminder',
            message: rem.message,
            reminder_type: rem.reminder_type || 'task_deadline',
            isDbReminder: true
          });
          try {
            await reminderAPI.dismiss(rem.reminder_id);
            // Short delay so the alarm modal is visible before the item removes from list
            setTimeout(() => {
              refreshReminders();
              loadReminderHistory();
            }, 1500);
          } catch (e) { console.error('Error dismissing reminder', e); }
        }
      }
    };

    // Don't check immediately — wait for the first full interval so page-load
    // doesn't accidentally trigger reminders.
    const interval = setInterval(checkReminders, INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // register once; reads latest reminders via ref


  const handleTimerComplete = async (completedTimer) => {
    // 1. Play persistent alarm and notification
    setRingingAlarm({
      id: Date.now(),
      title: 'Timer Complete',
      message: `Your ${completedTimer?.type || 'timer'} session is complete!`
    });

    // 2. Formally stop the timer on the backend to log it to history
    if (stopTimer) {
      try {
        await stopTimer();
        if (refreshTimers) await refreshTimers(); // Refresh entries list
      } catch (err) {
        console.error('Failed to stop timer automatically:', err);
      }
    }
  };

  const handleStartTimer = () => {
    const duration = timerType === 'pomodoro' ? 25
      : timerType === 'short-break' ? 5
        : timerType === 'long-break' ? 15
          : manualDuration;
    setPendingTimerStart({ type: timerType, duration });
    setTimerTitleInput('');
    setShowTitleModal(true);
  };

  const confirmStartTimer = async () => {
    if (!pendingTimerStart) return;
    setShowTitleModal(false);
    const { type, duration } = pendingTimerStart;
    let newTaskId = null;
    if (timerTitleInput.trim()) {
      try {
        const taskRes = await createTask({
          title: timerTitleInput.trim(),
          description: `Voice Time Tracker session: ${type}`,
          category: 'Work',
          status: 'pending',
          priority: 'Medium'
        });
        newTaskId = taskRes?.task?.task_id || taskRes?.task_id || null;
      } catch (err) {
        console.error('Failed to create background task', err);
      }
    }
    try {
      await startTimer({ type, duration, task_id: newTaskId });
      toast.success(`${duration}-minute ${type} timer started!`);
    } catch (err) {
      toast.error('Failed to start timer. Try again.');
    }
    setPendingTimerStart(null);
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer();
      toast.success('Timer stopped and logged!');
    } catch (err) {
      toast.error('Failed to stop timer.');
    }
  };

  const handleResetTimer = () => {
    setShowResetConfirm(true);
  };

  const confirmResetTimer = async () => {
    if (activeTimer) {
      const type = activeTimer.type;
      const duration = activeTimer.duration_minutes || 25;
      const taskId = activeTimer.task_id; // Extract task_id which contains the title
      const oldTimerId = activeTimer.timer_id;

      // Stop the timer on the backend to finalize it
      await stopTimer();

      // Since they hit restart, they didn't finish. Delete the aborted partial log.
      if (oldTimerId) {
        await deleteTimer(oldTimerId);
      }

      // Start a fresh timer, preserving the task and title if it existed
      await startTimer({ type, duration, task_id: taskId });
      toast.success('Timer reset!');
      setShowResetConfirm(false);
    }
  };

  // Log time entry manually
  const handleLogTime = async (e) => {
    e.preventDefault();
    try {
      const taskRes = await createTask({
        title: logForm.title,
        description: `Manually logged ${logForm.duration} minutes`,
        duration: `${logForm.duration}m`,
        status: 'completed',
        priority: 'Medium',
        completed_at: new Date().toISOString(),
      });

      const newTaskId = taskRes?.task?.task_id || taskRes?.task_id || null;

      if (logTimer) {
        await logTimer({ type: 'manual', duration: logForm.duration, task_id: newTaskId });
      }

      if (refreshTimers) await refreshTimers();
      toast.success(`Logged ${logForm.duration} minutes!`);
      setShowLogModal(false);
      setLogForm({ title: '', duration: 30 });
      setLogHour(0);
      setLogMinute(30);
    } catch (error) {
      toast.error('Failed to log time');
    }
  };

  // Schedule reminder (creates active reminder and triggers browser notification/toast when time is up)
  const handleScheduleReminder = async (e) => {
    e.preventDefault();
    if (!reminderForm.minutes) return;

    const ms = reminderForm.minutes * 60 * 1000;
    const triggerTime = Date.now() + ms;
    const newReminder = {
      id: Date.now(),
      message: reminderForm.message || 'Time is up!',
      minutes: reminderForm.minutes,
      triggerTime
    };

    setActiveReminders(prev => [...prev, newReminder]);

    const scheduleNotif = () => setTimeout(() => {
      const firedAt = new Date().toISOString();
      setRingingAlarm({
        id: newReminder.id,
        title: 'Reminder',
        message: newReminder.message,
        reminder_type: 'manual',
        isDbReminder: false,
        firedAt
      });
      // Push to history immediately (in-memory, session only)
      setReminderHistory(prev => [{
        reminder_id: newReminder.id,
        message: newReminder.message,
        reminder_type: 'manual',
        fired_at: firedAt,
        reminder_time: new Date(newReminder.triggerTime).toISOString(),
        is_sent: true
      }, ...prev]);
      setActiveReminders(prev => prev.filter(r => r.id !== newReminder.id));
    }, ms);

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        scheduleNotif();
        toast.success(`Reminder set for ${reminderForm.minutes} minutes!`);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') { scheduleNotif(); toast.success(`Reminder set for ${reminderForm.minutes} minutes!`); }
          else {
            scheduleNotif();
            toast.error('Browser notifications blocked. App must be open to ring.');
          }
        });
      } else {
        scheduleNotif();
        toast.error('Notifications blocked. App must be open to ring.');
      }
    } else {
      scheduleNotif();
      toast.error('Notifications not supported. App must be open to ring.');
    }

    setShowReminderModal(false);
    setReminderForm({ message: '', minutes: 25 });
    setReminderHour(0);
    setReminderMinute(25);
  };



  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = activeTimer
    ? (((activeTimer.duration_minutes || activeTimer.duration || 25) * 60 - timeLeft) / ((activeTimer.duration_minutes || activeTimer.duration || 25) * 60)) * 100
    : 0;

  return (
    <>
      <div className="page timer-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Time Tracker</h1>
            <p className="page-subtitle">Track your time with manual timers</p>
          </div>

          <div className="header-controls">
            <button className="action-btn" onClick={() => setShowLogModal(true)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0 16px', height: '40px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Plus size={16} />
              <span>Log Time</span>
            </button>
            <button className="action-btn" onClick={() => setShowReminderModal(true)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0 16px', height: '40px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Bell size={16} />
              <span>Set Reminder</span>
            </button>
          </div>
        </div>


        <div className="timer-dashboard-grid">
          {/* Left Column: Timer & History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Timer Card */}
            <motion.div
              className="timer-card main-timer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ minHeight: '564px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <div className={`timer-display-wrap timer-mode-${activeTimer?.type || timerType}`}>
                <div className="timer-ambient-glow" />
                <div className="timer-display">
                  <svg className="timer-ring" viewBox="0 0 200 200">
                    {/* 12 tick marks around the ring */}
                    {Array.from({ length: 60 }, (_, i) => {
                      const angle = (i * 6 - 90) * (Math.PI / 180);
                      const isMajor = i % 5 === 0;
                      const r1 = isMajor ? 79 : 81;
                      const r2 = 91;
                      return (
                        <line
                          key={i}
                          x1={100 + r1 * Math.cos(angle)}
                          y1={100 + r1 * Math.sin(angle)}
                          x2={100 + r2 * Math.cos(angle)}
                          y2={100 + r2 * Math.sin(angle)}
                          stroke={isMajor ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)'}
                          strokeWidth={isMajor ? 1.5 : 0.8}
                          strokeLinecap="round"
                        />
                      );
                    })}
                    <circle
                      className="timer-ring-bg"
                      cx="100" cy="100" r="75"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.07)"
                      strokeWidth="7"
                    />
                    <circle
                      className="timer-ring-progress"
                      cx="100" cy="100" r="75"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 75}`}
                      strokeDashoffset={`${2 * Math.PI * 75 * (1 - progress / 100)}`}
                      transform="rotate(-90 100 100)"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--accent)" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="timer-content">
                    <div className={`timer-time ${(activeTimer ? formatTime(timeLeft) : '00:00').length > 5 ? 'long-format' : ''}`}>
                      {activeTimer ? formatTime(timeLeft) : '00:00'}
                    </div>
                    <div className="timer-mode-label">
                      {activeTimer
                        ? (activeTimer.type === 'pomodoro' ? 'Pomodoro' :
                          activeTimer.type === 'short-break' ? 'Short Break' :
                            activeTimer.type === 'long-break' ? 'Long Break' : 'Manual')
                        : (timerType === 'pomodoro' ? 'Pomodoro · 25m' :
                          timerType === 'short-break' ? 'Short Break · 5m' :
                            timerType === 'long-break' ? 'Long Break · 15m' :
                              `Manual · ${manualLabel}`)}
                    </div>
                  </div>
                </div>
              </div>

              {!activeTimer ? (
                <div className="timer-controls">
                  <div className="timer-type-grid">
                    <button
                      className={`type-btn mode-pomodoro ${timerType === 'pomodoro' ? 'active' : ''}`}
                      onClick={() => setTimerType('pomodoro')}
                    >
                      <Coffee size={16} />
                      <span>Pomodoro</span>
                      <span className="type-duration">25m</span>
                    </button>
                    <button
                      className={`type-btn mode-short ${timerType === 'short-break' ? 'active' : ''}`}
                      onClick={() => setTimerType('short-break')}
                    >
                      <Wind size={16} />
                      <span>Short Break</span>
                      <span className="type-duration">5m</span>
                    </button>
                    <button
                      className={`type-btn mode-long ${timerType === 'long-break' ? 'active' : ''}`}
                      onClick={() => setTimerType('long-break')}
                    >
                      <Target size={16} />
                      <span>Long Break</span>
                      <span className="type-duration">15m</span>
                    </button>
                    <button
                      className={`type-btn mode-manual ${timerType === 'manual' ? 'active' : ''}`}
                      onClick={() => { setTimerType('manual'); setShowManualPicker(true); }}
                    >
                      <Clock size={16} />
                      <span>Manual</span>
                      <span className="type-duration">{manualLabel}</span>
                    </button>
                  </div>

                  <div className="start-timer-row">
                    <button className="start-timer-btn" onClick={handleStartTimer}>
                      <span className="start-timer-icon"><Play size={18} /></span>
                      Start Timer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="timer-controls">
                  <div className="active-timer-actions">
                    <button className="stop-timer-btn" onClick={handleStopTimer}>
                      <span className="start-timer-icon"><Pause size={16} /></span>
                      Stop Timer
                    </button>
                    <button className="reset-timer-btn" onClick={handleResetTimer} title="Restart Timer">
                      <RotateCcw size={16} />
                      <span>Restart</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Recent Time Entries */}
            <motion.div
              className="timer-card recent-entries"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="entries-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="card-title">Recent Time Entries</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <button
                    onClick={() => setShowLogModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'rgba(255,107,53,0.12)',
                      border: '1px solid rgba(255,107,53,0.3)',
                      borderRadius: 8, padding: '5px 11px',
                      fontSize: '0.72rem', fontWeight: 700,
                      color: '#ff9060', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.22)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.12)'; }}
                  >
                    <Plus size={12} /> Log Time
                  </button>
                  {recentTimers && recentTimers.length > 0 && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        borderRadius: 8, padding: '5px 11px',
                        fontSize: '0.72rem', fontWeight: 700,
                        color: '#f87171', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.18)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  )}
                </div>
              </div>
              <div className="entries-list">
                {recentTimers && recentTimers.length > 0 ? (
                  recentTimers.slice(0, 7).map((timer, index) => (
                    <motion.div
                      key={timer.timer_id}
                      className="entry-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="entry-main">
                        <div className="entry-title">
                          {timer.task_title || timer.task?.title || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontWeight: 400 }}>{timer.type.replace('-', ' ')} session</span>}
                        </div>
                        <div className="entry-meta">
                          <span className="entry-category" style={{ textTransform: 'capitalize' }}>{timer.type.replace('-', ' ')}</span>
                          <span className="entry-time">
                            {new Date((timer.end_time || timer.start_time) + (!(timer.end_time || timer.start_time).endsWith('Z') ? 'Z' : '')).toLocaleString('en-US', {
                              month: 'short', day: 'numeric',
                              hour: 'numeric', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="entry-duration" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>
                          {timer.duration_minutes >= 60
                            ? `${Math.floor(timer.duration_minutes / 60)}h ${timer.duration_minutes % 60}m`
                            : `${timer.duration_minutes}m`}
                        </span>
                        <button
                          onClick={() => setTimerToDelete(timer)}
                          title="Delete Timer Log"
                          style={{
                            background: 'transparent',
                            color: 'inherit',
                            opacity: 0.5,
                            padding: '4px',
                            cursor: 'pointer',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          onMouseOver={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.opacity = 1; }}
                          onMouseOut={e => { e.currentTarget.style.color = 'inherit'; e.currentTarget.style.opacity = 0.5; }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Clock size={40} opacity={0.3} />
                    <p>No time entries yet</p>
                    <p className="empty-hint">Start a timer or log time manually</p>
                  </div>
                )}
              </div>
            </motion.div>

          </div>

          {/* Right Column: Reminders & Goals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>

            {/* ── Today's Summary Card ── */}
            {(() => {
              const total = todaySummary?.total_minutes || 0;
              const h = Math.floor(total / 60);
              const m = total % 60;
              const sessions = todaySummary?.sessions || 0;
              const pomodoros = todaySummary?.pomodoros || 0;
              const breaks = todaySummary?.timers?.filter(t => t.type === 'short-break' || t.type === 'long-break').length || 0;
              const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
              return (
                <motion.div
                  className="timer-card"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px' }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Today's Summary</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {activeTimer && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          fontSize: '0.65rem', fontWeight: 700, color: '#ff6b35',
                          background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.28)',
                          borderRadius: 20, padding: '3px 9px',
                          animation: 'pulse 2s ease-in-out infinite'
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff6b35', display: 'inline-block' }} />
                          LIVE
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div className="type-duration">
                          <span>Goal: {dailyGoalMinutes >= 60 ? `${Math.floor(dailyGoalMinutes / 60)}h ${dailyGoalMinutes % 60}m` : `${dailyGoalMinutes}m`}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Time row */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(255,107,53,0.02) 100%)',
                    border: '1px solid rgba(255,107,53,0.15)',
                    borderRadius: 12, padding: '16px 20px', marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>Total Time Today</span>
                      <span style={{
                        fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-1px', lineHeight: 1,
                        background: 'linear-gradient(90deg, #f5a623 0%, #ff6b35 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        color: 'transparent', display: 'inline-block'
                      }}>{timeStr}</span>
                    </div>
                    {/* Progress bar */}
                    {(() => {
                      const pct = Math.min(100, Math.round((total / dailyGoalMinutes) * 100));
                      const goalLabel = dailyGoalMinutes >= 60 ? `${Math.round(dailyGoalMinutes / 60)}h` : `${dailyGoalMinutes}m`;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, position: 'relative', overflow: 'visible' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #ff6b35, #ff9560)', borderRadius: 99, position: 'relative', minWidth: pct > 0 ? 8 : 0 }}>
                              {pct > 0 && <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', background: '#ff6b35', boxShadow: '0 0 6px rgba(255,107,53,0.7)' }} />}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500, whiteSpace: 'nowrap', minWidth: '50px', textAlign: 'right' }}>{pct}% of {goalLabel}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sub stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 'auto' }}>
                    {[
                      { value: sessions, label: 'Sessions' },
                      { value: pomodoros, label: 'Pomodoros' },
                      { value: breaks, label: 'Breaks' },
                    ].map(({ value, label }) => (
                      <div key={label} style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10, padding: '9px 12px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                      }}>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ff7d45', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}

            {/* Active Reminders */}
            <AnimatePresence>
              <motion.div
                key="reminders-card"
                className="timer-card active-reminders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ height: '280px', display: 'flex', flexDirection: 'column' }}
              >
                {/* Header */}
                <div className="entries-header" style={{ marginBottom: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 className="card-title" style={{ fontSize: '1rem' }}>
                      {showReminderHistory ? 'Reminder History' : 'Active Reminders'}
                    </h3>
                    {showReminderHistory && reminderHistory.length > 0 && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, background: 'rgba(255,107,53,0.15)',
                        color: '#ff9060', border: '1px solid rgba(255,107,53,0.25)',
                        borderRadius: 20, padding: '2px 8px'
                      }}>{reminderHistory.length}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* History toggle */}
                    <button
                      onClick={() => setShowReminderHistory(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: showReminderHistory ? 'rgba(255,107,53,0.22)' : 'rgba(255,107,53,0.12)',
                        border: `1px solid ${showReminderHistory ? 'rgba(255,107,53,0.5)' : 'rgba(255,107,53,0.3)'}`,
                        borderRadius: 8, padding: '5px 11px',
                        fontSize: '0.72rem', fontWeight: 700,
                        color: '#ff9060', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.22)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = showReminderHistory ? 'rgba(255,107,53,0.22)' : 'rgba(255,107,53,0.12)'; }}
                    >
                      {showReminderHistory
                        ? 'Active'
                        : <><Clock size={12} /> History</>
                      }
                    </button>

                    {/* Set Reminder (only shown in active view) or Clear (only in history view) */}
                    {showReminderHistory ? (
                      reminderHistory.length > 0 && (
                        <button
                          onClick={async () => {
                            try {
                              await reminderAPI.clearHistory();
                              setReminderHistory([]);
                              toast.success('Reminder history cleared');
                            } catch (e) {
                              toast.error('Could not clear history');
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                            borderRadius: 8, padding: '5px 11px', fontSize: '0.72rem',
                            fontWeight: 700, color: '#f87171', cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.18)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                        >
                          <Trash2 size={12} /> Clear
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => setShowReminderModal(true)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: 'rgba(255,107,53,0.12)',
                          border: '1px solid rgba(255,107,53,0.3)',
                          borderRadius: 8, padding: '5px 11px',
                          fontSize: '0.72rem', fontWeight: 700,
                          color: '#ff9060', cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.22)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.12)'; }}
                      >
                        <Bell size={12} /> Set Reminder
                      </button>
                    )}
                  </div>
                </div>

                {/* Body — toggled */}
                <AnimatePresence mode="wait">
                  {showReminderHistory ? (
                    /* ── History View ── */
                    <motion.div
                      key="history-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.18 }}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                      {reminderHistory.length > 0 ? (
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                          {reminderHistory.map((rem, idx) => {
                            const isTaskDeadline = rem.reminder_type === 'task_deadline';
                            const firedDate = rem.fired_at
                              ? new Date(rem.fired_at.includes('+') || rem.fired_at.endsWith('Z') ? rem.fired_at : rem.fired_at + 'Z')
                              : null;
                            const firedStr = firedDate && !isNaN(firedDate)
                              ? firedDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—';
                            return (
                              <div
                                key={`hist-${rem.reminder_id ?? idx}`}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '9px 12px',
                                  background: isTaskDeadline ? 'rgba(239,68,68,0.05)' : 'rgba(255,107,53,0.05)',
                                  border: `1px solid ${isTaskDeadline ? 'rgba(239,68,68,0.15)' : 'rgba(255,107,53,0.15)'}`,
                                  borderRadius: 10, flexShrink: 0
                                }}
                              >
                                <Bell size={13} style={{ color: isTaskDeadline ? '#ef4444' : 'var(--primary)', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {rem.message}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                    <span style={{
                                      fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                                      padding: '1px 6px', borderRadius: 20,
                                      background: isTaskDeadline ? 'rgba(239,68,68,0.15)' : 'rgba(255,107,53,0.15)',
                                      color: isTaskDeadline ? '#ef4444' : '#ff9060',
                                    }}>
                                      {isTaskDeadline ? 'Task Deadline' : 'Manual'}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Rang {firedStr}</span>
                                  </div>
                                </div>
                                {/* Per-item delete */}
                                <button
                                  title="Delete this entry"
                                  onClick={async () => {
                                    if (typeof rem.reminder_id === 'number') {
                                      try {
                                        await reminderAPI.deleteOne(rem.reminder_id);
                                      } catch (e) {
                                        toast.error('Could not delete entry');
                                        return;
                                      }
                                    }
                                    setReminderHistory(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  style={{
                                    flexShrink: 0, background: 'transparent', border: 'none',
                                    color: 'var(--text-tertiary)', cursor: 'pointer',
                                    padding: '4px', borderRadius: 6, display: 'flex',
                                    alignItems: 'center', transition: 'color 0.15s',
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.color = '#f87171'; }}
                                  onMouseOut={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.55 }}>
                          <Bell size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>No reminders have rung yet</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Fired reminders will appear here</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    /* ── Active Reminders View ── */
                    <motion.div
                      key="active-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                      {(activeReminders.length > 0 || (taskReminders && taskReminders.filter(r => !r.is_sent).length > 0)) ? (
                        <div className="entries-list" style={{ gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                          {/* Database Task Reminders */}
                          {taskReminders && taskReminders.filter(r => !r.is_sent).map((rem) => (
                            <div key={`task-rem-${rem.reminder_id}`} className="entry-item" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', flexShrink: 0 }}>
                              <div className="entry-main">
                                <div className="entry-title" style={{ fontSize: '0.9rem' }}>{rem.message}</div>
                                <div className="entry-meta">
                                  <span className="entry-time" style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                    Reminder at {(() => {
                                      const raw = rem.reminder_time;
                                      if (!raw) return '—';
                                      const d = new Date(raw.includes('+') || raw.endsWith('Z') ? raw : raw + 'Z');
                                      return isNaN(d) ? '—' : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    })()}
                                  </span>
                                </div>
                              </div>
                              <button
                                className="btn-icon"
                                onClick={async () => {
                                  try {
                                    await reminderAPI.dismiss(rem.reminder_id);
                                    refreshReminders();
                                  } catch (e) {
                                    toast.error('Could not dismiss reminder');
                                  }
                                }}
                                title="Dismiss Reminder"
                                style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          {/* Local Custom Reminders */}
                          {activeReminders.map((rem) => (
                            <div key={rem.id} className="entry-item" style={{ padding: '12px', background: 'rgba(255,107,53,0.05)', border: '1px solid rgba(255,107,53,0.15)', flexShrink: 0 }}>
                              <div className="entry-main">
                                <div className="entry-title" style={{ fontSize: '0.9rem' }}>{rem.message}</div>
                                <div className="entry-meta">
                                  <span className="entry-time" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                    In {rem.minutes}m ({new Date(rem.triggerTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                  </span>
                                </div>
                              </div>
                              <button
                                className="btn-icon"
                                onClick={() => setActiveReminders(prev => prev.filter(r => r.id !== rem.id))}
                                title="Cancel Reminder"
                                style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                          <Bell size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No active reminders</p>
                          <p className="empty-hint" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click 'Set Reminder' to add one</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* Focus Goals */}

            {(() => {
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const today = new Date();

              const getGoalForDate = (dateObj) => {
                const dateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD local
                const sortedDates = Object.keys(goalHistory).sort((a, b) => b.localeCompare(a));
                for (const d of sortedDates) {
                  if (d <= dateStr) {
                    return goalHistory[d];
                  }
                }

                return dailyGoalMinutes;
              };

              // Create a robust localized date string mapper
              // This strictly maps any timestamp to "MM/DD/YYYY" in the user's exact local timezone
              const getLocalDayString = (dateObj) => {
                return dateObj.toLocaleDateString('en-US');
              };

              const weekData = dayNames.map((name, i) => {
                const d = new Date(today);
                // Shift today's date based on weekOffset (e.g., -1 means last week, 7 days ago)
                d.setDate(today.getDate() + (weekOffset * 7));
                d.setDate(d.getDate() - ((d.getDay() - i + 7) % 7));

                const localDayTarget = getLocalDayString(d);
                const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                const mins = (recentTimers || [])
                  .filter(t => {
                    // Backend sends UTC without 'Z' sometimes, so force 'Z' for accurate Date parsing
                    const rawTime = t.start_time;
                    const parsedDate = new Date(rawTime.endsWith('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z');
                    // Check if this parsed date maps exactly to this column's calendar day in the user's timezone
                    return getLocalDayString(parsedDate) === localDayTarget;
                  })
                  .reduce((s, t) => s + (t.duration_minutes || 0), 0);

                // Determine if this generated date is actually "today" in the real world
                const isRealToday = getLocalDayString(d) === getLocalDayString(new Date());
                const dayGoal = getGoalForDate(d);

                return { name, displayDate, mins, isToday: isRealToday, goalMins: dayGoal, rawDate: d };
              });

              const maxMins = Math.max(...weekData.map(d => d.mins), ...weekData.map(d => d.goalMins));

              const activeStat = selectedWeekDay ? weekData.find(d => d.displayDate === selectedWeekDay) : null;
              const activeMins = activeStat ? activeStat.mins : (todaySummary?.total_minutes || 0);
              const activeGoal = activeStat ? activeStat.goalMins : getGoalForDate(today);
              const isTodayStats = !selectedWeekDay || (activeStat && activeStat.isToday);

              const pct = Math.min(100, Math.round((activeMins / activeGoal) * 100));
              const circumference = 2 * Math.PI * 42;

              // Calculate current streak
              let currentStreak = 0;
              for (let i = weekData.length - 1; i >= 0; i--) {
                const dayGoal = weekData[i].goalMins;
                if (weekData[i].mins >= dayGoal) {
                  currentStreak++;
                } else if (weekData[i].isToday && weekData[i].mins < dayGoal) {
                  // If today isn't met yet, we don't break the streak, we just look at yesterday
                  continue;
                } else if (!weekData[i].isToday && weekData[i].mins < dayGoal && i < today.getDay()) {
                  // Broken streak in the past week
                  break;
                }
              }
              return (
                <motion.div
                  className="timer-card focus-goals"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Focus Goals</h3>
                    <button
                      onClick={() => {
                        setGoalHour(Math.floor(dailyGoalMinutes / 60));
                        setGoalMinute(dailyGoalMinutes % 60);
                        setShowGoalModal(true);
                        setTimeout(() => {
                          if (goalHourRef.current) goalHourRef.current.scrollTo({ top: Math.floor(dailyGoalMinutes / 60) * 50, behavior: 'auto' });
                          if (goalMinuteRef.current) goalMinuteRef.current.scrollTo({ top: (dailyGoalMinutes % 60) * 50, behavior: 'auto' });
                        }, 50);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)',
                        borderRadius: 8, padding: '5px 11px', fontSize: '0.72rem',
                        fontWeight: 700, color: '#ff9060', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.22)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.12)'; }}
                    >
                      <Target size={12} /> Set Goal
                    </button>
                  </div>
                  <div className="goal-ring-row">
                    <div className="goal-ring-wrap">
                      <svg viewBox="0 0 100 100" className="goal-ring-svg">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="url(#goalGrad)" strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference * (1 - pct / 100)}
                          transform="rotate(-90 50 50)"
                          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                        <defs>
                          <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--primary)" />
                            <stop offset="100%" stopColor="var(--accent)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="goal-ring-label">
                        <div className="goal-pct">{pct}%</div>
                        <div className="goal-sub">of goal</div>
                      </div>
                    </div>
                    <div className="goal-info">
                      <div className="goal-row"><span className="goal-label" style={{ color: isTodayStats ? 'var(--text-secondary)' : '#fff' }}>{isTodayStats ? 'Daily Goal' : `${activeStat?.displayDate} Goal`}</span><span className="goal-val">{activeGoal >= 60 ? `${Math.floor(activeGoal / 60)}h ${String(activeGoal % 60).padStart(2, '0')}m` : `${activeGoal}m`}</span></div>
                      <div className="goal-row"><span className="goal-label">Achieved</span><span className="goal-val" style={{ color: 'var(--primary)' }}>{Math.floor(activeMins / 60)}h {String(activeMins % 60).padStart(2, '0')}m</span></div>
                      <div className="goal-row"><span className="goal-label">Remaining</span><span className="goal-val">{(() => { const r = Math.max(0, activeGoal - activeMins); return `${Math.floor(r / 60)}h ${String(r % 60).padStart(2, '0')}m`; })()}</span></div>
                    </div>
                  </div>
                  <div className="week-chart">
                    <div className="week-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} Weeks Ago`}</span>
                      </div>
                      {currentStreak > 0 && <span style={{ color: 'var(--primary)', fontSize: '0.65rem' }}>🔥 {currentStreak} Day Streak</span>}
                    </div>

                    <div className="chart-area-container">
                      {/* Pagination Arrows Left/Right of Chart */}
                      <button className="chart-nav-btn left-arrow" onClick={() => setWeekOffset(prev => prev - 1)} aria-label="Previous week">
                        <ChevronLeft size={16} />
                      </button>

                      <div className="chart-area-inner" style={{ position: 'relative', flex: 1, display: 'flex', height: '100%' }}>
                        {/* Y-Axis Grid Lines */}
                        <div className="y-axis-grid">
                          <div className="y-axis-line"><span className="y-axis-label">{Math.ceil(maxMins / 60)}h</span></div>
                          <div className="y-axis-line" style={{ top: '33%' }}><span className="y-axis-label">{Math.ceil(maxMins * 0.66 / 60)}h</span></div>
                          <div className="y-axis-line" style={{ top: '66%' }}><span className="y-axis-label">{Math.ceil(maxMins * 0.33 / 60)}h</span></div>
                        </div>

                        <div className="week-bars">
                          {weekData.map(({ name, displayDate, mins, isToday, goalMins }) => {
                            const pctOfGoal = Math.min(100, Math.round((mins / goalMins) * 100));
                            const isGoalMet = mins >= goalMins;
                            const isSelected = selectedWeekDay === displayDate;

                            return (
                              <div
                                key={name}
                                className={`week-bar-col ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} interactive-bar`}
                                onClick={() => setSelectedWeekDay(isSelected ? null : displayDate)}
                              >
                                <div className="week-bar-track">
                                  <div className={`week-bar-fill ${isToday ? 'today' : ''} ${isGoalMet ? 'goal-met' : ''}`} style={{ height: `${(mins / maxMins) * 100}%` }} />
                                </div>
                                <div className={`week-day-circle ${isToday ? 'today' : ''}`}>{name.charAt(0)}</div>

                                {/* Interactive Tooltip */}
                                <div className="bar-tooltip">
                                  <div className="tooltip-date">{displayDate}</div>
                                  <div className="tooltip-stat">
                                    <span className="stat-label">Achieved</span>
                                    <span className="stat-val" style={{ color: isGoalMet ? 'var(--primary)' : 'inherit' }}>
                                      {Math.floor(mins / 60)}h {String(mins % 60).padStart(2, '0')}m
                                    </span>
                                  </div>
                                  <div className="tooltip-stat">
                                    <span className="stat-label">Daily Goal</span>
                                    <span className="stat-val">{Math.floor(goalMins / 60)}h {String(goalMins % 60).padStart(2, '0')}m</span>
                                  </div>
                                  <div className="tooltip-progress-bar">
                                    <div className="tooltip-progress-fill" style={{ width: `${pctOfGoal}%`, background: isGoalMet ? 'var(--primary)' : 'var(--text-secondary)' }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        className={`chart-nav-btn right-arrow ${weekOffset >= 0 ? 'disabled' : ''}`}
                        onClick={() => setWeekOffset(prev => prev + 1)}
                        aria-label="Next week"
                        style={{ marginLeft: '35px' }}
                        disabled={weekOffset >= 0}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        </div>

        {/* Log Time Modal */}
        <AnimatePresence>
          {showLogModal && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ overflow: 'visible' }}
              >
                <h2 className="modal-title">Log Time Entry</h2>
                <form onSubmit={handleLogTime} className="modal-form">
                  <div className="form-group">
                    <label>WHAT DID YOU WORK ON?</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={logForm.title}
                      onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                      placeholder="e.g., Design new landing page"
                      required
                    />
                  </div>

                  <div className="form-group relative-wrapper">
                    <label>DURATION</label>

                    <div
                      className="modal-input"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowLogDurationPicker(!showLogDurationPicker)}
                    >
                      {logForm.duration >= 60
                        ? `${Math.floor(logForm.duration / 60)}h ${logForm.duration % 60}m`
                        : `${logForm.duration}m`}
                    </div>

                    <AnimatePresence>
                      {showLogDurationPicker && (
                        <motion.div
                          className="log-duration-popover"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="wheel-picker-ui">

                            <div className="wheels-container">
                              <div className="wheel-highlight-bar"></div>
                              <div
                                className="wheel-column"
                                ref={logHourRef}
                                onScroll={(e) => {
                                  const index = Math.round(e.target.scrollTop / 50);
                                  if (index >= 0 && index <= 23) setLogHour(index);
                                }}
                              >
                                <div className="wheel-spacer"></div>
                                {Array.from({ length: 24 }).map((_, h) => (
                                  <div
                                    key={`h-${h}`}
                                    className={`wheel-item ${logHour === h ? 'active' : ''}`}
                                    onClick={(e) => {
                                      setLogHour(h);
                                      e.currentTarget.parentElement.scrollTo({ top: h * 50, behavior: 'auto' });
                                    }}
                                  >
                                    {h.toString().padStart(2, '0')}
                                  </div>
                                ))}
                                <div className="wheel-spacer"></div>
                              </div>

                              <div className="wheel-colon">:</div>

                              <div
                                className="wheel-column"
                                ref={logMinuteRef}
                                onScroll={(e) => {
                                  const index = Math.round(e.target.scrollTop / 50);
                                  if (index >= 0 && index <= 59) setLogMinute(index);
                                }}
                              >
                                <div className="wheel-spacer"></div>
                                {Array.from({ length: 60 }).map((_, m) => (
                                  <div
                                    key={`m-${m}`}
                                    className={`wheel-item ${logMinute === m ? 'active' : ''}`}
                                    onClick={(e) => {
                                      setLogMinute(m);
                                      e.currentTarget.parentElement.scrollTo({ top: m * 50, behavior: 'auto' });
                                    }}
                                  >
                                    {m.toString().padStart(2, '0')}
                                  </div>
                                ))}
                                <div className="wheel-spacer"></div>
                              </div>
                            </div>

                            <div className="wheel-presets" style={{ marginTop: '10px' }}>
                              <button type="button" onClick={() => {
                                setLogHour(0); setLogMinute(15);
                                if (logHourRef.current) logHourRef.current.scrollTo({ top: 0, behavior: 'auto' });
                                if (logMinuteRef.current) logMinuteRef.current.scrollTo({ top: 15 * 50, behavior: 'auto' });
                              }}>15m</button>

                              <button type="button" onClick={() => {
                                setLogHour(0); setLogMinute(30);
                                if (logHourRef.current) logHourRef.current.scrollTo({ top: 0, behavior: 'auto' });
                                if (logMinuteRef.current) logMinuteRef.current.scrollTo({ top: 30 * 50, behavior: 'auto' });
                              }}>30m</button>

                              <button type="button" onClick={() => {
                                setLogHour(0); setLogMinute(45);
                                if (logHourRef.current) logHourRef.current.scrollTo({ top: 0, behavior: 'auto' });
                                if (logMinuteRef.current) logMinuteRef.current.scrollTo({ top: 45 * 50, behavior: 'auto' });
                              }}>45m</button>

                              <button type="button" onClick={() => {
                                setLogHour(1); setLogMinute(0);
                                if (logHourRef.current) logHourRef.current.scrollTo({ top: 50, behavior: 'auto' });
                                if (logMinuteRef.current) logMinuteRef.current.scrollTo({ top: 0, behavior: 'auto' });
                              }}>1h</button>
                            </div>

                            <button
                              type="button"
                              className="btn-primary-solid confirm-duration-btn"
                              style={{ marginTop: '16px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', border: 'none', color: '#fff', padding: '10px', borderRadius: '8px', width: '100%', fontWeight: '700', cursor: 'pointer' }}
                              onClick={() => {
                                const totalMinutes = (logHour * 60) + logMinute || 30;
                                setLogForm({ ...logForm, duration: totalMinutes });
                                setShowLogDurationPicker(false);
                              }}
                            >
                              Set Duration
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="picker-modal-actions" style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                    <button type="button" className="picker-cancel-btn" onClick={() => setShowLogModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="picker-set-btn">
                      Log Time
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Set Reminder Modal */}
        <AnimatePresence>
          {showReminderModal && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReminderModal(false)}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ overflow: 'visible' }}
              >
                <h2 className="modal-title">Set Reminder</h2>
                <form onSubmit={handleScheduleReminder} className="modal-form">
                  <div className="form-group">
                    <label>Reminder message</label>
                    <input
                      type="text"
                      value={reminderForm.message}
                      onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
                      placeholder="e.g., Take a break"
                      required
                    />
                  </div>

                  <div className="form-group relative-wrapper">
                    <label>REMIND ME IN (MINUTES)</label>
                    <div
                      className="modal-input"
                      onClick={() => setShowReminderPicker(!showReminderPicker)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span>{reminderLabel}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '4px solid currentColor' }} />
                        <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid currentColor' }} />
                      </span>
                    </div>

                    <AnimatePresence>
                      {showReminderPicker && (
                        <motion.div
                          className="log-duration-popover"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="wheel-picker-ui">
                            <div className="wheels-container">
                              <div className="wheel-highlight-bar"></div>

                              <div
                                className="wheel-column"
                                ref={reminderHourRef}
                                onScroll={(e) => {
                                  const index = Math.round(e.target.scrollTop / 50);
                                  if (index >= 0 && index <= 23) setReminderHour(index);
                                }}
                              >
                                <div className="wheel-spacer"></div>
                                {Array.from({ length: 24 }).map((_, h) => (
                                  <div
                                    key={`h-${h}`}
                                    className={`wheel-item ${reminderHour === h ? 'active' : ''}`}
                                    onClick={(e) => {
                                      setReminderHour(h);
                                      e.currentTarget.parentElement.scrollTo({ top: h * 50, behavior: 'auto' });
                                    }}
                                  >
                                    {h.toString().padStart(2, '0')}
                                  </div>
                                ))}
                                <div className="wheel-spacer"></div>
                              </div>

                              <div className="wheel-colon">:</div>

                              <div
                                className="wheel-column"
                                ref={reminderMinuteRef}
                                onScroll={(e) => {
                                  const index = Math.round(e.target.scrollTop / 50);
                                  if (index >= 0 && index <= 59) setReminderMinute(index);
                                }}
                              >
                                <div className="wheel-spacer"></div>
                                {Array.from({ length: 60 }).map((_, m) => (
                                  <div
                                    key={`m-${m}`}
                                    className={`wheel-item ${reminderMinute === m ? 'active' : ''}`}
                                    onClick={(e) => {
                                      setReminderMinute(m);
                                      e.currentTarget.parentElement.scrollTo({ top: m * 50, behavior: 'auto' });
                                    }}
                                  >
                                    {m.toString().padStart(2, '0')}
                                  </div>
                                ))}
                                <div className="wheel-spacer"></div>
                              </div>
                            </div>

                            <div className="wheel-presets" style={{ marginTop: '10px' }}>
                              <button type="button" onClick={() => {
                                setReminderHour(0); setReminderMinute(15);
                                if (reminderHourRef.current) reminderHourRef.current.scrollTo({ top: 0, behavior: 'auto' });
                                if (reminderMinuteRef.current) reminderMinuteRef.current.scrollTo({ top: 15 * 50, behavior: 'auto' });
                              }}>15m</button>

                              <button type="button" onClick={() => {
                                setReminderHour(0); setReminderMinute(30);
                                if (reminderHourRef.current) reminderHourRef.current.scrollTo({ top: 0, behavior: 'auto' });
                                if (reminderMinuteRef.current) reminderMinuteRef.current.scrollTo({ top: 30 * 50, behavior: 'auto' });
                              }}>30m</button>

                              <button type="button" onClick={() => {
                                setReminderHour(0); setReminderMinute(45);
                                if (reminderHourRef.current) reminderHourRef.current.scrollTo({ top: 0, behavior: 'auto' });
                                if (reminderMinuteRef.current) reminderMinuteRef.current.scrollTo({ top: 45 * 50, behavior: 'auto' });
                              }}>45m</button>

                              <button type="button" onClick={() => {
                                setReminderHour(1); setReminderMinute(0);
                                if (reminderHourRef.current) reminderHourRef.current.scrollTo({ top: 50, behavior: 'auto' });
                                if (reminderMinuteRef.current) reminderMinuteRef.current.scrollTo({ top: 0, behavior: 'auto' });
                              }}>1h</button>
                            </div>

                            <button
                              type="button"
                              className="btn-primary-solid confirm-duration-btn"
                              onClick={() => {
                                setReminderForm({ ...reminderForm, minutes: reminderDuration });
                                setShowReminderPicker(false);
                              }}
                            >
                              Set Duration
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="picker-modal-actions" style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                    <button type="button" className="picker-cancel-btn" onClick={() => setShowReminderModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="picker-set-btn">
                      Set Reminder
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
            >
              <motion.div
                className="modal-content duration-picker-modal"
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="picker-modal-header" style={{ marginBottom: '16px' }}>
                  <h2 className="modal-title" style={{ margin: 0 }}>Restart Timer?</h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5', padding: '0 4px', fontSize: '0.95rem' }}>
                  Are you sure you want to start over? Your current progress will be lost.
                </p>
                <div className="picker-modal-actions">
                  <button type="button" className="picker-cancel-btn" onClick={() => setShowResetConfirm(false)}>
                    Cancel
                  </button>
                  <button type="button" className="picker-set-btn" onClick={confirmResetTimer}>
                    <RotateCcw size={14} /> Restart
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Duration Picker Modal */}
        <AnimatePresence>
          {showManualPicker && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualPicker(false)}
            >
              <motion.div
                className="modal-content duration-picker-modal"
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="picker-modal-header">
                  <Clock size={18} style={{ color: 'var(--primary)' }} />
                  <h2 className="modal-title" style={{ margin: 0 }}>Set Duration</h2>
                </div>
                <div className="wheel-picker-ui">
                  <div className="wheel-headers">
                    <span>Hours</span>
                    <span style={{ opacity: 0 }}>:</span>
                    <span>Minutes</span>
                  </div>
                  <div className="wheels-container">
                    <div className="wheel-highlight-bar" />
                    <div
                      className="wheel-column"
                      ref={manualHourRef}
                      onScroll={e => setManualHour(Math.round(e.target.scrollTop / 50))}
                    >
                      <div className="wheel-spacer" />
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((h, i) => (
                        <div
                          key={h}
                          className={`wheel-item ${manualHour === h ? 'active' : ''}`}
                          onClick={e => { setManualHour(h); e.currentTarget.parentElement.scrollTo({ top: i * 50, behavior: 'auto' }); }}
                        >{h.toString().padStart(2, '0')}</div>
                      ))}
                      <div className="wheel-spacer" />
                    </div>
                    <div className="wheel-colon">:</div>
                    <div
                      className="wheel-column"
                      ref={manualMinuteRef}
                      onScroll={e => {
                        const idx = Math.round(e.target.scrollTop / 50);
                        if (idx >= 0 && idx <= 59) setManualMinute(idx);
                      }}
                    >
                      <div className="wheel-spacer" />
                      {Array.from({ length: 60 }).map((_, m) => (
                        <div
                          key={m}
                          className={`wheel-item ${manualMinute === m ? 'active' : ''}`}
                          onClick={e => { setManualMinute(m); e.currentTarget.parentElement.scrollTo({ top: m * 50, behavior: 'auto' }); }}
                        >{m.toString().padStart(2, '0')}</div>
                      ))}
                      <div className="wheel-spacer" />
                    </div>
                  </div>
                  <div className="wheel-presets">
                    {[[0, 15, '15m'], [0, 30, '30m'], [0, 45, '45m'], [1, 0, '1h']].map(([h, m, label]) => (
                      <button key={label} type="button" onClick={() => {
                        setManualHour(h); setManualMinute(m);
                        if (manualHourRef.current) manualHourRef.current.scrollTo({ top: h * 50, behavior: 'auto' });
                        if (manualMinuteRef.current) manualMinuteRef.current.scrollTo({ top: m * 50, behavior: 'auto' });
                      }}>{label}</button>
                    ))}
                  </div>
                  <div className="picker-modal-actions">
                    <button className="picker-cancel-btn" onClick={() => setShowManualPicker(false)}>Cancel</button>
                    <button className="picker-set-btn" onClick={() => setShowManualPicker(false)}>
                      <Play size={14} /> Set {manualLabel}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ringing Alarm Modal */}
        <AnimatePresence>
          {ringingAlarm && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: 9999, backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.85)' }}
            >
              <motion.div
                className="modal-content"
                initial={{ scale: 0.8, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, y: 50, opacity: 0 }}
                style={{ textAlign: 'center', borderColor: 'var(--primary)', boxShadow: '0 0 50px rgba(255,107,53,0.25)', borderTop: '4px solid var(--primary)', maxWidth: '400px' }}
              >
                <div style={{ display: 'inline-flex', padding: '20px', background: 'rgba(255,107,53,0.15)', borderRadius: '50%', marginBottom: '24px', animation: 'pulse 1.5s ease-in-out infinite' }}>
                  <Bell size={48} style={{ color: 'var(--primary)' }} />
                </div>
                <h2 className="modal-title" style={{ fontSize: '2rem', marginBottom: '12px' }}>{ringingAlarm.title}</h2>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>{ringingAlarm.message}</p>

                <button
                  className="btn-primary-solid"
                  style={{ width: '100%', padding: '16px', fontSize: '1.2rem', height: 'auto', borderRadius: '12px' }}
                  onClick={() => {
                    // If this was a DB-backed reminder, refresh history from server
                    if (ringingAlarm?.isDbReminder) {
                      loadReminderHistory();
                    }
                    setRingingAlarm(null);
                  }}
                >
                  Dismiss
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── Daily Goal Modal ── */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowGoalModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ maxWidth: '360px' }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="modal-title" style={{ marginBottom: 20 }}>Set Daily Goal</h2>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ alignSelf: 'flex-start' }}>DAILY GOAL</label>

                {/* ── Wheel Picker UI ── */}
                <div className="wheel-picker-ui" style={{ margin: '20px 0', width: '100%', maxWidth: '280px' }}>
                  <div className="wheels-container">
                    <div className="wheel-highlight-bar"></div>

                    {/* Hours Wheel */}
                    <div
                      className="wheel-column"
                      ref={goalHourRef}
                      onScroll={(e) => {
                        const index = Math.round(e.target.scrollTop / 50);
                        if (index >= 0 && index <= 23) setGoalHour(index);
                      }}
                    >
                      <div className="wheel-spacer"></div>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div
                          key={`h-${h}`}
                          className={`wheel-item ${goalHour === h ? 'active' : ''}`}
                          onClick={(e) => {
                            setGoalHour(h);
                            e.currentTarget.parentElement.scrollTo({ top: h * 50, behavior: 'smooth' });
                          }}
                        >
                          {h.toString().padStart(2, '0')}
                        </div>
                      ))}
                      <div className="wheel-spacer"></div>
                    </div>

                    <div className="wheel-colon">:</div>

                    {/* Minutes Wheel */}
                    <div
                      className="wheel-column"
                      ref={goalMinuteRef}
                      onScroll={(e) => {
                        const index = Math.round(e.target.scrollTop / 50);
                        if (index >= 0 && index <= 59) setGoalMinute(index);
                      }}
                    >
                      <div className="wheel-spacer"></div>
                      {Array.from({ length: 60 }).map((_, m) => (
                        <div
                          key={`m-${m}`}
                          className={`wheel-item ${goalMinute === m ? 'active' : ''}`}
                          onClick={(e) => {
                            setGoalMinute(m);
                            e.currentTarget.parentElement.scrollTo({ top: m * 50, behavior: 'smooth' });
                          }}
                        >
                          {m.toString().padStart(2, '0')}
                        </div>
                      ))}
                      <div className="wheel-spacer"></div>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 6, textAlign: 'center' }}>
                  {goalHour > 0 || goalMinute > 0
                    ? `= ${(goalHour * 60) + goalMinute} minutes`
                    : 'Set a goal duration'}
                </p>
              </div>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setShowGoalModal(false)}>Cancel</button>
                <button
                  className="btn-primary-solid"
                  onClick={() => {
                    const mins = (goalHour * 60) + goalMinute;
                    if (mins <= 0) { toast.error('Goal must be greater than 0'); return; }

                    const oldGlobalGoal = dailyGoalMinutes;
                    setDailyGoalMinutes(mins);
                    localStorage.setItem('voicepro_daily_goal_minutes', mins.toString());

                    // Save into history mapping for today
                    const todayStr = new Date().toLocaleDateString('en-CA');
                    const updatedHistory = { ...goalHistory };

                    // If history lacks a deep past baseline, securely freeze the old baseline into the past
                    if (!updatedHistory['2000-01-01']) {
                      // If the user's current goal is exactly 370 (6h 10m) and they have no baseline, 
                      // assume their old baseline was 250 (4h 10m) to fix their specific state
                      updatedHistory['2000-01-01'] = (oldGlobalGoal === 370) ? 250 : oldGlobalGoal;
                    }

                    updatedHistory[todayStr] = mins;

                    setGoalHistory(updatedHistory);
                    localStorage.setItem('voicepro_goal_history', JSON.stringify(updatedHistory));

                    toast.success(`Daily goal updated`);
                    setShowGoalModal(false);
                  }}
                >
                  Save Goal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Clear All History Confirm Modal ── */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ maxWidth: '380px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ marginBottom: '12px' }}>
                <h2 className="modal-title" style={{ color: '#f87171', marginBottom: '4px' }}>Clear All History</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '28px', lineHeight: 1.6, fontSize: '0.95rem' }}>
                Are you sure you want to delete <strong style={{ color: '#fff' }}>all {recentTimers?.length} timer log{recentTimers?.length !== 1 ? 's' : ''}</strong>? Your stats will reset to zero.
              </p>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setShowClearConfirm(false)}>Cancel</button>
                <button
                  className="btn-primary-solid"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 20px rgba(239,68,68,0.3)' }}
                  onClick={() => {
                    clearAllTimers()
                      .then(() => toast.success('All timer history cleared'))
                      .catch(() => toast.error('Failed to clear history'));
                    setShowClearConfirm(false);
                  }}
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Start Timer Title Modal ── */}
      <AnimatePresence>
        {showTitleModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTitleModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ maxWidth: '400px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: '4px' }}>What are you working on?</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Give this session a title (optional)</p>
                </div>
                <button className="btn-icon" onClick={() => setShowTitleModal(false)} style={{ marginTop: '-2px' }}><X size={18} /></button>
              </div>
              <input
                type="text"
                className="modal-input"
                placeholder="e.g. Design review, Client call…"
                value={timerTitleInput}
                onChange={e => setTimerTitleInput(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && confirmStartTimer()}
                style={{ marginBottom: '20px' }}
              />
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => { setTimerTitleInput(''); confirmStartTimer(); }}>Skip</button>
                <button className="btn-primary-solid" onClick={confirmStartTimer}>
                  <Play size={14} style={{ marginRight: 6 }} /> Start Timer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Timer Confirm Modal ── */}
      <AnimatePresence>
        {timerToDelete && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setTimerToDelete(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ maxWidth: '380px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ marginBottom: '12px' }}>
                <h2 className="modal-title" style={{ color: '#f87171', marginBottom: '4px' }}>Delete Timer Log</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '28px', lineHeight: 1.6, fontSize: '0.95rem' }}>
                Are you sure you want to delete this <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{timerToDelete.type?.replace('-', ' ')}</strong> session
                {timerToDelete.duration_minutes ? <> of <strong style={{ color: '#fff' }}>{timerToDelete.duration_minutes >= 60 ? `${Math.floor(timerToDelete.duration_minutes / 60)}h ${timerToDelete.duration_minutes % 60}m` : `${timerToDelete.duration_minutes}m`}</strong></> : ''}?
              </p>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setTimerToDelete(null)}>Cancel</button>
                <button
                  className="btn-primary-solid"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 20px rgba(239,68,68,0.3)' }}
                  onClick={() => {
                    deleteTimer(timerToDelete.timer_id)
                      .then(() => toast.success('Timer log deleted'))
                      .catch(() => toast.error('Failed to delete'));
                    setTimerToDelete(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
};

export default TimerPage;
