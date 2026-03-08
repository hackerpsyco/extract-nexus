#!/usr/bin/env python
"""
Check grouped session data structure
Run: python manage.py check_grouped_data
"""

from django.core.management.base import BaseCommand
from django.apps import apps

PlannedSession = apps.get_model('class', 'PlannedSession')
ClassSection = apps.get_model('class', 'ClassSection')
School = apps.get_model('class', 'School')


class Command(BaseCommand):
    help = 'Check grouped session data structure'

    def handle(self, *args, **options):
        # Find Demo School
        demo_school = School.objects.get(name__icontains='demo')
        demo_classes = ClassSection.objects.filter(school=demo_school)

        # Get a sample class
        sample_class = demo_classes.first()
        self.stdout.write(f"Sample class: {sample_class.display_name}")
        self.stdout.write(f"Total sessions: {PlannedSession.objects.filter(class_section=sample_class).count()}")

        # Check day 116
        sessions_day_116 = PlannedSession.objects.filter(
            class_section=sample_class,
            day_number=116
        )

        self.stdout.write(f"\nDay 116 sessions for {sample_class.display_name}:")
        for session in sessions_day_116:
            self.stdout.write(f"  - ID: {session.id}")
            self.stdout.write(f"    Grouped ID: {session.grouped_session_id}")
            self.stdout.write(f"    Created: {session.created_at}")

        # Check if there are both grouped and non-grouped for same day
        grouped_count = sessions_day_116.filter(grouped_session_id__isnull=False).count()
        non_grouped_count = sessions_day_116.filter(grouped_session_id__isnull=True).count()

        self.stdout.write(f"\nDay 116 breakdown:")
        self.stdout.write(f"  - Grouped sessions: {grouped_count}")
        self.stdout.write(f"  - Non-grouped sessions: {non_grouped_count}")

        # Check all classes for this pattern
        self.stdout.write(f"\n\nChecking all Demo School classes for mixed grouping:")
        for cls in demo_classes:
            sessions = PlannedSession.objects.filter(class_section=cls)
            
            # Find days with both grouped and non-grouped
            days_with_both = []
            for day_num in sessions.values_list('day_number', flat=True).distinct():
                day_sessions = sessions.filter(day_number=day_num)
                grouped = day_sessions.filter(grouped_session_id__isnull=False).count()
                non_grouped = day_sessions.filter(grouped_session_id__isnull=True).count()
                
                if grouped > 0 and non_grouped > 0:
                    days_with_both.append((day_num, grouped, non_grouped))
            
            if days_with_both:
                self.stdout.write(f"\n{cls.display_name}:")
                for day_num, grouped, non_grouped in days_with_both[:5]:
                    self.stdout.write(f"  - Day {day_num}: {grouped} grouped + {non_grouped} non-grouped")
