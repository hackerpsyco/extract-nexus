from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, datetime

class Command(BaseCommand):
    help = 'Clean up all old lesson plan uploads and reset step status for new day'

    def handle(self, *args, **options):
        from ...models import LessonPlanUpload, ActualSession
        
        # Get today's date
        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        
        # Create timezone-aware datetime boundaries
        today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        tomorrow_start = timezone.make_aware(datetime.combine(tomorrow, datetime.min.time()))
        
        self.stdout.write(f"Today: {today}")
        self.stdout.write(f"Today start: {today_start}")
        self.stdout.write("=" * 80)
        
        # 1. DELETE OLD LESSON PLAN UPLOADS
        self.stdout.write("\n1. CLEANING UP OLD LESSON PLAN UPLOADS")
        self.stdout.write("-" * 80)
        old_uploads = LessonPlanUpload.objects.filter(upload_date__lt=today_start)
        old_count = old_uploads.count()
        
        self.stdout.write(f"Found {old_count} old uploads before {today}")
        for upload in old_uploads:
            self.stdout.write(f"  ✗ Deleting: {upload.file_name} (uploaded: {upload.upload_date})")
            if upload.lesson_plan_file:
                try:
                    upload.lesson_plan_file.delete(save=False)
                except:
                    pass
            upload.delete()
        
        self.stdout.write(self.style.SUCCESS(f"✓ Deleted {old_count} old uploads"))
        
        # Show remaining uploads (should be today's only)
        today_uploads = LessonPlanUpload.objects.filter(
            upload_date__gte=today_start,
            upload_date__lt=tomorrow_start
        )
        self.stdout.write(f"\n✓ Remaining uploads for today: {today_uploads.count()}")
        for upload in today_uploads:
            self.stdout.write(f"  ✓ {upload.file_name} (uploaded: {upload.upload_date})")
        
        # 2. RESET STEP STATUS FOR OLD SESSIONS
        self.stdout.write("\n2. RESETTING STEP STATUS FOR OLD SESSIONS")
        self.stdout.write("-" * 80)
        
        # Delete old actual sessions (before today)
        old_sessions = ActualSession.objects.filter(date__lt=today)
        old_session_count = old_sessions.count()
        self.stdout.write(f"Found {old_session_count} old actual sessions before {today}")
        for session in old_sessions:
            self.stdout.write(f"  ✗ Deleting: Session {session.planned_session.day_number} from {session.date}")
            session.delete()
        self.stdout.write(self.style.SUCCESS(f"✓ Deleted {old_session_count} old sessions"))
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS("✓ CLEANUP COMPLETE - All old data removed, steps reset to white"))
        self.stdout.write("=" * 80)
