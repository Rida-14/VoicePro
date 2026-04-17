from app import create_app
from models import db, Task, Timer

app = create_app()
with app.app_context():
    timers = Timer.query.all()
    print("Total timers:", len(timers))
    for t in timers:
        if t.task_id:
            task = Task.query.get(t.task_id)
            if task.priority == "Low":
                print(f"Low priority timer: {t.duration_minutes} mins for task '{task.title}'")
