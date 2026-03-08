"""
Management command to check grouped session data
"""
from django.core.management.base import BaseCommand
from class.models import PlannedSession, ActualSession
from datetime import date


class Command(BaseCommand):
    help = 'Check grouped session data'

    def handle(self, *args, **options):
        today = date.today()

        # Check today's sessions
        today_sessions = ActualSession.objects.filter(date=today).select_related(
            'planned_session__class_section'
        )

        self.stdout.write(f"Total sessions today: {today_sessions.count()}")
        self.stdout.write("\nSession details:")
        for session in today_sessions[:15]:
            ps = session.planned_session
            self.stdout.write(
                f"  Class: {ps.class_section.display_name}, "
                f"grouped_session_id: {ps.grouped_session_id}"
            )

        # Check if any have grouped_session_id set
        grouped_count = PlannedSession.objects.filter(
            grouped_session_id__isnull=False
        ).count()
        self.stdout.write(f"\nTotal PlannedSessions with grouped_session_id: {grouped_count}")

        # Show grouped sessions
        grouped_sessions = PlannedSession.objects.filter(
            grouped_session_id__isnull=False
        ).values('grouped_session_id').distinct()
        self.stdout.write(f"\nGrouped session IDs: {list(grouped_sessions)}")

        # Show which classes are in each group
        for group in grouped_sessions:
            gid = group['grouped_session_id']
            classes = PlannedSession.objects.filter(
                grouped_session_id=gid
            ).select_related('class_section')
            class_names = [c.class_section.display_name for c in classes]
            self.stdout.write(f"  Group {gid}: {', '.join(class_names)}")
