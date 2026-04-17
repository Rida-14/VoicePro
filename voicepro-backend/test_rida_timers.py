from app import create_app
from models import db, User, Task, Timer

app = create_app()
with app.app_context():
    user = User.query.filter_by(email="rida@gmail.com").first()
    timers = Timer.query.filter_by(user_id=user.user_id).all()
    priorities = {'High': 0, 'Medium': 0, 'Low': 0, 'None': 0}
    
    for t in timers:
        if t.task_id:
            task = Task.query.get(t.task_id)
            if task.priority in priorities:
                priorities[task.priority] += t.duration_minutes
        else:
            priorities['None'] += t.duration_minutes
            
    print("Timers mapped by priority for rida@gmail.com:")
    print(priorities)
