from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Task, Timer, Reminder
from datetime import datetime, timedelta

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')

def parse_iso(dt_str):
    """Parse an ISO 8601 string that may end with Z or +00:00."""
    if not dt_str:
        return None
    # Strip timezone info so fromisoformat works on Python 3.9 and earlier
    clean = dt_str.replace('Z', '').replace('+00:00', '').split('.')[0]
    return datetime.fromisoformat(clean)

@tasks_bp.route('', methods=['GET'])
@jwt_required()
def get_tasks():
    """Get all tasks for current user"""
    try:
        user_id = int(get_jwt_identity())
        print(f"✅ JWT verified! User ID: {user_id}")
        print(f"📝 Request headers: {dict(request.headers)}")
        
        # Get query parameters
        status = request.args.get('status')  # pending, completed, cancelled
        priority = request.args.get('priority')  # low, medium, high
        
        # Build query
        query = Task.query.filter_by(user_id=user_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if priority:
            query = query.filter_by(priority=priority)
        
        # Order by created_at descending
        tasks = query.order_by(Task.created_at.desc()).all()
        
        return jsonify([task.to_dict() for task in tasks]), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get tasks: {str(e)}'}), 500

@tasks_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    """Get a specific task"""
    try:
        user_id = int(get_jwt_identity())
        task = Task.query.filter_by(task_id=task_id, user_id=user_id).first()
        
        if not task:
            return jsonify({'message': 'Task not found'}), 404
        
        return jsonify(task.to_dict()), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get task: {str(e)}'}), 500

@tasks_bp.route('', methods=['POST'])
@jwt_required()
def create_task():
    """Create a new task"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Validate required fields
        if 'title' not in data:
            return jsonify({'message': 'Title is required'}), 400
        
        title = data['title'].strip()
        if not title:
            return jsonify({'message': 'Title cannot be empty'}), 400
        
        # Create task
        task = Task(
            user_id=user_id,
            title=title,
            description=data.get('description', ''),
            category=data.get('category', 'Client Work'),
            status=data.get('status', 'pending'),
            priority=data.get('priority', 'medium'),
            duration=data.get('duration'),
            due_date=parse_iso(data.get('due_date'))
        )
        
        db.session.add(task)
        db.session.flush() # get task.task_id
        
        # Handle reminders
        if task.due_date and data.get('reminder_offset') is not None:
            offset_minutes = int(data['reminder_offset'])
            if offset_minutes > 0:
                reminder_time = task.due_date - timedelta(minutes=offset_minutes)
                reminder = Reminder(
                    user_id=user_id,
                    task_id=task.task_id,
                    message=f"Task due soon: {task.title}",
                    reminder_time=reminder_time,
                    is_sent=False,
                    reminder_type='task_deadline'
                )
                db.session.add(reminder)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Task created successfully',
            'task': task.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create task: {str(e)}'}), 500

@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """Update a task"""
    try:
        user_id = int(get_jwt_identity())
        task = Task.query.filter_by(task_id=task_id, user_id=user_id).first()
        
        if not task:
            return jsonify({'message': 'Task not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'title' in data:
            title = data['title'].strip()
            if not title:
                return jsonify({'message': 'Title cannot be empty'}), 400
            task.title = title
        
        if 'description' in data:
            task.description = data['description']
        
        if 'category' in data:
            task.category = data['category']
        
        if 'status' in data:
            task.status = data['status']
            # Auto-set completed_at when status changes to completed
            if data['status'] == 'completed' and not task.completed_at:
                task.completed_at = datetime.utcnow()
            # Clear completed_at when task is reopened
            elif data['status'] == 'pending':
                task.completed_at = None
        
        if 'completed_at' in data:
            if data['completed_at'] is None:
                task.completed_at = None
            elif data['completed_at']:
                try:
                    task.completed_at = datetime.fromisoformat(data['completed_at'].replace('Z', '+00:00').replace('+00:00', ''))
                except Exception:
                    task.completed_at = datetime.utcnow()
        
        if 'priority' in data:
            task.priority = data['priority']
        
        if 'duration' in data:
            task.duration = data['duration']
        
        if 'due_date' in data:
            task.due_date = parse_iso(data['due_date'])
            
        # Handle reminders sync
        existing_reminder = Reminder.query.filter_by(task_id=task_id).first()
        
        if not task.due_date:
            # If due date is removed, delete existing reminder
            if existing_reminder:
                db.session.delete(existing_reminder)
        elif 'reminder_offset' in data or 'due_date' in data:
            # Either due_date or offset changed
            offset_minutes = int(data.get('reminder_offset', 0)) if 'reminder_offset' in data else None
            
            if offset_minutes is not None and offset_minutes > 0:
                reminder_time = task.due_date - timedelta(minutes=offset_minutes)
                if existing_reminder:
                    existing_reminder.reminder_time = reminder_time
                    existing_reminder.message = f"Task due soon: {task.title}"
                    existing_reminder.is_sent = False
                else:
                    reminder = Reminder(
                        user_id=user_id,
                        task_id=task.task_id,
                        message=f"Task due soon: {task.title}",
                        reminder_time=reminder_time,
                        is_sent=False,
                        reminder_type='task_deadline'
                    )
                    db.session.add(reminder)
            elif offset_minutes == 0 and existing_reminder:
                 db.session.delete(existing_reminder)
                 
                 
        db.session.commit()
        
        return jsonify({
            'message': 'Task updated successfully',
            'task': task.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update task: {str(e)}'}), 500

@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    """Delete a task"""
    try:
        user_id = int(get_jwt_identity())
        task = Task.query.filter_by(task_id=task_id, user_id=user_id).first()
        
        if not task:
            return jsonify({'message': 'Task not found'}), 404
        
        # Nullify task_id on linked timer logs so FK constraint doesn't block deletion
        Timer.query.filter_by(task_id=task_id).update({'task_id': None})
        
        db.session.delete(task)
        db.session.commit()
        
        return jsonify({'message': 'Task deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete task: {str(e)}'}), 500

@tasks_bp.route('/<int:task_id>/complete', methods=['PATCH'])
@jwt_required()
def complete_task(task_id):
    """Mark a task as complete"""
    try:
        user_id = int(get_jwt_identity())
        task = Task.query.filter_by(task_id=task_id, user_id=user_id).first()
        
        if not task:
            return jsonify({'message': 'Task not found'}), 404
        
        task.status = 'completed'
        task.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Task completed successfully',
            'task': task.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to complete task: {str(e)}'}), 500
