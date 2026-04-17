from app import create_app
from models import db, Timer, Task, User
app = create_app()
with app.app_context():
    user = User.query.filter_by(email="rida@gmail.com").first()
    print("User ID:", user.user_id)
    timers = Timer.query.filter_by(user_id=user.user_id).all()
    for t in timers:
        if t.duration_minutes > 100:
            print(f"Massive Timer: {t.duration_minutes} mins, task_id={t.task_id}, start={t.start_time}")
