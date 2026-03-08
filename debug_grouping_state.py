import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CLAS.settings')
django.setup()

from django.apps import apps
CalendarDate = apps.get_model('class', 'CalendarDate')
ClassSection = apps.get_model('class', 'ClassSection')
PlannedSession = apps.get_model('class', 'PlannedSession')
DateType = apps.get_model('class', 'DateType')

def debug_grouping():
    today = date(2026, 3, 8)
    print(f"--- Debugging Grouping for {today} ---")
    
    # 1. Check CalendarDate records
    cal_dates = CalendarDate.objects.filter(date=today, date_type=0) # DateType.SESSION is usually 0
    print(f"Total CalendarDate records for today (date_type=0): {cal_dates.count()}")
    
    for cd in cal_dates:
        classes = cd.class_sections.all()
        class_names = [c.display_name for c in classes]
        print(f"ID: {cd.id} | Name: {cd.session_name} | Classes ({len(classes)}): {', '.join(class_names)}")
        for c in classes:
            print(f"  - Class: {c.display_name} (ID: {c.id})")

    # 2. Check PlannedSession grouped_session_id
    # We don't have a date field on PlannedSession directly, usually it's reached via ActualSession or implied by day_number
    # But for today, we can check which classes have a linked CalendarDate
    
if __name__ == "__main__":
    debug_grouping()
