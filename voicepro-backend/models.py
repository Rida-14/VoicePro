from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    """User model"""
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)  # Nullable for Google OAuth users
    auth_provider = db.Column(db.String(20), default='local')  # 'local' or 'google'
    avatar_url = db.Column(db.Text, nullable=True)  # Google profile picture URL
    profile_picture = db.Column(db.Text, nullable=True) # Base64 encoded image string
    email_notifications = db.Column(db.Boolean, default=True)
    push_notifications = db.Column(db.Boolean, default=False)
    task_reminders = db.Column(db.Boolean, default=True)
    focus_sounds = db.Column(db.Boolean, default=True)
    voice_feedback = db.Column(db.Boolean, default=True)
    theme = db.Column(db.String(20), default='dark')
    language = db.Column(db.String(10), default='en')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tasks = db.relationship('Task', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    timers = db.relationship('Timer', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    reminders = db.relationship('Reminder', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Check if password matches"""
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'user_id': self.user_id,
            'name': self.name,
            'email': self.email,
            'auth_provider': self.auth_provider or 'local',
            'avatar_url': self.avatar_url,
            'profile_picture': self.profile_picture or self.avatar_url,
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'task_reminders': self.task_reminders,
            'focus_sounds': self.focus_sounds,
            'voice_feedback': self.voice_feedback,
            'theme': self.theme,
            'language': self.language,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Task(db.Model):
    """Task model"""
    __tablename__ = 'tasks'
    
    task_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100), default='Client Work')
    status = db.Column(db.String(20), default='pending')  # pending, completed, cancelled
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    duration = db.Column(db.String(20))  # stored as string e.g. '30m', '1h 30m'
    due_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def to_dict(self):
        """Convert to dictionary"""
        def fmt(dt):
            """Format datetime as UTC ISO string with Z suffix so JS parses it correctly."""
            if dt is None:
                return None
            iso = dt.isoformat()
            # If there's no timezone info, treat as UTC by appending +00:00
            if '+' not in iso and iso[-1] != 'Z':
                iso += '+00:00'
            return iso

        return {
            'task_id': self.task_id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'status': self.status,
            'priority': self.priority,
            'duration': self.duration,
            'due_date': fmt(self.due_date),
            'created_at': fmt(self.created_at),
            'updated_at': fmt(self.updated_at),
            'completed_at': fmt(self.completed_at),
        }

class Timer(db.Model):
    """Timer model"""
    __tablename__ = 'timers'
    
    timer_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.task_id'))
    type = db.Column(db.String(20), default='manual')  # pomodoro, manual
    duration_minutes = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to Task so we can access self.task.title
    task = db.relationship('Task', foreign_keys=[task_id], lazy='select')
    
    def to_dict(self):
        """Convert to dictionary"""
        def fmt(dt):
            return (dt.isoformat() + 'Z') if dt else None
        return {
            'timer_id': self.timer_id,
            'user_id': self.user_id,
            'task_id': self.task_id,
            'task_title': self.task.title if self.task else None,
            'type': self.type,
            'duration_minutes': self.duration_minutes,
            'start_time': fmt(self.start_time),
            'end_time': fmt(self.end_time),
            'is_active': self.is_active,
            'created_at': fmt(self.created_at),
        }

class Reminder(db.Model):
    """Reminder model"""
    __tablename__ = 'reminders'
    
    reminder_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.task_id'))
    message = db.Column(db.String(500), nullable=False)
    reminder_time = db.Column(db.DateTime, nullable=False, index=True)
    is_sent = db.Column(db.Boolean, default=False)
    fired_at = db.Column(db.DateTime, nullable=True)  # When the alarm actually rang
    reminder_type = db.Column(db.String(20), default='manual')  # 'manual' or 'task_deadline'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        def fmt_utc(dt):
            """Format a naive datetime as UTC ISO string with +00:00 so JS parses correctly."""
            if dt is None:
                return None
            iso = dt.isoformat()
            if '+' not in iso and iso[-1] != 'Z':
                iso += '+00:00'
            return iso

        return {
            'reminder_id': self.reminder_id,
            'user_id': self.user_id,
            'task_id': self.task_id,
            'message': self.message,
            'reminder_time': fmt_utc(self.reminder_time),
            'is_sent': self.is_sent,
            'fired_at': fmt_utc(self.fired_at),
            'reminder_type': self.reminder_type or 'manual',
            'created_at': fmt_utc(self.created_at)
        }

class PasswordResetToken(db.Model):
    """Password reset token model"""
    __tablename__ = 'password_reset_tokens'
    
    token_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
