import os
import django
import uuid
from datetime import date

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CLAS.settings')
django.setup()

from django.apps import apps

def get_class_models():
    ClassSection = apps.get_model('class', 'ClassSection')
    PlannedSession = apps.get_model('class', 'PlannedSession')
    ActualSession = apps.get_model('class', 'ActualSession')
    CalendarDate = apps.get_model('class', 'CalendarDate')
    DateType = apps.get_model('class', 'DateType')
    Enrollment = apps.get_model('class', 'Enrollment')
    Student = apps.get_model('class', 'Student')
    SupervisorCalendar = apps.get_model('class', 'SupervisorCalendar')
    User = apps.get_model('class', 'User')
    return ClassSection, PlannedSession, ActualSession, CalendarDate, DateType, Enrollment, Student, SupervisorCalendar, User

def demo_grouping():
    print("--- Grouping Logic Demonstration ---")
    ClassSection, PlannedSession, ActualSession, CalendarDate, DateType, Enrollment, Student, SupervisorCalendar, User = get_class_models()
    
    # 1. Setup sample data
    school_name = "Demo School"
    class_a_name = "Grade 5A"
    class_b_name = "Grade 5B"
    today = date.today()
    
    # Get or create supervisor for calendar
    supervisor = User.objects.filter(is_superuser=True).first()
    if not supervisor:
        print("No supervisor found. Create one first.")
        return
        
    calendar, _ = SupervisorCalendar.objects.get_or_create(supervisor=supervisor)
    
    # 2. Show Planned vs Actual
    print(f"\n[1] Planned vs Actual Relation:")
    class_a = ClassSection.objects.filter(display_name=class_a_name).first()
    if not class_a:
        print(f"Sample classes not found. Please run migrations/seed data.")
        return

    # A class has many planned sessions (the content)
    day_1_plan = PlannedSession.objects.filter(class_section=class_a, day_number=1).first()
    print(f"Planned: {day_1_plan} (Content: Day 1)")
    
    # An actual session is the execution of a plan on a date
    actual, created = ActualSession.objects.get_or_create(
        planned_session=day_1_plan,
        date=today,
        defaults={'status': 1} # Conducted
    )
    print(f"Actual: {actual} (Date: {today})")

    # 3. Dynamic Grouping via CalendarDate
    print(f"\n[2] Dynamic Grouping (Daily Clean):")
    class_b = ClassSection.objects.filter(display_name=class_b_name).first()
    
    # Create a dynamic group for today
    cal_date, _ = CalendarDate.objects.get_or_create(
        calendar=calendar,
        date=today,
        date_type=DateType.SESSION
    )
    cal_date.class_sections.add(class_a, class_b)
    
    print(f"CalendarDate created for {today}")
    print(f"Grouped classes: {[c.display_name for c in cal_date.class_sections.all()]}")
    print("This grouping only exists for this specific CalendarDate/Today.")

    # 4. Impact on UI Query (Simulation)
    print(f"\n[3] UI Query Optimization Check:")
    # Instead of querying all classes, we query today's CalendarDate
    today_groups = CalendarDate.objects.filter(date=today).prefetch_related('class_sections')
    for group in today_groups:
        print(f"UI displays group: {[c.display_name for c in group.class_sections.all()]}")

if __name__ == "__main__":
    demo_grouping()
