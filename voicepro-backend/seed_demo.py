import os
import random
from datetime import datetime, timedelta
from app import create_app
from models import db, User, Task, Timer, Reminder

def seed_demo_data():
    app = create_app()
    with app.app_context():
        # 1. Create the Student Demo User
        email = "rida@gmail.com"
        print(f"Creating new user: {email}...")
        user = User(name="Rida", email=email)
        user.set_password("Rida@123")
        db.session.add(user)
        db.session.commit()
        user = User.query.filter_by(email=email).first() # Get instantiated user with ID
            
        print(f"Seeding data for user ID: {user.user_id}")

        categories = ["AI", "Software Testing", "Next Gen Databases", "Cloud Computing", "Creative"]
        now = datetime.utcnow()

        # 2. Seed Tasks (Mix of completed, pending, and in-progress)
        print("Seeding Tasks...")
        tasks_data = [
            ("Review introductory chapter on AI principles", "AI", "High", "in_progress", now + timedelta(days=2)),
            ("Finish Software Testing assignment 1", "Software Testing", "High", "pending", now + timedelta(days=1)),
            ("Review lecture notes for Next Gen Databases", "Next Gen Databases", "Medium", "completed", now - timedelta(days=1)),
            ("Complete Cloud Computing reading material", "Cloud Computing", "High", "in_progress", now + timedelta(days=3)),
            ("Work on the new sunset canvas painting", "Creative", "Low", "pending", now + timedelta(days=5)),
            ("Study for upcoming Databases short quiz", "Next Gen Databases", "Medium", "completed", now - timedelta(days=2)),
            ("Watch Software Testing tutorial video", "Software Testing", "Medium", "completed", now - timedelta(days=3)),
            ("Start Cloud Computing group project draft", "Cloud Computing", "High", "pending", now + timedelta(days=4)),
            ("Buy new acrylic painting supplies", "Creative", "Low", "completed", now - timedelta(days=4)),
            ("Prepare slides for AI class seminar", "AI", "High", "pending", now + timedelta(hours=6)),
            ("Read a tech design article", "Software Testing", "Low", "completed", now - timedelta(days=2)),
            ("Organize cloud architecture diagrams", "Cloud Computing", "Low", "completed", now - timedelta(days=1))
        ]

        task_objects = []
        for title, cat, prio, status, due in tasks_data:
            completed_at = due if status == "completed" else None
            task = Task(
                user_id=user.user_id,
                title=title,
                category=cat,
                priority=prio,
                status=status,
                due_date=due,
                duration="60m",
                completed_at=completed_at
            )
            db.session.add(task)
            task_objects.append(task)
        db.session.flush()

        # 3. Seed Timers (To populate Analytics charts like Task Completion Trend & Productivity by Hour)
        print("Seeding Timers...")
        # Generate timer sessions over the last 7 days to create a nice trend line
        for i in range(7):
            days_ago = 6 - i # From 6 days ago up to today
            base_date = now - timedelta(days=days_ago)
            
            # 1-4 sessions per day
            num_sessions = random.randint(1, 4)
            for _ in range(num_sessions):
                # Random hour between 9 AM and 5 PM
                hour_offset = random.randint(9, 17) 
                session_start = base_date.replace(hour=hour_offset, minute=random.randint(0, 59))
                
                # Random duration between 25m and 60m
                duration_mins = random.choice([25, 30, 45, 60])
                
                # Only attach timers to tasks that actually require seated study time (exclude trivial tasks like "Buy supplies")
                study_tasks = [t for t in task_objects if not t.title.startswith("Buy") and not t.title.startswith("Sketch")]
                task_id = random.choice(study_tasks).task_id if study_tasks and random.random() > 0.3 else None
                # Simulate real-world focus drops - sometimes stop slightly early or take slightly longer
                actual_duration_mins = duration_mins
                if random.random() > 0.6:  # 40% chance of imperfect focus
                    variance = random.randint(-8, 5) # Finish up to 8 mins early, or run 5 mins over
                    actual_duration_mins = max(1, duration_mins + variance)
                
                timer = Timer(
                    user_id=user.user_id,
                    task_id=task_id,
                    duration_minutes=duration_mins, # The "planned" or requested duration from the UI
                    type=random.choice(["pomodoro", "manual", "pomodoro"]),
                    start_time=session_start,
                    end_time=session_start + timedelta(minutes=actual_duration_mins), # The actual logged duration
                    is_active=False
                )
                db.session.add(timer)

        # 4. Seed Active Reminders (To show up immediately on Timer Page)
        print("Seeding Reminders...")
        reminders_data = [
            ("Meeting with Professor for Project Review", now + timedelta(minutes=45), "manual"),
            ("Start Cloud Computing Homework", now + timedelta(hours=3), "manual"),
            ("AI Assignment Deadline", now + timedelta(days=1), "task_deadline")
        ]
        
        for text, fire_time, r_type in reminders_data:
            task_id = task_objects[0].task_id if r_type == "task_deadline" else None
            reminder = Reminder(
                user_id=user.user_id,
                task_id=task_id,
                message=text,
                reminder_time=fire_time,
                reminder_type=r_type,
            )
            db.session.add(reminder)
            
        # Commit all dummy data
        db.session.commit()
        print("\n✅ Successfully seeded database with presentation data!")
        print("==================================================")
        print("👤 Email: rida@gmail.com")
        print("🔑 Password: Rida@123")
        print("==================================================")

if __name__ == "__main__":
    seed_demo_data()
