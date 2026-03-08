from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from class.models import FacilitatorSchool, ClassSection, ActualSession, PlannedSession
from datetime import date

User = get_user_model()

class Command(BaseCommand):
    help = 'Test my_attendance view'

    def handle(self, *args, **options):
        self.stdout.write("Testing My Attendance View...")
        
        # Get a facilitator
        facilitator = User.objects.filter(role__name='Facilitator').first()
        
        if not facilitator:
            self.stdout.write(self.style.ERROR("❌ No facilitator found"))
            return
        
        self.stdout.write(f"✓ Facilitator: {facilitator.full_name}")
        
        # Check schools
        schools = FacilitatorSchool.objects.filter(facilitator=facilitator, is_active=True)
        self.stdout.write(f"✓ Schools assigned: {schools.count()}")
        
        if schools.count() == 0:
            self.stdout.write(self.style.WARNING("⚠️  No schools assigned"))
            return
        
        # Check classes
        school_ids = schools.values_list('school_id', flat=True)
        classes = ClassSection.objects.filter(school_id__in=school_ids, is_active=True)
        self.stdout.write(f"✓ Classes: {classes.count()}")
        
        # Check today's sessions
        today = date.today()
        sessions = ActualSession.objects.filter(
            planned_session__class_section__school_id__in=school_ids,
            date=today
        )
        self.stdout.write(f"✓ Sessions today: {sessions.count()}")
        
        # Test the view
        from django.test import RequestFactory
        from class.facilitator_views import facilitator_my_attendance
        
        factory = RequestFactory()
        request = factory.get('/facilitator/my-attendance/')
        request.user = facilitator
        
        try:
            response = facilitator_my_attendance(request)
            self.stdout.write(self.style.SUCCESS(f"✓ View executed: Status {response.status_code}"))
            
            if hasattr(response, 'context_data'):
                context = response.context_data
                self.stdout.write(f"✓ Sessions in context: {len(context.get('sessions', []))}")
                self.stdout.write(f"✓ Total: {context.get('total_sessions', 0)}")
                self.stdout.write(f"✓ Marked: {context.get('marked_sessions', 0)}")
                self.stdout.write(f"✓ Unmarked: {context.get('unmarked_sessions', 0)}")
                self.stdout.write(self.style.SUCCESS("✅ My Attendance view is working!"))
            else:
                self.stdout.write(self.style.ERROR("❌ No context data"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            import traceback
            traceback.print_exc()
