from models import db, User, Task, Timer, Reminder
from datetime import datetime, timedelta, timezone
import random

def seed_data():
    demo_email = 'demo@voicepro.com'
    user = User.query.filter_by(email=demo_email).first()
    
    if not user:
        print(f"Error: Demo user '{demo_email}' not found. Please run app.py first.")
        return

        print(f"Seeding presentation-ready data for {user.name} ({user.email})...")

        # Clear existing data
        Task.query.filter_by(user_id=user.user_id).delete()
    Timer.query.filter_by(user_id=user.user_id).delete()
    Reminder.query.filter_by(user_id=user.user_id).delete()
    db.session.commit()

    # Presentation dates and ranges
    # We generate data from March 1st to May 1st so charts look full on any day including April 20th
    start_date = datetime(2026, 3, 1, tzinfo=timezone.utc)
    end_date = datetime(2026, 5, 5, tzinfo=timezone.utc)
    presentation_date = datetime(2026, 4, 20, tzinfo=timezone.utc)
    today = datetime.now(timezone.utc)

    # 1. Generate Non-Technical Tasks
    print("Generating tasks...")
    tasks_data = [
        # Completed Tasks (Past)
        {'title': 'Read Chapter 4 of course material', 'category': 'Study', 'status': 'completed', 'priority': 'Medium', 'due_date': datetime(2026, 3, 15, tzinfo=timezone.utc), 'duration': '1h 30m'},
        {'title': 'Draft outline for final paper', 'category': 'Assignment', 'status': 'completed', 'priority': 'High', 'due_date': datetime(2026, 3, 20, tzinfo=timezone.utc), 'duration': '2h'},
        {'title': 'Buy new paint brushes and canvas', 'category': 'Hobby', 'status': 'completed', 'priority': 'Low', 'due_date': datetime(2026, 3, 25, tzinfo=timezone.utc), 'duration': '1h'},
        {'title': 'Submit weekly progress report', 'category': 'Assignment', 'status': 'completed', 'priority': 'High', 'due_date': datetime(2026, 4, 2, tzinfo=timezone.utc), 'duration': '45m'},
        {'title': 'Organize study notes for midterms', 'category': 'Study', 'status': 'completed', 'priority': 'Medium', 'due_date': datetime(2026, 4, 10, tzinfo=timezone.utc), 'duration': '2h'},
        {'title': 'Complete the landscape painting', 'category': 'Hobby', 'status': 'completed', 'priority': 'Medium', 'due_date': datetime(2026, 4, 15, tzinfo=timezone.utc), 'duration': '3h'},
        {'title': 'Group meeting at the library', 'category': 'Project', 'status': 'completed', 'priority': 'High', 'due_date': datetime(2026, 4, 18, tzinfo=timezone.utc), 'duration': '1h'},

        # Pending Tasks (Around presentation date and future)
        {'title': 'Finalize presentation slides', 'category': 'Project', 'status': 'pending', 'priority': 'High', 'due_date': datetime(2026, 4, 19, tzinfo=timezone.utc), 'duration': '2h 30m'},
        {'title': 'Practice the presentation speech', 'category': 'Project', 'status': 'in_progress', 'priority': 'High', 'due_date': datetime(2026, 4, 20, 8, tzinfo=timezone.utc), 'duration': '1h'},
        {'title': 'Submit final project documentation', 'category': 'Assignment', 'status': 'pending', 'priority': 'High', 'due_date': datetime(2026, 4, 21, tzinfo=timezone.utc), 'duration': '3h'},
        {'title': 'Read chapters 5 and 6 for finals', 'category': 'Study', 'status': 'in_progress', 'priority': 'Medium', 'due_date': datetime(2026, 4, 23, tzinfo=timezone.utc), 'duration': '2h'},
        {'title': 'Start the new abstract painting', 'category': 'Hobby', 'status': 'pending', 'priority': 'Low', 'due_date': datetime(2026, 4, 25, tzinfo=timezone.utc), 'duration': '4h'},
        {'title': 'Review notes for final exams', 'category': 'Study', 'status': 'pending', 'priority': 'High', 'due_date': datetime(2026, 4, 28, tzinfo=timezone.utc), 'duration': '3h'},
        {'title': 'Return borrowed books to library', 'category': 'Personal', 'status': 'pending', 'priority': 'Low', 'due_date': datetime(2026, 5, 2, tzinfo=timezone.utc), 'duration': '30m'},
    ]

    # Dynamically generate filler tasks from today until end_date
    # so there's always something due in the near future and on the calendar.
    filler_task_titles = [
        "Review class notes", "Read recommended article", "Draft initial thoughts for assignment",
        "Work on presentation materials", "Organize study space", "Complete practice quiz",
        "Update project journal", "Meet with project mentor", "Review lecture recording"
    ]
    
    current_filler_date = today
    while current_filler_date <= end_date:
        # Add a task every 2 to 4 days
        tasks_data.append({
            'title': random.choice(filler_task_titles),
            'category': random.choice(['Study', 'Assignment', 'Project', 'Personal']),
            'status': random.choice(['pending', 'in_progress']),
            'priority': random.choice(['High', 'Medium', 'Low']),
            'due_date': current_filler_date.replace(hour=random.randint(10, 18), minute=0, second=0, microsecond=0),
            'duration': random.choice(['30m', '45m', '1h', '1h 30m', '2h'])
        })
        current_filler_date += timedelta(days=random.randint(2, 4))

    task_objects = []
    for t in tasks_data:
        due_date = t['due_date']
        created_at = due_date - timedelta(days=random.randint(5, 14))
        
        task = Task(
            user_id=user.user_id,
            title=t['title'],
            category=t['category'],
            status=t['status'],
            priority=t['priority'],
            duration=t['duration'],
            due_date=due_date,
            created_at=created_at,
            updated_at=created_at + timedelta(days=1)
        )
        
        if t['status'] == 'completed':
            # completed somewhat before due date
            task.completed_at = due_date - timedelta(hours=random.randint(2, 48))
            
        db.session.add(task)
        task_objects.append(task)
        
    db.session.commit()

    # 2. Generate Continuous Daily Focus Sessions (Timers)
    # This guarantees charts look amazing whether viewed today or on April 20th
    print("Generating daily focus sessions (Mar 1 -> May 1)...")
    current_day = start_date
    while current_day <= end_date:
        # Decide how many sessions on this day (1 to 4)
        # Make the days leading up to April 20th very busy!
        days_to_presentation = abs((presentation_date - current_day).days)
        if days_to_presentation <= 7:
            num_sessions = random.randint(3, 5) # heavy study week
        else:
            num_sessions = random.randint(1, 4) # normal
            
        # Random chance to skip a rest day (except near presentation)
        if days_to_presentation > 7 and random.random() < 0.15:
            num_sessions = 0
            
        for _ in range(num_sessions):
            task = random.choice(task_objects)
            duration_mins = random.choice([25, 30, 45, 50, 60, 90])
            
            # Random time of day
            hour = random.randint(9, 21)
            minute = random.randint(0, 59)
            start_time = current_day.replace(hour=hour, minute=minute)
            end_time = start_time + timedelta(minutes=duration_mins)

            timer = Timer(
                user_id=user.user_id,
                task_id=task.task_id,
                type=random.choice(['manual', 'pomodoro']),
                duration_minutes=duration_mins,
                start_time=start_time,
                end_time=end_time,
                is_active=False,
                created_at=start_time
            )
            db.session.add(timer)
            
        current_day += timedelta(days=1)


    # Add one active timer for "Right Now" so the current timer UI works
    active_task = next((t for t in task_objects if t.status == 'pending'), None)
    if active_task:
        active_timer = Timer(
            user_id=user.user_id,
            task_id=active_task.task_id,
            type='pomodoro',
            duration_minutes=45,
            start_time=today - timedelta(minutes=10),
            is_active=True,
            created_at=today - timedelta(minutes=10)
        )
        db.session.add(active_timer)

    db.session.commit()

    # 3. Generate Reminders around the Presentation Date
    print("Generating strategic reminders...")
    reminders_data = [
        {'title_contains': 'Finalize presentation', 'msg': 'Time to finish those slides!', 'date': datetime(2026, 4, 18, 14, tzinfo=timezone.utc)},
        {'title_contains': 'Practice the presentation', 'msg': 'Run through the speech one more time', 'date': datetime(2026, 4, 19, 18, tzinfo=timezone.utc)},
        {'title_contains': 'abstract painting', 'msg': 'Relax and start painting', 'date': datetime(2026, 4, 24, 16, tzinfo=timezone.utc)},
    ]

    for r in reminders_data:
        # Match task or pick random
        task = next((t for t in task_objects if r['title_contains'].lower() in t.title.lower()), task_objects[0])
        
        reminder = Reminder(
            user_id=user.user_id,
            task_id=task.task_id,
            message=r['msg'],
            reminder_time=r['date'],
            is_sent=False,
            reminder_type='manual',
            created_at=today - timedelta(days=1)
        )
        db.session.add(reminder)
        
    db.session.commit()
    print("✅ Awesome demo data seeded successfully! Ready for April 20th presentation.")

if __name__ == '__main__':
seed_data()
