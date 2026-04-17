import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Send, X, Bot, Loader, Check, SkipForward, Plus, Pencil, Zap, Coffee, Target, Focus, ListTodo, Flame, Activity, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import toast from 'react-hot-toast';
import { useApp } from '../contexts/AppContext';
import { reminderAPI, taskAPI } from '../services/api';
import './ChatbotAssistant.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = ['Client Work', 'Meeting', 'Admin', 'Bills & utilities'];

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'High', emoji: '🔴' },
  { label: 'Medium', value: 'Medium', emoji: '🟡' },
  { label: 'Low', value: 'Low', emoji: '🟢' },
];

const DURATION_OPTIONS = [
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: '3h', value: '3h' },
  { label: '4h', value: '4h' },
];

const REMINDER_OFFSET_OPTIONS = [
  { label: '15 min before', value: '15' },
  { label: '30 min before', value: '30' },
  { label: '1 hour before', value: '60' },
  { label: '2 hours before', value: '120' },
  { label: '1 day before', value: '1440' },
  { label: 'No reminder', value: '' },
];

const REMINDER_TIME_OPTIONS = [
  { label: '5 min before', value: 5 },
  { label: '10 min before', value: 10 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: 'Custom time', value: 'custom' },
];

// Edit-field definitions for task
const TASK_EDIT_FIELDS = [
  { key: 'title', label: 'Title', step: 'task_title', aliases: ['title', 'name', 'task name'] },
  { key: 'priority', label: 'Priority', step: 'task_priority', aliases: ['priority', 'urgency'] },
  { key: 'category', label: 'Category', step: 'task_category', aliases: ['category', 'cat', 'type'] },
  { key: 'duration', label: 'Duration', step: 'task_duration', aliases: ['duration', 'time estimate', 'how long'] },
  { key: 'description', label: 'Description', step: 'task_description', aliases: ['description', 'desc', 'notes', 'note'] },
  { key: 'due_date', label: 'Due Date', step: 'task_duedate', aliases: ['due', 'due date', 'due at', 'date', 'deadline', 'when'] },
  { key: 'reminder_offset', label: 'Reminder', step: 'task_reminder_offset', aliases: ['reminder', 'remind', 'alert'] },
];

// Edit-field definitions for reminder
const REMINDER_EDIT_FIELDS = [
  { key: 'message', label: 'Message', step: 'reminder_message', aliases: ['message', 'text', 'what', 'about'] },
  { key: 'time', label: 'When', step: 'reminder_time', aliases: ['when', 'time', 'date', 'schedule'] },
];

// Match a field from user input using key, label, and aliases
const matchEditField = (input, fields) => {
  const lowered = input.toLowerCase().replace(/^(edit|change|modify|update)\s*/i, '').trim();
  return fields.find(f =>
    lowered === f.key ||
    lowered === f.label.toLowerCase() ||
    f.aliases.some(a => lowered.includes(a) || a.includes(lowered))
  );
};

// ─── Subcomponents ────────────────────────────────────────────────────────────
const SoundBars = () => (
  <div className="chatbot-sound-bars">
    {[0, 1, 2, 3, 4].map((i) => (
      <span key={i} className="chatbot-sound-bar" style={{ animationDelay: `${i * 0.1}s` }} />
    ))}
  </div>
);

const ThinkingDots = () => (
  <div className="chatbot-thinking">
    <span className="dot" />
    <span className="dot" />
    <span className="dot" />
  </div>
);

// ─── Briefing Card Components ─────────────────────────────────────────────────
const cardBase = {
  borderRadius: '12px',
  padding: '14px 16px',
  width: '100%',
  fontSize: '0.875rem',
  lineHeight: '1.5',
};
const sectionHeader = (color) => ({
  fontWeight: '700',
  fontSize: '0.82rem',
  color,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
  paddingBottom: '4px',
  borderBottom: `1px solid ${color}33`,
});
const statChip = (bg, color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '16px',
  background: bg,
  color,
  fontSize: '0.78rem',
  fontWeight: '600',
});
const taskItem = {
  padding: '3px 0',
  fontSize: '0.875rem',
  color: '#d1d5db',
};

const BriefingSummaryCard = ({ data }) => {
  const { title, currentTasks, overdueTasks, upcomingTasks, upcomingReminders, highPriority } = data;
  return (
    <div style={cardBase}>
      <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '10px', color: '#f5c6a0' }}>
        {title} Briefing
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        <span style={statChip('rgba(59,130,246,0.15)', '#93c5fd')}>{upcomingTasks?.length || 0} Tasks</span>
        {overdueTasks?.length > 0 && (
          <span style={statChip('rgba(239,68,68,0.15)', '#fca5a5')}>{overdueTasks.length} Overdue</span>
        )}
        <span style={statChip('rgba(168,85,247,0.15)', '#c4b5fd')}>{upcomingReminders?.length || 0} Reminders</span>
      </div>

      {/* High priority */}
      {highPriority && highPriority.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={sectionHeader('#f87171')}>High Priority</div>
          {highPriority.slice(0, 3).map((t, i) => (
            <div key={i} style={taskItem}>• {t.title}</div>
          ))}
        </div>
      )}

      {/* Next reminder */}
      {upcomingReminders && upcomingReminders.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={sectionHeader('#a78bfa')}>Next Reminder</div>
          <div style={{ ...taskItem, display: 'flex', justifyContent: 'space-between' }}>
            <span>{upcomingReminders[0].message}</span>
            <span style={{ color: '#a78bfa', fontWeight: '600', fontSize: '0.75rem' }}>
              {new Date(upcomingReminders[0].reminder_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '10px', fontStyle: 'italic' }}>
        Would you like a detailed breakdown?
      </div>
    </div>
  );
};

const BriefingDetailCard = ({ data }) => {
  const { type, currentTasks, overdueTasks, upcomingReminders } = data;
  return (
    <div style={cardBase}>
      {/* Overdue */}
      {overdueTasks && overdueTasks.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={sectionHeader('#f87171')}>Overdue Tasks ({overdueTasks.length})</div>
          {overdueTasks.map((t, i) => (
            <div key={i} style={taskItem}>{i + 1}. {t.title}</div>
          ))}
        </div>
      )}

      {/* Current / upcoming */}
      {currentTasks && currentTasks.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={sectionHeader('#60a5fa')}>{type === 'daily' ? 'Due Today' : 'Upcoming Tasks'} ({currentTasks.length})</div>
          {currentTasks.map((t, i) => (
            <div key={i} style={taskItem}>{i + 1}. {t.title}</div>
          ))}
        </div>
      )}

      {/* Reminders */}
      {(upcomingReminders && upcomingReminders.length > 0) && (
        <div style={{ marginBottom: '12px' }}>
          <div style={sectionHeader('#a78bfa')}>Reminders ({upcomingReminders.length})</div>
          {upcomingReminders.map((r, i) => (
            <div key={i} style={{ ...taskItem, display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span>{i + 1}. {r.message}</span>
              <span style={{ color: '#a78bfa', fontWeight: '600', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                {new Date(r.reminder_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          ))}
        </div>
      )}

      {(!overdueTasks?.length && !currentTasks?.length && !upcomingReminders?.length) && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>You have an empty schedule!</div>
      )}

      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '6px', fontStyle: 'italic' }}>
        Anything else I can help with?
      </div>
    </div>
  );
};

// ─── Helper: convert duration string to minutes ───────────────────────────────
const durationToMinutes = (d) => {
  if (!d) return null;
  const m = String(d).match(/^(\d+)\s*(h|m)/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  return m[2].toLowerCase() === 'h' ? num * 60 : num;
};

// ─── Suggest Task Card ────────────────────────────────────────────────────────
const SuggestTaskCard = ({ data }) => {
  const { timeLabel, suggestions, noMatch } = data;
  return (
    <div style={cardBase}>
      <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '10px', color: '#f5c6a0' }}>
        Suggested Tasks — {timeLabel}
      </div>

      {noMatch ? (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', margin: '8px 0' }}>
          No tasks fit that timeframe. Try a different window, or maybe it's a good time for a break!
        </div>
      ) : (
        <>
          {suggestions.map((t, i) => (
            <div key={i} style={{ ...taskItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span>{i + 1}. {t.title}</span>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {t.duration && (
                  <span style={statChip('rgba(59,130,246,0.15)', '#93c5fd')}>{t.duration}</span>
                )}
                {t.priority === 'High' && (
                  <span style={statChip('rgba(239,68,68,0.15)', '#fca5a5')}>High</span>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '10px', fontStyle: 'italic' }}>
        Anything else I can help with?
      </div>
    </div>
  );
};

// ─── Urgent Task Card ─────────────────────────────────────────────────────────
const UrgentTaskCard = ({ data }) => {
  const { suggestions, noMatch } = data;
  return (
    <div style={cardBase}>
      <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '10px', color: '#f5c6a0' }}>
        Most Urgent Tasks
      </div>
      {noMatch ? (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', margin: '8px 0' }}>
          You're all caught up! No urgent tasks right now.
        </div>
      ) : (
        suggestions.map((t, i) => (
          <div key={i} style={{ ...taskItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span>{i + 1}. {t.title}</span>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {t.isOverdue && <span style={statChip('rgba(239,68,68,0.15)', '#fca5a5')}>Overdue</span>}
              {t.priority === 'High' && <span style={statChip('rgba(245,158,11,0.15)', '#fcd34d')}>High</span>}
              {t.duration && <span style={statChip('rgba(59,130,246,0.15)', '#93c5fd')}>{t.duration}</span>}
            </div>
          </div>
        ))
      )}
      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '10px', fontStyle: 'italic' }}>
        Anything else I can help with?
      </div>
    </div>
  );
};

// ─── Plan My Day Card ─────────────────────────────────────────────────────────
const PlanMyDayCard = ({ data }) => {
  const { schedule, totalMinutes, noTasks } = data;
  return (
    <div style={cardBase}>
      <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px', color: '#f5c6a0' }}>
        Your Day Plan
      </div>
      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '10px' }}>
        {noTasks ? '' : `${schedule.length} tasks · ~${totalMinutes >= 60 ? Math.floor(totalMinutes/60) + 'h ' + (totalMinutes%60 > 0 ? (totalMinutes%60) + 'm' : '') : totalMinutes + 'm'} estimated`}
      </div>
      {noTasks ? (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', margin: '8px 0' }}>
          No pending tasks to plan. Enjoy your free day!
        </div>
      ) : (
        schedule.map((t, i) => (
          <div key={i} style={{ ...taskItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#9ca3af', fontSize: '0.75rem', minWidth: '18px' }}>{i + 1}.</span>
              {t.title}
            </span>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {t.isOverdue && <span style={statChip('rgba(239,68,68,0.15)', '#fca5a5')}>Overdue</span>}
              {t.priority === 'High' && <span style={statChip('rgba(245,158,11,0.15)', '#fcd34d')}>High</span>}
              {t.duration && <span style={statChip('rgba(59,130,246,0.15)', '#93c5fd')}>{t.duration}</span>}
            </div>
          </div>
        ))
      )}
      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '10px', fontStyle: 'italic' }}>
        Anything else I can help with?
      </div>
    </div>
  );
};

// ─── Productivity Insights Card ───────────────────────────────────────────────
const insightBar = (label, value, max, color) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
      <span style={{ color: '#d1d5db' }}>{label}</span>
      <span style={{ color, fontWeight: '600' }}>{value}</span>
    </div>
    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
      <div style={{ height: '100%', borderRadius: '3px', background: color, width: `${Math.min((value / max) * 100, 100)}%`, transition: 'width 0.4s ease' }} />
    </div>
  </div>
);

const ProductivityInsightsCard = ({ data }) => {
  const { totalTasks, completed, pending, overdue, completionRate, totalWorkloadMins, categoryBreakdown } = data;
  const workloadLabel = totalWorkloadMins >= 60
    ? `${Math.floor(totalWorkloadMins/60)}h ${totalWorkloadMins%60 > 0 ? (totalWorkloadMins%60) + 'm' : ''}`
    : `${totalWorkloadMins}m`;
  return (
    <div style={cardBase}>
      <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '10px', color: '#f5c6a0' }}>
        Productivity Insights
      </div>

      {/* Stat chips row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        <span style={statChip('rgba(34,197,94,0.15)', '#86efac')}>{completionRate}% Done</span>
        <span style={statChip('rgba(59,130,246,0.15)', '#93c5fd')}>{pending} Pending</span>
        {overdue > 0 && <span style={statChip('rgba(239,68,68,0.15)', '#fca5a5')}>{overdue} Overdue</span>}
        <span style={statChip('rgba(168,85,247,0.15)', '#c4b5fd')}>{workloadLabel} Workload</span>
      </div>

      {/* Progress bars */}
      <div style={{ marginBottom: '6px' }}>
        <div style={sectionHeader('#86efac')}>Task Completion</div>
        {insightBar('Completed', completed, totalTasks || 1, '#86efac')}
        {insightBar('Pending', pending, totalTasks || 1, '#93c5fd')}
        {overdue > 0 && insightBar('Overdue', overdue, totalTasks || 1, '#fca5a5')}
      </div>

      {/* Category breakdown */}
      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <div>
          <div style={sectionHeader('#c4b5fd')}>By Category</div>
          {categoryBreakdown.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '2px 0', color: '#d1d5db' }}>
              <span>{c.name}</span>
              <span style={{ color: '#9ca3af' }}>{c.count} task{c.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '10px', fontStyle: 'italic' }}>
        Anything else I can help with?
      </div>
    </div>
  );
};

// ─── Procrastination Alert Card ───────────────────────────────────────────────
const ProcrastinationAlertCard = ({ data }) => {
  const { neglected, noMatch } = data;
  return (
    <div style={cardBase}>
      <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px', color: '#f5c6a0' }}>
        Procrastination Alert
      </div>
      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '10px' }}>
        {noMatch ? '' : 'Tasks sitting the longest without progress'}
      </div>
      {noMatch ? (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', margin: '8px 0' }}>
          No neglected tasks found. You're staying on top of things!
        </div>
      ) : (
        neglected.map((t, i) => (
          <div key={i} style={{ ...taskItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span>{i + 1}. {t.title}</span>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <span style={statChip('rgba(245,158,11,0.15)', '#fcd34d')}>{t.daysAgo}d ago</span>
              {t.priority === 'High' && <span style={statChip('rgba(239,68,68,0.15)', '#fca5a5')}>High</span>}
            </div>
          </div>
        ))
      )}
      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '10px', fontStyle: 'italic' }}>
        Anything else I can help with?
      </div>
    </div>
  );
};

// ─── Personalized Insights Card ───────────────────────────────────────────────
const PersonalizedInsightsCard = ({ data }) => {
  const { insights } = data;
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ ...cardBase, paddingBottom: '0' }}>
        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '10px', color: '#f5c6a0' }}>
          Personalized Insights
        </div>
      </div>
      {insights.map((insight, idx) => (
        <div key={idx} className={`chatbot-insight-card ${insight.type}`}>
          <div className={`chatbot-insight-icon ${insight.type}`}>
            {insight.icon}
          </div>
          <div className="chatbot-insight-content">
            <h4 className="chatbot-insight-title">{insight.title}</h4>
            <p className="chatbot-insight-text">{insight.text}</p>
          </div>
        </div>
      ))}
      <div style={{ ...cardBase, paddingTop: '4px' }}>
        <div style={{ fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>
          Anything else I can help with?
        </div>
      </div>
    </div>
  );
};

// ─── Chart Specific Gradient Helpers ───────────────────────────────────────────
const getGradientId = (identifier) => {
  if (!identifier) return 'url(#gradDefault)';
  const str = String(identifier).toLowerCase();
  if (str.includes('high') || str.includes('ff8a65') || str.includes('e74c3c') || str.includes('ff6b35')) return 'url(#gradHigh)';
  if (str.includes('medium') || str.includes('pending') || str.includes('ffd54f') || str.includes('f39c12') || str.includes('ffd93d')) return 'url(#gradMedium)';
  if (str.includes('low') || str.includes('completed') || str.includes('81c995') || str.includes('2ecc71') || str.includes('4ecdc4')) return 'url(#gradLow)';
  return 'url(#gradDefault)';
};

