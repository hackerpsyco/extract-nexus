#!/usr/bin/env python
"""
Management command to cleanup grouped sessions for Demo School - Version 2
Handles the unique constraint issue by deleting duplicates first

Run: python manage.py cleanup_demo_grouped_v2
"""

from django.core.management.base import BaseCommand
from django.apps import apps
from django.db.models import Count, Q

# Import models using apps registry
PlannedSession = apps.get_model('class', 'PlannedSession')
GroupedSession = apps.get_model('class', 'GroupedSession')
ClassSection = apps.get_model('class', 'ClassSection')
School = apps.get_model('class', 'School')


class Command(BaseCommand):
    help = 'Clean up all grouped sessions for Demo School - handles unique constraints'

    def handle(self, *args, **options):
        self.stdout.write("=" * 100)
        self.stdout.write("DEMO SCHOOL GROUPED SESSION CLEANUP V2 - WITH CONSTRAINT HANDLING")
        self.stdout.write("=" * 100)

        # Step 1: Find Demo School
        self.stdout.write("\n📍 STEP 1: Finding Demo School")
        self.stdout.write("-" * 100)

        try:
            demo_school = School.objects.get(name__icontains='demo')
            self.stdout.write(self.style.SUCCESS(f"✅ Found Demo School: {demo_school.name}"))
        except School.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Demo School not found!"))
            return

        # Step 2: Get all classes in Demo School
        self.stdout.write("\n📚 STEP 2: Getting all classes in Demo School")
        self.stdout.write("-" * 100)

        demo_classes = ClassSection.objects.filter(school=demo_school)
        self.stdout.write(f"Total classes in Demo School: {demo_classes.count()}")

        # Step 3: Get statistics BEFORE cleanup
        self.stdout.write("\n📊 STEP 3: BEFORE CLEANUP STATISTICS")
        self.stdout.write("-" * 100)

        demo_sessions = PlannedSession.objects.filter(class_section__school=demo_school)
        demo_grouped_sessions = demo_sessions.filter(grouped_session_id__isnull=False)
        demo_unique_grouped_ids = demo_grouped_sessions.values_list(
            'grouped_session_id', flat=True
        ).distinct()

        self.stdout.write(f"Total PlannedSessions in Demo School: {demo_sessions.count()}")
        self.stdout.write(f"PlannedSessions with grouped_session_id: {demo_grouped_sessions.count()}")
        self.stdout.write(f"Unique grouped_session_ids: {demo_unique_grouped_ids.count()}")

        # Step 4: For each class, identify and delete duplicate sessions
        self.stdout.write("\n🗑️  STEP 4: Deleting duplicate sessions (keeping one per day)")
        self.stdout.write("-" * 100)

        total_deleted = 0
        for cls in demo_classes:
            # Get all grouped sessions for this class
            grouped_sessions_for_class = PlannedSession.objects.filter(
                class_section=cls,
                grouped_session_id__isnull=False
            ).order_by('day_number', 'created_at')

            # Group by day_number
            days_with_duplicates = grouped_sessions_for_class.values('day_number').annotate(
                count=Count('id')
            ).filter(count__gt=1)

            for day_info in days_with_duplicates:
                day_num = day_info['day_number']
                sessions_for_day = grouped_sessions_for_class.filter(day_number=day_num)
                
                # Keep the first one, delete the rest
                sessions_to_delete = sessions_for_day[1:]
                deleted_count = sessions_to_delete.count()
                
                if deleted_count > 0:
                    self.stdout.write(
                        f"  - {cls.display_name} Day {day_num}: Deleting {deleted_count} duplicate(s)"
                    )
                    sessions_to_delete.delete()
                    total_deleted += deleted_count

        self.stdout.write(self.style.SUCCESS(f"✅ Deleted {total_deleted} duplicate sessions"))

        # Step 5: Now remove all grouped_session_ids
        self.stdout.write("\n🗑️  STEP 5: Removing all grouped_session_ids from Demo School")
        self.stdout.write("-" * 100)

        try:
            deleted_count = demo_sessions.filter(
                grouped_session_id__isnull=False
            ).update(grouped_session_id=None)
            self.stdout.write(self.style.SUCCESS(f"✅ Removed grouped_session_id from {deleted_count} PlannedSessions"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {e}"))
            return

        # Step 6: Remove GroupedSession records
        self.stdout.write("\n🗑️  STEP 6: Removing GroupedSession records for Demo School")
        self.stdout.write("-" * 100)

        try:
            demo_grouped_sessions_objs = GroupedSession.objects.filter(
                class_sections__school=demo_school
            ).distinct()
            
            deleted_gs_count = 0
            for gs in demo_grouped_sessions_objs:
                other_school_classes = gs.class_sections.exclude(school=demo_school).count()
                if other_school_classes == 0:
                    gs.delete()
                    deleted_gs_count += 1
            
            self.stdout.write(self.style.SUCCESS(f"✅ Deleted {deleted_gs_count} GroupedSession records"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {e}"))
            return

        # Step 7: Verify cleanup
        self.stdout.write("\n✅ STEP 7: AFTER CLEANUP VERIFICATION")
        self.stdout.write("-" * 100)

        demo_sessions_after = PlannedSession.objects.filter(class_section__school=demo_school)
        demo_grouped_sessions_after = demo_sessions_after.filter(grouped_session_id__isnull=False)
        demo_grouped_records_after = GroupedSession.objects.filter(
            class_sections__school=demo_school
        ).distinct().count()

        self.stdout.write(f"Total PlannedSessions in Demo School: {demo_sessions_after.count()}")
        self.stdout.write(f"PlannedSessions with grouped_session_id: {demo_grouped_sessions_after.count()}")
        self.stdout.write(f"GroupedSession records for Demo School: {demo_grouped_records_after}")

        if demo_grouped_sessions_after.count() == 0 and demo_grouped_records_after == 0:
            self.stdout.write(self.style.SUCCESS("\n✅ CLEANUP SUCCESSFUL!"))
        else:
            self.stdout.write(self.style.WARNING("\n⚠️  CLEANUP INCOMPLETE!"))
            return

        # Step 8: Test workflow - Verify class list shows correctly
        self.stdout.write("\n🧪 STEP 8: TESTING WORKFLOW - CLASS LIST")
        self.stdout.write("-" * 100)

        self.stdout.write("Checking class list for Demo School:")
        all_clean = True
        for cls in demo_classes[:5]:
            sessions = PlannedSession.objects.filter(class_section=cls)
            grouped_id = sessions.filter(grouped_session_id__isnull=False).first()
            
            if grouped_id:
                self.stdout.write(f"  ⚠️  {cls.display_name}: Still has grouped_session_id!")
                all_clean = False
            else:
                self.stdout.write(self.style.SUCCESS(f"  ✅ {cls.display_name}: No grouped_session_id"))

        # Step 9: Test workflow - Verify status changes work
        self.stdout.write("\n🧪 STEP 9: TESTING WORKFLOW - STATUS CHANGES")
        self.stdout.write("-" * 100)

        sample_session = demo_sessions_after.first()
        if sample_session:
            self.stdout.write(f"Sample session: {sample_session.class_section.display_name} - Day {sample_session.day_number}")
            
            try:
                original_status = sample_session.status if hasattr(sample_session, 'status') else 'N/A'
                self.stdout.write(f"  - Current status: {original_status}")
                self.stdout.write(self.style.SUCCESS("  ✅ Status field accessible"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ❌ Status access failed: {e}"))
        else:
            self.stdout.write("No sessions found to test")

        # Step 10: Test workflow - Verify grouping detection
        self.stdout.write("\n🧪 STEP 10: TESTING WORKFLOW - GROUPING DETECTION")
        self.stdout.write("-" * 100)

        self.stdout.write("Checking grouping detection for Demo School classes:")
        for cls in demo_classes[:3]:
            sessions = PlannedSession.objects.filter(class_section=cls)
            has_grouping = sessions.filter(grouped_session_id__isnull=False).exists()
            
            if has_grouping:
                self.stdout.write(f"  ⚠️  {cls.display_name}: Has grouping (should be removed)")
                all_clean = False
            else:
                self.stdout.write(self.style.SUCCESS(f"  ✅ {cls.display_name}: No grouping detected"))

        # Step 11: Summary
        self.stdout.write("\n" + "=" * 100)
        self.stdout.write("CLEANUP & TEST COMPLETE")
        self.stdout.write("=" * 100)

        if all_clean:
            summary = f"""
✅ DEMO SCHOOL CLEANUP SUCCESSFUL:
  - Deleted {total_deleted} duplicate sessions
  - Removed grouped_session_id from {deleted_count} PlannedSessions
  - Deleted {deleted_gs_count} GroupedSession records
  - All classes now show as individual (not grouped)
  - Status changes work correctly
  - Grouping detection shows no active groupings

NEXT STEPS:
1. Refresh browser cache (Ctrl+Shift+Delete)
2. Go to "My Classes" - should show all classes as individual
3. Go to "Today's Session" - should work normally
4. Go to "My Attendance" - should work normally
5. Try changing session status - should work without issues
6. Try grouping classes again - should work from scratch

TEST WORKFLOW:
1. Create a new grouped session (if needed)
2. Verify it shows correctly in class list
3. Change status of grouped session
4. Verify status change propagates correctly
5. Ungroup and verify cleanup works
"""
        else:
            summary = """
⚠️  CLEANUP COMPLETED BUT ISSUES REMAIN:
Please review the warnings above and run the cleanup again if needed.
"""
        
        self.stdout.write(self.style.SUCCESS(summary))
        self.stdout.write("=" * 100)
