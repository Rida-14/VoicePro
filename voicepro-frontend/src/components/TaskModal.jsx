import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { Plus, X, Mic, Folder, Calendar, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, eachDayOfInterval, parseISO } from 'date-fns';
import './TaskModal.css';

const DEFAULT_CATEGORIES = ['Client Work', 'Meeting', 'Admin', 'Bills & utilities'];

const CustomSelect = ({ value, onChange, options, label, icon: Icon, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || { label: value, value };

  return (
    <div className="custom-select-container" ref={selectRef}>
      <div
        className={`custom-select-trigger ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="trigger-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icon && <Icon size={14} className="trigger-icon" />}
          <span>{selectedOption.label || 'Select...'}</span>
        </div>
        <ChevronRight size={14} className={`trigger-arrow ${isOpen ? 'open' : ''}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-select-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
                {value === opt.value && <Check size={14} className="check-icon" />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WheelPicker = ({ options, value, onChange, label, itemHeight = 50 }) => {
  const columnRef = useRef(null);

  useEffect(() => {
    if (columnRef.current) {
      const index = options.indexOf(value);
      if (index !== -1) {
        requestAnimationFrame(() => {
          if (columnRef.current) {
            columnRef.current.scrollTop = index * itemHeight;
          }
        });
      }
    }
  }, [value, options, itemHeight]);

  const handleScroll = (e) => {
    const index = Math.round(e.target.scrollTop / itemHeight);
    if (options[index] !== undefined && options[index] !== value) {
      onChange(options[index]);
    }
  };

  return (
    <div className="wheel-column-wrapper">
      {label && <span className="wheel-label-tiny">{label}</span>}
      <div
        className="wheel-column"
        ref={columnRef}
        onScroll={handleScroll}
        style={{ height: itemHeight * 3 }}
      >
        <div className="wheel-spacer" style={{ height: itemHeight, minHeight: itemHeight }}></div>
        {options.map((opt) => (
          <div
            key={opt}
            className={`wheel-item ${value === opt ? 'active' : ''}`}
            onClick={() => onChange(opt)}
            style={{ height: itemHeight, lineHeight: `${itemHeight}px` }}
          >
            {opt.toString().padStart(2, '0')}
          </div>
        ))}
        <div className="wheel-spacer" style={{ height: itemHeight, minHeight: itemHeight }}></div>
      </div>
    </div>
  );
};

const CustomDateTimePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const pickerRef = useRef(null);

  const dateValue = value ? new Date(value) : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderHeader = () => (
    <div className="calendar-header">
      <button type="button" className="cal-nav-btn" onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)); }}><ChevronLeft size={16} /></button>
      <span className="current-month-label">{format(currentMonth, 'MMMM yyyy')}</span>
      <button type="button" className="cal-nav-btn" onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)); }}><ChevronRight size={16} /></button>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return <div className="calendar-weekdays">{days.map(d => <div key={d} className="calendar-weekday">{d}</div>)}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        days.push(
          <div
            key={day.toString()}
            className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'out-of-month' : isSameDay(day, dateValue) ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              const newDate = new Date(cloneDay);
              if (dateValue) {
                newDate.setHours(dateValue.getHours());
                newDate.setMinutes(dateValue.getMinutes());
              } else {
                newDate.setHours(12);
                newDate.setMinutes(0);
              }
              onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
            }}
          >
            <span className="day-number">{format(day, 'd')}</span>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={day.toString()} className="calendar-row">{days}</div>);
      days = [];
    }
    return <div className="calendar-grid">{rows}</div>;
  };

  const handleTimeChange = (type, val) => {
    const newDate = dateValue ? new Date(dateValue) : new Date();
    if (type === 'h') newDate.setHours(val);
    else newDate.setMinutes(val);
    onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <div className="custom-picker-container" ref={pickerRef}>
      <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="trigger-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={14} className="trigger-icon" style={{ color: '#ff6b35' }} />
          <span>{dateValue ? format(dateValue, 'MMM d, yyyy HH:mm') : 'Set date & time'}</span>
        </div>
        <ChevronRight size={14} className={`trigger-arrow ${isOpen ? 'open' : ''}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-picker-popover"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
          >
            <div className="calendar-section">
              {renderHeader()}
              {renderDays()}
              {renderCells()}
            </div>
            <div className="time-section-wheels">
              <div className="time-label-header"><Clock size={12} /> Set Time</div>
              <div className="wheel-headers" style={{ marginBottom: '-8px' }}><span>Hours</span><span>Minutes</span></div>
              <div className="time-wheels-wrapper">
                <div className="wheel-highlight-bar-mini"></div>
                <WheelPicker
                  options={Array.from({ length: 24 }, (_, i) => i)}
                  value={dateValue ? dateValue.getHours() : 12}
                  onChange={(val) => handleTimeChange('h', val)}
                  itemHeight={50}
                />
                <div className="wheel-colon-mini">:</div>
                <WheelPicker
                  options={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]}
                  value={dateValue ? Math.floor(dateValue.getMinutes() / 5) * 5 : 0}
                  onChange={(val) => handleTimeChange('m', val)}
                  itemHeight={50}
                />
              </div>
            </div>
            <button type="button" className="btn-primary-solid tiny-btn" onClick={() => setIsOpen(false)}>Done</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TaskModal = ({ isOpen, onClose, mode = 'create', taskToEdit = null }) => {
  const { tasks, createTask, updateTask, user } = useApp();

  const [newTask, setNewTask] = useState({
    title: '',
    category: 'Client Work',
    duration: '30m',
    priority: 'Medium',
    description: '',
    due_date: '',
    reminder_offset: ''
  });

  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Wheel picker states
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(30);
  const hourColumnRef = useRef(null);
  const minuteColumnRef = useRef(null);

  // Initialize form if in edit mode
  useEffect(() => {
    if (mode === 'edit' && taskToEdit && isOpen) {
      let dueDateLocal = '';
      if (taskToEdit.due_date) {
        const raw = taskToEdit.due_date.endsWith('Z') ? taskToEdit.due_date : taskToEdit.due_date.replace('+00:00', 'Z');
        const d = new Date(raw);
        const pad = n => String(n).padStart(2, '0');
        dueDateLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      setNewTask({
        title: taskToEdit.title,
        category: taskToEdit.category || 'Client Work',
        duration: taskToEdit.duration || '30m',
        priority: taskToEdit.priority || 'Medium',
        description: taskToEdit.description || '',
        due_date: dueDateLocal,
        reminder_offset: ''
      });

      // Parse duration for wheel picker
      const hourMatch = (taskToEdit.duration || '').match(/(\d+)h/);
      const minMatch = (taskToEdit.duration || '').match(/(\d+)m/);
      setSelectedHour(hourMatch ? parseInt(hourMatch[1]) : 0);
      setSelectedMinute(minMatch ? parseInt(minMatch[1]) : 0);
    } else if (mode === 'create' && isOpen) {
      // Reset for create mode
      setNewTask({
        title: '',
        category: 'Client Work',
        duration: '30m',
        priority: 'Medium',
        description: '',
        due_date: '',
        reminder_offset: ''
      });
      setSelectedHour(0);
      setSelectedMinute(30);
    }
  }, [mode, taskToEdit, isOpen]);

  // Sync Categories
  useEffect(() => {
    if (!isOpen) return;
    const taskCategories = tasks.map(t => t.category).filter(Boolean);
    let savedCategories = [];
    if (user?.email) {
      try {
        const saved = localStorage.getItem(`voicepro_categories_${user.email}`);
        if (saved) savedCategories = JSON.parse(saved);
      } catch (e) { }
    }
    const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...savedCategories, ...taskCategories]));
    setCategories(combined);
  }, [tasks, user, isOpen]);

  // Wheel picker scroll sync
  useEffect(() => {
    if (showDurationPicker) {
      setTimeout(() => {
        if (hourColumnRef.current) hourColumnRef.current.scrollTop = selectedHour * 50;
        if (minuteColumnRef.current) minuteColumnRef.current.scrollTop = (selectedMinute / 5) * 50;
      }, 10);
    }
  }, [showDurationPicker, selectedHour, selectedMinute]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const taskToSubmit = {
        title: newTask.title,
        category: newTask.category,
        duration: newTask.duration,
        priority: newTask.priority,
        description: newTask.description,
        status: 'pending'
      };

      if (newTask.due_date) {
        taskToSubmit.due_date = new Date(newTask.due_date).toISOString();
        if (newTask.reminder_offset) {
          taskToSubmit.reminder_offset = parseInt(newTask.reminder_offset, 10);
        }
      }

      if (mode === 'edit') {
        await updateTask(taskToEdit.task_id, taskToSubmit);
      } else {
        await createTask(taskToSubmit);
      }
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      const trimmedName = newCategoryName.trim();
      const updated = [...categories, trimmedName];
      setCategories(updated);
      setNewTask({ ...newTask, category: trimmedName });
      setNewCategoryName('');
      if (user?.email) {
        localStorage.setItem(`voicepro_categories_${user.email}`, JSON.stringify(updated));
      }
    }
  };

  const handleDeleteCategory = (catName) => {
    if (DEFAULT_CATEGORIES.includes(catName)) return;
    const updated = categories.filter(c => c !== catName);
    setCategories(updated);
    if (newTask.category === catName) setNewTask({ ...newTask, category: 'Client Work' });
    if (user?.email) {
      localStorage.setItem(`voicepro_categories_${user.email}`, JSON.stringify(updated));
    }
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay">
          <motion.div
            className="modal-container glass-box"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            <div className="modal-header">
              <div>
                <h2>{mode === 'edit' ? 'Edit Task' : 'Create New Task'}</h2>
                <p className="modal-subtitle">{mode === 'edit' ? 'Update task details' : 'Enter your task details below'}</p>
              </div>
              <button className="btn-icon" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="modal-form">
              <div className="form-group">
                <label>Task Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="e.g. Design Landing Page"
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Due Date & Time</label>
                    <CustomDateTimePicker
                      value={newTask.due_date}
                      onChange={val => setNewTask({ ...newTask, due_date: val })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Remind Me</label>
                    <CustomSelect
                      value={newTask.reminder_offset}
                      disabled={!newTask.due_date}
                      onChange={val => setNewTask({ ...newTask, reminder_offset: val })}
                      options={[
                        { label: 'No reminder', value: '' },
                        { label: '15 min before', value: '15' },
                        { label: '1 hour before', value: '60' },
                        { label: '2 hours before', value: '120' },
                        { label: '1 day before', value: '1440' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ marginBottom: 0 }}><Folder size={12} style={{ marginRight: '4px', display: 'inline' }} /> Category</label>
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="inline-new-cat-btn"
                    >
                      <Plus size={12} /> New
                    </button>
                  </div>
                  <CustomSelect
                    value={newTask.category}
                    onChange={val => setNewTask({ ...newTask, category: val })}
                    options={categories.map(cat => ({ label: cat, value: cat }))}
                  />
                </div>

                <div className="form-group relative-wrapper">
                  <label>⏱ EST. DURATION</label>
                  <div className="modal-input" onClick={() => setShowDurationPicker(!showDurationPicker)}>
                    {newTask?.duration || '10m'}
                  </div>
                  <AnimatePresence>
                    {showDurationPicker && (
                      <motion.div className="duration-wheel-popover" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="wheel-picker-ui">
                          <div className="wheel-headers" style={{ marginBottom: '-8px' }}><span>Hours</span><span>Minutes</span></div>
                          <div className="time-wheels-wrapper">
                            <div className="wheel-highlight-bar-mini"></div>
                            <WheelPicker
                              options={[0, 1, 2, 3, 4, 5, 6, 7, 8]}
                              value={selectedHour}
                              onChange={setSelectedHour}
                              itemHeight={50}
                            />
                            <div className="wheel-colon-mini">:</div>
                            <WheelPicker
                              options={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]}
                              value={selectedMinute}
                              onChange={setSelectedMinute}
                              itemHeight={50}
                            />
                          </div>
                          <button type="button" className="confirm-duration-btn" onClick={() => {
                            setNewTask({ ...newTask, duration: `${selectedHour > 0 ? selectedHour + 'h ' : ''}${selectedMinute}m` });
                            setShowDurationPicker(false);
                          }}>Set Duration</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="form-group">
                <label>Priority Level</label>
                <div className="priority-segments">
                  {['Low', 'Medium', 'High'].map(level => (
                    <button key={level} type="button" className={`priority-btn ${newTask.priority === level ? `active-${level.toLowerCase()}` : ''}`} onClick={() => setNewTask({ ...newTask, priority: level })}>{level}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  className="modal-input"
                  placeholder="Add details..."
                  rows="2"
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  style={{ maxHeight: '100px', minHeight: '60px' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-primary-solid">{mode === 'edit' ? 'Save Changes' : 'Create Task'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Category Modal - Nested or Shared? For simplicity nested here */}
      <AnimatePresence>
        {isAddCategoryOpen && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <motion.div className="modal-container glass-box" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>Manage Categories</h2>
                <button className="btn-icon" onClick={() => setIsAddCategoryOpen(false)}><X size={20} /></button>
              </div>
              <div className="categories-list">
                {categories.map(cat => (
                  <div key={cat} className="category-item">
                    <span>{cat}</span>
                    {!DEFAULT_CATEGORIES.includes(cat) && <button onClick={() => handleDeleteCategory(cat)}><X size={14} /></button>}
                  </div>
                ))}
              </div>
              <div className="form-group" style={{ marginTop: '20px' }}>
                <input type="text" className="modal-input" placeholder="New category..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button className="btn-primary-solid" style={{ marginTop: '10px', width: '100%' }} onClick={handleAddCategory}>Add Category</button>
              </div>
              <button className="btn-ghost" style={{ marginTop: '10px', width: '100%' }} onClick={() => setIsAddCategoryOpen(false)}>Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default TaskModal;