const getCssGradient = (identifier) => {
  if (!identifier) return 'linear-gradient(to bottom, #9C27B0, rgba(156, 39, 176, 0.4))';
  const str = String(identifier).toLowerCase();
  if (str.includes('high') || str.includes('ff8a65') || str.includes('e74c3c') || str.includes('ff6b35')) return 'linear-gradient(to bottom, #FF6B35, rgba(255, 107, 53, 0.4))';
  if (str.includes('medium') || str.includes('pending') || str.includes('ffd54f') || str.includes('f39c12') || str.includes('ffd93d')) return 'linear-gradient(to bottom, #FFD93D, rgba(255, 217, 61, 0.4))';
  if (str.includes('low') || str.includes('completed') || str.includes('81c995') || str.includes('2ecc71') || str.includes('4ecdc4')) return 'linear-gradient(to bottom, #4ECDC4, rgba(78, 205, 196, 0.4))';
  return 'linear-gradient(to bottom, #9C27B0, rgba(156, 39, 176, 0.4))';
};

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(20, 25, 35, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)', color: '#fff', outline: 'none', zIndex: 100
      }}>
        {label && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: 600 }}>{label}</div>}
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color || entry.payload?.fill || '#FF6B35' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{entry.name}:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatter ? formatter(entry.value)[0] : entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Chart Card Component ──────────────────────────────────────────────────────
const InsightChartCard = ({ data }) => {
  const { chartType, title } = data;
  const { getInsights } = useApp();
  
  const [timeframe, setTimeframe] = useState('week');
  const [localData, setLocalData] = useState(data.chartData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // Force year timeframe for heatmap (always 365 days)
    const effectiveTimeframe = chartType === 'activity_heatmap' ? 'year' : timeframe;
    const fetchLocal = async () => {
      setLoading(true);
      try {
        const res = await getInsights(effectiveTimeframe);
        if (isMounted) setLocalData(res);
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (effectiveTimeframe === 'week' && data.chartData) {
      setLocalData(data.chartData);
    } else {
      fetchLocal();
    }
    return () => { isMounted = false; };
  }, [timeframe, getInsights, data.chartData, chartType]);

  const completionTrend = localData?.focus_time?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: item.hours
  })) || [];
  
  const timeDistribution = localData?.time_priority_breakdown || [];
  const priorityData = localData?.priority_breakdown || [];
  const statusData = localData?.status_breakdown || [];

  return (
    <div style={{ ...cardBase, paddingRight: '20px', position: 'relative' }}>
      {chartType !== 'activity_heatmap' && (
        <select 
          value={timeframe} 
          onChange={(e) => setTimeframe(e.target.value)}
          style={{
             position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.4)', color: '#fff', 
             border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.75rem', 
             padding: '4px 8px', outline: 'none', cursor: 'pointer', zIndex: 10,
          }}
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="year">Last Year</option>
        </select>
      )}

      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B35" stopOpacity={1}/><stop offset="100%" stopColor="#FF6B35" stopOpacity={0.3}/></linearGradient>
          <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFD93D" stopOpacity={1}/><stop offset="100%" stopColor="#FFD93D" stopOpacity={0.3}/></linearGradient>
          <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ECDC4" stopOpacity={1}/><stop offset="100%" stopColor="#4ECDC4" stopOpacity={0.3}/></linearGradient>
          <linearGradient id="gradDefault" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9C27B0" stopOpacity={1}/><stop offset="100%" stopColor="#9C27B0" stopOpacity={0.3}/></linearGradient>
          <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B35" stopOpacity={0.3}/><stop offset="100%" stopColor="#FF6B35" stopOpacity={0}/></linearGradient>
        </defs>
      </svg>
      <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '12px', color: '#f5c6a0', paddingRight: chartType !== 'activity_heatmap' ? '110px' : '0' }}>{title}{chartType === 'activity_heatmap' && <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#9ca3af', marginLeft: '8px' }}>Last 365 Days</span>}</div>

      <div style={{ width: '100%', height: chartType === 'activity_heatmap' ? 'auto' : '220px', marginLeft: chartType === 'activity_heatmap' ? '0' : '-15px' }}>
        {chartType === 'task_completion' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completionTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="hours" stroke="#FF6B35" strokeWidth={3} fill="url(#focusGradient)" name="Focus Hours" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartType === 'time_priority' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie data={timeDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                  {timeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getGradientId(entry.name || entry.fill)} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip formatter={(value) => [`${value}h`, 'Time Spent']} />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              {timeDistribution.map((item) => (
                 <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#d1d5db' }}>
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: getCssGradient(item.name || item.fill) }} />
                   {item.name} ({item.value.toFixed(1)}h)
                 </div>
              ))}
            </div>
          </div>
        )}

        {chartType === 'tasks_priority' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getGradientId(entry.name || entry.fill)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'completion_status' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value" stroke="none">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getGradientId(entry.name || entry.fill)} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              {statusData.map((item) => (
                 <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#d1d5db' }}>
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: getCssGradient(item.name || item.fill) }} />
                   {item.name}: {item.value}
                 </div>
              ))}
            </div>
          </div>
        )}

        {chartType === 'time_project' && (
          <ResponsiveContainer width="100%" height="100%">
            {loading ? <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center'}}><Loader className="chatbot-spin" size={24}/></div> : (
            <BarChart data={localData?.project_breakdown || []} layout="vertical" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false}/>
              <XAxis type="number" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.6)" width={80} tick={{ fontSize: 10 }} />
              <RechartsTooltip content={<CustomTooltip formatter={(value) => [`${value}h`, 'Time Spent']} />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="hours" fill="url(#gradLow)" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
            )}
          </ResponsiveContainer>
        )}

        {chartType === 'productivity_hour' && (
          <ResponsiveContainer width="100%" height="100%">
            {loading ? <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center'}}><Loader className="chatbot-spin" size={24}/></div> : (
            <BarChart data={localData?.hourly_pattern || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} interval={3} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<CustomTooltip formatter={(value) => [`${value}h`, 'Focus Time']} />} />
              <Bar dataKey="hours" name="Focus Hours" radius={[4, 4, 0, 0]} barSize={16}>
                {(localData?.hourly_pattern || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['url(#gradHigh)', 'url(#gradLow)', 'url(#gradMedium)'][index % 3]} />
                ))}
              </Bar>
            </BarChart>
            )}
          </ResponsiveContainer>
        )}

        {chartType === 'focus_day' && (
          <ResponsiveContainer width="100%" height="100%">
            {loading ? <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center'}}><Loader className="chatbot-spin" size={24}/></div> : (
            <AreaChart data={localData?.day_of_week_pattern || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip formatter={(value) => [`${value}h`, 'Focus Hours']} />} />
              <Area type="monotone" dataKey="hours" stroke="#FFD93D" strokeWidth={3} fill="url(#gradMedium)" />
            </AreaChart>
            )}
          </ResponsiveContainer>
        )}

        {chartType === 'focus_quality' && (
          <ResponsiveContainer width="100%" height="100%">
            {loading ? <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center'}}><Loader className="chatbot-spin" size={24}/></div> : (
            <LineChart data={localData?.focus_quality?.map(i => ({ date: new Date(i.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), quality: i.quality })) || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="quality" stroke="#FFD23F" strokeWidth={3} dot={{ fill: '#FFD23F', r: 4, strokeWidth: 2, stroke: '#1A1F2B' }} activeDot={{ r: 6 }} name="Quality %" />
            </LineChart>
            )}
          </ResponsiveContainer>
        )}

        {chartType === 'activity_heatmap' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 0' }}>
            {loading ? <div style={{display:'flex', height:'100px', alignItems:'center', justifyContent:'center'}}><Loader className="chatbot-spin" size={24}/></div> : (
              <div style={{ display: 'flex', gap: '1px', justifyContent: 'flex-start', flexWrap: 'nowrap', overflow: 'visible' }}>
                {(localData?.activity_heatmap || []).length > 0 ? Array.from({ length: Math.ceil((localData?.activity_heatmap || []).length / 7) }).map((_, colIndex) => {
                  const weekDays = (localData?.activity_heatmap || []).slice(colIndex * 7, (colIndex + 1) * 7);
                  return (
                    <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: '1 1 0' }}>
                      {weekDays.map((day, dIdx) => (
                        <div
                          key={dIdx}
                          title={`${day.date}: ${day.count}h focus`}
                          style={{
                            width: '100%', paddingBottom: '100%', borderRadius: '2px',
                            backgroundColor: day.count === 0 ? 'rgba(255,255,255,0.06)' : `rgba(78, 205, 196, ${Math.min(day.count * 0.15 + 0.3, 1)})`,
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                  );
                }) : <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No activity data found.</div>}
              </div>
            )}
          </div>
        )}

        {chartType === 'estimated_vs_actual' && (
          <ResponsiveContainer width="100%" height="100%">
            {loading ? <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center'}}><Loader className="chatbot-spin" size={24}/></div> : (
              (localData?.estimated_vs_actual || []).length > 0 ? (
                <BarChart data={localData?.estimated_vs_actual || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<CustomTooltip formatter={(value) => [`${value}h`, '']} />} />
                  <Bar dataKey="estimated" name="Estimated" fill="url(#gradLow)" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="actual" name="Actual" fill="url(#gradHigh)" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              ) : (
                <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem'}}>No tasks with estimated duration completed yet.</div>
              )
            )}
          </ResponsiveContainer>
        )}

        {chartType === 'burndown' && (
          <ResponsiveContainer width="100%" height="100%">
            {loading ? <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center'}}><Loader className="chatbot-spin" size={24}/></div> : (
            <LineChart data={localData?.burndown_data || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip formatter={(value) => [value, 'Tasks Remaining']} />} />
              <Line type="monotone" dataKey="remaining" stroke="#FF6B35" strokeWidth={3} dot={{ fill: '#FF6B35', r: 4, strokeWidth: 2, stroke: '#1A1F2B' }} activeDot={{ r: 6 }} name="Tasks Remaining" />
            </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ─── TTS helper ───────────────────────────────────────────────────────────────
const speakText = (text, onEnd) => {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();

  const doSpeak = (voices) => {
    const utter = new SpeechSynthesisUtterance(text);
    const preferred =
      voices.find((v) => v.name.includes('Samantha') && v.lang.startsWith('en')) ||
      voices.find((v) => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find((v) => v.lang.startsWith('en-') && v.localService) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];
    if (preferred) utter.voice = preferred;
    utter.rate = 1.05;
    utter.pitch = 0.95;
    utter.volume = 1;

    const resumeInterval = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(resumeInterval); return; }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 5000);

    utter.onend = () => { clearInterval(resumeInterval); onEnd?.(); };
    utter.onerror = () => { clearInterval(resumeInterval); onEnd?.(); };
    setTimeout(() => window.speechSynthesis.speak(utter), 50);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak(voices);
  } else {
    let fired = false;
    window.speechSynthesis.onvoiceschanged = () => {
      if (fired) return;
      fired = true;
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak(window.speechSynthesis.getVoices());
    };
    setTimeout(() => {
      if (fired) return;
      fired = true;
      doSpeak(window.speechSynthesis.getVoices());
    }, 800);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const stripEmoji = (t) => t.replace(/[\u{1F600}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA00}-\u{1FAFF}]/gu, '').trim();

const isYes = (t) => /^(yes|yeah|yep|sure|ok|okay|okay|confirm|create|done|go ahead|go\s+ahead|let'?s\s+go|do\s+it|set\s+it|yup|y|absolutely|definitely|proceed|affirmative)\b/i.test(t.trim());
const isNo = (t) => /^(no|nope|nah|cancel|nevermind|never\s+mind|stop|abort|quit|exit|n|not|reject)\b/i.test(t.trim());
const isBack = (t) => /^(back|go\s*back|previous|prev|undo)(\s*(back|please|now))*$/i.test(t.trim());
const isEdit = (t) => /^(edit|change|modify|update)$/i.test(t.trim());
const isSkip = (t) => /^(skip|skip\s*(it|this|that)?|pass|next|none|na|n\/a|no\s*(thanks|notes|description|need|reminder)?)$/i.test(t.trim());
const isCancel = (t) => /^(cancel|nevermind|never\s+mind|abort|quit|stop|exit)\b/i.test(t.trim());

// Strip common voice prefixes from task title: "call it X", "name it X", "title is X"
const extractTitle = (text) => {
  return text
    .replace(/^(call\s+it|name\s+it|title\s+is|it'?s?\s+called|let'?s?\s+call\s+it|make\s+it|set\s+it\s+as|set\s+it\s+to)\s+/i, '')
    .trim();
};

// Parse duration from text like "4h", "30m", "2 hours", "45 minutes"
const parseDuration = (text) => {
  const t = text.replace(/^(about|around|roughly|approximately)\s+/i, '');
  const m = t.match(/^(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)?$/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const unit = (m[2] || 'm').toLowerCase();
  if (unit.startsWith('h')) return `${num}h`;
  return `${num}m`;
};

// Word-to-number map for voice input
const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, sixty: 60,
  half: 0.5, quarter: 0.25,
};
const wordToNum = (w) => WORD_NUMBERS[w.toLowerCase()] ?? parseInt(w, 10);

// ── Natural language date parser ──────────────────────────────────────────────
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DAYS_OF_WEEK = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const parseNaturalDate = (text) => {
  const t = text.toLowerCase().replace(/[,]/g, '').replace(/\s+/g, ' ').trim();
  const now = new Date();

  // "tomorrow"
  if (/^tomorrow/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    // Try to extract time: "tomorrow at 3pm", "tomorrow 15:00"
    const timeMatch = t.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3];
      if (ampm?.toLowerCase() === 'pm' && h < 12) h += 12;
      if (ampm?.toLowerCase() === 'am' && h === 12) h = 0;
      d.setHours(h, min, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0); // default 9 AM
    }
    return d;
  }

  // "today at 5pm"
  if (/^today/.test(t)) {
    const d = new Date(now);
    const timeMatch = t.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3];
      if (ampm?.toLowerCase() === 'pm' && h < 12) h += 12;
      if (ampm?.toLowerCase() === 'am' && h === 12) h = 0;
      d.setHours(h, min, 0, 0);
    }
    return d > now ? d : null;
  }

  // "next monday", "next friday"
  const nextDayMatch = t.match(/^next\s+(\w+)/);
  if (nextDayMatch) {
    const dayIdx = DAYS_OF_WEEK.indexOf(nextDayMatch[1]);
    if (dayIdx >= 0) {
      const d = new Date(now);
      const diff = (dayIdx - d.getDay() + 7) % 7 || 7; // always next week
      d.setDate(d.getDate() + diff);
      d.setHours(9, 0, 0, 0);
      return d;
    }
  }

  // "in 3 days", "in 1 week"
  const inMatch = t.match(/^in\s+(\d+)\s*(day|days|week|weeks)/);
  if (inMatch) {
    const d = new Date(now);
    const n = parseInt(inMatch[1], 10);
    if (inMatch[2].startsWith('week')) d.setDate(d.getDate() + n * 7);
    else d.setDate(d.getDate() + n);
    d.setHours(9, 0, 0, 0);
    return d;
  }

  // "3 march", "3rd march", "march 3", "march 3rd", "15 jan", "jan 15"
  // Can also have time: "3 march at 10am", "march 3 10:00"
  let month = -1, day = -1;
  // Try: <day> <month>
  const dm = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)/);
  if (dm) {
    day = parseInt(dm[1], 10);
    const mIdx = MONTHS.indexOf(dm[2]) !== -1 ? MONTHS.indexOf(dm[2]) : MONTH_SHORT.indexOf(dm[2].slice(0,3));
    if (mIdx >= 0) month = mIdx;
  }
  // Try: <month> <day>
  if (month < 0) {
    const md = t.match(/^(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/);
    if (md) {
      const mIdx = MONTHS.indexOf(md[1]) !== -1 ? MONTHS.indexOf(md[1]) : MONTH_SHORT.indexOf(md[1].slice(0,3));
      if (mIdx >= 0) {
        month = mIdx;
        day = parseInt(md[2], 10);
      }
    }
  }
  if (month >= 0 && day > 0 && day <= 31) {
    let year = now.getFullYear();
    const candidate = new Date(year, month, day, 9, 0, 0);
    if (candidate < now) candidate.setFullYear(year + 1);
    // Extract time from anywhere in the string: "at 10am", "10:30 pm", "3 pm"
    const timeMatch = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (timeMatch[3].toLowerCase() === 'pm' && h < 12) h += 12;
      if (timeMatch[3].toLowerCase() === 'am' && h === 12) h = 0;
      candidate.setHours(h, min, 0, 0);
    } else {
      // Try 24h format: "15:00", "10:30"
      const t24 = t.match(/(\d{1,2}):(\d{2})/);
      if (t24) {
        candidate.setHours(parseInt(t24[1], 10), parseInt(t24[2], 10), 0, 0);
      }
    }
    return candidate;
  }

  // Standalone time: "10 AM", "3:30 PM" (for today or tomorrow)
  const standaloneTime = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (standaloneTime) {
    const d = new Date(now);
    let h = parseInt(standaloneTime[1], 10);
    const min = standaloneTime[2] ? parseInt(standaloneTime[2], 10) : 0;
    if (standaloneTime[3].toLowerCase() === 'pm' && h < 12) h += 12;
    if (standaloneTime[3].toLowerCase() === 'am' && h === 12) h = 0;
    d.setHours(h, min, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1); // if past today, set for tomorrow
    return d;
  }

  return null;
};

// ── Fuzzy string similarity (for category matching) ──────────────────────────
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const similarity = (a, b) => {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 3 || nb.length < 3) return na === nb ? 1 : 0; // short strings need exact match
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  // Count matching chars in sequence
  let matches = 0;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  let lastIdx = -1;
  for (const ch of shorter) {
    const idx = longer.indexOf(ch, lastIdx + 1);
    if (idx >= 0) { matches++; lastIdx = idx; }
  }
  return matches / longer.length;
};

