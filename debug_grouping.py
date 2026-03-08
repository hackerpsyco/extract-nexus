#!/usr/bin/env python
"""Direct test of grouping issue"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CLAS.settings')
django.setup()

from datetime import date
from django.contrib.auth import get_user_model

# Import from class app (using getattr to avoid keyword conflict)
import sys
from importlib import import_module
class_models = import_module('class.models')
ActualSession = class_models.ActualSession
PlannedSession = class_models.PlannedSession
ClassSection = class_models.ClassSection
FacilitatorSchool = class_models.FacilitatorSchool

User = get_user_model()

print("\n" + "="*70)
print("DEBUGGING ATTENDANCE GROUPING ISSUE")
print("="*70)

# Get a facilitator
facilitator = User.objects.filter(role__name='Facilitator').first()
if not facilitator:
    print('❌ No facilitator found')
    exit(1)

print(f'\n✓ Facilitator: {facilitator.full_name} (ID: {facilitator.id})')

# Get schools
schools = FacilitatorSchool.objects.filter(facilitator=facilitator, is_active=True).values_list('school_id', flat=True)
print(f'✓ Schools assigned: {len(schools)}')

# Get classes
classes = ClassSection.objects.filter(school_id__in=schools, is_active=True)
print(f'✓ Classes: {len(classes)}')

# Check today's sessions
today = date.today()
print(f'\n📅 Today: {today}')

# Get ALL sessions (not just today)
all_sessions = ActualSession.objects.filter(
    planned_session__class_section__school_id__in=schools
).order_by('-date')[:20]
print(f'✓ Total ActualSessions (all dates): {all_sessions.count()}')
print(f'  Recent dates:')
for s in all_sessions[:5]:
    print(f'    - {s.date}')

sessions = ActualSession.objects.filter(
    planned_session__class_section__school_id__in=schools,
    date=today
)
print(f'\n✓ ActualSessions for TODAY ({today}): {sessions.count()}')

# Check for duplicates and grouping status
print("\n" + "-"*70)
print("CLASS GROUPING STATUS")
print("-"*70)

for cls in classes[:5]:
    cls_sessions = ActualSession.objects.filter(
        planned_session__class_section=cls,
        date=today
    ).order_by('id')
    
    print(f"\n📌 {cls.display_name}")
    print(f"   Sessions: {cls_sessions.count()}")
    
    if cls_sessions.count() == 0:
        print(f"   ⚠️  NO SESSIONS FOR THIS CLASS")
    elif cls_sessions.count() > 1:
        print(f"   ❌ DUPLICATE SESSIONS (should be 1):")
        for i, s in enumerate(cls_sessions):
            ps = s.planned_session
            print(f"      {i+1}. ActualSession ID: {s.id}")
            print(f"         PlannedSession ID: {ps.id}")
            print(f"         Grouped: {ps.grouped_session_id is not None}")
            if ps.grouped_session_id:
                grouped = PlannedSession.objects.filter(
                    grouped_session_id=ps.grouped_session_id,
                    day_number=ps.day_number,
                    is_active=True
                )
                print(f"         Grouped with: {grouped.count()} classes")
    else:
        s = cls_sessions.first()
        ps = s.planned_session
        print(f"   ✓ ActualSession ID: {s.id}")
        print(f"   ✓ PlannedSession ID: {ps.id}")
        
        if ps.grouped_session_id:
            grouped = PlannedSession.objects.filter(
                grouped_session_id=ps.grouped_session_id,
                day_number=ps.day_number,
                is_active=True
            )
            grouped_names = ', '.join([p.class_section.display_name for p in grouped])
            print(f"   ✓ Status: GROUPED with {grouped.count()} classes")
            print(f"   ✓ Classes: {grouped_names}")
        else:
            print(f"   ✓ Status: SINGLE (ungrouped)")

# Check PlannedSession availability
print("\n" + "-"*70)
print("PLANNED SESSION AVAILABILITY")
print("-"*70)

for cls in classes[:3]:
    print(f"\n📌 {cls.display_name}")
    
    # Ungrouped sessions
    ungrouped = PlannedSession.objects.filter(
        class_section=cls,
        grouped_session_id__isnull=True,
        is_active=True
    )
    print(f"   Ungrouped sessions: {ungrouped.count()}")
    
    # Grouped sessions
    grouped = PlannedSession.objects.filter(
        class_section=cls,
        grouped_session_id__isnull=False,
        is_active=True
    )
    print(f"   Grouped sessions: {grouped.count()}")
    
    if grouped.count() > 0:
        for g in grouped[:2]:
            # Get all classes in this group
            group_members = PlannedSession.objects.filter(
                grouped_session_id=g.grouped_session_id,
                day_number=g.day_number,
                is_active=True
            )
            names = ', '.join([p.class_section.display_name for p in group_members])
            print(f"      - Group: {names}")

# Check for issues
print("\n" + "-"*70)
print("POTENTIAL ISSUES")
print("-"*70)

issues = []

# Check 1: Duplicate sessions
for cls in classes:
    count = ActualSession.objects.filter(
        planned_session__class_section=cls,
        date=today
    ).count()
    if count > 1:
        issues.append(f"❌ {cls.display_name}: {count} sessions (should be 1)")

# Check 2: Missing sessions
for cls in classes:
    count = ActualSession.objects.filter(
        planned_session__class_section=cls,
        date=today
    ).count()
    if count == 0:
        issues.append(f"⚠️  {cls.display_name}: No session for today")

# Check 3: Orphaned PlannedSessions
orphaned = PlannedSession.objects.filter(
    is_active=True,
    class_section__school_id__in=schools
).exclude(
    id__in=ActualSession.objects.filter(date=today).values_list('planned_session_id', flat=True)
)
if orphaned.count() > 0:
    issues.append(f"⚠️  {orphaned.count()} PlannedSessions not used today")

if issues:
    print("\nFound issues:")
    for issue in issues:
        print(f"  {issue}")
else:
    print("\n✅ No issues found!")

print("\n" + "="*70)
