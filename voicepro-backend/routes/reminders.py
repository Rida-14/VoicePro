from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Reminder, Task

reminders_bp = Blueprint('reminders', __name__, url_prefix='/api/reminders')


def parse_iso_datetime(dt_str):
    """Parse ISO datetime strings that may include Z or +00:00."""
    if not dt_str:
        return None

    clean = dt_str.replace('Z', '').replace('+00:00', '').split('.')[0]
    return datetime.fromisoformat(clean)


@reminders_bp.route('', methods=['POST'])
@jwt_required()
def create_reminder():
    """Create a manual reminder for current user"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}

        message = (data.get('message') or '').strip()
        if not message:
            return jsonify({'message': 'Reminder message is required'}), 400

        reminder_time = None

        if data.get('reminder_time'):
            reminder_time = parse_iso_datetime(data.get('reminder_time'))
        elif data.get('in_minutes') is not None:
            minutes = int(data.get('in_minutes'))
            if minutes <= 0:
                return jsonify({'message': 'in_minutes must be greater than 0'}), 400
            reminder_time = datetime.utcnow() + timedelta(minutes=minutes)

        if not reminder_time:
            return jsonify({'message': 'Provide reminder_time or in_minutes'}), 400

        task_id = data.get('task_id')
        if task_id is not None:
            task = Task.query.filter_by(task_id=task_id, user_id=user_id).first()
            if not task:
                return jsonify({'message': 'Task not found for provided task_id'}), 404

        reminder = Reminder(
            user_id=user_id,
            task_id=task_id,
            message=message,
            reminder_time=reminder_time,
            is_sent=False,
            reminder_type='manual'
        )

        db.session.add(reminder)
        db.session.commit()

        return jsonify({
            'message': 'Reminder created successfully',
            'reminder': reminder.to_dict()
        }), 201
    except ValueError:
        return jsonify({'message': 'Invalid date/time or in_minutes format'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create reminder: {str(e)}'}), 500

@reminders_bp.route('', methods=['GET'])
@jwt_required()
def get_reminders():
    """Get all pending (not yet sent) reminders for current user"""
    try:
        user_id = int(get_jwt_identity())
        reminders = Reminder.query.filter_by(user_id=user_id, is_sent=False).order_by(Reminder.reminder_time.asc()).all()
        return jsonify([r.to_dict() for r in reminders]), 200
    except Exception as e:
        return jsonify({'message': f'Failed to get reminders: {str(e)}'}), 500

@reminders_bp.route('/history', methods=['GET'])
@jwt_required()
def get_reminder_history():
    """Get all fired (sent) reminders for current user, newest first"""
    try:
        user_id = int(get_jwt_identity())
        reminders = (
            Reminder.query
            .filter_by(user_id=user_id, is_sent=True)
            .order_by(Reminder.fired_at.desc().nullslast(), Reminder.reminder_time.desc())
            .limit(50)
            .all()
        )
        return jsonify([r.to_dict() for r in reminders]), 200
    except Exception as e:
        return jsonify({'message': f'Failed to get reminder history: {str(e)}'}), 500

@reminders_bp.route('/history', methods=['DELETE'])
@jwt_required()
def clear_reminder_history():
    """Delete all fired reminders for current user"""
    try:
        user_id = int(get_jwt_identity())
        Reminder.query.filter_by(user_id=user_id, is_sent=True).delete()
        db.session.commit()
        return jsonify({'message': 'Reminder history cleared'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to clear history: {str(e)}'}), 500

@reminders_bp.route('/<int:reminder_id>/dismiss', methods=['POST'])
@jwt_required()
def dismiss_reminder(reminder_id):
    """Mark a reminder as sent/dismissed and record when it fired"""
    try:
        user_id = int(get_jwt_identity())
        reminder = Reminder.query.filter_by(reminder_id=reminder_id, user_id=user_id).first()

        if not reminder:
            return jsonify({'message': 'Reminder not found'}), 404

        reminder.is_sent = True
        reminder.fired_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Reminder dismissed', 'reminder': reminder.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to dismiss reminder: {str(e)}'}), 500

@reminders_bp.route('/<int:reminder_id>', methods=['DELETE'])
@jwt_required()
def delete_reminder(reminder_id):
    """Delete a single reminder (from history)"""
    try:
        user_id = int(get_jwt_identity())
        reminder = Reminder.query.filter_by(reminder_id=reminder_id, user_id=user_id).first()

        if not reminder:
            return jsonify({'message': 'Reminder not found'}), 404

        db.session.delete(reminder)
        db.session.commit()

        return jsonify({'message': 'Reminder deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete reminder: {str(e)}'}), 500

@reminders_bp.route('/<int:reminder_id>', methods=['PUT'])
@jwt_required()
def update_reminder(reminder_id):
    """Update a reminder (e.g., change reminder time)"""
    try:
        user_id = int(get_jwt_identity())
        reminder = Reminder.query.filter_by(reminder_id=reminder_id, user_id=user_id).first()

        if not reminder:
            return jsonify({'message': 'Reminder not found'}), 404

        data = request.get_json() or {}

        # Update reminder_time if provided
        if 'reminder_time' in data:
            reminder_time_str = data.get('reminder_time')
            reminder.reminder_time = parse_iso_datetime(reminder_time_str)

        # Update message if provided
        if 'message' in data:
            message = data.get('message', '').strip()
            if message:
                reminder.message = message

        db.session.commit()

        return jsonify({'message': 'Reminder updated', 'reminder': reminder.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update reminder: {str(e)}'}), 500
