import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
  Calendar, ChevronDown, TrendingUp, Clock, Zap, CheckCircle, 
  Target, Award, Eye, AlertCircle, Coffee, Focus, Activity, Flame, Scale, ListTodo
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import './AnalyticsPage.css';

// Gradient Helpers for UI Polish
const getGradientId = (identifier) => {
  const str = String(identifier).toLowerCase();
  if (str.includes('high') || str.includes('ff8a65') || str.includes('e74c3c') || str.includes('ff6b35')) return 'url(#gradHigh)';
  if (str.includes('medium') || str.includes('pending') || str.includes('ffd54f') || str.includes('f39c12') || str.includes('ffd93d')) return 'url(#gradMedium)';
  if (str.includes('low') || str.includes('completed') || str.includes('81c995') || str.includes('2ecc71') || str.includes('4ecdc4')) return 'url(#gradLow)';
  return 'url(#gradDefault)';
};

const getCssGradient = (identifier) => {
  const str = String(identifier).toLowerCase();
  if (str.includes('high') || str.includes('ff8a65') || str.includes('e74c3c') || str.includes('ff6b35')) return 'linear-gradient(to bottom, #FF6B35, rgba(255, 107, 53, 0.4))';
  if (str.includes('medium') || str.includes('pending') || str.includes('ffd54f') || str.includes('f39c12') || str.includes('ffd93d')) return 'linear-gradient(to bottom, #FFD93D, rgba(255, 217, 61, 0.4))';
  if (str.includes('low') || str.includes('completed') || str.includes('81c995') || str.includes('2ecc71') || str.includes('4ecdc4')) return 'linear-gradient(to bottom, #4ECDC4, rgba(78, 205, 196, 0.4))';
  return 'linear-gradient(to bottom, #9C27B0, rgba(156, 39, 176, 0.4))';
};

const BAR_COLORS = ['url(#gradHigh)', 'url(#gradLow)', 'url(#gradMedium)'];

