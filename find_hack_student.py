#!/usr/bin/env python
"""
Find the enrollment ID for student "hack" and generate test data
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'CLAS.settings')
django.setup()

from class.models import Student, Enrollment, StudentQuiz, Attendance

# Find student "hack"
student = Student.objects.filter(full_name='hack').first()

if not student:
    print("❌ Student 'hack' not found")
    exit(1)

print(f"✓ Found student: {student.full_name}")
print(f"  Student ID: {student.id}")

# Find active enrollment
enrollment = Enrollment.objects.filter(student=student, is_active=True).first()

if not enrollment:
    print("❌ No active enrollment found for this student")
    exit(1)

print(f"✓ Found enrollment: {enrollment.id}")
print(f"  School: {enrollment.school.name}")
print(f"  Class: {enrollment.class_section.display_name}")

# Check current data
quiz_count = StudentQuiz.objects.filter(enrollment=enrollment).count()
attendance_count = Attendance.objects.filter(enrollment=enrollment).count()

print(f"\n📊 Current Data:")
print(f"  Quiz Scores: {quiz_count} (need 3+)")
print(f"  Attendance Records: {attendance_count} (need 5+)")

# Check if growth analysis is possible
if quiz_count >= 3 and attendance_count >= 5:
    print(f"\n✓ Growth analysis is available!")
else:
    print(f"\n⚠ Need more data for growth analysis")
    print(f"\n📝 To generate test data, run:")
    print(f"   python manage.py generate_growth_test_data --enrollment-id {enrollment.id}")
    print(f"\n📊 Then analyze with:")
    print(f"   python manage.py analyze_student_growth --enrollment-id {enrollment.id}")

print(f"\n🔗 View student at:")
print(f"   http://localhost:8000/facilitator/students/{student.id}/detail/")
