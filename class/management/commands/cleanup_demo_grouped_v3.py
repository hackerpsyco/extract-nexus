#!/usr/bin/env python
"""
Management command to cleanup grouped sessions for Demo School - Version 3
Handles mixed grouped/non-grouped sessions by deleting all and recreating clean ones

Run: python manage.py cleanup_demo_grouped_v3
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
    help = 'Clean up all grouped sessions for Demo School - handles mixed grouping'

    def handle(self, *args, **options):
        self.stdout.write("=" * 100)
        self.stdout.write("DEMO SCHOOL GROUPED SESSION CLEANUP V3 - COMPLETE RESET")
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

        # Step 4: For each class, identify days with mixed grouping and delete all for those days
        self.stdout.write("\n🗑️  STEP 4: Deleting all sessions for days with mixed grouping")
        self.stdout.write("-" * 100)

        total_deleted = 0
        days_to_recreate = {}  # {class_id: set(day_numbers)}

        for cls in demo_classes:
            sessions = PlannedSession.objects.filter(class_section=cls)
            
            # Find days with both grouped and non-grouped
            for day_num in sessions.values_list('day_number', flat=True).distinct():
                day_sessions = sessions.filter(day_number=day_num)
                grouped = day_sessions.filter(grouped_session_id__isnull=False).count()
                non_grouped = day_sessions.filter(grouped_session_id__isnull=True).count()
                
                if grouped > 0 and non_grouped > 0:
                    # Mixed grouping - delete all and mark for recreation
                    self.stdout.write(
                        f"  - {cls.display_name} Day {day_num}: {grouped} grouped + {non_grouped} non-grouped"
                    )
                    
                    # Store one session to get its data before deletion
                    sample_session = day_sessions.first()
                    
                    # Delete all sessions for this day
                    deleted = day_sessions.delete()[0]
                    total_deleted += deleted
                    
                    # Mark for recreation
                    if cls.id not in days_to_recreate:
                        days_to_recreate[cls.id] = set()
                    days_to_recreate[cls.id].add((day_num, sample_session))

        self.stdout.write(self.style.SUCCESS(f"✅ Deleted {total_deleted} sessions with mixed grouping"))

        # Step 5: Recreate clean non-grouped sessions
        self.stdout.write("\n✨ STEP 5: Recreating clean non-grouped sessions")
        self.stdout.write("-" * 100)

        total_recreated = 0
        for cls_id, day_info_set in days_to_recreate.items():
            cls = ClassSection.objects.get(id=cls_id)
            for day_num, sample_session in day_info_set:
                # Create a new clean non-grouped session
                new_session = PlannedSession.objects.create(
                    class_section=cls,
                    day_number=day_num,
                    title=sample_session.title,
                    description=sample_session.description,
                    is_active=sample_session.is_active,
                    grouped_session_id=None,  # Explicitly non-grouped
                )
                self.stdout.write(f"  ✅ Recreated {cls.display_name} Day {day_num}")
                total_recreated += 1

        self.stdout.write(self.style.SUCCESS(f"✅ Recreated {total_recreated} clean sessions"))

        # Step 6: Delete all remaining grouped_session_ids
        self.stdout.write("\n🗑️  STEP 6: Removing all remaining grouped_session_ids")
        self.stdout.write("-" * 100)

        try:
            remaining_grouped = PlannedSession.objects.filter(
                class_section__school=demo_school,
                grouped_session_id__isnull=False
            )
            deleted_count = remaining_grouped.update(grouped_session_id=None)
            self.stdout.write(self.style.SUCCESS(f"✅ Removed grouped_session_id from {deleted_count} sessions"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {e}"))
            return

        # Step 7: Remove GroupedSession records
        self.stdout.write("\n🗑️  STEP 7: Removing GroupedSession records for Demo School")
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

        # Step 8: Verify cleanup
        self.stdout.write("\n✅ STEP 8: AFTER CLEANUP VERIFICATION")
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

        # Step 9: Test workflow - Verify class list shows correctly
        self.stdout.write("\n🧪 STEP 9: TESTING WORKFLOW - CLASS LIST")
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
  - Deleted {total_deleted} sessions with mixed grouping
  - Recreated {total_recreated} clean non-grouped sessions
  - Removed grouped_session_id from {deleted_count} sessions
  - Deleted {deleted_gs_count} GroupedSession records
  - All classes now show as individual (not grouped)
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
