#!/usr/bin/env python
"""
Fast cleanup for Demo School grouped sessions using bulk operations
Run: python manage.py cleanup_demo_grouped_fast
"""

from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import connection
from django.db.models import Count, Q

PlannedSession = apps.get_model('class', 'PlannedSession')
GroupedSession = apps.get_model('class', 'GroupedSession')
ClassSection = apps.get_model('class', 'ClassSection')
School = apps.get_model('class', 'School')


class Command(BaseCommand):
    help = 'Fast cleanup of grouped sessions for Demo School'

    def handle(self, *args, **options):
        self.stdout.write("=" * 100)
        self.stdout.write("FAST DEMO SCHOOL GROUPED SESSION CLEANUP")
        self.stdout.write("=" * 100)

        # Find Demo School
        try:
            demo_school = School.objects.get(name__icontains='demo')
            self.stdout.write(self.style.SUCCESS(f"✅ Found Demo School: {demo_school.name}"))
        except School.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Demo School not found!"))
            return

        demo_classes = ClassSection.objects.filter(school=demo_school)
        self.stdout.write(f"Total classes: {demo_classes.count()}")

        # Get statistics BEFORE
        self.stdout.write("\n📊 BEFORE CLEANUP:")
        demo_sessions = PlannedSession.objects.filter(class_section__school=demo_school)
        grouped_count = demo_sessions.filter(grouped_session_id__isnull=False).count()
        self.stdout.write(f"Total sessions: {demo_sessions.count()}")
        self.stdout.write(f"Grouped sessions: {grouped_count}")

        # FAST METHOD: Delete ActualSessions first, then PlannedSessions
        self.stdout.write("\n🗑️  STEP 1: Deleting ActualSessions for grouped PlannedSessions")
        self.stdout.write("-" * 100)

        # Get all grouped PlannedSession IDs
        grouped_session_ids = list(
            PlannedSession.objects.filter(
                class_section__school=demo_school,
                grouped_session_id__isnull=False
            ).values_list('id', flat=True)
        )

        if grouped_session_ids:
            # Delete ActualSessions that reference these PlannedSessions
            from django.apps import apps
            ActualSession = apps.get_model('class', 'ActualSession')
            
            deleted_actual = ActualSession.objects.filter(
                planned_session_id__in=grouped_session_ids
            ).delete()[0]
            self.stdout.write(self.style.SUCCESS(f"✅ Deleted {deleted_actual} ActualSessions"))

        # Now delete the grouped PlannedSessions
        self.stdout.write("\n🗑️  STEP 2: Deleting grouped PlannedSessions")
        self.stdout.write("-" * 100)

        deleted_planned = PlannedSession.objects.filter(
            class_section__school=demo_school,
            grouped_session_id__isnull=False
        ).delete()[0]
        self.stdout.write(self.style.SUCCESS(f"✅ Deleted {deleted_planned} grouped PlannedSessions"))

        # FAST METHOD: Bulk update remaining sessions to remove grouped_session_id
        self.stdout.write("\n🗑️  STEP 3: Removing grouped_session_id from remaining sessions")
        self.stdout.write("-" * 100)

        updated = PlannedSession.objects.filter(
            class_section__school=demo_school,
            grouped_session_id__isnull=False
        ).update(grouped_session_id=None)
        self.stdout.write(self.style.SUCCESS(f"✅ Updated {updated} sessions"))

        # Delete GroupedSession records
        self.stdout.write("\n🗑️  STEP 4: Deleting GroupedSession records")
        self.stdout.write("-" * 100)

        demo_grouped_objs = GroupedSession.objects.filter(
            class_sections__school=demo_school
        ).distinct()
        
        deleted_gs = 0
        for gs in demo_grouped_objs:
            other_school_classes = gs.class_sections.exclude(school=demo_school).count()
            if other_school_classes == 0:
                gs.delete()
                deleted_gs += 1
        
        self.stdout.write(self.style.SUCCESS(f"✅ Deleted {deleted_gs} GroupedSession records"))

        # Verify
        self.stdout.write("\n✅ AFTER CLEANUP:")
        demo_sessions_after = PlannedSession.objects.filter(class_section__school=demo_school)
        grouped_after = demo_sessions_after.filter(grouped_session_id__isnull=False).count()
        self.stdout.write(f"Total sessions: {demo_sessions_after.count()}")
        self.stdout.write(f"Grouped sessions: {grouped_after}")

        if grouped_after == 0:
            self.stdout.write(self.style.SUCCESS("\n✅ CLEANUP SUCCESSFUL!"))
            self.stdout.write("""
Next steps:
1. Refresh browser (Ctrl+Shift+Delete)
2. Go to "My Classes" - all classes should show as individual
3. Go to "Today's Session" - should work normally
4. Go to "My Attendance" - should work normally
""")
        else:
            self.stdout.write(self.style.WARNING(f"\n⚠️  Still have {grouped_after} grouped sessions"))

        self.stdout.write("=" * 100)