// Step-specific prompts for the "back" command
const STEP_PROMPTS = {
  task_title: "What should I call this task?",
  task_priority: 'What priority?',
  task_category: 'Which category?',
  task_duration: 'How long will this take?',
  task_description: 'Any description or notes? Type it or skip:',
  task_duedate: 'Set a due date & time? Use the picker below or skip:',
  task_reminder_offset: 'Want a reminder before the deadline?',
  reminder_message: 'What should I remind you about?',
  reminder_time: 'When should I remind you?',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ChatbotAssistant Component
// ═══════════════════════════════════════════════════════════════════════════════
const ChatbotAssistant = () => {
  const {
    tasks,
    createTask,
    refreshTasks,
    refreshReminders,
    taskReminders,
    user,
    getInsights,
  } = useApp();

  // ── State ───────────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const pendingOnSpeakEndRef = useRef(null);
  const hasCalledGoToMenuRef = useRef(false);

  // Flow state machine
  const [flowState, setFlowState] = useState('menu');
  const [taskDraft, setTaskDraft] = useState({});
  const [reminderDraft, setReminderDraft] = useState({});
  const [briefingData, setBriefingData] = useState(null);

  // Focus tracking
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDatetimeInput, setShowDatetimeInput] = useState(false);
  const [datetimeValue, setDatetimeValue] = useState('');
  const [showCustomReminderTime, setShowCustomReminderTime] = useState(false);
  const [customReminderTime, setCustomReminderTime] = useState('');
  // Editing mode: which flow we're editing from + which field
  const [editingFrom, setEditingFrom] = useState(null); // 'task_confirm' | 'reminder_confirm' | null
  const [showTaskEditPicker, setShowTaskEditPicker] = useState(false);
  const [showReminderEditPicker, setShowReminderEditPicker] = useState(false);

  // Task management state
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [managementActionType, setManagementActionType] = useState(null); // 'mark_done' | 'change_priority' | 'delete_reminder'
  const [settingTaskReminder, setSettingTaskReminder] = useState(false); // Track if we're setting reminder for an edited task

  // Hands-free voice mode: auto-listen after each bot response
  const [voiceMode, setVoiceMode] = useState(false);

  const chatLogRef = useRef(null);
  const optionsRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceModeRef = useRef(false);

  const skipSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    const cb = pendingOnSpeakEndRef.current;
    pendingOnSpeakEndRef.current = null;
    if (cb) cb();
  }, []);

  // Keep ref in sync
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Categories from existing tasks + defaults
  const categories = useMemo(() => {
    const taskCats = tasks.map((t) => t.category).filter(Boolean);
    let savedCats = [];
    if (user?.email) {
      try {
        const saved = localStorage.getItem(`voicepro_categories_${user.email}`);
        if (saved) savedCats = JSON.parse(saved);
      } catch (_) {}
    }
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...savedCats, ...taskCats]));
  }, [tasks, user]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    if (!chatLogRef.current) return;
    
    const doScroll = () => {
      if (chatLogRef.current) {
        // Force scroll to absolute bottom
        chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
      }
    };
    
    // Immediate scroll
    doScroll();
    
    // Use RAF for next frame
    requestAnimationFrame(doScroll);
    
    // Multiple timeouts
    [10, 25, 50, 100, 200, 400, 600].forEach(delay => {
      setTimeout(doScroll, delay);
    });
  }, []);

  useEffect(scrollToBottom, [messages, flowState, scrollToBottom]);

  const triggerAutoListen = useCallback(() => {
    // After TTS ends, auto-start listening if voice mode is on
    if (!voiceModeRef.current) return;
    // Small delay so TTS fully stops before mic opens
    setTimeout(() => {
      if (voiceModeRef.current && !recognitionRef.current) {
        // We can't call startListeningWrapped here due to dependency order,
        // so we dispatch a custom event that we listen for below
        window.dispatchEvent(new CustomEvent('voicepro-auto-listen'));
      }
    }, 400);
  }, []);

  const addBotMessage = useCallback((text, speakIt = true, onSpeakEnd = null) => {
    setMessages((prev) => [...prev, { role: 'bot', content: text }]);
    if (speakIt) {
      setIsSpeaking(true);
      pendingOnSpeakEndRef.current = onSpeakEnd;
      speakText(stripEmoji(text), () => {
        setIsSpeaking(false);
        pendingOnSpeakEndRef.current = null;
        if (onSpeakEnd) {
          onSpeakEnd();
        } else {
          triggerAutoListen();
        }
      });
    } else {
      if (onSpeakEnd) onSpeakEnd();
    }
  }, [triggerAutoListen]);

  const addUserMessage = useCallback((text) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
  }, []);

  const addSuccessMessage = useCallback((text) => {
    setMessages((prev) => [...prev, { role: 'success', content: text }]);
    // Don't auto-listen after success — flow is ending
    speakText(stripEmoji(text));
  }, []);

  // Initialize welcome
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = user?.name ? `Hey ${user.name.split(' ')[0]}! I'm your VoicePro assistant.` : "Hey! I'm your VoicePro assistant.";
      addBotMessage(`${greeting} How can I help you today?`);
    }
  }, [isOpen, messages.length, addBotMessage, user]);

  // ── Speech recognition ──────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (_) {}
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // ── Flow handlers ───────────────────────────────────────────────────────────

  const resetFlowState = useCallback(() => {
    setFlowState('menu');
    setTaskDraft({});
    setReminderDraft({});
    setShowNewCategoryInput(false);
    setShowDatetimeInput(false);
    setShowCustomReminderTime(false);
    setEditingFrom(null);
    setShowTaskEditPicker(false);
    setShowReminderEditPicker(false);
    setSelectedTask(null);
    setSelectedReminder(null);
    setManagementActionType(null);
    setBriefingData(null); // Reset briefing data
    // Turn off voice mode when returning to menu
    setVoiceMode(false);
  }, []);

  const goToMenu = useCallback((prompt) => {
    // Prevent duplicate goToMenu calls from race conditions
    if (hasCalledGoToMenuRef.current) return;
    hasCalledGoToMenuRef.current = true;
    
    resetFlowState();
    addBotMessage(prompt || 'What else can I help with?');
  }, [addBotMessage, resetFlowState]);

  // Helper to return to confirm after editing a single field
  const returnToConfirm = useCallback((type) => {
    setEditingFrom(null);
    if (type === 'task') {
      setFlowState('task_confirm');
      setTimeout(() => addBotMessage("Updated! Here's your revised task summary:"), 300);
    } else {
      setFlowState('reminder_confirm');
      setTimeout(() => addBotMessage("Updated! Here's your revised reminder:"), 300);
    }
  }, [addBotMessage]);

  // ── TASK FLOW ───────────────────────────────────────────────────────────────
  const startTaskFlow = useCallback(() => {
    setTaskDraft({});
    setEditingFrom(null);
    setFlowState('task_title');
    addBotMessage("Let's create a task! What should I call it?");
  }, [addBotMessage]);

  const handleTaskTitle = useCallback((text) => {
    const cleaned = extractTitle(text);
    const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    setTaskDraft((prev) => ({ ...prev, title }));
    addUserMessage(title);
    if (editingFrom === 'task_confirm') {
      returnToConfirm('task');
    } else {
      setFlowState('task_priority');
      setTimeout(() => addBotMessage('What priority?'), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleTaskPriority = useCallback((priority) => {
    setTaskDraft((prev) => ({ ...prev, priority }));
    addUserMessage(priority);
    if (editingFrom === 'task_confirm') {
      returnToConfirm('task');
    } else {
      setFlowState('task_category');
      setTimeout(() => addBotMessage('Which category does this belong to?'), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleTaskCategory = useCallback((category) => {
    if (category === '__new__') {
      setShowNewCategoryInput(true);
      return;
    }
    setTaskDraft((prev) => ({ ...prev, category }));
    addUserMessage(category);
    setShowNewCategoryInput(false);
    if (editingFrom === 'task_confirm') {
      returnToConfirm('task');
    } else {
      setFlowState('task_duration');
      setTimeout(() => addBotMessage('How long will this take?'), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleTaskDuration = useCallback((duration) => {
    if (duration === 'skip') {
      addUserMessage('Skipped');
      setTaskDraft((prev) => { const d = { ...prev }; delete d.duration; return d; });
    } else {
      setTaskDraft((prev) => ({ ...prev, duration }));
      addUserMessage(duration);
    }
    if (editingFrom === 'task_confirm') {
      returnToConfirm('task');
    } else {
      setFlowState('task_description');
      setTimeout(() => addBotMessage('Any description or notes? Type it or skip:'), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleTaskDescription = useCallback((text) => {
    if (isSkip(text) || text === 'Skipped') {
      addUserMessage('Skipped');
      setTaskDraft((prev) => { const d = { ...prev }; delete d.description; return d; });
    } else {
      const desc = text.charAt(0).toUpperCase() + text.slice(1);
      setTaskDraft((prev) => ({ ...prev, description: desc }));
      addUserMessage(desc);
    }
    if (editingFrom === 'task_confirm') {
      returnToConfirm('task');
    } else {
      setFlowState('task_duedate');
      setShowDatetimeInput(true);
      // Pre-populate with tomorrow 9 AM as a sensible default
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const pad = (n) => String(n).padStart(2, '0');
      setDatetimeValue(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:00`);
      setTimeout(() => addBotMessage('Set a due date & time? Use the picker below or skip:'), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleTaskDueDate = useCallback((value) => {
    setShowDatetimeInput(false);
    if (value === 'skip') {
      addUserMessage('Skipped');
      setTaskDraft((prev) => { const d = { ...prev }; delete d.due_date; delete d.reminder_offset; return d; });
      if (editingFrom === 'task_confirm') {
        returnToConfirm('task');
      } else {
        setFlowState('task_confirm');
        setTimeout(() => addBotMessage("Here's your task summary. You can edit any field or create it:"), 300);
      }
    } else {
      // Store date as local datetime string (YYYY-MM-DDTHH:mm) — not UTC
      setTaskDraft((prev) => ({ ...prev, due_date: value }));
      // Format display using local interpretation
      const parts = value.split('T');
      const [y, mo, da] = parts[0].split('-');
      const [hr, mi] = (parts[1] || '09:00').split(':');
      const dateObj = new Date(parseInt(y), parseInt(mo) - 1, parseInt(da), parseInt(hr), parseInt(mi));
      addUserMessage(`Due: ${dateObj.toLocaleString()}`);
      if (editingFrom === 'task_confirm') {
        returnToConfirm('task');
      } else {
        setFlowState('task_reminder_offset');
        setTimeout(() => addBotMessage('Want a reminder before the deadline?'), 300);
      }
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleTaskReminderOffset = useCallback((value) => {
    if (value === 'skip' || value === '') {
      addUserMessage(value === 'skip' ? 'Skipped' : 'No reminder');
      setTaskDraft((prev) => { const d = { ...prev }; delete d.reminder_offset; return d; });
    } else {
      setTaskDraft((prev) => ({ ...prev, reminder_offset: value }));
      const mins = parseInt(value, 10);
      const label = mins >= 1440 ? `${mins / 1440} day before` : mins >= 60 ? `${mins / 60} hour${mins / 60 > 1 ? 's' : ''} before` : `${mins} min before`;
      addUserMessage(label);
    }
    if (editingFrom === 'task_confirm') {
      returnToConfirm('task');
    } else {
      setFlowState('task_confirm');
      setTimeout(() => addBotMessage("Here's your task summary. You can edit any field or create it:"), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleTaskCreate = useCallback(async () => {
    setIsWorking(true);
    try {
      const payload = {
        title: taskDraft.title,
        status: 'pending',
        priority: taskDraft.priority || 'Medium',
        category: taskDraft.category || 'Client Work',
        description: taskDraft.description || '',
        duration: taskDraft.duration || null,
      };

      if (taskDraft.due_date) {
        // due_date is stored as local 'YYYY-MM-DDTHH:mm'; convert to ISO for API
        const parts = taskDraft.due_date.split('T');
        const [y, mo, da] = parts[0].split('-');
        const [hr, mi] = (parts[1] || '09:00').split(':');
        const localDate = new Date(parseInt(y), parseInt(mo) - 1, parseInt(da), parseInt(hr), parseInt(mi));
        payload.due_date = localDate.toISOString();
        if (taskDraft.reminder_offset) {
          payload.reminder_offset = parseInt(taskDraft.reminder_offset, 10);
        }
      }

      await createTask(payload);
      await Promise.all([refreshTasks(), refreshReminders()]);
      toast.success('Task created!');
      addSuccessMessage(`Task "${taskDraft.title}" created successfully!`);
      setTimeout(() => goToMenu('Anything else I can help with?'), 3000);
    } catch (err) {
      toast.error('Failed to create task');
      addBotMessage('Something went wrong creating the task. Want to try again?');
    } finally {
      setIsWorking(false);
    }
  }, [taskDraft, createTask, refreshTasks, refreshReminders, addSuccessMessage, addBotMessage, goToMenu]);

  // Start editing a specific task field from confirm screen
  const startTaskFieldEdit = useCallback((fieldStep) => {
    setEditingFrom('task_confirm');
    setShowTaskEditPicker(false);
    setFlowState(fieldStep);
    if (fieldStep === 'task_duedate') setShowDatetimeInput(true);
    const prompts = {
      task_title: 'Enter the new task name:',
      task_priority: 'Choose the new priority:',
      task_category: 'Choose the new category:',
      task_duration: 'Pick a new duration:',
      task_description: 'Enter the new description:',
      task_duedate: 'Pick a new due date & time:',
      task_reminder_offset: 'Choose a new reminder time:',
    };
    addBotMessage(prompts[fieldStep] || 'Enter the new value:');
  }, [addBotMessage]);

  // ── REMINDER FLOW ───────────────────────────────────────────────────────────
  const startReminderFlow = useCallback(() => {
    // If there's a selected task, use task-reminder logic
    if (selectedTask) {
      setSettingTaskReminder(true);
      const taskReminderMessage = `Task due soon: ${selectedTask.title}`;
      setReminderDraft({ message: taskReminderMessage });
      setEditingFrom(null);
      setFlowState('reminder_time');
      addBotMessage('How many minutes before the due date/time do you want to be reminded? (e.g., "10 minutes", "30 minutes", "1 hour")');
    } else {
      // Normal reminder flow for general reminders
      setReminderDraft({});
      setEditingFrom(null);
      setFlowState('reminder_message');
      addBotMessage("Let's set a reminder! What should I remind you about?");
    }
  }, [selectedTask, addBotMessage]);

  const handleReminderMessage = useCallback((text) => {
    const msg = text.charAt(0).toUpperCase() + text.slice(1);
    setReminderDraft((prev) => ({ ...prev, message: msg }));
    addUserMessage(msg);
    if (editingFrom === 'reminder_confirm') {
      returnToConfirm('reminder');
    } else {
      setFlowState('reminder_time');
      setTimeout(() => addBotMessage('When should I remind you?'), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleReminderTime = useCallback((value) => {
    if (value === 'custom') {
      setShowCustomReminderTime(true);
      return;
    }
    setReminderDraft((prev) => ({ ...prev, in_minutes: value, reminder_time: undefined }));
    const opt = REMINDER_TIME_OPTIONS.find((o) => o.value === value);
    addUserMessage(opt?.label || `In ${value} minutes`);
    setShowCustomReminderTime(false);
    if (editingFrom === 'reminder_confirm') {
      returnToConfirm('reminder');
    } else {
      setFlowState('reminder_confirm');
      setTimeout(() => addBotMessage("Here's your reminder summary. You can edit or confirm:"), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleReminderCustomTime = useCallback((value) => {
    setReminderDraft((prev) => ({ ...prev, reminder_time: new Date(value).toISOString(), in_minutes: undefined }));
    addUserMessage(`At ${new Date(value).toLocaleString()}`);
    setShowCustomReminderTime(false);
    if (editingFrom === 'reminder_confirm') {
      returnToConfirm('reminder');
    } else {
      setFlowState('reminder_confirm');
      setTimeout(() => addBotMessage("Here's your reminder summary. You can edit or confirm:"), 300);
    }
  }, [addUserMessage, addBotMessage, editingFrom, returnToConfirm]);

  const handleReminderCreate = useCallback(async () => {
    setIsWorking(true);
    try {
      const payload = { message: reminderDraft.message };
      
      // If setting reminder for a task from edit flow, link it to the task
      if (settingTaskReminder && selectedTask) {
        payload.task_id = selectedTask.task_id;
      }
      
      if (reminderDraft.reminder_time) {
        payload.reminder_time = reminderDraft.reminder_time;
      } else if (settingTaskReminder && selectedTask && selectedTask.due_date && reminderDraft.in_minutes) {
        // For task reminders, calculate reminder time as: due_date - in_minutes
        const dueDate = new Date(selectedTask.due_date);
        const reminderTime = new Date(dueDate.getTime() - (reminderDraft.in_minutes * 60 * 1000));
        payload.reminder_time = reminderTime.toISOString();
      } else {
        payload.in_minutes = reminderDraft.in_minutes || 30;
      }
      
      // If setting for task, delete existing reminder first
      if (settingTaskReminder && selectedTask) {
        const existingReminder = taskReminders.find(r => r.task_id === selectedTask.task_id);
        if (existingReminder) {
          await reminderAPI.deleteOne(existingReminder.reminder_id);
        }
      }
      
      await reminderAPI.create(payload);
      await refreshReminders();
      toast.success('Reminder set!');
      addSuccessMessage(`Reminder "${reminderDraft.message}" set!`);
      
      // Reset task reminder flag and go back to menu
      if (settingTaskReminder) {
        setSettingTaskReminder(false);
        setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
      } else {
        setTimeout(() => goToMenu('Anything else I can help with?'), 3000);
      }
    } catch (err) {
      toast.error('Failed to set reminder');
      addBotMessage('Something went wrong. Want to try again?');
    } finally {
      setIsWorking(false);
    }
  }, [reminderDraft, settingTaskReminder, selectedTask, taskReminders, refreshReminders, addSuccessMessage, addBotMessage, goToMenu]);

  // Start editing a specific reminder field
  const startReminderFieldEdit = useCallback((fieldStep) => {
    setEditingFrom('reminder_confirm');
    setShowReminderEditPicker(false);
    setFlowState(fieldStep);
    if (fieldStep === 'reminder_time') setShowCustomReminderTime(false);
    const prompts = {
      reminder_message: 'Enter the new reminder message:',
      reminder_time: 'Pick a new time:',
    };
    addBotMessage(prompts[fieldStep] || 'Enter the new value:');
  }, [addBotMessage]);


  const handleBriefingRequest = useCallback((type) => {
    setIsWorking(true);
    setTimeout(() => {
      const now = new Date();
      let end = new Date(now);
      let title = '';
      if (type === 'daily') {
        end.setHours(23, 59, 59, 999);
        title = "Today's";
      } else if (type === 'weekly') {
        // More useful to see a full 7-day rolling window
        end.setDate(now.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        title = "This week's";
      } else if (type === 'monthly') {
        // Most professional standard is the end of the current calendar month
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        title = "This month's";
      }

      const upcomingTasks = tasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false;
        const d = new Date(t.due_date);
        return d <= end; // Include overdue tasks as well 
      });
      upcomingTasks.sort((a,b) => new Date(a.due_date) - new Date(b.due_date));

      const overdueTasks = upcomingTasks.filter(t => new Date(t.due_date) < new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      const currentTasks = upcomingTasks.filter(t => new Date(t.due_date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()));

      const upcomingReminders = (taskReminders || []).filter(r => {
        if (!r.reminder_time) return false;
        const d = new Date(r.reminder_time);
        return d >= now && d <= end;
      });
      upcomingReminders.sort((a,b) => new Date(a.reminder_time) - new Date(b.reminder_time));

      let summary = `${title} briefing: `;
      if (type === 'daily') {
        if (currentTasks.length === 0 && overdueTasks.length === 0) {
          summary += `You have no tasks due today, and `;
        } else if (currentTasks.length > 0 && overdueTasks.length > 0) {
          summary += `You have ${currentTasks.length} task${currentTasks.length !== 1 ? 's' : ''} due today and ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''}, plus `;
        } else if (currentTasks.length > 0) {
          summary += `You have ${currentTasks.length} task${currentTasks.length !== 1 ? 's' : ''} due today and `;
        } else {
          summary += `You have no tasks due today but ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} to catch up on, plus `;
        }
      } else {
        summary += `You have ${upcomingTasks.length} pending task${upcomingTasks.length !== 1 ? 's' : ''} `;
        if (overdueTasks.length > 0) {
          summary += `(including ${overdueTasks.length} overdue), and `;
        } else {
          summary += `and `;
        }
      }
      
      summary += `${upcomingReminders.length} reminder${upcomingReminders.length !== 1 ? 's' : ''} coming up.`;
      
      const highPriority = upcomingTasks.filter(t => t.priority === 'High');
      if (highPriority.length > 0) {
        summary += ` Your highest priority tasks are: ${highPriority.slice(0,3).map(t => t.title).join(', ')}.`;
      } else if (upcomingTasks.length > 0) {
        summary += ` Some of your tasks are: ${upcomingTasks.slice(0,3).map(t => t.title).join(', ')}.`;
      }

      if (upcomingReminders.length > 0) {
        summary += ` Your next reminder is to "${upcomingReminders[0].message}" at ${new Date(upcomingReminders[0].reminder_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`;
      }

      setIsWorking(false);
      setBriefingData({ type, title, currentTasks, overdueTasks, upcomingTasks, upcomingReminders, highPriority });

      // Build TTS text (spoken version)
      let spokenSummary = summary + ' Would you like a detailed breakdown?';

      // Store as structured message
      setMessages(prev => [...prev, { role: 'bot', content: spokenSummary, type: 'briefing_summary', data: {
        title, type, currentTasks, overdueTasks, upcomingTasks, upcomingReminders, highPriority
      }}]);

      setIsSpeaking(true);
      pendingOnSpeakEndRef.current = () => setFlowState('briefing_detailed_prompt');
      speakText(stripEmoji(spokenSummary), () => {
        setIsSpeaking(false);
        pendingOnSpeakEndRef.current = null;
        setFlowState('briefing_detailed_prompt');
      });
    }, 800);
  }, [tasks, taskReminders, addBotMessage, goToMenu]);

  const handleDetailedBriefing = useCallback(() => {
    setIsWorking(true);
    setTimeout(() => {
      if (!briefingData) {
        goToMenu('Sorry, I lost track of the briefing. Anything else?');
        return;
      }
      const { type, currentTasks, overdueTasks, upcomingReminders } = briefingData;
      let details = '';

      if (overdueTasks && overdueTasks.length > 0) {
        details += `Overdue Tasks (${overdueTasks.length}):\n` + overdueTasks.map((t, i) => `  ${i+1}. ${t.title}`).join('\n') + '\n\n';
      }
      
      if (type === 'daily' && currentTasks && currentTasks.length > 0) {
        details += `Due Today (${currentTasks.length}):\n` + currentTasks.map((t, i) => `  ${i+1}. ${t.title}`).join('\n') + '\n\n';
      } else if (type !== 'daily' && currentTasks && currentTasks.length > 0) {
        details += `Upcoming Tasks (${currentTasks.length}):\n` + currentTasks.map((t, i) => `  ${i+1}. ${t.title}`).join('\n') + '\n\n';
      }

      if (upcomingReminders && upcomingReminders.length > 0) {
        details += `Reminders (${upcomingReminders.length}):\n` + upcomingReminders.map((r, i) => {
          const rTime = new Date(r.reminder_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          return `  ${i+1}. ${r.message} — ${rTime}`;
        }).join('\n');
      }

      if (!details.trim()) {
        details = "You actually have an empty schedule!";
      }

      setIsWorking(false);

      // Build TTS text
      let spokenDetails = '';
      if (overdueTasks && overdueTasks.length > 0) {
        spokenDetails += `Your ${overdueTasks.length} overdue tasks are: ` + overdueTasks.map((t, i) => `${i+1}. ${t.title}`).join(', ') + '. ';
      }
      if (type === 'daily' && currentTasks && currentTasks.length > 0) {
        spokenDetails += `Tasks due today: ` + currentTasks.map((t, i) => `${i+1}. ${t.title}`).join(', ') + '. ';
      } else if (type !== 'daily' && currentTasks && currentTasks.length > 0) {
        spokenDetails += `Upcoming tasks: ` + currentTasks.map((t, i) => `${i+1}. ${t.title}`).join(', ') + '. ';
      }
      if (upcomingReminders && upcomingReminders.length > 0) {
        spokenDetails += `Reminders: ` + upcomingReminders.map(r => r.message).join(', ') + '.';
      }
      if (!spokenDetails) spokenDetails = 'You have an empty schedule!';
      spokenDetails += ' Anything else I can help with?';

      // Store as structured message
      setMessages(prev => [...prev, { role: 'bot', content: spokenDetails, type: 'briefing_detail', data: {
        type, currentTasks, overdueTasks, upcomingReminders
      }}]);

      setIsSpeaking(true);
      pendingOnSpeakEndRef.current = () => resetFlowState();
      speakText(stripEmoji(spokenDetails), () => {
        setIsSpeaking(false);
        pendingOnSpeakEndRef.current = null;
        resetFlowState();
      });
    }, 800);
  }, [briefingData, addBotMessage, goToMenu]);

  // ── SUGGEST TASK (AI brainstorming) ─────────────────────────────────────────
  const handleSuggestTask = useCallback((timeMinutes, timeLabel) => {
    setIsWorking(true);
    setTimeout(() => {
      const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

      // Separate tasks with and without duration
      const withDuration = pending.filter(t => {
        const mins = durationToMinutes(t.duration);
        return mins !== null && mins <= timeMinutes;
      });
      const withoutDuration = pending.filter(t => !t.duration);

      // Sort: High priority first, then overdue, then by due date
      const now = new Date();
      const sortByRelevance = (arr) => arr.sort((a, b) => {
        const aPri = a.priority === 'High' ? 0 : a.priority === 'Medium' ? 1 : 2;
        const bPri = b.priority === 'High' ? 0 : b.priority === 'Medium' ? 1 : 2;
        if (aPri !== bPri) return aPri - bPri;
        const aOverdue = a.due_date && new Date(a.due_date) < now ? 0 : 1;
        const bOverdue = b.due_date && new Date(b.due_date) < now ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return (new Date(a.due_date || '2099-12-31')) - (new Date(b.due_date || '2099-12-31'));
      });

      sortByRelevance(withDuration);
      sortByRelevance(withoutDuration);

      // Show up to 5 matching tasks, then up to 2 flexible ones
      const suggestions = [...withDuration.slice(0, 5), ...withoutDuration.slice(0, 2)];
      const noMatch = suggestions.length === 0;

      // Build TTS text
      let spoken = '';
      if (noMatch) {
        spoken = `I couldn't find any tasks that fit in ${timeLabel}. Maybe it's a good time for a break! Anything else I can help with?`;
      } else {
        spoken = `Here's what I'd suggest for ${timeLabel}: ` + suggestions.map((t, i) => `${i+1}. ${t.title}`).join(', ') + '. Anything else I can help with?';
      }

      // Store as structured message
      setMessages(prev => [...prev, { role: 'bot', content: spoken, type: 'suggest_task', data: {
        timeLabel, suggestions, noMatch
      }}]);

      setIsSpeaking(true);
      pendingOnSpeakEndRef.current = () => resetFlowState();
      speakText(stripEmoji(spoken), () => {
        setIsSpeaking(false);
        pendingOnSpeakEndRef.current = null;
        resetFlowState();
      });

      setIsWorking(false);
    }, 800);
  }, [tasks, resetFlowState]);

  // ── MOST URGENT ─────────────────────────────────────────────────────────────
  const handleMostUrgent = useCallback(() => {
    setIsWorking(true);
    setTimeout(() => {
      const now = new Date();
      const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

      const sorted = pending.map(t => ({
        ...t,
        isOverdue: t.due_date && new Date(t.due_date) < now,
      })).sort((a, b) => {
        // Overdue first
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        // Then high priority
        const aPri = a.priority === 'High' ? 0 : a.priority === 'Medium' ? 1 : 2;
        const bPri = b.priority === 'High' ? 0 : b.priority === 'Medium' ? 1 : 2;
        if (aPri !== bPri) return aPri - bPri;
        // Then earliest due date
        return (new Date(a.due_date || '2099-12-31')) - (new Date(b.due_date || '2099-12-31'));
      });

      const suggestions = sorted.slice(0, 5);
      const noMatch = suggestions.length === 0;

      let spoken = noMatch
        ? "You're all caught up! No urgent tasks right now. Anything else I can help with?"
        : 'Your most urgent tasks are: ' + suggestions.map((t, i) => `${i+1}. ${t.title}`).join(', ') + '. Anything else I can help with?';

      setMessages(prev => [...prev, { role: 'bot', content: spoken, type: 'urgent_task', data: { suggestions, noMatch } }]);
      setIsSpeaking(true);
      pendingOnSpeakEndRef.current = () => resetFlowState();
      speakText(stripEmoji(spoken), () => { setIsSpeaking(false); pendingOnSpeakEndRef.current = null; resetFlowState(); });
      setIsWorking(false);
    }, 800);
  }, [tasks, resetFlowState]);

  // ── PLAN MY DAY ─────────────────────────────────────────────────────────────
  const handlePlanMyDay = useCallback(() => {
    setIsWorking(true);
    setTimeout(() => {
      const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
      const now = new Date();

      // Sort by urgency + priority
      const sorted = pending.map(t => ({
        ...t,
        isOverdue: t.due_date && new Date(t.due_date) < now,
      })).sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        const aPri = a.priority === 'High' ? 0 : a.priority === 'Medium' ? 1 : 2;
        const bPri = b.priority === 'High' ? 0 : b.priority === 'Medium' ? 1 : 2;
        if (aPri !== bPri) return aPri - bPri;
        return (new Date(a.due_date || '2099-12-31')) - (new Date(b.due_date || '2099-12-31'));
      });

      // Pick top tasks that fit reasonably into a day (e.g. up to 6 tasks or ~4 hours)
      let schedule = [];
      let totalMinutes = 0;
      for (const t of sorted) {
        if (schedule.length >= 6) break;
        const mins = durationToMinutes(t.duration) || 30; // assume 30m if unknown
        if (totalMinutes + mins > 240 && schedule.length >= 3) break; // Don't overflow the day too much
        schedule.push(t);
        totalMinutes += mins;
      }

      const noTasks = schedule.length === 0;
      let spoken = noTasks
        ? "You have no pending tasks to plan. Enjoy your free day! Anything else I can help with?"
        : `Here's a suggested plan for today: ` + schedule.map((t, i) => `${i+1}. ${t.title}`).join(', ') + '. Anything else I can help with?';

      setMessages(prev => [...prev, { role: 'bot', content: spoken, type: 'plan_my_day', data: { schedule, totalMinutes, noTasks } }]);
      setIsSpeaking(true);
      pendingOnSpeakEndRef.current = () => resetFlowState();
      speakText(stripEmoji(spoken), () => { setIsSpeaking(false); pendingOnSpeakEndRef.current = null; resetFlowState(); });
      setIsWorking(false);
    }, 800);
  }, [tasks, resetFlowState]);

  // ── PRODUCTIVITY INSIGHTS ───────────────────────────────────────────────────
  const handleProductivityInsights = useCallback(async () => {
    setIsWorking(true);
    try {
      const chartData = await getInsights('week');
      setTimeout(() => {
        const totalTasks = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        const pending = pendingTasks.length;
        const now = new Date();
        const overdue = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < now).length;
        const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
        
        const totalWorkloadMins = pendingTasks.reduce((acc, t) => acc + (durationToMinutes(t.duration) || 30), 0);
  
        const catCounts = pendingTasks.reduce((acc, t) => {
          const cat = t.category || 'Uncategorized';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {});
        const categoryBreakdown = Object.entries(catCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 3);
  
        let spoken = `Here are your productivity stats! You've completed ${completionRate}% of your tasks. Which visual chart would you like to explore next?`;
  
        setMessages(prev => [...prev, { role: 'bot', content: spoken, type: 'productivity_insights', data: { totalTasks, completed, pending, overdue, completionRate, totalWorkloadMins, categoryBreakdown } }]);
        setFlowState('productivity_insights_charts');
        // Save the detailed chartData into tasks state so we don't have to refetch it on the next user turn
        setTaskDraft(chartData);
        
        setIsSpeaking(true);
        pendingOnSpeakEndRef.current = null;
        speakText(stripEmoji(spoken), () => { setIsSpeaking(false); pendingOnSpeakEndRef.current = null; });
        setIsWorking(false);
      }, 500);
    } catch (err) {
      console.error(err);
      addBotMessage('Failed to gather your detailed insights data.');
      setIsWorking(false);
      resetFlowState();
    }
  }, [tasks, resetFlowState, getInsights]);
  
  // ── PERSONALIZED INSIGHTS ───────────────────────────────────────────────────
  const handlePersonalizedInsights = useCallback(async () => {
    setIsWorking(true);
    try {
      const data = await getInsights('week');
      setTimeout(() => {
        const insights = [];
        const hourlyData = data.hourly_pattern || [];
        const focusQualityData = data.focus_quality || [];
        const completionRate = data.completion_rate || 0;
        const streakDays = data.streak_days || 0;
        const pendingTasks = data.pending_tasks || 0;
        const completedTasks = data.completed_tasks || 0;
        const totalHours = data.total_hours || 0;

        // 1. Peak Productivity
        if (hourlyData.length > 0) {
          const peakHourObj = [...hourlyData].sort((a, b) => b.hours - a.hours)[0];
          if (peakHourObj && peakHourObj.hours > 0) {
            insights.push({
              type: 'success',
              icon: <Zap size={20} />,
              title: 'Prime Time Identified',
              text: `You are most productive around ${peakHourObj.hour}. Try scheduling your "Deep Work" during this window.`
            });
          }
        }

        // 2. Workload & Burnout
        const dailyAvgHours = totalHours / 7;
        if (dailyAvgHours > 5) {
          insights.push({
            type: 'warning',
            icon: <Coffee size={20} />,
            title: 'High Workload Alert',
            text: `You're averaging ${dailyAvgHours.toFixed(1)} hours of focus daily. Don't forget to take breaks to prevent burnout.`
          });
        }

        // 3. Focus Quality
        const avgQuality = focusQualityData.length 
          ? Math.round(focusQualityData.reduce((acc, curr) => acc + curr.quality, 0) / focusQualityData.length)
          : 0;
          
        if (avgQuality > 0 && avgQuality < 70) {
          insights.push({
            type: 'warning',
            icon: <Focus size={20} />,
            title: 'Focus Quality Dropping',
            text: `Your focus quality is around ${avgQuality}%. Try minimizing distractions (like your phone) during timer sessions.`
          });
        } else if (avgQuality >= 90) {
          insights.push({
            type: 'success',
            icon: <Focus size={20} />,
            title: 'Laser Focus',
            text: `Outstanding ${avgQuality}% focus quality! You're clearly in the zone. Keep up this momentum.`
          });
        }

        // 4. Task Management
        if (pendingTasks > 10 && completionRate < 50) {
          insights.push({
            type: 'info',
            icon: <ListTodo size={20} />,
            title: 'Backlog Growing',
            text: `You have ${pendingTasks} pending tasks. Try the "2-Minute Rule": if it takes under 2 mins, do it now!`
          });
        }

        // 5. Streaks
        if (streakDays >= 3) {
          insights.push({
            type: 'success',
            icon: <Flame size={20} />,
            title: 'On Fire!',
            text: `You're on a ${streakDays}-day focus streak. Solid daily rhythm—don't break the chain!`
          });
        }

        // Default if none
        if (insights.length === 0) {
          insights.push({
            type: 'info',
            icon: <Activity size={20} />,
            title: 'Consistent Tracking',
            text: `Tracking your time is the first step to improving it. Keep logging sessions to unlock more insights.`
          });
        }

        const topInsights = insights.slice(0, 3);
        const spoken = `I've analyzed your recent activity! ` + topInsights.map(i => `${i.title}: ${i.text}`).join(' ') + ` You're doing great!`;

        setMessages(prev => [...prev, { role: 'bot', content: spoken, type: 'personalized_insights', data: { insights: topInsights } }]);
        
        setIsSpeaking(true);
        pendingOnSpeakEndRef.current = () => resetFlowState();
        speakText(stripEmoji(spoken), () => { 
          setIsSpeaking(false); 
          pendingOnSpeakEndRef.current = null; 
          resetFlowState(); 
        });
        setIsWorking(false);
      }, 800);
    } catch (err) {
      console.error(err);
      addBotMessage("I couldn't fetch your personalized insights right now.");
      setIsWorking(false);
      resetFlowState();
    }
  }, [getInsights, resetFlowState, addBotMessage]);

  // ── PROCRASTINATION ALERT ───────────────────────────────────────────────────
  const handleProcrastinationAlert = useCallback(() => {
    setIsWorking(true);
    setTimeout(() => {
      const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
      const now = new Date();
      
      const neglected = pending.filter(t => t.created_at).map(t => {
        const createdDate = new Date(t.created_at);
        const diffTime = Math.abs(now - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...t, daysAgo: diffDays };
      }).filter(t => t.daysAgo >= 3) // Only tasks older than 3 days
        .sort((a, b) => b.daysAgo - a.daysAgo)
        .slice(0, 5);

      const noMatch = neglected.length === 0;

      let spoken = noMatch
        ? "No neglected tasks found. You're staying on top of things! Anything else I can help with?"
        : `Here are tasks sitting the longest: ` + neglected.map((t, i) => `${i+1}. ${t.title} (${t.daysAgo} days ago)`).join(', ') + '. Anything else I can help with?';

      setMessages(prev => [...prev, { role: 'bot', content: spoken, type: 'procrastination_alert', data: { neglected, noMatch } }]);
      setIsSpeaking(true);
      pendingOnSpeakEndRef.current = () => resetFlowState();
      speakText(stripEmoji(spoken), () => { setIsSpeaking(false); pendingOnSpeakEndRef.current = null; resetFlowState(); });
      setIsWorking(false);
    }, 800);
  }, [tasks, resetFlowState]);

  // ── TASK MANAGEMENT FLOWS ───────────────────────────────────────────────────

  const startManageTasksFlow = useCallback((actionType = managementActionType) => {
    // For edit, delete, and priority changes, show both pending and in-progress tasks
    // For mark-done and move-to-in-progress, show only pending tasks
    const eligibleStatuses = ['edit_task', 'delete_task', 'change_priority'].includes(actionType) 
      ? ['pending', 'in_progress'] 
      : ['pending'];
    const availableTasks = tasks.filter(t => eligibleStatuses.includes(t.status));
    
    if (availableTasks.length === 0) {
      addBotMessage('You have no tasks to manage!');
      setTimeout(() => goToMenu('Anything else I can help with?'), 2000);
      return;
    }
    setFlowState('manage_task_select');
    let prompt = 'Which task would you like to update?';
    if (actionType === 'mark_done') {
      prompt = 'Which task would you like to mark done?';
    } else if (actionType === 'delete_task') {
      prompt = 'Which task would you like to delete?';
    } else if (actionType === 'shift_inprogress') {
      prompt = 'Which task would you like to move to in-progress?';
    } else if (actionType === 'edit_task') {
      prompt = 'Which task would you like to edit?';
    } else if (actionType === 'change_priority') {
      prompt = 'Which task would you like to change the priority for?';
    }
    addBotMessage(prompt);
  }, [tasks, addBotMessage, goToMenu, managementActionType]);

  const handleTaskSelected = useCallback((task) => {
    setSelectedTask(task);
    addUserMessage(task.title);
    
    if (managementActionType === 'mark_done') {
      // Ask for confirmation before marking done
      setFlowState('manage_task_confirm_complete');
      addBotMessage(`Are you sure you want to mark "${task.title}" as complete?`);
    } else if (managementActionType === 'delete_task') {
      // Ask for confirmation before deleting
      setFlowState('manage_task_delete_confirm');
      addBotMessage(`Delete "${task.title}"?`);
    } else if (managementActionType === 'shift_inprogress') {
      // Ask for confirmation before shifting
      setFlowState('manage_task_shift_confirm');
      addBotMessage(`Move "${task.title}" to in-progress?`);
    } else if (managementActionType === 'change_priority') {
      // Skip action select, go directly to priority selection
      setFlowState('manage_task_select_priority');
      addBotMessage('What should the new priority be?');
    } else if (managementActionType === 'edit_task') {
      // Show edit options
      setFlowState('manage_edit_task_select');
      addBotMessage(`What would you like to edit for "${task.title}"?`);
    } else {
      // Default: show action options
      setFlowState('manage_task_action');
      addBotMessage(`What would you like to do with "${task.title}"?`);
    }
  }, [managementActionType, addUserMessage, addBotMessage]);

  const handleConfirmCompleteTask = useCallback(async () => {
    if (!selectedTask) return;
    setIsWorking(true);
    try {
      await taskAPI.complete(selectedTask.task_id);
      await refreshTasks();
      toast.success('Task marked as done!');
      addSuccessMessage(`✓ "${selectedTask.title}" marked as complete!`);
      setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
    } catch (err) {
      toast.error('Failed to complete task');
      addBotMessage('Something went wrong. Want to try again?');
    } finally {
      setIsWorking(false);
    }
  }, [selectedTask, refreshTasks, addSuccessMessage, addBotMessage, goToMenu]);

  const handleChangePriority = useCallback((newPriority) => {
    if (!selectedTask) return;
    setIsWorking(true);
    addUserMessage(newPriority);
    setTimeout(async () => {
      try {
        await taskAPI.update(selectedTask.task_id, { priority: newPriority });
        await refreshTasks();
        toast.success('Priority updated!');
        addSuccessMessage(`"${selectedTask.title}" priority updated to ${newPriority}!`);
        setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
      } catch (err) {
        toast.error('Failed to update priority');
        addBotMessage('Something went wrong. Want to try again?');
      } finally {
        setIsWorking(false);
      }
    }, 300);
  }, [selectedTask, refreshTasks, addUserMessage, addSuccessMessage, addBotMessage, goToMenu]);

  const startManageRemindersFlow = useCallback(() => {
    const pendingReminders = (taskReminders || []).filter(r => !r.is_sent);
    if (pendingReminders.length === 0) {
      addBotMessage('You have no reminders.');
      setTimeout(() => goToMenu('Anything else I can help with?'), 2000);
      return;
    }
    setFlowState('manage_reminder_select');
    addBotMessage('Which reminder would you like to delete?');
  }, [taskReminders, addBotMessage, goToMenu]);

  const handleReminderSelected = useCallback((reminder) => {
    setSelectedReminder(reminder);
    addUserMessage(reminder.message);
    
    if (managementActionType === 'delete_reminder') {
      // Skip confirmation, go directly to asking yes/no
      addBotMessage(`Delete "${reminder.message}"?`);
      setFlowState('manage_reminder_confirm_delete');
    } else {
      addBotMessage(`Delete "${reminder.message}"?`);
      setFlowState('manage_reminder_confirm_delete');
    }
  }, [managementActionType, addUserMessage, addBotMessage]);

  const handleDeleteReminder = useCallback(async () => {
    if (!selectedReminder) return;
    setIsWorking(true);
    try {
      await reminderAPI.deleteOne(selectedReminder.reminder_id);
      await refreshReminders();
      toast.success('Reminder deleted!');
      addSuccessMessage(`✓ Reminder deleted!`);
      setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
    } catch (err) {
      toast.error('Failed to delete reminder');
      addBotMessage('Something went wrong. Want to try again?');
    } finally {
      setIsWorking(false);
    }
  }, [selectedReminder, refreshReminders, addSuccessMessage, addBotMessage, goToMenu]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;
    setIsWorking(true);
    try {
      await taskAPI.delete(selectedTask.task_id);
      await refreshTasks();
      toast.success('Task deleted!');
      addSuccessMessage(`✓ "${selectedTask.title}" deleted!`);
      setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
    } catch (err) {
      toast.error('Failed to delete task');
      addBotMessage('Something went wrong. Want to try again?');
    } finally {
      setIsWorking(false);
    }
  }, [selectedTask, refreshTasks, addSuccessMessage, addBotMessage, goToMenu]);

  const handleShiftToInProgress = useCallback(async () => {
    if (!selectedTask) return;
    setIsWorking(true);
    try {
      await taskAPI.update(selectedTask.task_id, { status: 'in_progress' });
      await refreshTasks();
      toast.success('Task moved to in-progress!');
      addSuccessMessage(`✓ "${selectedTask.title}" moved to in-progress!`);
      setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
    } catch (err) {
      toast.error('Failed to shift task');
      addBotMessage('Something went wrong. Want to try again?');
    } finally {
      setIsWorking(false);
    }
  }, [selectedTask, refreshTasks, addSuccessMessage, addBotMessage, goToMenu]);

  // ── Universal text input handler ────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleTextInput = useCallback((text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    const lowered = trimmed.toLowerCase();

    // Global: handle cancel/back at any point
    if (isNo(trimmed) && flowState !== 'menu' && flowState !== 'task_title' && flowState !== 'reminder_message') {
      addUserMessage(trimmed);
      goToMenu('No worries! Anything else I can help with?');
      return;
    }
    if (isBack(trimmed) && flowState !== 'menu') {
      addUserMessage(trimmed);
      const taskSteps = ['task_title', 'task_priority', 'task_category', 'task_duration', 'task_description', 'task_duedate', 'task_reminder_offset', 'task_confirm'];
      const reminderSteps = ['reminder_message', 'reminder_time', 'reminder_confirm'];
      const taskIdx = taskSteps.indexOf(flowState);
      const remIdx = reminderSteps.indexOf(flowState);
      if (taskIdx > 0) {
        const prevStep = taskSteps[taskIdx - 1];
        setFlowState(prevStep);
        if (prevStep === 'task_duedate') setShowDatetimeInput(true);
        addBotMessage(STEP_PROMPTS[prevStep] || 'Go ahead:');
      } else if (remIdx > 0) {
        const prevStep = reminderSteps[remIdx - 1];
        setFlowState(prevStep);
        addBotMessage(STEP_PROMPTS[prevStep] || 'Go ahead:');
      } else {
        goToMenu('No worries! Anything else I can help with?');
      }
      return;
    }

    switch (flowState) {
      case 'menu': {
        if (/manage\s*reminder/i.test(lowered) || similarity(lowered, 'manage reminders') > 0.7) {
          addUserMessage('Manage Reminders');
          setFlowState('manage_reminders_menu');
          addBotMessage('What would you like to do?');
        } else if (/manage|update|mark|complete|done|delete|remove|check\s*off/i.test(lowered) || similarity(lowered, 'manage tasks') > 0.7) {
          addUserMessage('Manage Tasks');
          setFlowState('manage_menu');
          addBotMessage('What would you like to do?');
        } else if (/insight|productivity|stat|how.*am.*i/i.test(lowered) || similarity(lowered, 'productivity insights') > 0.6) {
          addUserMessage('Productivity Insights');
          handleProductivityInsights();
        } else if (/personalized.*insight|personal.*insight|coach|tips/i.test(lowered) || similarity(lowered, 'personalized insights') > 0.7) {
          addUserMessage('Personalized Insights');
          handlePersonalizedInsights();
        } else if (/suggest|recommend|what.*work|free.*time|brain.*storm/i.test(lowered) || similarity(lowered, 'suggest task') > 0.7 || similarity(lowered, 'suggest a task') > 0.7 || similarity(lowered, 'what should i work on') > 0.7 || similarity(lowered, 'ai brainstorming') > 0.5) {
          addUserMessage('AI Brainstorming');
          setFlowState('ai_brainstorm_menu');
          addBotMessage('How can I help you strategize your tasks?');
        } else if (/task|add\s*a?\s*tas/i.test(lowered) || similarity(lowered, 'add a task') > 0.7 || similarity(lowered, 'add task') > 0.7 || similarity(lowered, 'new task') > 0.7 || similarity(lowered, 'create task') > 0.7) {
          addUserMessage('Add Task');
          startTaskFlow();
        } else if (/remind|set\s*a?\s*remind/i.test(lowered) || similarity(lowered, 'set reminder') > 0.7 || similarity(lowered, 'set a reminder') > 0.7 || similarity(lowered, 'new reminder') > 0.7) {
          addUserMessage('Set Reminder');
          startReminderFlow();
        } else if (/briefing|summary|agenda|what.?s\s*next/i.test(lowered) || similarity(lowered, 'get briefing') > 0.7) {
          addUserMessage('Get Briefing');
          setFlowState('briefing_type');
          addBotMessage('Would you like a daily, weekly, or monthly briefing?');
        } else if (/^(no|nope|nah|nothing|none|no\s*thanks|thank\s*you|thanks|bye|goodbye|that'?s\s*all|done|cancel)/i.test(lowered) || lowered.includes('thank you') || lowered.includes('bye')) {
          addUserMessage(trimmed);
          const closings = [
            "Alright, have a great day!",
            "No problem, I'm here if you need me.",
            "Sure thing! Catch you later.",
            "You got it. Bye for now!"
          ];
          const farewell = closings[Math.floor(Math.random() * closings.length)];
          addBotMessage(farewell, true);
          setTimeout(() => {
            setIsOpen(false);
            setVoiceMode(false);
            stopListening();
            window.speechSynthesis.cancel();
          }, 1500);
        } else {
          addUserMessage(trimmed);
          addBotMessage("I can help you add a task, set a reminder, manage tasks, manage reminders, get a briefing, or suggest a task. Pick an option:");
        }
        break;
      }

      case 'ai_brainstorm_menu': {
        addUserMessage(trimmed);
        if (/free.*time|suggest.*time|by.*time|time/i.test(lowered) || similarity(lowered, 'suggest by free time') > 0.6) {
          setFlowState('suggest_time');
          addBotMessage('How much free time do you have?');
        } else if (/urgent|most.*urgent|critical|important/i.test(lowered) || similarity(lowered, "see most urgent tasks") > 0.6) {
          handleMostUrgent();
        } else if (/plan|my.*day|schedule|today/i.test(lowered) || similarity(lowered, 'plan my day') > 0.6) {
          handlePlanMyDay();
        } else if (/procrastination|alert|neglect|old.*task/i.test(lowered) || similarity(lowered, 'procrastination alert') > 0.6) {
          handleProcrastinationAlert();
        } else if (/personalized.*insight|personal.*insight|coach|tips/i.test(lowered) || similarity(lowered, 'personalized insights') > 0.7) {
          handlePersonalizedInsights();
        } else {
          addBotMessage('Pick an option: Suggest by Free Time, See most urgent tasks, Plan My Day, Procrastination Alert, or Personalized Insights.');
        }
        break;
      }

      case 'productivity_insights_charts': {
        // The detailed chart data is temporarily stored in taskDraft
        const displayChart = (chartType, chartTitle) => {
           addUserMessage(trimmed);
           const spoken = `Here is your ${chartTitle} chart.`;
           setMessages(prev => [...prev, { role: 'bot', content: spoken, type: 'insight_chart', data: { chartType, chartData: Object.keys(taskDraft).length > 0 ? taskDraft : null, title: chartTitle } }]);
           setIsSpeaking(true);
           speakText(spoken, () => setIsSpeaking(false));
           // KEEP flow state in 'productivity_insights_charts' so they can view another chart
        };

        if (/^(no|nope|nah|nothing|none|no\s*thanks|thank\s*you|thanks|back|cancel|exit|done)/i.test(lowered)) {
          addUserMessage(trimmed);
          addBotMessage('Alright. Is there anything else I can help you with?');
          resetFlowState();
        } else if (/task.*completion/i.test(lowered) || similarity(lowered, 'task completion trend') > 0.6) {
          displayChart('task_completion', 'Task Completion Trend');
        } else if (/time.*priority/i.test(lowered) || similarity(lowered, 'time by priority') > 0.6) {
          displayChart('time_priority', 'Time by Priority');
        } else if (/tasks.*priority/i.test(lowered) || similarity(lowered, 'tasks by priority') > 0.6) {
          displayChart('tasks_priority', 'Tasks by Priority');
        } else if (/completion.*status/i.test(lowered) || similarity(lowered, 'completion status') > 0.6) {
          displayChart('completion_status', 'Completion Status');
        } else if (/time.*project/i.test(lowered) || similarity(lowered, 'time spent per project') > 0.6) {
          displayChart('time_project', 'Time Spent Per Project');
        } else if (/productivity.*hour/i.test(lowered) || similarity(lowered, 'productivity by hour') > 0.6) {
          displayChart('productivity_hour', 'Productivity by Hour');
        } else if (/focus.*day/i.test(lowered) || similarity(lowered, 'focus by day') > 0.6) {
          displayChart('focus_day', 'Focus by Day');
        } else if (/quality/i.test(lowered) || similarity(lowered, 'focus quality score') > 0.6) {
          displayChart('focus_quality', 'Focus Quality Score');
        } else if (/heatmap|activity.*heat/i.test(lowered) || similarity(lowered, 'activity heatmap') > 0.6) {
          displayChart('activity_heatmap', 'Activity Heatmap');
        } else if (/estimated|estimate.*actual|est.*vs/i.test(lowered) || similarity(lowered, 'estimated vs actual time') > 0.6) {
          displayChart('estimated_vs_actual', 'Estimated vs Actual Time');
        } else if (/burndown|burn.*down/i.test(lowered) || similarity(lowered, 'burndown chart') > 0.6) {
          displayChart('burndown', 'Burndown Chart');
        } else {
          addUserMessage(trimmed);
          addBotMessage("Please choose a chart: Task Completion Trend, Time by Priority, Tasks by Priority, Completion Status, Time Spent Per Project, Productivity by Hour, Focus by Day, Focus Quality Score, Activity Heatmap, Estimated vs Actual Time, or Burndown Chart. Or say 'back' to exit.");
        }
        break;
      }

      case 'suggest_time': {
        addUserMessage(trimmed);
        if (/15/i.test(lowered) || /fifteen/i.test(lowered)) {
          handleSuggestTask(15, '15 minutes');
        } else if (/30|half.*hour|thirty/i.test(lowered)) {
          handleSuggestTask(30, '30 minutes');
        } else if (/1\s*h|one.*hour|60.*min|an.*hour/i.test(lowered)) {
          handleSuggestTask(60, '1 hour');
        } else if (/2.*h|two.*hour|120/i.test(lowered)) {
          handleSuggestTask(120, '2+ hours');
        } else {
          // Try parsing a custom duration
          const parsed = parseDuration(trimmed);
          if (parsed) {
            const mins = durationToMinutes(parsed);
            handleSuggestTask(mins, parsed);
          } else {
            addBotMessage('Please pick a time window: 15 min, 30 min, 1 hour, or 2+ hours.');
          }
        }
        break;
      }

      case 'manage_menu': {
        if (/mark|complete|done|check|finish/i.test(lowered)) {
          addUserMessage('Mark Task as Done');
          setManagementActionType('mark_done');
          startManageTasksFlow('mark_done');
        } else if (/delete.*task|remove.*task/i.test(lowered)) {
          addUserMessage('Delete Task');
          setManagementActionType('delete_task');
          startManageTasksFlow('delete_task');
        } else if (/shift|move|progress|in.progress/i.test(lowered)) {
          addUserMessage('Move to In Progress');
          setManagementActionType('shift_inprogress');
          startManageTasksFlow('shift_inprogress');
        } else if (/edit|update|change|modify/i.test(lowered)) {
          addUserMessage('Edit Task');
          setManagementActionType('edit_task');
          startManageTasksFlow('edit_task');
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No problem! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('You can mark a task as done, delete a task, shift to in-progress, or edit a task. Pick an option:');
        }
        break;
      }

      case 'manage_reminders_menu': {
        if (/view|list|show|all/i.test(lowered)) {
          addUserMessage('View Reminders');
          hasCalledGoToMenuRef.current = false; // Reset guard for this action
          const allReminders = (taskReminders || []).sort((a, b) => new Date(b.reminder_time) - new Date(a.reminder_time));
          if (allReminders.length === 0) {
            addBotMessage('You have no reminders.');
            setTimeout(() => { hasCalledGoToMenuRef.current = false; goToMenu('Need anything else?'); }, 2000);
          } else {
            const reminderList = allReminders.map((r, idx) => {
              const reminderDate = new Date(r.reminder_time);
              const timeStr = reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + reminderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const isSent = r.is_sent ? '✓' : '';
              return `${idx + 1}. ${r.message}\n   ${timeStr} ${isSent}`;
            }).join('\n');
            addBotMessage(`Here are your reminders:\n\n${reminderList}`, true, () => goToMenu('Need anything else?'));
          }
        } else if (/delete|remove/i.test(lowered)) {
          addUserMessage('Delete Reminder');
          setManagementActionType('delete_reminder');
          addBotMessage('Which reminder would you like to delete?');
          setFlowState('manage_reminders_select');
        } else if (/edit|update|change|modify/i.test(lowered)) {
          addUserMessage('Edit Reminder');
          setManagementActionType('edit_reminder');
          addBotMessage('Which reminder would you like to edit?');
          setFlowState('manage_reminders_select');
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No problem! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('You can view all reminders, delete a reminder, or edit a reminder. Pick an option:');
        }
        break;
      }

      case 'manage_reminders_select': {
        // User selected a reminder from the list
        const allReminders = (taskReminders || []).sort((a, b) => new Date(b.reminder_time) - new Date(a.reminder_time));
        const userInputLower = trimmed.toLowerCase();
        
        // Improved matching: try exact, fuzzy, then word-based matching
        let matchedReminder = allReminders.find(r => 
          similarity(userInputLower, r.message.toLowerCase()) > 0.65 || 
          userInputLower.includes(r.message.toLowerCase())
        );
        
        // If no match found, try word-based matching
        if (!matchedReminder) {
          const userWords = userInputLower.split(/\s+/).filter(w => w.length > 2); // words > 2 chars
          let bestMatch = null, bestScore = 0;
          
          for (const reminder of allReminders) {
            const reminderWords = reminder.message.toLowerCase().split(/\s+/);
            let matchedWords = 0;
            
            // Count how many user words appear in reminder message
            for (const userWord of userWords) {
              for (const remWord of reminderWords) {
                if (userWord === remWord || remWord.includes(userWord) || userWord.includes(remWord)) {
                  matchedWords++;
                  break;
                }
              }
            }
            
            const matchScore = matchedWords / Math.max(userWords.length, reminderWords.length);
            
            if (matchScore > bestScore && matchedWords >= 2) { // At least 2 words should match
              bestScore = matchScore;
              bestMatch = reminder;
            }
          }
          
          if (bestMatch && bestScore > 0.3) {
            matchedReminder = bestMatch;
          }
        }
        
        if (matchedReminder) {
          setSelectedReminder(matchedReminder);
          addUserMessage(matchedReminder.message);
          if (managementActionType === 'delete_reminder') {
            setFlowState('manage_reminder_confirm');
            addBotMessage(`Are you sure you want to delete "${matchedReminder.message}"?`);
          } else if (managementActionType === 'edit_reminder') {
            setFlowState('manage_reminder_edit_time');
            addBotMessage(`Current reminder time: ${new Date(matchedReminder.reminder_time).toLocaleString()}\n\nWhat time would you like to set it to?`);
          }
        } else {
          addUserMessage(trimmed);
          if (allReminders.length === 0) {
            addBotMessage('You have no reminders.');
            setTimeout(() => goToMenu('Anything else I can help with?'), 2000);
          } else {
            const remainingList = allReminders.map(r => `• "${r.message}" at ${new Date(r.reminder_time).toLocaleString()}`).join('\n');
            addBotMessage(`Here are your reminders:\n\n${remainingList}`);
          }
        }
        break;
      }

      case 'manage_reminder_confirm': {
        if (isYes(lowered)) {
          addUserMessage('Yes, delete it');
          setIsWorking(true);
          reminderAPI.deleteOne(selectedReminder.reminder_id)
            .then(() => {
              refreshReminders();
              toast.success('Reminder deleted!');
              addSuccessMessage(`✓ Reminder "${selectedReminder.message}" deleted!`);
              setSelectedReminder(null);
              setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
            })
            .catch(() => {
              toast.error('Failed to delete reminder');
              addBotMessage('Something went wrong. Want to try again?');
            })
            .finally(() => setIsWorking(false));
        } else if (isNo(lowered)) {
          addUserMessage('Never mind');
          goToMenu('No problem! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Say "yes" to confirm or "no" to cancel.');
        }
        break;
      }

      case 'manage_reminder_edit_time': {
        // Check if user wants to cancel
        if (isCancel(lowered)) {
          addUserMessage('Cancel');
          setSelectedReminder(null);
          setTimeout(() => goToMenu('Anything else I can help with?'), 1500);
          break;
        }
        
        // Try to parse as full date first (e.g., "March 31", "tomorrow at 3pm")
        let parsedDate = parseNaturalDate(trimmed);
        
        if (parsedDate) {
          // Full date was parsed successfully
          const newReminderTime = parsedDate.toISOString();
          addUserMessage(trimmed);
          setIsWorking(true);
          reminderAPI.update(selectedReminder.reminder_id, { reminder_time: newReminderTime })
            .then(() => {
              refreshReminders();
              toast.success('Reminder updated!');
              addSuccessMessage(`✓ Reminder time changed to ${new Date(newReminderTime).toLocaleString()}!`);
              setSelectedReminder(null);
              setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
            })
            .catch(() => {
              toast.error('Failed to update reminder');
              addBotMessage('Something went wrong. Want to try again?');
            })
            .finally(() => setIsWorking(false));
        } else {
          // Fall back to time-only parsing
          const timeMatch = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?|[ap]m)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            let minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const period = timeMatch[3] ? timeMatch[3].toLowerCase().replace(/\./g, '') : null;
            
            if (hours > 23) {
              addUserMessage(trimmed);
              addBotMessage('That hour is invalid. Please use 0-23 for 24-hour format, or include AM/PM.');
            } else {
              if (period && (period === 'pm' || period === 'p')) {
                if (hours !== 12) hours += 12;
              } else if (period && (period === 'am' || period === 'a')) {
                if (hours === 12) hours = 0;
              }
              
              // Use today's date with new time
              const today = new Date();
              const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0);
              const newReminderTime = localDate.toISOString();
              
              addUserMessage(trimmed);
              setIsWorking(true);
              reminderAPI.update(selectedReminder.reminder_id, { reminder_time: newReminderTime })
                .then(() => {
                  refreshReminders();
                  toast.success('Reminder updated!');
                  addSuccessMessage(`✓ Reminder time changed to ${new Date(newReminderTime).toLocaleString()}!`);
                  setSelectedReminder(null);
                  setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
                })
                .catch(() => {
                  toast.error('Failed to update reminder');
                  addBotMessage('Something went wrong. Want to try again?');
                })
                .finally(() => setIsWorking(false));
            }
          } else {
            addUserMessage(trimmed);
            addBotMessage('I couldn\'t understand that time. Please use formats like "March 31", "tomorrow at 3pm", "3:30 PM", or "15:30". Or say "cancel" to go back.');
          }
        }
        break;
      }

      case 'manage_task_select': {
        // User selected a task from the list
        // For edit, delete, and priority changes, include both pending and in-progress tasks
        // For mark-done and move-to-in-progress, only pending tasks
        const eligibleStatuses = ['edit_task', 'delete_task', 'change_priority'].includes(managementActionType)
          ? ['pending', 'in_progress']
          : ['pending'];
        const availableTasks = tasks.filter(t => eligibleStatuses.includes(t.status));
        let selectedTaskFromInput = null;
        
        // Remove common articles for better matching
        const cleanedInput = lowered.replace(/\b(the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();
        
        // Try exact match first
        selectedTaskFromInput = availableTasks.find(t => {
          const cleanedTitle = t.title.toLowerCase().replace(/\b(the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();
          return cleanedTitle === cleanedInput || 
                 lowered.includes(t.title.toLowerCase()) || 
                 t.title.toLowerCase().includes(lowered);
        });
        
        // Try fuzzy matching if exact match failed
        if (!selectedTaskFromInput) {
          let bestMatch = null, bestScore = 0;
          for (const task of availableTasks) {
            const score = similarity(cleanedInput, task.title.toLowerCase().replace(/\b(the|a|an)\b/g, '').replace(/\s+/g, ' ').trim());
            if (score > bestScore) { bestScore = score; bestMatch = task; }
          }
          if (bestMatch && bestScore >= 0.65) {
            selectedTaskFromInput = bestMatch;
          }
        }
        
        // Try word-based matching if fuzzy match failed
        if (!selectedTaskFromInput) {
          const userWords = cleanedInput.split(/\s+/).filter(w => w.length > 2); // words > 2 chars
          let bestMatch = null, bestScore = 0;
          
          for (const task of availableTasks) {
            const taskWords = task.title.toLowerCase().replace(/\b(the|a|an)\b/g, '').split(/\s+/);
            let matchedWords = 0;
            
            // Count how many user words appear in task title
            for (const userWord of userWords) {
              for (const taskWord of taskWords) {
                if (userWord === taskWord || taskWord.includes(userWord) || userWord.includes(taskWord)) {
                  matchedWords++;
                  break;
                }
              }
            }
            
            const matchScore = matchedWords / Math.max(userWords.length, taskWords.length);
            
            if (matchScore > bestScore && matchedWords >= 2) { // At least 2 words should match
              bestScore = matchScore;
              bestMatch = task;
            }
          }
          
          if (bestMatch && bestScore > 0.3) {
            selectedTaskFromInput = bestMatch;
          }
        }
        
        if (selectedTaskFromInput) {
          handleTaskSelected(selectedTaskFromInput);
        } else {
          addUserMessage(trimmed);
          addBotMessage('Task not found. Please select from the list or say "cancel".');
        }
        break;
      }

      case 'manage_task_action': {
        if (/mark|complete|done|check|finish/i.test(lowered)) {
          addUserMessage('Mark Done');
          setFlowState('manage_task_confirm_complete');
          addBotMessage(`Are you sure you want to mark "${selectedTask?.title || 'this task'}" as complete?`);
        } else if (/chang.*priority|priority/i.test(lowered) || similarity(lowered, 'change priority') > 0.7) {
          addUserMessage('Change Priority');
          setFlowState('manage_task_select_priority');
          addBotMessage('What should the new priority be?');
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No problem! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Say "mark done" to complete this task, "change priority" to update it, or "cancel" to go back.');
        }
        break;
      }

      case 'manage_task_select_priority': {
        const p = lowered.includes('high') ? 'High'
          : (lowered.includes('med') || lowered.includes('mid')) ? 'Medium'
          : lowered.includes('low') ? 'Low' : null;
        if (p) {
          addUserMessage(p);
          handleChangePriority(p);
        } else { 
          addUserMessage(trimmed); 
          addBotMessage('Please choose High, Medium, or Low priority.'); 
        }
        break;
      }

      case 'manage_task_action_priority': {
        // Similar to manage_task_action but for priority changes
        if (/chang.*priority|priority/i.test(lowered) || similarity(lowered, 'change priority') > 0.7) {
          setFlowState('manage_task_select_priority');
          addBotMessage('What should the new priority be?');
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No problem! Anything else I can help with?');
        }
        break;
      }

      case 'manage_reminder_select': {
        // User selected a reminder from the list
        const pendingReminders = (taskReminders || []).filter(r => !r.is_sent);
        let selectedReminderFromInput = null;
        
        // Remove common articles for better matching
        const cleanedInput = lowered.replace(/\b(the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();
        
        // Try exact match
        selectedReminderFromInput = pendingReminders.find(r => {
          const cleanedMsg = r.message.toLowerCase().replace(/\b(the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();
          return cleanedMsg === cleanedInput ||
                 lowered.includes(r.message.toLowerCase()) || 
                 r.message.toLowerCase().includes(lowered);
        });
        
        // Try fuzzy matching if exact match failed
        if (!selectedReminderFromInput) {
          let bestMatch = null, bestScore = 0;
          for (const reminder of pendingReminders) {
            const score = similarity(cleanedInput, reminder.message.toLowerCase().replace(/\b(the|a|an)\b/g, '').replace(/\s+/g, ' ').trim());
            if (score > bestScore) { bestScore = score; bestMatch = reminder; }
          }
          if (bestMatch && bestScore >= 0.65) {
            selectedReminderFromInput = bestMatch;
          }
        }
        
        // Try word-based matching if fuzzy match failed
        if (!selectedReminderFromInput) {
          const userWords = cleanedInput.split(/\s+/).filter(w => w.length > 2); // words > 2 chars
          let bestMatch = null, bestScore = 0;
          
          for (const reminder of pendingReminders) {
            const reminderWords = reminder.message.toLowerCase().replace(/\b(the|a|an)\b/g, '').split(/\s+/);
            let matchedWords = 0;
            
            // Count how many user words appear in reminder message
            for (const userWord of userWords) {
              for (const reminderWord of reminderWords) {
                if (userWord === reminderWord || reminderWord.includes(userWord) || userWord.includes(reminderWord)) {
                  matchedWords++;
                  break;
                }
              }
            }
            
            const matchScore = matchedWords / Math.max(userWords.length, reminderWords.length);
            
            if (matchScore > bestScore && matchedWords >= 2) { // At least 2 words should match
              bestScore = matchScore;
              bestMatch = reminder;
            }
          }
          
          if (bestMatch && bestScore > 0.3) {
            selectedReminderFromInput = bestMatch;
          }
        }
        
        if (selectedReminderFromInput) {
          handleReminderSelected(selectedReminderFromInput);
        } else {
          addUserMessage(trimmed);
          addBotMessage('Reminder not found. Please select from the list or say "cancel".');
        }
        break;
      }

      case 'manage_task_confirm_complete': {
        if (isYes(lowered)) {
          addUserMessage('Yes');
          handleConfirmCompleteTask();
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          setFlowState('manage_task_select');
          addBotMessage('Which task would you like to mark done?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Please say yes to confirm or no to cancel.');
        }
        break;
      }

      case 'manage_reminder_confirm_delete': {
        if (isYes(lowered)) {
          addUserMessage('Yes, delete it');
          handleDeleteReminder();
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No problem! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Please say yes to delete or no to cancel.');
        }
        break;
      }

      case 'manage_task_delete_confirm': {
        if (isYes(lowered)) {
          addUserMessage('Yes, delete it');
          handleDeleteTask();
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No problem! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Please say yes to delete or no to cancel.');
        }
        break;
      }

      case 'manage_task_shift_confirm': {
        if (isYes(lowered)) {
          addUserMessage('Yes, move it');
          handleShiftToInProgress();
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No problem! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Please say yes to move or no to cancel.');
        }
        break;
      }

      case 'manage_edit_task_select': {
        const priority = (/chang.*priority|priority/i.test(lowered) || similarity(lowered, 'change priority') > 0.7);
        const title = (/chang.*title|title|name/i.test(lowered) || similarity(lowered, 'change title') > 0.7);
        const desc = (/chang.*description|description|details/i.test(lowered) || similarity(lowered, 'change description') > 0.7);
        const cat = (/chang.*category|category/i.test(lowered) || similarity(lowered, 'change category') > 0.7);
        const duedate = (/chang.*due.*date|due.*date|date.*deadline/i.test(lowered) || similarity(lowered, 'change due date') > 0.7);
        const time = (/chang.*due.*time|due.*time|what time/i.test(lowered) || similarity(lowered, 'change due time') > 0.7);
        const duration = (/chang.*duration|duration|how long|length/i.test(lowered) || similarity(lowered, 'change duration') > 0.7);
        const reminder = (/chang.*reminder|add.*reminder|reminder|alert/i.test(lowered) || similarity(lowered, 'add reminder') > 0.7);

        if (priority) {
          addUserMessage('Change priority');
          setFlowState('manage_task_select_priority');
          addBotMessage('What should the new priority be?');
        } else if (title) {
          addUserMessage('Change title');
          setFlowState('manage_edit_title');
          addBotMessage('What would you like to change the title to?');
        } else if (desc) {
          addUserMessage('Change description');
          setFlowState('manage_edit_description');
          addBotMessage('What should the new description be?');
        } else if (cat) {
          addUserMessage('Change category');
          setFlowState('manage_edit_category');
          addBotMessage('What category would you like to change it to?');
        } else if (duedate) {
          addUserMessage('Change due date');
          setFlowState('manage_edit_duedate');
          addBotMessage('What date should this task be due?');
        } else if (time) {
          addUserMessage('Change due time');
          setFlowState('manage_edit_time');
          addBotMessage('What time should this task be due? (e.g., "3:30 PM", "15:30", "3pm")');
        } else if (duration) {
          addUserMessage('Change duration');
          setFlowState('manage_edit_duration');
          addBotMessage('How long will this task take?');
        } else if (reminder) {
          addUserMessage('Add/Change reminder');
          setSettingTaskReminder(true);
          const taskReminderMessage = `Task due soon: ${selectedTask.title}`;
          setReminderDraft({ message: taskReminderMessage });
          setFlowState('reminder_time');
          addBotMessage('How many minutes before the due date/time do you want to be reminded? (e.g., "10 minutes", "30 minutes", "1 hour")');
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No problem! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('You can change priority, title, description, category, due date, due time, duration, or add a reminder. What would you like to edit?');
        }
        break;
      }

      case 'manage_edit_title': {
        addUserMessage(trimmed);
        const updates = { title: trimmed };
        setIsWorking(true);
        taskAPI.update(selectedTask.task_id, updates).then(() => {
          refreshTasks();
          toast.success('Title updated!');
          addSuccessMessage(`✓ Title changed to "${trimmed}"!`);
          setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
        }).catch(() => {
          toast.error('Failed to update title');
          addBotMessage('Something went wrong. Want to try again?');
        }).finally(() => {
          setIsWorking(false);
        });
        break;
      }

      case 'manage_edit_description': {
        addUserMessage(trimmed);
        const updates = { description: trimmed };
        setIsWorking(true);
        taskAPI.update(selectedTask.task_id, updates).then(() => {
          refreshTasks();
          toast.success('Description updated!');
          addSuccessMessage(`✓ Description updated!`);
          setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
        }).catch(() => {
          toast.error('Failed to update description');
          addBotMessage('Something went wrong. Want to try again?');
        }).finally(() => {
          setIsWorking(false);
        });
        break;
      }

      case 'manage_edit_category': {
        addUserMessage(trimmed);
        const catMatch = categories.find(c => c.toLowerCase().includes(lowered) || lowered.includes(c.toLowerCase()));
        if (catMatch) {
          const updates = { category: catMatch };
          setIsWorking(true);
          taskAPI.update(selectedTask.task_id, updates).then(() => {
            refreshTasks();
            toast.success('Category updated!');
            addSuccessMessage(`✓ Category changed to "${catMatch}"!`);
            setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
          }).catch(() => {
            toast.error('Failed to update category');
            addBotMessage('Something went wrong. Want to try again?');
          }).finally(() => {
            setIsWorking(false);
          });
        } else {
          addBotMessage(`Category "${trimmed}" not found. Available categories: ${categories.join(', ')}`);
        }
        break;
      }

      case 'manage_edit_duedate': {
        // Comprehensive date parsing
        let dateStr = trimmed;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const formatLocalDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        if (/^today$/i.test(trimmed)) {
          dateStr = formatLocalDate(today);
        } else if (/^tomorrow$/i.test(trimmed)) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dateStr = formatLocalDate(tomorrow);
        } else if (/^next\s*week$/i.test(trimmed)) {
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          dateStr = formatLocalDate(nextWeek);
        } else {
          // Try parsing natural language dates
          const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
                          january: 0, february: 1, march: 2, april: 3, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
          
          let parsedDate = null;
          
          // Pattern: "14th march 2026", "14 march 2026", "march 14 2026", "march 14th 2026"
          const naturalMatch = trimmed.match(/(?:(\d{1,2})\s*(?:st|nd|rd|th)?\s*)?([a-z]+)\s*(?:(\d{1,2})\s*(?:st|nd|rd|th)?\s*)?(?:,?\s*(\d{4}))?/i);
          if (naturalMatch) {
            const rawDay = naturalMatch[1] || naturalMatch[3];
            const day = rawDay ? parseInt(rawDay) : null;
            const monthStr = naturalMatch[2];
            const rawYear = naturalMatch[4];
            const year = rawYear ? parseInt(rawYear) : new Date().getFullYear();
            const monthNum = months[monthStr.toLowerCase().substring(0, 3)] ?? months[monthStr.toLowerCase()];
            
            if (day && monthNum !== undefined && year) {
              parsedDate = new Date(year, monthNum, day);
            }
          }
          
          // Pattern: "14/03/2026" or "03/14/2026" or "14-03-2026" or "03-14-2026"
          if (!parsedDate) {
            const slashMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (slashMatch) {
              const year = parseInt(slashMatch[3]);
              let month = parseInt(slashMatch[2]) - 1;
              let day = parseInt(slashMatch[1]);
              // If day > 12, assume first format is day, otherwise try to detect
              if (day > 12) {
                parsedDate = new Date(year, month, day);
              } else if (month > 11) {
                parsedDate = new Date(year, parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
              } else {
                // Ambiguous - assume DD/MM/YYYY
                parsedDate = new Date(year, month, day);
              }
            }
          }
          
          // Pattern: "2026-03-14" (YYYY-MM-DD)
          if (!parsedDate && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            parsedDate = new Date(trimmed + 'T00:00:00');
          }
          
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            // Format as YYYY-MM-DD using local date to avoid timezone shifts
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
          } else {
            addBotMessage('I couldn\'t understand that date. Try: "today", "tomorrow", "14th march 2026", "march 14 2026", "14/03/2026", or "2026-03-14".');
            break;
          }
        }
        
        addUserMessage(trimmed);
        const updates = { due_date: dateStr };
        setIsWorking(true);
        taskAPI.update(selectedTask.task_id, updates).then(() => {
          refreshTasks();
          toast.success('Due date updated!');
          addSuccessMessage(`✓ Due date changed to ${dateStr}!`);
          setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
        }).catch(() => {
          toast.error('Failed to update due date');
          addBotMessage('Something went wrong. Want to try again?');
        }).finally(() => {
          setIsWorking(false);
        });
        break;
      }

      case 'manage_edit_duration': {
        // Sanitize input - remove profanity and unnecessary words
        const profanityList = /\b(damn|hell|crap|shit|fuck|ass|bastard|bitch|dick|prick)\b/gi;
        const cleanedInput = trimmed.replace(profanityList, '').trim();
        
        // Extract duration-relevant parts only (numbers + time units)
        const durationRegex = /(\d+[\s]*(second|minute|hour|day|week|month|year|sec|min|hr|day|week)s?)/gi;
        const matches = cleanedInput.match(durationRegex);
        const finalDuration = matches ? matches.join(', ') : cleanedInput;
        
        addUserMessage(trimmed);
        const updates = { duration: finalDuration };
        setIsWorking(true);
        taskAPI.update(selectedTask.task_id, updates).then(() => {
          refreshTasks();
          toast.success('Duration updated!');
          addSuccessMessage(`✓ Duration changed to "${finalDuration}"!`);
          setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
        }).catch(() => {
          toast.error('Failed to update duration');
          addBotMessage('Something went wrong. Want to try again?');
        }).finally(() => {
          setIsWorking(false);
        });
        break;
      }

      case 'manage_edit_time': {
        // Parse time input - handles formats like "10:00 am", "10:00 a.m.", "3:30 PM", "15:30"
        const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?|[ap]m)?/i;
        const match = trimmed.match(timeRegex);
        if (!match) {
          addUserMessage(trimmed);
          addBotMessage('I couldn\'t understand that time. Please use formats like "3:30 PM", "15:30", or "3pm".');
          break;
        }
        
        addUserMessage(trimmed);
        let hours = parseInt(match[1]);
        let minutes = match[2] ? parseInt(match[2]) : 0;
        const period = match[3] ? match[3].toLowerCase().replace(/\./g, '') : null; // Remove dots from period
        
        // Convert to 24-hour format if AM/PM provided
        if (period && (period === 'pm' || period === 'p')) {
          if (hours !== 12) {
            hours += 12;
          }
        } else if (period && (period === 'am' || period === 'a')) {
          if (hours === 12) {
            hours = 0;
          }
        }
        
        // Extract date from due_date string without timezone conversion
        let year, month, day;
        if (selectedTask.due_date) {
          // Parse ISO date format: "2026-03-31T..." or "2026-03-31"
          const dateMatch = selectedTask.due_date.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            year = parseInt(dateMatch[1]);
            month = parseInt(dateMatch[2]);
            day = parseInt(dateMatch[3]);
          } else {
            const today = new Date();
            year = today.getFullYear();
            month = today.getMonth() + 1;
            day = today.getDate();
          }
        } else {
          const today = new Date();
          year = today.getFullYear();
          month = today.getMonth() + 1;
          day = today.getDate();
        }
        
        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        // Create a local datetime and convert to UTC for storage
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);
        const utcHours = localDate.getUTCHours();
        const utcMinutes = localDate.getUTCMinutes();
        const utcDateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}:00`;
        
        const updates = { due_date: utcDateTimeStr };
        setIsWorking(true);
        taskAPI.update(selectedTask.task_id, updates).then(() => {
          refreshTasks();
          toast.success('Time updated!');
          addSuccessMessage(`✓ Time changed to ${timeStr}!`);
          setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
        }).catch(() => {
          toast.error('Failed to update time');
          addBotMessage('Something went wrong. Want to try again?');
        }).finally(() => {
          setIsWorking(false);
        });
        break;
      }

      case 'manage_edit_reminder': {
        // Start the reminder flow for the selected task with pre-filled message
        setSettingTaskReminder(true);
        const taskReminderMessage = `Task due soon: ${selectedTask.title}`;
        setReminderDraft({ message: taskReminderMessage });
        setFlowState('reminder_time');
        addUserMessage('Add/Change reminder');
        addBotMessage('How many minutes before the due date/time do you want to be reminded? (e.g., "10 minutes", "30 minutes", "1 hour")');
        break;
      }

      case 'manage_edit_category_custom': {
        addUserMessage(trimmed);
        const updates = { category: trimmed };
        setIsWorking(true);
        taskAPI.update(selectedTask.task_id, updates).then(() => {
          refreshTasks();
          toast.success('Category updated!');
          addSuccessMessage(`✓ Category changed to "${trimmed}"!`);
          setTimeout(() => goToMenu('Anything else I can help with?'), 2500);
        }).catch(() => {
          toast.error('Failed to update category');
          addBotMessage('Something went wrong. Want to try again?');
        }).finally(() => {
          setIsWorking(false);
        });
        break;
      }

      case 'briefing_type': {
        if (/day|daily|today/.test(lowered)) {
          addUserMessage('Daily');
          handleBriefingRequest('daily');
        } else if (/week/.test(lowered)) {
          addUserMessage('Weekly');
          handleBriefingRequest('weekly');
        } else if (/month/.test(lowered)) {
          addUserMessage('Monthly');
          handleBriefingRequest('monthly');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Please say daily, weekly, or monthly.');
        }
        break;
      }

      case 'briefing_detailed_prompt': {
        if (isYes(lowered)) {
          addUserMessage('Yes please');
          handleDetailedBriefing();
        } else if (isNo(lowered)) {
          addUserMessage('No thanks');
          goToMenu('Okay! Anything else I can help with?');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Please say yes for a full breakdown, or no to skip.');
        }
        break;
      }

      case 'task_title':
        handleTaskTitle(trimmed);
        break;

      case 'task_priority': {
        const p = lowered.includes('high') ? 'High'
          : (lowered.includes('med') || lowered.includes('mid')) ? 'Medium'
          : lowered.includes('low') ? 'Low' : null;
        if (p) handleTaskPriority(p);
        else { addUserMessage(trimmed); addBotMessage('Say High, Medium, or Low — or tap an option:'); }
        break;
      }

      case 'task_category': {
        if (isSkip(lowered)) { handleTaskCategory(categories[0] || 'Client Work'); break; }
        // Try exact match, then partial, then fuzzy
        const exact = categories.find((c) => c.toLowerCase() === lowered);
        if (exact) { handleTaskCategory(exact); break; }
        const partial = categories.find((c) => lowered.includes(c.toLowerCase()) || c.toLowerCase().includes(lowered));
        if (partial) { handleTaskCategory(partial); break; }
        // Fuzzy match: handle typos like "bell" → "bills", "bill and utilities" → "Bills & utilities"
        let bestMatch = null, bestScore = 0;
        for (const cat of categories) {
          const score = similarity(lowered, cat);
          if (score > bestScore) { bestScore = score; bestMatch = cat; }
        }
        if (bestMatch && bestScore >= 0.6) {
          handleTaskCategory(bestMatch);
        } else {
          addUserMessage(trimmed);
          addBotMessage(`No matching category. Tap "+ New" to create one, or pick from the list.`);
        }
        break;
      }

      case 'task_duration': {
        if (isSkip(lowered)) { handleTaskDuration('skip'); break; }
        const dur = parseDuration(trimmed);
        if (dur) handleTaskDuration(dur);
        else {
          const opt = DURATION_OPTIONS.find((o) => lowered === o.value || lowered === o.label.toLowerCase());
          if (opt) handleTaskDuration(opt.value);
          else { addUserMessage(trimmed); addBotMessage('Try something like "30m", "2h", or "45 minutes". Or tap an option:'); }
        }
        break;
      }

      case 'task_description':
        handleTaskDescription(trimmed);
        break;

      case 'task_duedate': {
        if (isSkip(lowered)) { handleTaskDueDate('skip'); break; }
        // Helper to convert Date to local YYYY-MM-DDTHH:mm (no UTC shift)
        const toLocalDatetime = (d) => {
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        // Try natural language date first, then Date.parse fallback
        const natural = parseNaturalDate(trimmed);
        if (natural && natural > new Date()) {
          handleTaskDueDate(toLocalDatetime(natural));
          break;
        }
        const parsed = Date.parse(trimmed);
        if (!isNaN(parsed) && parsed > Date.now()) {
          handleTaskDueDate(toLocalDatetime(new Date(parsed)));
        } else {
          addUserMessage(trimmed);
          addBotMessage('Try saying something like "tomorrow", "3 March", "next Monday", or use the picker below.');
        }
        break;
      }

      case 'task_reminder_offset': {
        if (isSkip(lowered) || /^no$/i.test(lowered) || /^(no reminder|don'?t remind|none)$/i.test(lowered)) { handleTaskReminderOffset('skip'); break; }
        // Match offset options by label
        const matched = REMINDER_OFFSET_OPTIONS.find(o => {
          const l = o.label.toLowerCase();
          return lowered.includes(l) || lowered === o.value;
        });
        if (matched) { handleTaskReminderOffset(matched.value); break; }
        // Try parsing with digits: "15 min", "1 hour", "2 days"
        const mDigit = lowered.match(/(\d+)\s*(min|mins|minute|minutes|hour|hours|hr|hrs|day|days)/i);
        if (mDigit) {
          let mins = parseInt(mDigit[1], 10);
          if (mDigit[2].startsWith('hour') || mDigit[2].startsWith('hr')) mins *= 60;
          else if (mDigit[2].startsWith('day')) mins *= 1440;
          handleTaskReminderOffset(String(mins));
          break;
        }
        // Try parsing with words: "one day before", "two hours before", "half hour"
        const mWord = lowered.match(/(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|sixty|half|quarter)\s*(min|mins|minute|minutes|hour|hours|hr|hrs|day|days)/i);
        if (mWord) {
          let num = wordToNum(mWord[1]);
          if (mWord[2].startsWith('hour') || mWord[2].startsWith('hr')) num = Math.round(num * 60);
          else if (mWord[2].startsWith('day')) num = Math.round(num * 1440);
          else num = Math.round(num);
          handleTaskReminderOffset(String(num));
          break;
        }
        // Detect intent to go back and change due date/time from this step
        if (/change\s*(the)?\s*(time|date|due)/i.test(lowered) || /set\s*(the)?\s*(time|date)/i.test(lowered)) {
          addUserMessage(trimmed);
          setFlowState('task_duedate');
          setShowDatetimeInput(true);
          addBotMessage('Pick a new due date & time:');
          break;
        }
        addUserMessage(trimmed);
        addBotMessage('Say something like "1 hour before", "30 min before", or "one day before". Or tap an option:');
        break;
      }

      case 'task_confirm': {
        if (isYes(lowered) || /^create/i.test(lowered)) {
          addUserMessage('Create Task');
          handleTaskCreate();
        } else if (isEdit(lowered) || /change|edit|modify|update/i.test(lowered)) {
          addUserMessage(trimmed);
          setShowTaskEditPicker(true);
          addBotMessage('Which field would you like to change?');
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No worries! Anything else I can help with?');
        } else {
          // Try to match a field name for direct edit
          const field = matchEditField(lowered, TASK_EDIT_FIELDS);
          if (field) {
            addUserMessage(`Edit ${field.label}`);
            startTaskFieldEdit(field.step);
          } else {
            addUserMessage(trimmed);
            addBotMessage('Say "create" to confirm, "edit" to change a field, or "cancel" to discard.');
          }
        }
        break;
      }

      case 'task_edit_picker': {
        const field = matchEditField(lowered, TASK_EDIT_FIELDS);
        if (field) {
          addUserMessage(`Edit ${field.label}`);
          startTaskFieldEdit(field.step);
        } else {
          addUserMessage(trimmed);
          addBotMessage('Which field? Say title, priority, category, duration, description, due date, or reminder.');
        }
        break;
      }

      case 'reminder_message':
        handleReminderMessage(trimmed);
        break;

      case 'reminder_time': {
        // Try matching numbered minutes/hours
        const tm = lowered.match(/(\d+)\s*(min|minute|minutes|hour|hours|hr|hrs)?/i);
        if (tm) {
          const unit = (tm[2] || 'min').toLowerCase();
          const mins = unit.startsWith('h') ? parseInt(tm[1]) * 60 : parseInt(tm[1]);
          handleReminderTime(mins);
        } else if (/custom/i.test(lowered)) {
          handleReminderTime('custom');
        } else {
          addUserMessage(trimmed);
          addBotMessage('Pick a time from the options, or say something like "in 30 minutes".');
        }
        break;
      }

      case 'reminder_confirm': {
        if (isYes(lowered) || /^set/i.test(lowered)) {
          addUserMessage('Set Reminder');
          handleReminderCreate();
        } else if (isEdit(lowered) || /change|edit|modify|update/i.test(lowered)) {
          addUserMessage(trimmed);
          setShowReminderEditPicker(true);
          addBotMessage('Which field would you like to change?');
        } else if (isNo(lowered)) {
          addUserMessage('Cancel');
          goToMenu('No worries! Anything else I can help with?');
        } else {
          // Try to match field name
          const field = matchEditField(lowered, REMINDER_EDIT_FIELDS);
          if (field) {
            addUserMessage(`Edit ${field.label}`);
            startReminderFieldEdit(field.step);
          } else {
            addUserMessage(trimmed);
            addBotMessage('Say "set" to confirm, "edit" to change a field, or "cancel" to discard.');
          }
        }
        break;
      }

      default: {
        addUserMessage(trimmed);
        addBotMessage('Pick an option from below, or say "cancel" to start over.');
        break;
      }
    }
  }, [flowState, categories, editingFrom, goToMenu,
    handleTaskTitle, handleTaskPriority, handleTaskCategory, handleTaskDuration,
    handleTaskDescription, handleTaskDueDate, handleTaskReminderOffset, handleTaskCreate,
    handleReminderMessage, handleReminderTime, handleReminderCreate,
    startTaskFlow, startReminderFlow, startTaskFieldEdit, startReminderFieldEdit,
    addUserMessage, addBotMessage]);

  // Wire startListening to use latest handleTextInput
  const handleTextInputRef = useRef(handleTextInput);
  handleTextInputRef.current = handleTextInput;

  const startListeningWrapped = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }
    if (recognitionRef.current) {
      stopListening();
      return;
    }

    window.speechSynthesis.cancel();

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      recognitionRef.current = null;
      setIsListening(false);
      if (transcript) {
        setInputValue('');
        handleTextInputRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setIsListening(false);
      if (event.error === 'no-speech' && voiceModeRef.current) {
        // In voice mode, auto-retry after no-speech timeout
        setTimeout(() => {
          if (voiceModeRef.current && !recognitionRef.current) {
            startListeningWrapped();
          }
        }, 300);
        return;
      }
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        toast.error('Speech recognition error. Try again.');
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [stopListening]);

  // Handle voice mode toggle from mic button
  const toggleVoiceMode = useCallback(() => {
    if (voiceMode && isListening) {
      // Currently listening in voice mode — just restart listening
      // (user tapped mic because it seemed stuck)
      stopListening();
      setTimeout(() => startListeningWrapped(), 200);
    } else if (voiceMode && !isListening) {
      // Voice mode on but not listening (e.g., TTS speaking) — restart listening
      window.speechSynthesis.cancel();
      setTimeout(() => startListeningWrapped(), 200);
    } else {
      // Turn on voice mode and start listening
      setVoiceMode(true);
      if (!recognitionRef.current) {
        setTimeout(() => startListeningWrapped(), 100);
      }
    }
  }, [voiceMode, isListening, stopListening, startListeningWrapped]);

  // Listen for auto-listen events from TTS callback
  useEffect(() => {
    const handleAutoListen = () => {
      if (voiceModeRef.current && !recognitionRef.current) {
        startListeningWrapped();
      }
    };
    window.addEventListener('voicepro-auto-listen', handleAutoListen);
    return () => window.removeEventListener('voicepro-auto-listen', handleAutoListen);
  }, [startListeningWrapped]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue('');
    handleTextInput(text);
  }, [inputValue, handleTextInput]);

  const needsTextInput = ['task_title', 'task_description', 'reminder_message'].includes(flowState);
  const isInFlow = flowState !== 'menu';

  // Determine input placeholder based on flow state
  const getPlaceholder = () => {
    if (isListening) return 'Listening…';
    if (needsTextInput) return 'Type your answer…';
    if (isInFlow) return 'Type, tap an option, or say "back"…';
    return 'Type or tap an option…';
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const formatDuration = (d) => {
    if (!d) return '—';
    return d;
  };

  const formatReminderOffset = (v) => {
    if (!v) return '—';
    const mins = parseInt(v, 10);
    if (mins >= 1440) return `${mins / 1440} day${mins / 1440 > 1 ? 's' : ''} before`;
    if (mins >= 60) return `${mins / 60} hour${mins / 60 > 1 ? 's' : ''} before`;
    return `${mins} min before`;
  };

  const renderOptions = () => {
    // Don't render option buttons while bot is speaking
    if (isSpeaking) return null;
    
    switch (flowState) {
      case 'menu':
        return (
          <div className="chatbot-options">
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Add Task'); startTaskFlow(); }}>
              Add Task
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Set Reminder'); startReminderFlow(); }}>
              Set Reminder
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Get Briefing'); setFlowState('briefing_type'); addBotMessage('Would you like a daily, weekly, or monthly briefing?'); }}>
              Get Briefing
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Manage Tasks'); setFlowState('manage_menu'); addBotMessage('What would you like to do?'); }}>
              Manage Tasks
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Manage Reminders'); setFlowState('manage_reminders_menu'); addBotMessage('What would you like to do?'); }}>
              Manage Reminders
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('AI Brainstorming'); setFlowState('ai_brainstorm_menu'); addBotMessage('How can I help you strategize your tasks?'); }}>
              AI Brainstorming
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Productivity Insights'); handleProductivityInsights(); }}>
              Productivity Insights
            </button>
          </div>
        );

      case 'ai_brainstorm_menu':
        return (
          <div className="chatbot-options">
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Suggest by Free Time'); setFlowState('suggest_time'); addBotMessage('How much free time do you have?'); }}>
              Suggest by Free Time
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage("See most urgent tasks"); handleMostUrgent(); }}>
              See most urgent tasks
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage("Plan My Day"); handlePlanMyDay(); }}>
              Plan My Day
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage("Procrastination Alert"); handleProcrastinationAlert(); }}>
              Procrastination Alert
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage("Personalized Insights"); handlePersonalizedInsights(); }}>
              Personalized Insights
            </button>
          </div>
        );

      case 'productivity_insights_charts':
        const displayChartClick = (chartType, chartTitle) => {
           addUserMessage(chartTitle);
           const spoken = `Here is your ${chartTitle} chart.`;
           setMessages(prev => [...prev, { role: 'bot', content: spoken, type: 'insight_chart', data: { chartType, chartData: Object.keys(taskDraft).length > 0 ? taskDraft : null, title: chartTitle } }]);
           setIsSpeaking(true);
           speakText(spoken, () => setIsSpeaking(false));
        };
        return (
          <div className="chatbot-options">
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('task_completion', 'Task Completion Trend')}>
              Task Completion Trend
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('time_priority', 'Time by Priority')}>
              Time by Priority
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('tasks_priority', 'Tasks by Priority')}>
              Tasks by Priority
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('completion_status', 'Completion Status')}>
              Completion Status
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('time_project', 'Time Spent Per Project')}>
              Time Spent Per Project
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('productivity_hour', 'Productivity by Hour')}>
              Productivity by Hour
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('focus_day', 'Focus by Day')}>
              Focus by Day
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('focus_quality', 'Focus Quality Score')}>
              Focus Quality Score
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('activity_heatmap', 'Activity Heatmap')}>
              Activity Heatmap
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('estimated_vs_actual', 'Estimated vs Actual Time')}>
              Estimated vs Actual Time
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => displayChartClick('burndown', 'Burndown Chart')}>
              Burndown Chart
            </button>
            <button className="chatbot-option-btn" onClick={() => { addUserMessage("Back"); resetFlowState(); addBotMessage('Is there anything else I can help you with?'); }} style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
              Back
            </button>
          </div>
        );

      case 'briefing_type':
        return (
          <div className="chatbot-options">
            {['Daily', 'Weekly', 'Monthly'].map((b) => (
              <button key={b} className="chatbot-option-btn main-menu" onClick={() => { addUserMessage(b); handleBriefingRequest(b.toLowerCase()); }}>
                {b} Briefing
              </button>
            ))}
          </div>
        );

      case 'briefing_detailed_prompt':
        return (
          <div className="chatbot-options">
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Yes'); handleDetailedBriefing(); }}>Yes please</button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('No'); goToMenu('Okay! Anything else I can help with?'); }}>No thanks</button>
          </div>
        );

      case 'suggest_time':
        return (
          <div className="chatbot-options">
            {[['15 min', 15], ['30 min', 30], ['1 hour', 60], ['2+ hours', 120]].map(([label, mins]) => (
              <button key={label} className="chatbot-option-btn main-menu" onClick={() => { addUserMessage(label); handleSuggestTask(mins, label); }}>
                {label}
              </button>
            ))}
          </div>
        );

      case 'task_priority':
        return (
          <div className="chatbot-options">
            {['High', 'Medium', 'Low'].map((p) => (
              <button key={p} className="chatbot-option-btn" onClick={() => handleTaskPriority(p)}>
                {p === 'High' ? '🔴' : p === 'Medium' ? '🟡' : '🟢'} {p}
              </button>
            ))}
          </div>
        );

      case 'task_category':
        return (
          <>
            <div className="chatbot-options">
              {categories.map((cat) => (
                <button key={cat} className="chatbot-option-btn" onClick={() => handleTaskCategory(cat)}>
                  {cat}
                </button>
              ))}
              <button className="chatbot-option-btn" onClick={() => handleTaskCategory('__new__')}>
                <Plus size={12} /> New
              </button>
            </div>
            {showNewCategoryInput && (
              <div className="chatbot-new-cat-row">
                <input
                  className="chatbot-new-cat-input"
                  type="text"
                  placeholder="New category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim()) {
                      handleTaskCategory(newCategoryName.trim());
                      setNewCategoryName('');
                    }
                  }}
                  autoFocus
                />
                <button
                  className="chatbot-new-cat-add-btn"
                  onClick={() => {
                    if (newCategoryName.trim()) {
                      handleTaskCategory(newCategoryName.trim());
                      setNewCategoryName('');
                    }
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </>
        );

      case 'task_duration':
        return (
          <div className="chatbot-options">
            {DURATION_OPTIONS.map((d) => (
              <button key={d.value} className="chatbot-option-btn" onClick={() => handleTaskDuration(d.value)}>
                {d.label}
              </button>
            ))}
            <button className="chatbot-option-btn skip-btn" onClick={() => handleTaskDuration('skip')}>
              <SkipForward size={12} /> Skip
            </button>
          </div>
        );

      case 'task_description':
        return (
          <div className="chatbot-options">
            <button className="chatbot-option-btn skip-btn" onClick={() => handleTaskDescription('skip')}>
              <SkipForward size={12} /> Skip
            </button>
          </div>
        );

      case 'task_duedate':
        return (
          <>
            {showDatetimeInput && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="datetime-local"
                  className="chatbot-datetime-input"
                  value={datetimeValue}
                  onChange={(e) => setDatetimeValue(e.target.value)}
                />
                {datetimeValue && (
                  <button
                    className="chatbot-option-btn"
                    onClick={() => {
                      handleTaskDueDate(datetimeValue);
                      setDatetimeValue('');
                    }}
                  >
                    <Check size={12} /> Set
                  </button>
                )}
              </div>
            )}
            <div className="chatbot-options">
              <button className="chatbot-option-btn skip-btn" onClick={() => handleTaskDueDate('skip')}>
                <SkipForward size={12} /> Skip
              </button>
            </div>
          </>
        );

      case 'task_reminder_offset':
        return (
          <div className="chatbot-options">
            {REMINDER_OFFSET_OPTIONS.map((o) => (
              <button key={o.value} className="chatbot-option-btn" onClick={() => handleTaskReminderOffset(o.value)}>
                {o.label}
              </button>
            ))}
            <button className="chatbot-option-btn skip-btn" onClick={() => handleTaskReminderOffset('skip')}>
              <SkipForward size={12} /> Skip
            </button>
          </div>
        );

      case 'task_confirm':
        return (
          <>
            <div className="chatbot-summary-card">
              <div className="summary-title">Task Summary</div>
              <div className="summary-row"><span className="summary-label">Title</span><span className="summary-value">{taskDraft.title}</span></div>
              <div className="summary-row"><span className="summary-label">Priority</span><span className="summary-value">{taskDraft.priority || 'Medium'}</span></div>
              <div className="summary-row"><span className="summary-label">Category</span><span className="summary-value">{taskDraft.category || 'Client Work'}</span></div>
              <div className="summary-row"><span className="summary-label">Duration</span><span className="summary-value">{formatDuration(taskDraft.duration) || '—'}</span></div>
              <div className="summary-row"><span className="summary-label">Notes</span><span className="summary-value">{taskDraft.description || '—'}</span></div>
              <div className="summary-row"><span className="summary-label">Due</span><span className="summary-value">{taskDraft.due_date ? (() => { const p = taskDraft.due_date.split('T'); const [y,mo,da] = p[0].split('-'); const [hr,mi] = (p[1]||'09:00').split(':'); return new Date(parseInt(y),parseInt(mo)-1,parseInt(da),parseInt(hr),parseInt(mi)).toLocaleString(); })() : '—'}</span></div>
              {taskDraft.due_date && <div className="summary-row"><span className="summary-label">Reminder</span><span className="summary-value">{formatReminderOffset(taskDraft.reminder_offset)}</span></div>}
            </div>
            <div className="chatbot-confirm-row">
              <button className="chatbot-confirm-btn create" onClick={handleTaskCreate} disabled={isWorking}>
                {isWorking ? <Loader size={14} className="chatbot-spin" /> : <Check size={14} />} Create Task
              </button>
              <button className="chatbot-confirm-btn edit" onClick={() => { setShowTaskEditPicker((p) => !p); addBotMessage('Which field would you like to change?', !showTaskEditPicker); }}>
                <Pencil size={14} /> Edit
              </button>
              <button className="chatbot-confirm-btn cancel" onClick={() => { addUserMessage('Cancel'); goToMenu('No worries! Anything else I can help with?'); }}>
                <X size={14} /> Cancel
              </button>
            </div>
            {showTaskEditPicker && (
              <div className="chatbot-options">
                {TASK_EDIT_FIELDS.filter(f => f.key !== 'reminder_offset' || taskDraft.due_date).map((f) => (
                  <button key={f.key} className="chatbot-option-btn" onClick={() => { addUserMessage(`Edit ${f.label}`); startTaskFieldEdit(f.step); }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </>
        );

      case 'reminder_time':
        return (
          <>
            <div className="chatbot-options">
              {REMINDER_TIME_OPTIONS.map((o) => (
                <button key={o.value} className="chatbot-option-btn" onClick={() => handleReminderTime(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
            {showCustomReminderTime && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="datetime-local"
                  className="chatbot-datetime-input"
                  value={customReminderTime}
                  onChange={(e) => setCustomReminderTime(e.target.value)}
                />
                {customReminderTime && (
                  <button
                    className="chatbot-option-btn"
                    onClick={() => {
                      handleReminderCustomTime(customReminderTime);
                      setCustomReminderTime('');
                    }}
                  >
                    <Check size={12} /> Set
                  </button>
                )}
              </div>
            )}
          </>
        );

      case 'reminder_confirm':
        return (
          <>
            <div className="chatbot-summary-card">
              <div className="summary-title">Reminder Summary</div>
              <div className="summary-row"><span className="summary-label">Message</span><span className="summary-value">{reminderDraft.message}</span></div>
              <div className="summary-row">
                <span className="summary-label">When</span>
                <span className="summary-value">
                  {reminderDraft.reminder_time
                    ? new Date(reminderDraft.reminder_time).toLocaleString()
                    : `${reminderDraft.in_minutes} minute${reminderDraft.in_minutes !== 1 ? 's' : ''} before`}
                </span>
              </div>
            </div>
            <div className="chatbot-confirm-row">
              <button className="chatbot-confirm-btn create" onClick={handleReminderCreate} disabled={isWorking}>
                {isWorking ? <Loader size={14} className="chatbot-spin" /> : <Check size={14} />} Set Reminder
              </button>
              <button className="chatbot-confirm-btn edit" onClick={() => { setShowReminderEditPicker((p) => !p); addBotMessage('Which field would you like to change?', !showReminderEditPicker); }}>
                <Pencil size={14} /> Edit
              </button>
              <button className="chatbot-confirm-btn cancel" onClick={() => { addUserMessage('Cancel'); goToMenu('No worries! Anything else I can help with?'); }}>
                <X size={14} /> Cancel
              </button>
            </div>
            {showReminderEditPicker && (
              <div className="chatbot-options">
                {REMINDER_EDIT_FIELDS.map((f) => (
                  <button key={f.key} className="chatbot-option-btn" onClick={() => { addUserMessage(`Edit ${f.label}`); startReminderFieldEdit(f.step); }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </>
        );

      case 'manage_menu':
        return (
          <div className="chatbot-options">
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Mark Task as Done'); setManagementActionType('mark_done'); startManageTasksFlow('mark_done'); }}>
              Mark Task as Done
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Delete Task'); setManagementActionType('delete_task'); startManageTasksFlow('delete_task'); }}>
              Delete Task
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Move to In Progress'); setManagementActionType('shift_inprogress'); startManageTasksFlow('shift_inprogress'); }}>
              Move to In Progress
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Edit Task'); setManagementActionType('edit_task'); startManageTasksFlow('edit_task'); }}>
              Edit Task
            </button>
          </div>
        );

      case 'manage_reminders_menu':
        return (
          <div className="chatbot-options">
            <button className="chatbot-option-btn main-menu" onClick={() => { hasCalledGoToMenuRef.current = false; addUserMessage('View Reminders'); const allReminders = (taskReminders || []).sort((a, b) => new Date(b.reminder_time) - new Date(a.reminder_time)); if (allReminders.length === 0) { addBotMessage('You have no reminders.'); setTimeout(() => { hasCalledGoToMenuRef.current = false; goToMenu('Need anything else?'); }, 2000); } else { const reminderList = allReminders.map((r, idx) => { const reminderDate = new Date(r.reminder_time); const timeStr = reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + reminderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); const isSent = r.is_sent ? '✓' : ''; return `${idx + 1}. ${r.message}\n   ${timeStr} ${isSent}`; }).join('\n'); addBotMessage(`Here are your reminders:\n\n${reminderList}`, true, () => goToMenu('Need anything else?')); } }}>
              View Reminders
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Delete Reminder'); setManagementActionType('delete_reminder'); setFlowState('manage_reminders_select'); addBotMessage('Which reminder would you like to delete?'); }}>
              Delete Reminder
            </button>
            <button className="chatbot-option-btn main-menu" onClick={() => { addUserMessage('Edit Reminder'); setManagementActionType('edit_reminder'); setFlowState('manage_reminders_select'); addBotMessage('Which reminder would you like to edit?'); }}>
              Edit Reminder
            </button>
          </div>
        );

      case 'manage_reminders_select': {
        const allReminders = (taskReminders || []).sort((a, b) => new Date(b.reminder_time) - new Date(a.reminder_time));
        if (allReminders.length === 0) {
          return (
            <div className="chatbot-options">
              <button className="chatbot-option-btn main-menu" onClick={() => goToMenu('You have no reminders. Anything else I can help with?')}>
                Back to Menu
              </button>
            </div>
          );
        }
        return (
          <div className="chatbot-options">
            {allReminders.map((reminder) => (
              <button 
                key={reminder.reminder_id} 
                className="chatbot-option-btn" 
                onClick={() => {
                  setSelectedReminder(reminder);
                  addUserMessage(reminder.message);
                  if (managementActionType === 'delete_reminder') {
                    setFlowState('manage_reminder_confirm');
                    addBotMessage(`Are you sure you want to delete "${reminder.message}"?`);
                  } else if (managementActionType === 'edit_reminder') {
                    setFlowState('manage_reminder_edit_time');
                    addBotMessage(`Current reminder time: ${new Date(reminder.reminder_time).toLocaleString()}\n\nWhat time would you like to set it to?`);
                  }
                }}
                disabled={isWorking}
                style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {reminder.message}
              </button>
            ))}
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              Back to Menu
            </button>
          </div>
        );
      }

      case 'manage_reminder_confirm':
        return (
          <div className="chatbot-options">
            <button className="chatbot-option-btn" onClick={() => { addUserMessage('Yes, delete it'); setIsWorking(true); reminderAPI.deleteOne(selectedReminder.reminder_id).then(() => { refreshReminders(); toast.success('Reminder deleted!'); addSuccessMessage(`✓ Reminder "${selectedReminder.message}" deleted!`); setSelectedReminder(null); setTimeout(() => goToMenu('Anything else I can help with?'), 2500); }).catch(() => { toast.error('Failed to delete reminder'); addBotMessage('Something went wrong. Want to try again?'); }).finally(() => setIsWorking(false)); }} disabled={isWorking}>
              {isWorking ? <Loader size={14} className="chatbot-spin" /> : <Check size={14} />} Yes, Delete
            </button>
            <button className="chatbot-option-btn skip-btn" onClick={() => { addUserMessage('Never mind'); goToMenu('No problem! Anything else I can help with?'); }} disabled={isWorking}>
              Cancel
            </button>
          </div>
        );

      case 'manage_reminder_edit_time':
        return (
          <div className="chatbot-options">
            <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginBottom: '8px' }}>
              Say a date like "March 31", "tomorrow at 3pm", "3:30 PM" or "15:30"
            </div>
            <button className="chatbot-option-btn skip-btn" onClick={() => { addUserMessage('Cancel'); setSelectedReminder(null); goToMenu('Anything else I can help with?'); }} disabled={isWorking}>
              Cancel
            </button>
          </div>
        );

      case 'manage_task_select': {
        // For edit, delete, and priority changes, include both pending and in-progress tasks
        // For mark-done and move-to-in-progress, only pending tasks
        const eligibleStatuses = ['edit_task', 'delete_task', 'change_priority'].includes(managementActionType)
          ? ['pending', 'in_progress']
          : ['pending'];
        const availableTasks = tasks.filter(t => eligibleStatuses.includes(t.status));
        if (availableTasks.length === 0) {
          return (
            <div className="chatbot-options">
              <button className="chatbot-option-btn main-menu" onClick={() => goToMenu('Anything else I can help with?')}>
                Back to Menu
              </button>
            </div>
          );
        }
        return (
          <div className="chatbot-options">
            {availableTasks.map((task) => (
              <button 
                key={task.task_id} 
                className="chatbot-option-btn" 
                onClick={() => handleTaskSelected(task)}
                disabled={isWorking}
                style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
                {task.title}
                {task.priority && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}> · {task.priority}</span>}
              </button>
            ))}
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              Back to Menu
            </button>
          </div>
        );
      }

      case 'manage_task_action':
        return (
          <div className="chatbot-options">
            <button 
              className="chatbot-option-btn" 
              onClick={() => { addUserMessage('Mark Done'); setFlowState('manage_task_confirm_complete'); addBotMessage(`Are you sure you want to mark "${selectedTask?.title || 'this task'}" as complete?`); }}
              disabled={isWorking}
              style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
              Mark Done
            </button>
            <button 
              className="chatbot-option-btn" 
              onClick={() => { addUserMessage('Change Priority'); setFlowState('manage_task_select_priority'); addBotMessage('What should the new priority be?'); }}
              disabled={isWorking}
            >
              Change Priority
            </button>
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              Back to Menu
            </button>
          </div>
        );

      case 'manage_task_select_priority':
        return (
          <div className="chatbot-options">
            {PRIORITY_OPTIONS.map((p) => (
              <button 
                key={p.value} 
                className="chatbot-option-btn" 
                onClick={() => handleChangePriority(p.value)}
                disabled={isWorking}
                style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
                {p.emoji} {p.label}
              </button>
            ))}
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              Back to Menu
            </button>
          </div>
        );

      case 'manage_task_action_priority':
        return (
          <div className="chatbot-options">
            {PRIORITY_OPTIONS.map((p) => (
              <button 
                key={p.value} 
                className="chatbot-option-btn" 
                onClick={() => handleChangePriority(p.value)}
                disabled={isWorking}
                style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
                {p.emoji} {p.label}
              </button>
            ))}
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              Back to Menu
            </button>
          </div>
        );

      case 'manage_reminder_select': {
        const pendingReminders = (taskReminders || []).filter(r => !r.is_sent);
        if (pendingReminders.length === 0) {
          return (
            <div className="chatbot-options">
              <button className="chatbot-option-btn main-menu" onClick={() => goToMenu('Anything else I can help with?')}>
                Back to Menu
              </button>
            </div>
          );
        }
        return (
          <div className="chatbot-options">
            {pendingReminders.map((reminder) => (
              <button 
                key={reminder.reminder_id} 
                className="chatbot-option-btn" 
                onClick={() => handleReminderSelected(reminder)}
                disabled={isWorking}
                style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
                {reminder.message}
              </button>
            ))}
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              Back to Menu
            </button>
          </div>
        );
      }

      case 'manage_task_confirm_complete':
        return (
          <div className="chatbot-options">
            <button 
              className="chatbot-option-btn" 
              onClick={() => { addUserMessage('Yes'); handleConfirmCompleteTask(); }}
              disabled={isWorking}
              style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
              Yes, mark done
            </button>
            <button 
              className="chatbot-option-btn skip-btn" 
              onClick={() => { addUserMessage('No'); setFlowState('manage_task_select'); addBotMessage('Which task would you like to mark done?'); }}
              disabled={isWorking}
            >
              No, cancel
            </button>
          </div>
        );

      case 'manage_reminder_confirm_delete':
        return (
          <div className="chatbot-options">
            <button 
              className="chatbot-option-btn" 
              onClick={() => { addUserMessage('Yes, delete it'); handleDeleteReminder(); }}
              disabled={isWorking}
              style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
              Yes, delete
            </button>
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              Cancel
            </button>
          </div>
        );

      case 'manage_task_delete_confirm':
        return (
          <div className="chatbot-options">
            <button 
              className="chatbot-option-btn" 
              onClick={() => { addUserMessage('Yes, delete it'); handleDeleteTask(); }}
              disabled={isWorking}
              style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
              Yes, delete
            </button>
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              No, cancel
            </button>
          </div>
        );

      case 'manage_task_shift_confirm':
        return (
          <div className="chatbot-options">
            <button 
              className="chatbot-option-btn" 
              onClick={() => { addUserMessage('Yes, move it'); handleShiftToInProgress(); }}
              disabled={isWorking}
              style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              {isWorking ? <Loader size={12} className="chatbot-spin" style={{ display: 'inline-block', marginRight: '4px' }} /> : null}
              Yes, move it
            </button>
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')} disabled={isWorking}>
              No, cancel
            </button>
          </div>
        );

      case 'manage_edit_task_select':
        return (
          <div className="chatbot-options">
            <button 
              className="chatbot-option-btn"
              onClick={() => { addUserMessage('Change priority'); setFlowState('manage_task_select_priority'); addBotMessage('What should the new priority be?'); }}
            >
              Change Priority
            </button>
            <button 
              className="chatbot-option-btn"
              onClick={() => { addUserMessage('Change title'); setFlowState('manage_edit_title'); addBotMessage('What would you like to change the title to?'); }}
            >
              Change Title
            </button>
            <button 
              className="chatbot-option-btn"
              onClick={() => { addUserMessage('Change description'); setFlowState('manage_edit_description'); addBotMessage('What should the new description be?'); }}
            >
              Change Description
            </button>
            <button 
              className="chatbot-option-btn"
              onClick={() => { addUserMessage('Change category'); setFlowState('manage_edit_category'); addBotMessage('What category would you like to change it to?'); }}
            >
              Change Category
            </button>
            <button 
              className="chatbot-option-btn"
              onClick={() => { addUserMessage('Change due date'); setFlowState('manage_edit_duedate'); addBotMessage('What date should this task be due?'); }}
            >
              Change Due Date
            </button>
            <button 
              className="chatbot-option-btn"
              onClick={() => { addUserMessage('Change duration'); setFlowState('manage_edit_duration'); addBotMessage('How long will this task take?'); }}
            >
              Change Duration
            </button>
            <button 
              className="chatbot-option-btn"
              onClick={() => { addUserMessage('Change due time'); setFlowState('manage_edit_time'); addBotMessage('What time should this task be due? (e.g., "3:30 PM", "15:30", "3pm")'); }}
            >
              Change Due Time
            </button>
            <button 
              className="chatbot-option-btn"
              onClick={() => { 
                addUserMessage('Add/Change reminder'); 
                setSettingTaskReminder(true);
                const taskReminderMessage = `Task due soon: ${selectedTask.title}`;
                setReminderDraft({ message: taskReminderMessage });
                setFlowState('reminder_time');
                addBotMessage('How many minutes before the due date/time do you want to be reminded? (e.g., "10 minutes", "30 minutes", "1 hour")');
              }}
            >
              Add/Change Reminder
            </button>
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')}>
              Cancel
            </button>
          </div>
        );

      case 'manage_edit_title':
      case 'manage_edit_description':
      case 'manage_edit_duration':
      case 'manage_edit_time':
      case 'manage_edit_reminder':
        return (
          <div className="chatbot-options" style={{ flexDirection: 'column' }}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Type your response..."
              defaultValue=""
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  handleTextInput(e.target.value.trim());
                  e.target.value = '';
                }
              }}
              autoFocus
            />
            <button 
              className="chatbot-option-btn"
              onClick={() => goToMenu('Anything else I can help with?')}
              style={{ marginTop: '8px' }}
            >
              Cancel
            </button>
          </div>
        );

      case 'manage_edit_category':
        return (
          <div className="chatbot-options">
            {categories.map((cat) => (
              <button 
                key={cat} 
                className="chatbot-option-btn"
                onClick={() => handleTextInput(cat)}
              >
                {cat}
              </button>
            ))}
            <button 
              className="chatbot-option-btn"
              onClick={() => { 
                setFlowState('manage_edit_category_custom');
                addBotMessage('What category would you like?');
              }}
            >
              Other
            </button>
            <button className="chatbot-option-btn skip-btn" onClick={() => goToMenu('Anything else I can help with?')}>
              Cancel
            </button>
          </div>
        );

      case 'manage_edit_category_custom':
        return (
          <div className="chatbot-options" style={{ flexDirection: 'column' }}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Type the category..."
              defaultValue=""
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  handleTextInput(e.target.value.trim());
                  e.target.value = '';
                }
              }}
              autoFocus
            />
            <button 
              className="chatbot-option-btn"
              onClick={() => goToMenu('Anything else I can help with?')}
              style={{ marginTop: '8px' }}
            >
              Cancel
            </button>
          </div>
        );

      case 'manage_edit_duedate':
        return (
          <div className="chatbot-options" style={{ flexDirection: 'column' }}>
            <input
              type="date"
              className="chatbot-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  handleTextInput(e.target.value.trim());
                  e.target.value = '';
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleTextInput(e.target.value.trim());
                  e.target.value = '';
                }
              }}
              autoFocus
            />
            <button 
              className="chatbot-option-btn"
              onClick={() => goToMenu('Anything else I can help with?')}
              style={{ marginTop: '8px' }}
            >
              Cancel
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="chatbot-root">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-panel"
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-title-wrap">
                <div className="chatbot-avatar">
                  <Bot size={16} />
                </div>
                <div>
                  <h4>VoicePro Assistant</h4>
                  {voiceMode ? (
                    <span
                      className="chatbot-subtitle chatbot-voice-mode-badge"
                      onClick={() => { setVoiceMode(false); stopListening(); window.speechSynthesis.cancel(); }}
                      title="Click to exit voice mode"
                      style={{ cursor: 'pointer' }}
                    >
                      {isListening ? '🎙 Listening…' : '🎙 Voice mode'} <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>· tap to exit</span>
                    </span>
                  ) : (
                    <span className="chatbot-subtitle">
                      {isListening ? 'Listening…' : isWorking ? 'Working…' : 'Ready to help'}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="chatbot-close-btn"
                onClick={() => {
                  setIsOpen(false);
                  setVoiceMode(false);
                  stopListening();
                  window.speechSynthesis.cancel();
                }}
                aria-label="Close assistant"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat log */}
            <div className="chatbot-chat-log" ref={chatLogRef}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  className={`chatbot-msg chatbot-msg-${msg.role === 'bot' ? 'bot' : msg.role === 'success' ? 'success' : 'user'}${msg.type === 'insight_chart' ? ' chatbot-msg-chart' : ''}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {msg.type === 'briefing_summary' ? (
                    <BriefingSummaryCard data={msg.data} />
                  ) : msg.type === 'briefing_detail' ? (
                    <BriefingDetailCard data={msg.data} />
                  ) : msg.type === 'suggest_task' ? (
                    <SuggestTaskCard data={msg.data} />
                  ) : msg.type === 'urgent_task' ? (
                    <UrgentTaskCard data={msg.data} />
                  ) : msg.type === 'plan_my_day' ? (
                    <PlanMyDayCard data={msg.data} />
                  ) : msg.type === 'productivity_insights' ? (
                    <ProductivityInsightsCard data={msg.data} />
                  ) : msg.type === 'insight_chart' ? (
                    <InsightChartCard data={msg.data} />
                  ) : msg.type === 'procrastination_alert' ? (
                    <ProcrastinationAlertCard data={msg.data} />
                  ) : msg.type === 'personalized_insights' ? (
                    <PersonalizedInsightsCard data={msg.data} />
                  ) : (
                    <span style={{ whiteSpace: 'pre-line' }}>{msg.content}</span>
                  )}
                </motion.div>
              ))}

              <div ref={optionsRef}>
                {renderOptions()}
              </div>

              {isWorking && (
                <div className="chatbot-msg chatbot-msg-bot" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Working on it</span> <ThinkingDots />
                </div>
              )}
            </div>

            {/* Listening indicator */}
            {isListening && (
              <div className="chatbot-listening-bar">
                <SoundBars />
                <span>Listening — speak now</span>
              </div>
            )}

            {/* Skip Reading button */}
            {isSpeaking && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                <button
                  onClick={skipSpeaking}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fca5a5',
                    borderRadius: '20px',
                    padding: '6px 18px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  <SkipForward size={14} /> Skip Reading
                </button>
              </div>
            )}

            {/* Input row */}
            <div className="chatbot-input-row">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={getPlaceholder()}
                disabled={isWorking || isListening}
                aria-label="Chatbot input"
              />
              <button
                className={`chatbot-mic-btn ${isListening ? 'active' : ''} ${voiceMode ? 'voice-mode' : ''}`}
                onClick={toggleVoiceMode}
                disabled={isWorking}
                aria-label={voiceMode ? 'Turn off voice mode' : 'Turn on voice mode'}
              >
                {isListening ? <SoundBars /> : <Mic size={16} />}
              </button>
              <button
                className="chatbot-send-btn"
                onClick={handleSend}
                disabled={!inputValue.trim() || isWorking}
                aria-label="Send"
              >
                {isWorking ? <Loader size={16} className="chatbot-spin" /> : <Send size={16} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        className={`chatbot-fab ${isListening ? 'listening' : ''}`}
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
          } else {
            toggleVoiceMode();
          }
        }}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.06 }}
        aria-label="Open chatbot assistant"
      >
        {isListening ? (
          <SoundBars />
        ) : (
          <Bot size={24} />
        )}
      </motion.button>
    </div>
  );
};

export default ChatbotAssistant;
