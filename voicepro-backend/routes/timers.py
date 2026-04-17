from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Timer, Task
from datetime import datetime, timedelta
from sqlalchemy import func

timers_bp = Blueprint('timers', __name__, url_prefix='/api/timers')

@timers_bp.route('/start', methods=['POST'])
@jwt_required()
def start_timer():
    """Start a new timer"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Check if there's already an active timer
        active_timer = Timer.query.filter_by(user_id=user_id, is_active=True).first()
        if active_timer:
            return jsonify({'message': 'Please stop the current timer before starting a new one'}), 400
        
        # Validate duration
        if 'duration' not in data:
            return jsonify({'message': 'Duration is required'}), 400
        
        duration = int(data['duration'])
        if duration <= 0:
            return jsonify({'message': 'Duration must be positive'}), 400
        
        # Create timer
        timer = Timer(
            user_id=user_id,
            task_id=data.get('task_id'),
            type=data.get('type', 'manual'),
            duration_minutes=duration,
            start_time=datetime.utcnow(),
            is_active=True
        )
        
        db.session.add(timer)
        db.session.commit()
        
        return jsonify({
            'message': 'Timer started successfully',
            'timer': timer.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to start timer: {str(e)}'}), 500

@timers_bp.route('/log', methods=['POST'])
@jwt_required()
def log_timer():
    """Manually log a completed timer"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Validate duration
        if 'duration' not in data:
            return jsonify({'message': 'Duration is required'}), 400
            
        duration = int(data['duration'])
        if duration <= 0:
            return jsonify({'message': 'Duration must be positive'}), 400
            
        # Create completed timer
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(minutes=duration)
        
        timer = Timer(
            user_id=user_id,
            task_id=data.get('task_id'),
            type=data.get('type', 'manual'),
            duration_minutes=duration,
            start_time=start_time,
            end_time=end_time,
            is_active=False
        )
        
        db.session.add(timer)
        db.session.commit()
        
        return jsonify({
            'message': 'Timer logged successfully',
            'timer': timer.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to log timer: {str(e)}'}), 500

@timers_bp.route('/<int:timer_id>/stop', methods=['POST'])
@jwt_required()
def stop_timer(timer_id):
    """Stop an active timer"""
    try:
        user_id = get_jwt_identity()
        timer = Timer.query.filter_by(timer_id=timer_id, user_id=user_id, is_active=True).first()
        
        if not timer:
            return jsonify({'message': 'Active timer not found'}), 404
        
        timer.end_time = datetime.utcnow()
        # Calculate actual duration in minutes, minimum 1 minute if it ran for any time
        actual_duration = max(1, round((timer.end_time - timer.start_time).total_seconds() / 60))
        timer.duration_minutes = actual_duration
        timer.is_active = False
        
        db.session.commit()
        
        return jsonify({
            'message': 'Timer stopped successfully',
            'timer': timer.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to stop timer: {str(e)}'}), 500

@timers_bp.route('/<int:timer_id>', methods=['DELETE'])
@jwt_required()
def delete_timer(timer_id):
    """Delete a timer log"""
    try:
        user_id = get_jwt_identity()
        timer = Timer.query.filter_by(timer_id=timer_id, user_id=user_id).first()
        
        if not timer:
            return jsonify({'message': 'Timer not found'}), 404
            
        db.session.delete(timer)
        db.session.commit()
        
        return jsonify({'message': 'Timer deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete timer: {str(e)}'}), 500

@timers_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_timer():
    """Get currently active timer"""
    try:
        user_id = get_jwt_identity()
        timer = Timer.query.filter_by(user_id=user_id, is_active=True).first()
        
        if not timer:
            return jsonify({'timer': None}), 200
        
        return jsonify({'timer': timer.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get active timer: {str(e)}'}), 500

@timers_bp.route('/summary/today', methods=['GET'])
@jwt_required()
def get_today_summary():
    """Get today's timer summary"""
    try:
        user_id = get_jwt_identity()
        
        # Get today's date range
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        # Query timers for today
        timers = Timer.query.filter(
            Timer.user_id == user_id,
            Timer.start_time >= today_start,
            Timer.start_time < today_end
        ).all()
        
        # Calculate statistics
        total_minutes = sum(t.duration_minutes for t in timers if not t.is_active)
        total_hours = round(total_minutes / 60, 1) if total_minutes else 0
        
        sessions = len([t for t in timers if not t.is_active])
        pomodoros = len([t for t in timers if t.type == 'pomodoro' and not t.is_active])
        
        return jsonify({
            'total_hours': total_hours,
            'total_minutes': total_minutes,
            'sessions': sessions,
            'pomodoros': pomodoros,
            'timers': [t.to_dict() for t in timers]
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get summary: {str(e)}'}), 500

@timers_bp.route('/clear-all', methods=['DELETE'])
@jwt_required()
def clear_all_timers():
    """Delete all timer history for the current user"""
    try:
        user_id = get_jwt_identity()
        Timer.query.filter(
            Timer.user_id == user_id,
            Timer.is_active == False  # noqa: E712 – keep inactive-only
        ).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'message': 'All timer history cleared'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to clear history: {str(e)}'}), 500

@timers_bp.route('/history', methods=['GET'])
@jwt_required()
def get_timer_history():
    """Get timer history"""
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters
        days = int(request.args.get('days', 7))
        
        # Get date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Query timers
        timers = Timer.query.filter(
            Timer.user_id == user_id,
            Timer.start_time >= start_date,
            Timer.start_time <= end_date
        ).order_by(Timer.start_time.desc()).all()
        
        return jsonify([t.to_dict() for t in timers]), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get timer history: {str(e)}'}), 500
