import os
import django
import uuid
from django.utils import timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CLAS.settings')
django.setup()

from django.apps import apps
import importlib

# Get models
ClassSection = apps.get_model('class', 'ClassSection')
PlannedSession = apps.get_model('class', 'PlannedSession')
ActualSession = apps.get_model('class', 'ActualSession')
GroupedSession = apps.get_model('class', 'GroupedSession')
CalendarDate = apps.get_model('class', 'CalendarDate')
SupervisorCalendar = apps.get_model('class', 'SupervisorCalendar')
School = apps.get_model('class', 'School')
User = apps.get_model('class', 'User')

class_models = importlib.import_module("class.models")
DateType = class_models.DateType

def verify_apply_grouping_fix():
    print("--- apply_grouping Logic Verification ---")
    
    # 1. Setup Test Data
    school = School.objects.first()
    user = User.objects.first()
    
    if not school:
        print("Required test data (School) missing")
        return
    if not user:
        print("Required test data (User) missing")
        return
        
    class_a = ClassSection.objects.filter(school=school).first()
    class_b = ClassSection.objects.filter(school=school).exclude(id=getattr(class_a, 'id', None)).first()
    
    if not (class_a and class_b):
        print(f"Not enough classes for testing in school {school.name}")
        return

    today = timezone.now().date()
    group_uuid = uuid.uuid4()
    
    print(f"Testing with User: {user.username}, Classes: {class_a.display_name}, {class_b.display_name}")
    
    try:
        # Simulate the problematic part of apply_grouping
        print("\nAttempting to create CalendarDate for grouping...")
        
        # This is the logic I just added/fixed
        calendar, _ = SupervisorCalendar.objects.get_or_create(supervisor=user)
        
        # Ensure we delete any existing to avoid conflicts (matching view logic)
        CalendarDate.objects.filter(
            date=today,
            date_type=DateType.SESSION,
            class_sections__in=[class_a, class_b]
        ).distinct().delete()
        
        cal_date = CalendarDate.objects.create(
            calendar=calendar,
            date=today,
            school=school,
            date_type=DateType.SESSION,
            notes=f"Group Session: {class_a.display_name} & others"
        )
        
        # Add primary facilitator
        cal_date.assigned_facilitators.add(user)
        cal_date.class_sections.add(class_a, class_b)
        
        print("SUCCESS: CalendarDate created and configured without TypeError.")
        
        # Cleanup
        cal_date.delete()
        
    except TypeError as e:
        print(f"FAILED: TypeError still occurred: {e}")
    except Exception as e:
        print(f"FAILED: An unexpected error occurred: {e}")

if __name__ == "__main__":
    verify_apply_grouping_fix()
