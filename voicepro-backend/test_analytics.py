from app import create_app
from models import db, Timer, Task
from routes.analytics import generate_project_breakdown, generate_hourly_pattern, generate_day_of_week_pattern, generate_focus_quality

app = create_app()
with app.app_context():
    timers = Timer.query.all()
    print("Project Breakdown:", generate_project_breakdown(timers))
    print("Hourly Pattern:", generate_hourly_pattern(timers))
    print("Day of Week Pattern:", generate_day_of_week_pattern(timers))
    print("Focus Quality:", generate_focus_quality(timers))
