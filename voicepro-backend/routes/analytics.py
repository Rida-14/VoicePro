from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Task, Timer
from datetime import datetime, timedelta
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    """Get productivity insights"""
    try:
        user_id = int(get_jwt_identity())
        period = request.args.get('period', 'week')  # week, month, year
        
        # Calculate date range
        end_date = datetime.utcnow()
        if period == 'week':
            start_date = end_date - timedelta(days=7)
            prev_start = start_date - timedelta(days=7)
        elif period == 'month':
            start_date = end_date - timedelta(days=30)
            prev_start = start_date - timedelta(days=30)
        elif period == 'year':
            start_date = end_date - timedelta(days=365)
            prev_start = start_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=7)
            prev_start = start_date - timedelta(days=7)
        
        # Get tasks
        tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.created_at >= start_date
        ).all()
        
        # Get timers
        timers = Timer.query.filter(
            Timer.user_id == user_id,
            Timer.start_time >= start_date
        ).all()
        
        # ── Previous period data for trend comparison ──
        prev_tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.created_at >= prev_start,
            Task.created_at < start_date
        ).all()
        prev_timers = Timer.query.filter(
            Timer.user_id == user_id,
            Timer.start_time >= prev_start,
            Timer.start_time < start_date
        ).all()
        prev_completed = len([t for t in prev_tasks if t.status == 'completed'])
        prev_pending = len([t for t in prev_tasks if t.status == 'pending'])
        prev_minutes = sum(t.duration_minutes for t in prev_timers if not t.is_active)
        prev_hours = round(prev_minutes / 60, 1) if prev_minutes else 0
        prev_pomodoros = len([t for t in prev_timers if t.type == 'pomodoro' and not t.is_active])
        
        # Calculate insights
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.status == 'completed'])
        pending_tasks = len([t for t in tasks if t.status == 'pending'])
        
        total_minutes = sum(t.duration_minutes for t in timers if not t.is_active)
        total_hours = round(total_minutes / 60, 1) if total_minutes else 0
        
        focus_sessions = len([t for t in timers if not t.is_active])
        pomodoros = len([t for t in timers if t.type == 'pomodoro' and not t.is_active])
        
        # Avg session length
        active_timers = [t for t in timers if not t.is_active]
        avg_session_minutes = round(total_minutes / len(active_timers)) if active_timers else 0
        
        # Current streak (consecutive days with at least 1 completed timer)
        streak_days = 0
        check_date = end_date.date()
        all_user_timers = Timer.query.filter(
            Timer.user_id == user_id,
            Timer.is_active == False
        ).all()
        timer_dates = set(t.start_time.date() for t in all_user_timers if t.start_time)
        while check_date in timer_dates:
            streak_days += 1
            check_date -= timedelta(days=1)
        
        # Completion rate
        completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
        
        # Get all tasks for burndown calculation (need backlog prior to start_date)
        all_tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.created_at <= end_date
        ).all()
        
        # Generate time series data for charts
        focus_time_data = generate_focus_time_data(timers, start_date, end_date)
        priority_breakdown = generate_priority_breakdown(tasks)
        time_priority_breakdown = generate_time_priority_breakdown(timers)
        status_breakdown = generate_status_breakdown(tasks)
        project_breakdown = generate_project_breakdown(timers)
        hourly_pattern = generate_hourly_pattern(timers)
        focus_quality = generate_focus_quality(timers, start_date, end_date)
        day_of_week_pattern = generate_day_of_week_pattern(timers)
        
        estimated_vs_actual = generate_estimated_vs_actual(tasks, timers)
        activity_heatmap = generate_activity_heatmap(user_id)
        burndown_data = generate_burndown_data(all_tasks, start_date, end_date)
        
        return jsonify({
            'period': period,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'total_hours': total_hours,
            'focus_sessions': focus_sessions,
            'pomodoros': pomodoros,
            'completion_rate': completion_rate,
            'prev_completed_tasks': prev_completed,
            'prev_total_hours': prev_hours,
            'prev_pending_tasks': prev_pending,
            'prev_pomodoros': prev_pomodoros,
            'avg_session_minutes': avg_session_minutes,
            'streak_days': streak_days,
            'focus_time': focus_time_data,
            'priority_breakdown': priority_breakdown,
            'time_priority_breakdown': time_priority_breakdown,
            'status_breakdown': status_breakdown,
            'project_breakdown': project_breakdown,
            'hourly_pattern': hourly_pattern,
            'focus_quality': focus_quality,
            'day_of_week_pattern': day_of_week_pattern,
            'estimated_vs_actual': estimated_vs_actual,
            'activity_heatmap': activity_heatmap,
            'burndown_data': burndown_data
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get insights: {str(e)}'}), 500

def generate_focus_time_data(timers, start_date, end_date):
    """Generate daily focus time data"""
    daily_data = {}
    
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        daily_data[date_str] = 0
        current_date += timedelta(days=1)
    
    # Aggregate timer data by day
    for timer in timers:
        if not timer.is_active and timer.start_time:
            date_str = timer.start_time.strftime('%Y-%m-%d')
            if date_str in daily_data:
                daily_data[date_str] += timer.duration_minutes
    
    # Convert to chart data
    return [
        {
            'date': date,
            'hours': round(minutes / 60, 1)
        }
        for date, minutes in sorted(daily_data.items())
    ]

def generate_priority_breakdown(tasks):
    """Generate priority breakdown (count)"""
    high = len([t for t in tasks if str(t.priority).lower() == 'high'])
    medium = len([t for t in tasks if str(t.priority).lower() == 'medium'])
    low = len([t for t in tasks if str(t.priority).lower() == 'low'])
    
    return [
        {'name': 'High', 'value': high, 'fill': '#FF8A65'},
        {'name': 'Medium', 'value': medium, 'fill': '#FFD54F'},
        {'name': 'Low', 'value': low, 'fill': '#81C995'}
    ]

def generate_time_priority_breakdown(timers):
    """Generate time spent per priority (hours)"""
    breakdown = {'high': 0, 'medium': 0, 'low': 0, 'none': 0}
    
    for timer in timers:
        if not timer.is_active:
            p = str(timer.task.priority).lower() if timer.task and timer.task.priority else 'none'
            if p in breakdown:
                breakdown[p] += timer.duration_minutes
            else:
                breakdown['none'] += timer.duration_minutes
                
    return [
        {'name': 'High Priority', 'value': round(breakdown['high'] / 60, 1), 'fill': '#FF8A65'},
        {'name': 'Medium Priority', 'value': round(breakdown['medium'] / 60, 1), 'fill': '#FFD54F'},
        {'name': 'Low Priority', 'value': round(breakdown['low'] / 60, 1), 'fill': '#81C995'}
    ]

def generate_status_breakdown(tasks):
    """Generate task status breakdown"""
    completed = len([t for t in tasks if t.status == 'completed'])
    pending = len([t for t in tasks if t.status != 'completed'])
    
    return [
        {'name': 'Completed', 'value': completed, 'fill': '#3B82F6'},
        {'name': 'Pending', 'value': pending, 'fill': '#95A5A6'}
    ]

def generate_project_breakdown(timers):
    """Generate breakdown of time spent per project (category)"""
    project_data = {}
    
    for timer in timers:
        if not timer.is_active:
            # Get category from associated task, or default to 'Uncategorized'
            category = timer.task.category if timer.task else 'Uncategorized'
            if category not in project_data:
                project_data[category] = 0
            project_data[category] += timer.duration_minutes
            
    # Convert to chart format and sort by hours
    breakdown = [
        {
            'name': name,
            'hours': round(minutes / 60, 1)
        }
        for name, minutes in project_data.items()
    ]
    return sorted(breakdown, key=lambda x: x['hours'], reverse=True)[:5]

def generate_hourly_pattern(timers):
    """Generate hourly productivity pattern (00:00 to 23:00) in hours"""
    hourly_data = {hour: 0 for hour in range(24)}
    
    for timer in timers:
        if not timer.is_active and timer.start_time:
            hour = timer.start_time.hour
            hourly_data[hour] += timer.duration_minutes
    
    # Return all 24 hours for a complete chart, scaled to hours
    return [
        {
            'hour': f"{hour:02d}:00",
            'hours': round(minutes / 60, 2)
        }
        for hour, minutes in hourly_data.items()
    ]

def generate_day_of_week_pattern(timers):
    """Generate focus hours by day of week"""
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    data = {day: 0 for day in days}
    for timer in timers:
        if not timer.is_active and timer.start_time:
            day_name = timer.start_time.strftime('%a')
            if day_name in data:
                data[day_name] += timer.duration_minutes
    return [
        {'day': day, 'hours': round(data[day] / 60, 1)}
        for day in days
    ]

def generate_focus_quality(timers, start_date, end_date):
    """Generate focus quality score over time, including all days in the range"""
    daily_quality = {}
    
    for timer in timers:
        if not timer.is_active and timer.start_time:
            date_str = timer.start_time.strftime('%Y-%m-%d')
            if date_str not in daily_quality:
                daily_quality[date_str] = []
            
            # Quality score based on completed vs expected duration
            expected = timer.duration_minutes
            actual = (timer.end_time - timer.start_time).total_seconds() / 60 if timer.end_time else expected
            quality = min(100, round((actual / expected) * 100)) if expected > 0 else 100
            daily_quality[date_str].append(quality)
    
    # Average quality per day
    for d in daily_quality:
        daily_quality[d] = round(sum(daily_quality[d]) / len(daily_quality[d]))
        
    result = []
    current_date = start_date
    last_known_quality = 100 # default to 100% if no data before

    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        if date_str in daily_quality:
            last_known_quality = daily_quality[date_str]
        
        result.append({
            'date': date_str,
            'quality': last_known_quality
        })
        current_date += timedelta(days=1)
        
    return result

def parse_duration(duration_str):
    """Helper to convert duration string (e.g. '1h 30m') to minutes"""
    if not duration_str:
        return 0
    import re
    minutes = 0
    hours_match = re.search(r'(\d+)\s*h', duration_str, re.IGNORECASE)
    mins_match = re.search(r'(\d+)\s*m', duration_str, re.IGNORECASE)
    if hours_match:
        minutes += int(hours_match.group(1)) * 60
    if mins_match:
        minutes += int(mins_match.group(1))
    return minutes

def generate_estimated_vs_actual(tasks, timers):
    """Compare estimated task duration with actual time spent for completed tasks"""
    completed_tasks = [t for t in tasks if t.status == 'completed' and t.duration]
    results = []
    
    for task in completed_tasks:
        estimated_mins = parse_duration(task.duration)
        if estimated_mins == 0:
            continue
            
        actual_mins = sum(tmr.duration_minutes for tmr in timers if tmr.task_id == task.task_id and not tmr.is_active)
        
        results.append({
            'name': task.title[:20] + '...' if len(task.title) > 20 else task.title,
            'full_name': task.title,
            'estimated': round(estimated_mins / 60, 2),
            'actual': round(actual_mins / 60, 2)
        })
        
    # Sort by actual time descending and return top 7
    return sorted(results, key=lambda x: x['actual'], reverse=True)[:7]

def generate_activity_heatmap(user_id):
    """Generate a year-long activity heatmap (last 365 days)"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=365)
    
    timers = Timer.query.filter(
        Timer.user_id == user_id,
        Timer.start_time >= start_date,
        Timer.is_active == False
    ).all()
    
    daily_data = {}
    current_date = start_date
    while current_date <= end_date:
        daily_data[current_date.strftime('%Y-%m-%d')] = 0
        current_date += timedelta(days=1)
        
    for timer in timers:
        if timer.start_time:
            date_str = timer.start_time.strftime('%Y-%m-%d')
            if date_str in daily_data:
                daily_data[date_str] += timer.duration_minutes
            
    return [
        {'date': date, 'count': round(minutes / 60, 1)}
        for date, minutes in sorted(daily_data.items())
    ]

def generate_burndown_data(all_tasks, start_date, end_date):
    """Calculate remaining tasks dropping down to zero over the period"""
    # Count backlog (tasks created before start_date and not completed before start_date)
    backlog = 0
    for t in all_tasks:
        if t.created_at < start_date:
            if t.status != 'completed' or (t.completed_at and t.completed_at >= start_date):
                backlog += 1
                
    remaining = backlog
    daily_burndown = []
    
    current_date = start_date
    while current_date <= end_date:
        # tasks created on this day
        created_today = sum(1 for t in all_tasks if t.created_at and t.created_at.date() == current_date.date())
        # tasks completed on this day
        completed_today = sum(1 for t in all_tasks if t.status == 'completed' and t.completed_at and t.completed_at.date() == current_date.date())
        
        remaining = remaining + created_today - completed_today
        
        daily_burndown.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'remaining': max(0, remaining)
        })
        current_date += timedelta(days=1)
        
    return daily_burndown

@analytics_bp.route('/time-breakdown', methods=['GET'])
@jwt_required()
def get_time_breakdown():
    """Get time breakdown by category"""
    try:
        user_id = get_jwt_identity()
        
        # Get date range from query params
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if start_date_str and end_date_str:
            start_date = datetime.fromisoformat(start_date_str)
            end_date = datetime.fromisoformat(end_date_str)
        else:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
        
        # Get timers with associated tasks
        timers = Timer.query.filter(
            Timer.user_id == user_id,
            Timer.start_time >= start_date,
            Timer.start_time <= end_date
        ).all()
        
        # Group by task priority (as category proxy)
        breakdown = {}
        for timer in timers:
            if not timer.is_active:
                if timer.task_id:
                    task = Task.query.get(timer.task_id)
                    category = task.priority if task else 'Uncategorized'
                else:
                    category = 'Uncategorized'
                
                if category not in breakdown:
                    breakdown[category] = 0
                breakdown[category] += timer.duration_minutes
        
        return jsonify(breakdown), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get time breakdown: {str(e)}'}), 500

@analytics_bp.route('/weekly-report', methods=['GET'])
@jwt_required()
def get_weekly_report():
    """Get weekly productivity report"""
    try:
        user_id = get_jwt_identity()
        
        # Last 7 days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        # Get all data
        tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.created_at >= start_date
        ).all()
        
        timers = Timer.query.filter(
            Timer.user_id == user_id,
            Timer.start_time >= start_date
        ).all()
        
        # Generate comprehensive report
        report = {
            'week_start': start_date.isoformat(),
            'week_end': end_date.isoformat(),
            'tasks': {
                'total': len(tasks),
                'completed': len([t for t in tasks if t.status == 'completed']),
                'pending': len([t for t in tasks if t.status == 'pending']),
                'completion_rate': round(len([t for t in tasks if t.status == 'completed']) / len(tasks) * 100) if tasks else 0
            },
            'time': {
                'total_hours': round(sum(t.duration_minutes for t in timers if not t.is_active) / 60, 1),
                'focus_sessions': len([t for t in timers if not t.is_active]),
                'pomodoros': len([t for t in timers if t.type == 'pomodoro' and not t.is_active]),
                'average_session': round(sum(t.duration_minutes for t in timers if not t.is_active) / len([t for t in timers if not t.is_active])) if [t for t in timers if not t.is_active] else 0
            },
            'top_tasks': [t.to_dict() for t in sorted([t for t in tasks if t.status == 'completed'], key=lambda x: x.completed_at or x.created_at, reverse=True)[:5]]
        }
        
        return jsonify(report), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to get weekly report: {str(e)}'}), 500