const AnalyticsPage = () => {
  const { getInsights, user } = useApp();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');
  const [data, setData] = useState(null);
  const [heatmapTooltip, setHeatmapTooltip] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const insights = await getInsights(dateRange);
      setData(insights);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, getInsights]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ==========================================
  // DATA MAPPING (Transforming API data for Recharts)
  // ==========================================

  // ── Helper: compute period-over-period change text ──
  const getTrendChange = (current, previous, unit = '') => {
    const periodLabel = dateRange === 'week' ? 'week' : dateRange === 'month' ? 'month' : 'year';
    const diff = current - previous;
    if (previous === 0 && current === 0) return { text: 'Same as last period', trend: 'neutral' };
    if (previous === 0) return { text: `+${current}${unit} vs last ${periodLabel}`, trend: 'up' };
    const pct = Math.round((diff / previous) * 100);
    if (pct === 0) return { text: 'Same as last period', trend: 'neutral' };
    if (pct > 0) return { text: `↑ ${pct}% vs last ${periodLabel}`, trend: 'up' };
    if (pct < 0) return { text: `↓ ${Math.abs(pct)}% vs last ${periodLabel}`, trend: 'down' };
    return { text: 'Same as last period', trend: 'neutral' };
  };

  const periodLabel = dateRange === 'week' ? 'week' : dateRange === 'month' ? 'month' : 'year';

  const wellbeingStats = data ? (() => {
    const completedTrend = getTrendChange(data.completed_tasks, data.prev_completed_tasks || 0);
    const hoursTrend = getTrendChange(data.total_hours, data.prev_total_hours || 0);
    const overdue = (data.status_breakdown || []).find(s => s.name === 'Pending')?.value || 0;
    const pomodorosTrend = getTrendChange(data.pomodoros, data.prev_pomodoros || 0);

    return [
      {
        label: 'Tasks Completed',
        value: data.completed_tasks,
        change: `${data.completion_rate}% Rate`,
        trend: completedTrend.trend,
        icon: CheckCircle,
        color: 'primary',
        description: completedTrend.text,
      },
      {
        label: 'Focus Time',
        value: `${data.total_hours}h`,
        change: data.avg_session_minutes ? `~${data.avg_session_minutes}m avg session` : `${data.focus_sessions} Sessions`,
        trend: hoursTrend.trend,
        icon: Clock,
        color: 'secondary',
        description: hoursTrend.text,
      },
      {
        label: 'Active Streak',
        value: `${data.streak_days || 0}d`,
        change: `${data.pending_tasks} task${data.pending_tasks !== 1 ? 's' : ''} pending`,
        trend: (data.streak_days || 0) > 0 ? 'up' : 'neutral',
        icon: Flame,
        color: 'accent',
        description: (data.streak_days || 0) > 0 ? `${data.streak_days} day${data.streak_days !== 1 ? 's' : ''} in a row!` : 'Start a timer today!',
      },
      {
        label: 'Pomodoros',
        value: data.pomodoros,
        change: `${data.focus_sessions} total sessions`,
        trend: pomodorosTrend.trend,
        icon: Award,
        color: 'purple',
        description: pomodorosTrend.text,
      },
    ];
  })() : [];

  const completionTrend = data?.focus_time?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: item.hours
  })) || [];

  const timeDistribution = data?.time_priority_breakdown || [];

  const priorityData = data?.priority_breakdown || [];

  const statusData = data?.status_breakdown || [];
  
  const projectBreakdown = data?.project_breakdown || [];

  const hourlyData = data?.hourly_pattern || [];

  const focusQualityData = data?.focus_quality?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    quality: item.quality
  })) || [];

  const dayOfWeekData = data?.day_of_week_pattern || [];

  const estimatedVsActual = data?.estimated_vs_actual || [];
  const activityHeatmap = data?.activity_heatmap || [];
  const burndownData = data?.burndown_data || [];

  const getChartInterval = () => {
    if (dateRange === 'week') return 0;
    if (dateRange === 'month') return 4; // Show every 5th day roughly
    return 30; // Every month for yearly
  };

  // ==========================================
  // BEAUTIFUL CUSTOM TOOLTIP
  // ==========================================
  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      const displayLabel = payload[0]?.payload?.full_name || label;
      return (
        <div style={{
          background: 'rgba(20, 25, 35, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          color: '#fff',
          outline: 'none',
          zIndex: 100
        }}>
          {displayLabel && (
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {displayLabel}
            </div>
          )}
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: entry.color || entry.payload?.fill || '#FF6B35', 
                boxShadow: `0 0 8px ${entry.color || entry.payload?.fill || '#FF6B35'}` 
              }} />
              <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                {entry.name}:
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                 {formatter ? formatter(entry.value)[0] : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading-container">
          <motion.div 
            className="analytics-loader"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p>Analyzing your productivity...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analytics-page">
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>No Analytics Data Yet</h3>
          <p>Start tracking your tasks and using the focus timer to see insights here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <motion.div 
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-left">
          <h1 className="page-title">Insights</h1>
          <p className="page-subtitle">Track your performance and improve your workflow</p>
        </div>
        
        <div className="header-controls">
          <div className="date-range-selector">
            <Calendar size={18} />
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="range-select"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
            <ChevronDown size={18} />
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div 
        className="wellbeing-stats"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {wellbeingStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              className={`wellbeing-card wellbeing-${stat.color}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <div className="wellbeing-icon">
                <Icon size={24} strokeWidth={2} />
              </div>
              <div className="wellbeing-content">
                <div className="wellbeing-value">{stat.value}</div>
                <div className="wellbeing-label">{stat.label}</div>
                <div className="wellbeing-description">{stat.description}</div>
                <div className={`wellbeing-change ${stat.trend}`}>
                  {stat.change}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Global SVG Defs for Gradients */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity={1}/>
            <stop offset="100%" stopColor="#FF6B35" stopOpacity={0.3}/>
          </linearGradient>
          <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD93D" stopOpacity={1}/>
            <stop offset="100%" stopColor="#FFD93D" stopOpacity={0.3}/>
          </linearGradient>
          <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ECDC4" stopOpacity={1}/>
            <stop offset="100%" stopColor="#4ECDC4" stopOpacity={0.3}/>
          </linearGradient>
          <linearGradient id="gradDefault" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9C27B0" stopOpacity={1}/>
            <stop offset="100%" stopColor="#9C27B0" stopOpacity={0.3}/>
          </linearGradient>
        </defs>
      </svg>

      {/* Activity Heatmap (GitHub Style) */}
      <motion.div 
        className="heatmap-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        style={{ padding: '24px', overflowX: 'auto' }}
      >
        <div className="heatmap-header" style={{ marginBottom: '20px' }}>
          <Activity size={20} color="#4ECDC4" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f0f1f5', margin: 0, letterSpacing: '0.02em' }}>Activity Heatmap</h3>
          <span style={{ fontSize: '0.85rem', color: '#9ca3af', marginLeft: '8px', fontWeight: '500' }}>Last 365 Days</span>
        </div>
        
        {(() => {
          if (!activityHeatmap || activityHeatmap.length === 0) {
            return <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No activity data found.</div>;
          }

          const getMondayIndex = (d) => (d === 0 ? 6 : d - 1); // 0=Mon ... 6=Sun

          // 1. Group by weeks, padding the first week
          const firstDate = new Date(activityHeatmap[0].date);
          const firstMondayIndex = getMondayIndex(firstDate.getDay());
          
          const paddedData = [
            ...Array(firstMondayIndex).fill(null),
            ...activityHeatmap
          ];

          // Ensure it ends cleanly at Sunday
          const lastDate = new Date(activityHeatmap[activityHeatmap.length - 1].date);
          const lastMondayIndex = getMondayIndex(lastDate.getDay());
          if (lastMondayIndex < 6) {
            paddedData.push(...Array(6 - lastMondayIndex).fill(null));
          }

          const weeks = [];
          for (let i = 0; i < paddedData.length; i += 7) {
            weeks.push(paddedData.slice(i, i + 7));
          }

          // Month Labels calculation
          const monthLabels = [];
          let currentMonth = -1;
          weeks.forEach((week, colIndex) => {
            const firstValidDay = week.find(d => d !== null);
            if (firstValidDay) {
              const dateObj = new Date(firstValidDay.date);
              const month = dateObj.getMonth();
              // Only push if month changed and it's not the very end of the array
              if (month !== currentMonth && colIndex < weeks.length - 2) {
                 monthLabels.push({ 
                   label: dateObj.toLocaleString('default', { month: 'short' }), 
                   col: colIndex 
                 });
                 currentMonth = month;
              }
            }
          });

          return (
            <div className="github-heatmap-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div className="heatmap-months" style={{ display: 'flex', gap: '4px', paddingLeft: '38px', marginBottom: '8px' }}>
                {weeks.map((week, wIdx) => {
                  const hasLabel = monthLabels.find(m => m.col === wIdx);
                  return (
                    <div key={`m-${wIdx}`} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                      {hasLabel && (
                        <span style={{ position: 'absolute', left: 0, bottom: 0, fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {hasLabel.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <div className="heatmap-days-y" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '30px', flexShrink: 0, color: '#9ca3af', fontSize: '11px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>Mon</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}></div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>Wed</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}></div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>Fri</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}></div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}></div>
                </div>
                <div className="github-heatmap-grid" style={{ display: 'flex', gap: '4px', flex: 1, minWidth: 0 }}>
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="heatmap-col" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                      {week.map((day, dIdx) => {
                        if (!day) return <div key={dIdx} style={{ width: '100%', aspectRatio: '1 / 1', background: 'transparent' }} />;
                        
                        const bg = day.count === 0 
                          ? 'rgba(255,255,255,0.04)' 
                          : (day.count < 1 ? 'rgba(78, 205, 196, 0.4)' 
                          : day.count < 3 ? 'rgba(78, 205, 196, 0.6)' 
                          : day.count < 5 ? 'rgba(78, 205, 196, 0.8)' 
                          : 'rgba(78, 205, 196, 1)');

                        return (
                          <div 
                            key={dIdx} 
                            style={{ 
                              width: '100%', aspectRatio: '1 / 1', borderRadius: '3px', 
                              backgroundColor: bg,
                              transition: 'all 0.15s ease-out', cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => { 
                              e.currentTarget.style.transform = 'scale(1.35)'; 
                              e.currentTarget.style.boxShadow = '0 2px 10px rgba(78,205,196,0.6)'; 
                              e.currentTarget.style.zIndex = 10; 
                              e.currentTarget.style.position = 'relative'; 

                              const rect = e.currentTarget.getBoundingClientRect();
                              setHeatmapTooltip({
                                day,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 8
                              });
                            }}
                            onMouseLeave={(e) => { 
                              e.currentTarget.style.transform = 'scale(1)'; 
                              e.currentTarget.style.boxShadow = 'none'; 
                              e.currentTarget.style.zIndex = 1; 
                              setHeatmapTooltip(null);
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="heatmap-legend" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9ca3af', marginTop: '16px', marginRight: '8px' }}>
                <span style={{ marginRight: '4px' }}>Less</span>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255,255,255,0.04)' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(78, 205, 196, 0.4)' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(78, 205, 196, 0.6)' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(78, 205, 196, 0.8)' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(78, 205, 196, 1)' }}></div>
                <span style={{ marginLeft: '4px' }}>More</span>
              </div>

              {heatmapTooltip && (
                <div style={{
                  position: 'fixed',
                  left: heatmapTooltip.x,
                  top: heatmapTooltip.y,
                  transform: 'translate(-50%, -100%)',
                  background: 'rgba(20, 25, 35, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '12px',
                  zIndex: 9999,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {new Date(heatmapTooltip.day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ECDC4' }} />
                    {heatmapTooltip.day.count > 0 ? `${heatmapTooltip.day.count}h focus` : 'No focus time'}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </motion.div>

      {/* Main Charts Grid */}
      <div className="charts-grid">
        {/* Task Completion Trend (Top Wide Chart) */}
        <motion.div 
          className="chart-card chart-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Zap size={20} />
                Focus Time Trend
              </h3>
              <p className="chart-subtitle">Daily focus hours over the selected period</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={completionTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1A1F2B', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#FF6B35" 
                  strokeWidth={3}
                  fill="url(#focusGradient)"
                  name="Focus Hours"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Row 1: Time by Priority | Tasks by Priority */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Eye size={20} />
                Time by Priority
              </h3>
              <p className="chart-subtitle">Hours spent per priority level</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={timeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                  animationBegin={200}
                  animationDuration={800}
                >
                  {timeDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getGradientId(entry.name || entry.fill)} 
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth={2}
                      style={{ outline: 'none', cursor: 'pointer', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))', transition: 'all 0.3s ease' }} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip formatter={(value) => [`${value}h`, 'Time Spent']} />} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="legend-grid">
              {timeDistribution.map((item) => (
                <div key={item.name} className="legend-item">
                  <div className="legend-dot" style={{ background: getCssGradient(item.name || item.fill), boxShadow: `0 0 8px rgba(0,0,0,0.5)` }} />
                  <div className="legend-content">
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-value">{item.value.toFixed(1)}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Target size={20} />
                Tasks by Priority
              </h3>
              <p className="chart-subtitle">Current total task distribution</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={priorityData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.04)', radius: [6, 6, 0, 0] }}
                  content={<CustomTooltip />}
                />
                <Bar 
                  dataKey="value" 
                  radius={[6, 6, 0, 0]}
                  barSize={60}
                  animationDuration={1000}
                >
                  {priorityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getGradientId(entry.name || entry.fill)} 
                      style={{ cursor: 'pointer', filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.3))', transition: 'all 0.3s ease' }} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Row 2: Project Breakdown | Productivity by Hour */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Award size={20} />
                Time Spent Per Project
              </h3>
              <p className="chart-subtitle">Top 5 projects taking your time</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={projectBreakdown} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false}/>
                <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.8)" width={110} tick={{ fontSize: 13 }} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1A1F2B', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value}h`, 'Time Spent']}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="hours" fill="url(#gradLow)" radius={[0, 4, 4, 0]} barSize={24} name="Hours" style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Coffee size={20} />
                Productivity by Hour
              </h3>
              <p className="chart-subtitle">Your best working hours</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  stroke="rgba(255,255,255,0.4)" 
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} 
                  interval={3}
                  tickLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.4)" 
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.04)', radius: [4, 4, 0, 0] }}
                  content={<CustomTooltip formatter={(value) => [`${value}h`, 'Focus Time']} />}
                />
                <Bar 
                  dataKey="hours" 
                  name="Focus Hours" 
                  radius={[4, 4, 0, 0]} 
                  barSize={20}
                  animationDuration={1000}
                >
                  {hourlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} style={{ filter: 'drop-shadow(0px -2px 6px rgba(0,0,0,0.2))' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Other charts */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <CheckCircle size={20} />
                Completion Status
              </h3>
              <p className="chart-subtitle">Completed vs Pending tasks</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getGradientId(entry.name || entry.fill)} stroke="rgba(255,255,255,0.05)" strokeWidth={2} style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))' }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend-grid">
              {statusData.map((item) => (
                <div key={item.name} className="legend-item">
                  <div className="legend-dot" style={{ background: getCssGradient(item.name || item.fill) }} />
                  <div className="legend-content">
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-value">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Calendar size={20} />
                Focus by Day
              </h3>
              <p className="chart-subtitle">Focus intensity across the week</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dayOfWeekData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="day" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="rgba(255,255,255,0.3)" tick={false} axisLine={false} />
                <Radar name="Focus Hours" dataKey="hours" stroke="#FFD93D" strokeWidth={2} fill="url(#gradMedium)" fillOpacity={0.8} style={{ filter: 'drop-shadow(0px 4px 8px rgba(255,217,61,0.3))' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1A1F2B', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value}h`, 'Focus Hours']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          className="chart-card chart-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Focus size={20} />
                Focus Quality Score
              </h3>
              <p className="chart-subtitle">Quality of focus sessions</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={focusQualityData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1A1F2B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" dataKey="quality" stroke="#FFD23F" strokeWidth={3}
                  dot={{ fill: '#FFD23F', r: 5, strokeWidth: 2, stroke: '#1A1F2B' }}
                  activeDot={{ r: 8, fill: '#FFD23F', stroke: '#fff', strokeWidth: 2 }} name="Quality %"
                  style={{ filter: 'drop-shadow(0px 6px 8px rgba(255,210,63,0.3))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Estimated vs Actual Time */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Scale size={20} />
                Estimated vs Actual Time
              </h3>
              <p className="chart-subtitle">Accuracy of your task estimates</p>
            </div>
          </div>
          <div className="chart-container">
            {estimatedVsActual.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={estimatedVsActual} margin={{ top: 20, right: 20, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={85} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<CustomTooltip formatter={(value) => [`${value}h`, '']} />} />
                  <Bar dataKey="estimated" name="Estimated Time" fill="url(#gradLow)" radius={[4, 4, 0, 0]} barSize={16} animationDuration={1000} />
                  <Bar dataKey="actual" name="Actual Time" fill="url(#gradHigh)" radius={[4, 4, 0, 0]} barSize={16} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div style={{ color: '#9ca3af', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>No tasks with estimated duration completed yet.</div>
            )}
          </div>
        </motion.div>

        {/* Burndown Chart */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <div className="chart-header">
            <div>
              <h3 className="chart-title">
                <Flame size={20} />
                Burndown Chart
              </h3>
              <p className="chart-subtitle">Tasks remaining over the period</p>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={burndownData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} interval={dateRange === 'month' ? Math.floor(burndownData.length / 6) : dateRange === 'week' ? 0 : 30} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ background: '#1A1F2B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  formatter={(value) => [value, 'Tasks Remaining']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                />
                <Line 
                  type="monotone" dataKey="remaining" stroke="#FF6B35" strokeWidth={3}
                  dot={{ fill: '#FF6B35', r: 4, strokeWidth: 2, stroke: '#1A1F2B' }}
                  activeDot={{ r: 6, fill: '#FF6B35' }} name="Tasks Remaining"
                  style={{ filter: 'drop-shadow(0px 4px 6px rgba(255,107,53,0.3))' }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Dynamic Insights & Recommendations */}
      <motion.div 
        className="insights-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="section-title">Personalized Insights</h3>
        <div className="insights-grid">
          {(() => {
            const insights = [];
            const daysInRange = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365;
            
            // 1. Peak Productivity
            if (hourlyData && hourlyData.length > 0) {
              const peakHourObj = [...hourlyData].sort((a, b) => b.hours - a.hours)[0];
              if (peakHourObj && peakHourObj.hours > 0) {
                insights.push({
                  type: 'success',
                  icon: <Zap size={24} />,
                  title: 'Prime Time Identified',
                  text: `You are most productive around ${peakHourObj.hour}. Try scheduling your most challenging "Deep Work" tasks during this window.`
                });
              }
            }

            // 2. Workload & Burnout
            const dailyAvgHours = data.total_hours / daysInRange;
            if (dailyAvgHours > 5) {
              insights.push({
                type: 'warning',
                icon: <Coffee size={24} />,
                title: 'High Workload Alert',
                text: `You're averaging ${dailyAvgHours.toFixed(1)} hours of focus daily. Don't forget to take regular breaks to prevent burnout.`
              });
            } else if (dailyAvgHours < 0.5 && data.total_hours > 0) {
              insights.push({
                type: 'info',
                icon: <Target size={24} />,
                title: 'Build Momentum',
                text: `You're averaging under 30 minutes of focus daily. Try starting with one 25-minute Pomodoro session each day to build the habit.`
              });
            }

            // 3. Focus Quality
            const avgQuality = focusQualityData.length 
              ? Math.round(focusQualityData.reduce((acc, curr) => acc + curr.quality, 0) / focusQualityData.length)
              : 100;
              
            if (avgQuality < 70 && data.total_hours > 0) {
              insights.push({
                type: 'warning',
                icon: <Focus size={24} />,
                title: 'Focus Quality Dropping',
                text: `Your focus sessions are frequently ending early (avg quality ${avgQuality}%). Try putting your phone away to minimize distractions.`
              });
            } else if (avgQuality >= 90 && data.total_hours > 0) {
              insights.push({
                type: 'success',
                icon: <Focus size={24} />,
                title: 'Laser Focus',
                text: `Your focus quality is an outstanding ${avgQuality}%. You are successfully resisting distractions during your timer sessions. Keep it up!`
              });
            }

            // 4. Task Management
            if (data.pending_tasks > 15 && data.completion_rate < 50) {
              insights.push({
                type: 'info',
                icon: <ListTodo size={24} />,
                title: 'Backlog Growing',
                text: `You have ${data.pending_tasks} pending tasks. Try using the "2-Minute Rule": if a task takes less than 2 minutes, do it immediately to clear the clutter.`
              });
            } else if (data.completion_rate >= 80 && data.completed_tasks > 0) {
              insights.push({
                type: 'success',
                icon: <TrendingUp size={24} />,
                title: 'Task Execution',
                text: `You've completed ${data.completion_rate}% of your tasks! You're in a high-productivity zone. Keep this momentum going.`
              });
            }

            // 5. Streaks
            if (data.streak_days >= 3) {
              insights.push({
                type: 'success',
                icon: <Flame size={24} />,
                title: 'On Fire!',
                text: `You're on a ${data.streak_days}-day focus streak. You've built a solid daily rhythm. Don't break the chain!`
              });
            }

            // Default
            if (insights.length === 0) {
               insights.push({
                 type: 'info',
                 icon: <Activity size={24} />,
                 title: 'Consistent Tracking',
                 text: `Tracking your time is the first step to improving it. Keep logging your sessions to unlock personalized productivity insights.`
               });
            }

            // Return up to 3 most relevant insights
            return insights.slice(0, 3).map((insight, idx) => (
              <div key={idx} className={`insight-card insight-${insight.type}`}>
                <div className="insight-icon">{insight.icon}</div>
                <div className="insight-content">
                  <h4 className="insight-title">{insight.title}</h4>
                  <p className="insight-text">{insight.text}</p>
                </div>
              </div>
            ));
          })()}
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsPage;