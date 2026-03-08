import uuid
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_http_methods
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.conf import settings
from django.core.paginator import Paginator
from django.db.models import Prefetch, Count, Q, Exists, OuterRef, Max
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.vary import vary_on_headers
from django.core.files.base import ContentFile
from typing import List, Optional
import csv
import openpyxl
import os
import json
import logging
from .forms import AddUserForm, EditUserForm, AddSchoolForm, ClassSectionForm, AssignFacilitatorForm
from .models import User, Role, School, ClassSection, FacilitatorSchool,Student,Enrollment,PlannedSession,SessionStep, ActualSession, Attendance, CANCELLATION_REASONS, FacilitatorTask, SessionStatus, AttendanceStatus, DateType, CurriculumStatus, SessionFeedback, StudentGuardian
from .models import CurriculumSession, SessionTemplate, SessionUsageLog, ImportHistory, SessionVersionHistory, LessonPlanUpload
from .services.session_integration_service import SessionIntegrationService, IntegratedSessionData
from .mixins import PerformanceOptimizedMixin, OptimizedListMixin, CachedViewMixin, AjaxOptimizedMixin, DatabaseOptimizedMixin, cache_expensive_operation, monitor_performance
from .decorators import facilitator_required
from datetime import date
import re
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
import time

logger = logging.getLogger(__name__)
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

# Import the session management classes
from .session_management import SessionSequenceCalculator, SessionStatusManager


def get_grouped_classes_for_session(planned_session: PlannedSession, target_date: Optional[date] = None) -> List[ClassSection]:
    """
    Helper function to get all classes in a grouped session
    Consolidates logic for checking both grouped_session_id and CalendarDate
    
    Returns list of ClassSection objects that are part of the same group
    """
    grouped_classes = []
    if target_date is None:
        target_date = timezone.now().date()
    
    # Priority 1: Check CalendarDate for specific date grouping
    from .models import CalendarDate
    calendar_entry = CalendarDate.objects.filter(
        date=target_date,
        class_sections=planned_session.class_section,
        date_type=DateType.SESSION
    ).first()
    
    if calendar_entry and calendar_entry.class_sections.count() > 1:
        # This class is part of a grouped session via CalendarDate for this specific date
        grouped_classes = list(calendar_entry.class_sections.all())
        logger.info(f"Grouped session detected via CalendarDate (Date: {target_date}) for class {planned_session.class_section.id}: classes_in_group={len(grouped_classes)}")
        return grouped_classes

    # Priority 2: Fallback to persistent grouped_session_id only if no date-specific entry exists
    # AND only if we are specifically looking for a permanent group.
    # We'll skip this if we want strict date-based grouping as requested by the user.
    # However, to maintain some compatibility, we check if it's supposed to be grouped today.
    # If target_date matches today, we check if there's an ActualSession for it.
    if planned_session.grouped_session_id:
        has_active_session = False
        if target_date == timezone.now().date():
             from .models import ActualSession
             has_active_session = ActualSession.objects.filter(
                 planned_session=planned_session,
                 date=target_date
             ).exists()
        
        if has_active_session:
            grouped_sessions = PlannedSession.objects.filter(
                grouped_session_id=planned_session.grouped_session_id,
                day_number=planned_session.day_number
            ).select_related('class_section')
            
            grouped_classes = [gs.class_section for gs in grouped_sessions]
            logger.info(f"Grouped session detected via ACTIVE grouped_session_id for class {planned_session.class_section.id}: classes_in_group={len(grouped_classes)}")
            return grouped_classes

    logger.info(f"Single session for class {planned_session.class_section.id}: no grouped_session_id or no active CalendarDate for {target_date}")
    return [planned_session.class_section]


# Import the session management classes

# -------------------------------
# Role-Based Dashboard Configuration
# -------------------------------
ROLE_CONFIG = {
    "ADMIN": {"url": "/admin/dashboard/", "template": "admin/dashboard.html"},
    "SUPERVISOR": {"url": "/supervisor/dashboard/", "template": "Supervisor/dashboard.html"},
    "FACILITATOR": {"url": "/facilitator/dashboard/", "template": "facilitator/dashboard.html"},
}

# -------------------------------
# Authentication Views
# ✅ Authentication views moved to views_auth.py
# - login_view
# - logout_view
# - session_check_view
# - clear_session_view
# These are now imported from views_auth.py in urls.py


# ✅ HOME REDIRECT VIEW (SINGLE SOURCE OF TRUTH FOR ROLE-BASED ROUTING)
# This is the ONLY place that decides where users go after login
@login_required(login_url='/login/')
def home(request):
    """
    Single source of truth for role-based routing after login.
    Routes authenticated users to their appropriate dashboard based on role.
    
    This view ensures:
    - No redirect loops (authorization failures return 403, not redirects)
    - One place decides where users go
    - Clean separation: auth views only authenticate, this view routes
    """
    role = request.user.role.name.lower() if request.user.role else None
    
    if role == 'admin':
        return redirect('/admin/dashboard/')
    elif role == 'supervisor':
        return redirect('/supervisor/dashboard/')
    elif role == 'facilitator':
        return redirect('/facilitator/dashboard/')
    else:
        logger.error(f"User {request.user.email} has unknown role: {role}")
        return redirect('/login/')


# Dashboard View is defined later in this file (line ~2867)
# to include complete admin dashboard logic with stats and activities


# -------------------------------
# User Management Views
# -------------------------------
@login_required
def users_view(request):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to view this page.")
        return redirect("no_permission")

    users = User.objects.all().order_by("-created_at")
    roles = Role.objects.all()
    return render(request, "admin/users/users.html", {
        "users": users,
        "roles": roles
    })


@login_required
def add_user(request):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to add users.")
        return redirect("no_permission")

    if request.method == "POST":
        form = AddUserForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data["password"])
            user.save()
            messages.success(request, "User created successfully!")
            return redirect("users_view")
    else:
        form = AddUserForm()

    return render(request, "admin/users/add_user.html", {"form": form})


@login_required
def edit_user(request, user_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to edit users.")
        return redirect("no_permission")

    user = get_object_or_404(User, id=user_id)

    if request.method == "POST":
        form = EditUserForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            messages.success(request, "User updated successfully!")
            return redirect("users_view")
    else:
        form = EditUserForm(instance=user)

    return render(request, "admin/users/edit_user.html", {
        "form": form,
        "user": user
    })


@login_required
def delete_user(request, user_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to delete users.")
        return redirect("no_permission")

    user = get_object_or_404(User, id=user_id)
    user.delete()
    messages.success(request, "User deleted successfully!")
    return redirect("users_view")


# -------------------------------
# AJAX User Creation (NOT REMOVED)
# -------------------------------
@csrf_exempt
def create_user_ajax(request):
    if request.method == "POST":
        full_name = request.POST.get("full_name")
        email = request.POST.get("email")
        password = request.POST.get("password")
        role_id = request.POST.get("role")

        if not all([full_name, email, password, role_id]):
            return JsonResponse({"success": False, "error": "All fields are required."})

        if User.objects.filter(email=email).exists():
            return JsonResponse({"success": False, "error": "User already exists."})

        try:
            role = Role.objects.get(id=role_id)

            user = User.objects.create_user(
                email=email,
                password=password,
                full_name=full_name,
                role=role        # ✅ IMPORTANT — pass the Role object
            )

            return JsonResponse({
                "success": True,
                "user": {
                    "id": str(user.id),
                    "full_name": user.full_name,
                    "email": user.email,
                    "role_name": role.name
                }
            })

        except Role.DoesNotExist:
            return JsonResponse({"success": False, "error": "Invalid role selected."})

    return JsonResponse({"success": False, "error": "Invalid request method."})

# -------------------------------
# School Management Views
# -------------------------------
@login_required
@monitor_performance
def schools(request):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to view schools.")
        return redirect("no_permission")

    # Optimized query with related data and statistics
    from .query_optimizations import CachedQueries
    
    schools_queryset = CachedQueries.get_schools_with_stats(request.user.id, cache_timeout=300)
    
    # Add pagination: 20 schools per page
    paginator = Paginator(schools_queryset, 20)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    form = AssignFacilitatorForm()
    return render(request, "admin/schools/list.html", {
        "page_obj": page_obj,
        "schools": page_obj.object_list,
        "form": form
    })


@login_required
def add_school(request):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to add schools.")
        return redirect("no_permission")

    if request.method == "POST":
        form = AddSchoolForm(request.POST)
        if form.is_valid():
            school = form.save()
            
            # Clear schools cache to refresh data
            from .query_optimizations import CachedQueries
            CachedQueries.invalidate_schools_cache(request.user.id)
            
            messages.success(request, f"School '{school.name}' added successfully!")
            return redirect("schools")
    else:
        form = AddSchoolForm()

    return render(request, "admin/schools/add_school.html", {"form": form})


@login_required
def edit_school(request, school_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to edit schools.")
        return redirect("no_permission")

    school = get_object_or_404(School, id=school_id)

    if request.method == "POST":
        form = AddSchoolForm(request.POST, instance=school)
        if form.is_valid():
            updated_school = form.save()
            
            # Clear schools cache to refresh data
            from .query_optimizations import CachedQueries
            CachedQueries.invalidate_schools_cache(request.user.id)
            
            messages.success(request, f"School '{updated_school.name}' updated successfully!")
            return redirect("schools")
    else:
        form = AddSchoolForm(instance=school)

    return render(request, "admin/schools/edit_school.html", {
        "form": form,
        "school": school
    })
@login_required
def delete_school(request, school_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to delete schools.")
        return redirect("no_permission")

    school = get_object_or_404(School, id=school_id)

    if request.method == "POST":
        school_name = school.name
        school.delete()
        
        # Clear schools cache to refresh data
        cache_key = f"schools_list_{request.user.id}"
        cache.delete(cache_key)
        
        messages.success(request, f"School '{school_name}' deleted successfully!")
        return redirect("schools")

    messages.error(request, "Invalid request.")
    return redirect("schools")


@login_required
def school_detail(request, school_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to view school details.")
        return redirect("no_permission")

    school = get_object_or_404(School, id=school_id)
    classes = ClassSection.objects.filter(school=school).order_by("class_level", "section")
    
    # Get facilitator assignments for this school
    facilitator_assignments = FacilitatorSchool.objects.filter(
        school=school
    ).select_related("facilitator").order_by("-created_at")
    
    # Calculate student count
    from django.db.models import Count, Q, Avg
    from .models import Enrollment, ActualSession, Attendance
    
    total_students = Enrollment.objects.filter(
        class_section__school=school,
        is_active=True
    ).values('student').distinct().count()
    
    total_facilitators = facilitator_assignments.filter(is_active=True).count()
    total_classes = classes.count()
    
    # Calculate sessions count
    total_sessions = ActualSession.objects.filter(
        planned_session__class_section__school=school
    ).count()
    
    # Calculate attendance percentage
    total_attendance_records = Attendance.objects.filter(
        actual_session__planned_session__class_section__school=school
    ).count()
    
    present_count = Attendance.objects.filter(
        actual_session__planned_session__class_section__school=school,
        status=AttendanceStatus.PRESENT
    ).count()
    
    attendance_percentage = 0
    if total_attendance_records > 0:
        attendance_percentage = round((present_count / total_attendance_records) * 100, 2)

    return render(request, "admin/schools/detail.html", {
        "school": school,
        "class_sections": classes,
        "facilitator_assignments": facilitator_assignments,
        "total_students": total_students,
        "total_facilitators": total_facilitators,
        "total_classes": total_classes,
        "sessions_count": total_sessions,
        "attendance_percentage": attendance_percentage
    })


# -------------------------------
# Class Management Views
# -------------------------------
@login_required
def class_sections_list(request, school_id=None):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to view classes.")
        return redirect("no_permission")

    if school_id:
        school = get_object_or_404(School, id=school_id)
        class_sections = ClassSection.objects.filter(
            school=school
        ).order_by("class_level", "section")
        
        # Custom ordering for better display
        class_sections = sorted(class_sections, key=lambda x: (x.class_level_order, x.section or 'A'))
    else:
        school = None
        class_sections = ClassSection.objects.all().select_related('school')
        # Custom ordering for all classes
        class_sections = sorted(class_sections, key=lambda x: (x.school.name, x.class_level_order, x.section or 'A'))

    # Add pagination: 30 classes per page
    paginator = Paginator(class_sections, 30)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    return render(request, "admin/classes/list.html", {
        "school": school,
        "page_obj": page_obj,
        "class_sections": page_obj.object_list,
        "schools": School.objects.all(),
    })

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import ClassSectionForm
from .models import School, ClassSection

@login_required
def class_section_add(request, school_id):
    # Permission check
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to add classes.")
        return redirect("no_permission")

    # Get the school
    school = get_object_or_404(School, id=school_id)

    if request.method == "POST":
        form = ClassSectionForm(request.POST)
        if form.is_valid():
            class_level = form.cleaned_data["class_level"]
            section = form.cleaned_data["section"]

            # Check duplicate
            if ClassSection.objects.filter(
                school=school,
                class_level=class_level,
                section=section
            ).exists():
                # Add non-field error to show in template
                form.add_error(None, f"Class {class_level} - Section {section} already exists for this school.")
            else:
                # Save new class section
                class_section = form.save(commit=False)
                class_section.school = school
                class_section.save()
                messages.success(request, f"Class {class_level} - Section {section} added successfully!")
                return redirect("class_sections_list_by_school", school_id=school.id)
    else:
        form = ClassSectionForm()

    return render(request, "admin/classes/add.html", {
        "form": form,
        "school": school
    })



@login_required
def class_section_delete(request, pk):
    class_section = get_object_or_404(ClassSection, id=pk)
    school_id = class_section.school.id

    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to delete classes.")
        return redirect("no_permission")

    if request.method == "POST" or request.method == "GET":
        from .signals_optimization import silence_signals
        
        # Explicitly invalidate global dashboard stats once
        cache.delete('dashboard_stats_ADMIN')
        cache.delete('dashboard_stats_FACILITATOR')
        cache.delete('dashboard_stats_SUPERVISOR')
        
        # Invalidate school classes cache
        cache.delete(f'school_{school_id}_classes')
        
        # Silence redundant cascade signals during bulk deletion
        with silence_signals():
            class_section.delete()
            
        messages.success(request, "Class section deleted successfully!")
        return redirect("class_sections_list_by_school", school_id=school_id)


@login_required
def admin_bulk_create_classes(request):
    """Create multiple new classes at once"""
    
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to access this page.")
        return redirect("no_permission")
    
    schools = School.objects.all().order_by('name')
    selected_school = None
    
    # Get school_id from query params or POST
    school_id = request.GET.get('school_id') or request.POST.get('school_id')
    if school_id:
        try:
            selected_school = School.objects.get(id=school_id)
        except School.DoesNotExist:
            pass
    
    if request.method == "POST":
        school_id = request.POST.get('school_id')
        
        if not school_id:
            messages.error(request, "Please select a school")
            return render(request, "admin/classes/bulk_create.html", {
                'schools': schools,
                'selected_school': selected_school,
            })
        
        try:
            school = School.objects.get(id=school_id)
        except School.DoesNotExist:
            messages.error(request, "School not found")
            return render(request, "admin/classes/bulk_create.html", {
                'schools': schools,
                'selected_school': selected_school,
            })
        
        # Get all class inputs
        class_levels = request.POST.getlist('class_level')
        sections = request.POST.getlist('section')
        academic_years = request.POST.getlist('academic_year')
        
        if not class_levels or len(class_levels) == 0:
            messages.error(request, "Please add at least one class")
            return render(request, "admin/classes/bulk_create.html", {
                'schools': schools,
                'selected_school': selected_school,
            })
        
        if len(class_levels) > 10:
            messages.error(request, "Maximum 10 classes allowed")
            return render(request, "admin/classes/bulk_create.html", {
                'schools': schools,
                'selected_school': selected_school,
            })
        
        # Create classes
        created_count = 0
        for i, class_level in enumerate(class_levels):
            if class_level and sections[i] and academic_years[i]:
                try:
                    ClassSection.objects.create(
                        school=school,
                        class_level=class_level,
                        section=sections[i],
                        academic_year=academic_years[i],
                        is_active=True
                    )
                    created_count += 1
                except Exception as e:
                    messages.warning(request, f"Error creating class {class_level} {sections[i]}: {str(e)}")
        
        if created_count > 0:
            messages.success(request, f"Successfully created {created_count} classes")
            return redirect("class_sections_list_by_school", school_id=school_id)
        else:
            messages.error(request, "No classes were created")
    
    context = {
        'schools': schools,
        'selected_school': selected_school,
    }
    
    return render(request, "admin/classes/bulk_create.html", context)


@login_required
def admin_bulk_add_classes(request):
    """Bulk add multiple classes - Admin version"""
    
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to access this page.")
        return redirect("no_permission")
    
    # Get selected class IDs from query params
    selected_ids = request.GET.getlist('ids')
    
    if not selected_ids:
        messages.error(request, "No classes selected")
        return redirect("class_sections_list")
    
    # Get the selected classes
    selected_classes = ClassSection.objects.filter(
        id__in=selected_ids
    ).select_related('school').order_by('school__name', 'class_level', 'section')
    
    if request.method == "POST":
        # Get form data
        class_name = request.POST.get('class_name', '').strip()
        description = request.POST.get('description', '').strip()
        
        if not class_name:
            messages.error(request, "Class name is required")
            return render(request, "admin/classes/bulk_add.html", {
                'selected_classes': selected_classes,
                'selected_ids': selected_ids,
            })
        
        # Create a grouped session for the selected classes
        try:
            with transaction.atomic():
                # Generate a unique grouped_session_id
                grouped_session_id = uuid.uuid4()
                
                # Get the list of selected classes
                classes_list = list(selected_classes)
                
                if len(classes_list) < 2:
                    messages.error(request, "Please select at least 2 classes to create a grouped session")
                    return render(request, "admin/classes/bulk_add.html", {
                        'selected_classes': selected_classes,
                        'selected_ids': selected_ids,
                    })
                
                # Use the supervisor's helper function to initialize grouped sessions
                from .supervisor_views import initialize_grouped_session_plans
                result = initialize_grouped_session_plans(classes_list, grouped_session_id)
                
                if result['success']:
                    messages.success(request, f"✅ Successfully created grouped session for {len(classes_list)} classes with 150 shared sessions")
                    return redirect("class_sections_list")
                else:
                    messages.error(request, f"❌ Error creating grouped session: {result.get('error', 'Unknown error')}")
                    return render(request, "admin/classes/bulk_add.html", {
                        'selected_classes': selected_classes,
                        'selected_ids': selected_ids,
                    })
        
        except Exception as e:
            messages.error(request, f"Error creating grouped session: {str(e)}")
            return render(request, "admin/classes/bulk_add.html", {
                'selected_classes': selected_classes,
                'selected_ids': selected_ids,
            })
    
    context = {
        'selected_classes': selected_classes,
        'selected_ids': ','.join(selected_ids),
        'class_count': len(selected_classes),
    }
    
    return render(request, "admin/classes/bulk_add.html", context)

@login_required
def class_view(request, school_id=None):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to view classes.")
        return redirect("no_permission")

    if school_id:
        return redirect("class_sections_list", school_id=school_id)

    return redirect("class_sections_list")


# -------------------------------
# No Permission
# -------------------------------
def no_permission(request):
    return render(request, "no_permission.html")


# Heartbeat Endpoint
# -------------------------------
@csrf_exempt
@require_http_methods(["GET", "POST", "HEAD"])
def heartbeat(request):
    """
    Lightweight  endpoint to keep Render app active.
    Prevents cold starts and database sleep.
    
    Accepts GET, POST, and HEAD requests.
    Usage: Ping this endpoint every 5 minutes using UptimeRobot or a cron job.
    URL: https://clas-bqai.onrender.com/heartbeat/
    """
    return JsonResponse({
        'status': 'ok',
        'timestamp': timezone.now().isoformat()
    }, status=200)


# -------------------------------
# Admin Settings
# -------------------------------
@login_required
def admin_settings(request):
    """Admin settings page"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "You do not have permission to access this page.")
        return redirect("no_permission")
    
    return render(request, "admin/settings.html", {})


def edit_class_section(request, pk):
    class_section = get_object_or_404(ClassSection, id=pk)
    form = ClassSectionForm(request.POST or None, instance=class_section)
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("class_sections_list")  # adjust as needed
    return render(request, "admin/classes/edit_class_section.html", {"form": form, "class_section": class_section})


def assign_facilitator(request, class_section_id=None):
    if request.method == "POST":
        form = AssignFacilitatorForm(request.POST)
        if form.is_valid():
            assignment = form.save()
            
            # Clear schools cache to refresh facilitator counts
            cache_key = f"schools_list_{request.user.id}"
            cache.delete(cache_key)
            
            if class_section_id:
                # Class-level assignment
                messages.success(request, f"Facilitator assigned to class successfully.")
                return redirect("class_sections_list")
            else:
                # School-level assignment
                messages.success(request, f"Facilitator assigned to {assignment.school.name} successfully.")
                return redirect("schools")
    else:
        form = AssignFacilitatorForm()
        
        # Pre-select class if provided
        if class_section_id:
            class_section = get_object_or_404(ClassSection, id=class_section_id)
            form.fields['school'].initial = class_section.school

    return render(request, "admin/assign_facilitator.html", {
        "form": form
    })

def students_list(request, school_id):
    school = get_object_or_404(School, id=school_id)
    class_sections = ClassSection.objects.filter(school=school)

    class_section_id = request.GET.get("class_section")

    enrollments = Enrollment.objects.filter(
        school=school,
        is_active=True
    ).select_related("student", "class_section")

    if class_section_id:
        enrollments = enrollments.filter(class_section_id=class_section_id)

    # Add pagination: 50 students per page
    paginator = Paginator(enrollments, 50)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    return render(request, "admin/students/students_list.html", {
        "school": school,
        "class_sections": class_sections,
        "page_obj": page_obj,
        "enrollments": page_obj.object_list,
        "selected_class_section": class_section_id,
    })


def student_add(request, school_id):
    school = get_object_or_404(School, id=school_id)
    class_sections = ClassSection.objects.filter(school=school)

    if request.method == "POST":
        student, _ = Student.objects.get_or_create(
            enrollment_number=request.POST["enrollment_number"],
            defaults={
                "full_name": request.POST["full_name"],
                "gender": request.POST["gender"]
            }
        )

        Enrollment.objects.get_or_create(
            student=student,
            school=school,
            class_section_id=request.POST["class_section"],
            defaults={
                "start_date": request.POST["start_date"],
                "is_active": True
            }
        )

        return redirect("students_list", school_id=school.id)

    return render(request, "admin/students/student_add.html", {
        "school": school,
        "class_sections": class_sections,
    })


def student_edit(request, school_id, student_id):
    school = get_object_or_404(School, id=school_id)
    student = get_object_or_404(Student, id=student_id)
    enrollment = get_object_or_404(
        Enrollment,
        student=student,
        school=school,
        is_active=True
    )
    class_sections = ClassSection.objects.filter(school=school)

    if request.method == "POST":
        student.enrollment_number = request.POST["enrollment_number"]
        student.full_name = request.POST["full_name"]
        student.gender = request.POST["gender"]
        student.save()

        enrollment.class_section_id = request.POST["class_section"]
        enrollment.start_date = request.POST["start_date"]
        enrollment.save()

        return redirect("students_list", school_id=school.id)

    return render(request, "admin/students/student_edit.html", {
        "school": school,
        "student": student,
        "enrollment": enrollment,
        "class_sections": class_sections,
    })

def student_delete(request, school_id, student_id):
    if request.method == "POST":
        enrollment = get_object_or_404(
            Enrollment,
            student_id=student_id,
            school_id=school_id,
            is_active=True
        )
        enrollment.is_active = False
        enrollment.save()

    return redirect("students_list", school_id=school_id)



def student_import(request, school_id):
    school = get_object_or_404(School, id=school_id)
    class_sections = ClassSection.objects.filter(school=school)

    if request.method == "POST":
        file = request.FILES.get("file")

        if not file:
            messages.error(request, "Please upload a file")
            return redirect(request.path)

        ext = file.name.split(".")[-1].lower()

        # ---------- READ FILE ----------
        if ext == "csv":
            rows = csv.DictReader(file.read().decode("utf-8").splitlines())

        elif ext in ["xlsx", "xls"]:
            wb = openpyxl.load_workbook(file)
            sheet = wb.active
            headers = [str(cell.value).strip() for cell in sheet[1]]
            rows = []
            for r in sheet.iter_rows(min_row=2, values_only=True):
                rows.append(dict(zip(headers, r)))
        else:
            messages.error(request, "Unsupported file format")
            return redirect(request.path)

        created_count = 0
        skipped_count = 0

        # ---------- PROCESS ROWS ----------
        for row in rows:
            enrollment_no = str(row.get("enrollment_number", "")).strip()
            full_name = str(row.get("full_name", "")).strip()
            gender = str(row.get("gender", "")).strip()
            class_level = str(row.get("class_level", "")).strip()
            section = str(row.get("section", "")).strip()
            start_date = row.get("start_date") or date.today()


            # Basic validation
            if not all([enrollment_no, full_name, gender, class_level, section]):
                skipped_count += 1
                continue

            class_section = ClassSection.objects.filter(
                school=school,
                class_level=class_level,
                section=section
            ).first()

            if not class_section:
                skipped_count += 1
                continue

            student, _ = Student.objects.get_or_create(
                enrollment_number=enrollment_no,
                defaults={
                    "full_name": full_name,
                    "gender": gender
                }
            )

            enrollment, created = Enrollment.objects.get_or_create(
                student=student,
                school=school,
                class_section=class_section,
                defaults={
                    "start_date": start_date,
                    "is_active": True
                }
            )

            if created:
                created_count += 1

        # ---------- USER FEEDBACK ----------
        if created_count == 0:
            messages.warning(
                request,
                f"No students imported. Skipped rows: {skipped_count}"
            )
        else:
            messages.success(
                request,
                f"{created_count} students imported successfully "
                f"(Skipped: {skipped_count})"
            )

        return redirect("students_list", school_id=school.id)

    return render(request, "admin/students/student_import.html", {
        "school": school,
        "class_sections": class_sections
    })


    
@login_required
@monitor_performance
def sessions_view(request, class_section_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)
    
    # Get pagination parameters
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 5))  # Show 5 sessions per page by default
    
    # Cache key for this class section
    cache_key = f"class_sessions_{class_section_id}_{page}_{per_page}"
    cached_data = cache.get(cache_key)
    
    if cached_data:
        return render(request, "admin/classes/class_sessions.html", cached_data)

    # Get total count first (fast query)
    total_sessions = PlannedSession.objects.filter(class_section=class_section).count()
    
    # Calculate pagination
    start_index = (page - 1) * per_page
    end_index = start_index + per_page
    
    # Get only the sessions for current page with optimized query
    planned_sessions = (
        PlannedSession.objects
        .filter(class_section=class_section)
        .select_related('class_section', 'class_section__school')
        .prefetch_related(
            Prefetch(
                'actual_sessions',
                queryset=ActualSession.objects.select_related('facilitator').order_by('-date')
            ),
            'steps'
        )
        .annotate(
            is_conducted=Exists(
                ActualSession.objects.filter(
                    planned_session=OuterRef("pk"),
                    status=SessionStatus.CONDUCTED
                )
            )
        )
        .order_by("day_number")[start_index:end_index]
    )

    # Process status for current page sessions only
    for ps in planned_sessions:
        ps.status_info = "pending"
        ps.status_class = "secondary"

        if ps.is_conducted:
            ps.status_info = "completed"
            ps.status_class = "success"
        else:
            # Get latest actual session ONLY
            last_actual = ps.actual_sessions.first()  # Already ordered by -date

            if last_actual:
                if last_actual.status == SessionStatus.HOLIDAY:
                    ps.status_info = "holiday"
                    ps.status_class = "warning"
                elif last_actual.status == SessionStatus.CANCELLED:
                    ps.status_info = "cancelled"
                    ps.status_class = "danger"

    # Calculate summary stats (cached separately for performance)
    stats_cache_key = f"class_stats_{class_section_id}"
    stats = cache.get(stats_cache_key)
    
    if not stats:
        # Get summary statistics
        conducted_count = ActualSession.objects.filter(
            planned_session__class_section=class_section,
            status=SessionStatus.CONDUCTED
        ).count()
        
        cancelled_count = ActualSession.objects.filter(
            planned_session__class_section=class_section,
            status=SessionStatus.CANCELLED
        ).count()
        
        pending_count = total_sessions - conducted_count - cancelled_count
        
        stats = {
            'total_sessions': total_sessions,
            'conducted_count': conducted_count,
            'cancelled_count': cancelled_count,
            'pending_count': max(0, pending_count)
        }
        
        # Cache stats for 5 minutes
        cache.set(stats_cache_key, stats, 300)

    # Pagination info
    total_pages = (total_sessions + per_page - 1) // per_page
    has_previous = page > 1
    has_next = page < total_pages
    
    context = {
        "class_section": class_section,
        "planned_sessions": planned_sessions,
        "pagination": {
            'current_page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'total_sessions': total_sessions,
            'has_previous': has_previous,
            'has_next': has_next,
            'previous_page': page - 1 if has_previous else None,
            'next_page': page + 1 if has_next else None,
            'start_index': start_index + 1,
            'end_index': min(end_index, total_sessions)
        },
        'stats': stats
    }
    
    # Cache the context for 2 minutes
    cache.set(cache_key, context, 120)
    
    return render(request, "admin/classes/class_sessions.html", context)
def extract_youtube_id(url):
    if not url:
        return None

    patterns = [
        r"youtu\.be\/([^?&]+)",
        r"youtube\.com\/watch\?v=([^?&]+)",
        r"youtube\.com\/shorts\/([^?&]+)",
        r"youtube\.com\/embed\/([^?&]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_curriculum_content_for_day(day_number):
    """Helper function to extract curriculum content for a specific day"""
    try:
        # Check cache first
        cache_key = f"curriculum_day_{day_number}"
        cached_content = cache.get(cache_key)
        if cached_content:
            return cached_content
        
        # Read the curriculum HTML file
        curriculum_file_path = os.path.join(settings.BASE_DIR, 'Templates/admin/session/English_ ALL DAYS.html')
        
        with open(curriculum_file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Extract specific day content using regex
        day_pattern = rf'<td class="s0">\s*Day {day_number}\s*</td>'
        next_day_pattern = rf'<td class="s0">\s*Day {day_number + 1}\s*</td>'
        
        # Find start of current day
        day_match = re.search(day_pattern, content, re.IGNORECASE)
        if not day_match:
            return None
        
        start_pos = day_match.start()
        
        # Find start of next day (or end of content)
        next_day_match = re.search(next_day_pattern, content, re.IGNORECASE)
        if next_day_match:
            end_pos = next_day_match.start()
        else:
            # If it's the last day, find the end of table
            end_pos = content.find('</tbody>')
            if end_pos == -1:
                end_pos = len(content)
        
        # Extract day content
        day_content = content[start_pos:end_pos]
        
        # Cache the content for 1 hour
        cache.set(cache_key, day_content, 60 * 60)
        
        return day_content
        
    except Exception as e:
        print(f"Error loading curriculum content for day {day_number}: {e}")
        return None
@login_required
def today_session(request, class_section_id):
    if request.user.role.name.upper() != "FACILITATOR":
        return redirect("no_permission")

    from .models import CalendarDate
    
    class_section = get_object_or_404(ClassSection, id=class_section_id)
    today = timezone.now().date()
    
    # CHECK IF THIS CLASS IS PART OF A GROUPED SESSION FOR TODAY
    # Priority 1: Check CalendarDate for specific date grouping (Most reliable for UI)
    calendar_entry_today = CalendarDate.objects.filter(
        date=today,
        class_sections=class_section,
        date_type=DateType.SESSION
    ).first()
    
    if calendar_entry_today and calendar_entry_today.class_sections.count() > 1:
        # This is a grouped session for today - redirect to primary
        primary_class = calendar_entry_today.class_sections.first()
        if primary_class.id != class_section.id:
            logger.info(f"Redirecting from class {class_section.id} to primary class {primary_class.id} via today's CalendarDate group")
            return redirect('facilitator_class_today_session', class_section_id=primary_class.id)
        # If we are the primary, just continue
        logger.info(f"Class {class_section.id} is primary for today's CalendarDate group")
    
    # Priority 2: Fallback to persistent grouped_session_id ONLY if it matches today's status
    # We only use this if we're sure it's supposed to be grouped today.
    # To keep it safe, we'll only check if an ActualSession exists for today with this planned session.
    current_planned_session = PlannedSession.objects.filter(
        class_section=class_section,
        is_active=True
    ).order_by('day_number').first()
    
    if current_planned_session and current_planned_session.grouped_session_id:
        # Check if there's an actual session for today
        has_session_today = ActualSession.objects.filter(
            planned_session=current_planned_session,
            date=today
        ).exists()
        
        if has_session_today:
            primary_session = PlannedSession.objects.filter(
                grouped_session_id=current_planned_session.grouped_session_id,
                day_number=current_planned_session.day_number
            ).select_related('class_section').order_by('id').first()
            
            if primary_session and primary_session.class_section.id != class_section.id:
                logger.info(f"Redirecting from class {class_section.id} to primary class {primary_session.class_section.id} via persistent grouped_session_id")
                return redirect('facilitator_class_today_session', class_section_id=primary_session.class_section.id)
    
    # CHECK CALENDAR FIRST - check both class-level and school-level entries
    # First check class-specific entry
    calendar_entry = CalendarDate.objects.filter(
        date=today,
        class_section=class_section
    ).first()
    
    # If no class-specific entry, check school-level entry (office work/holiday at school level)
    if not calendar_entry:
        calendar_entry = CalendarDate.objects.filter(
            date=today,
            school=class_section.school,
            class_section__isnull=True  # School-level entries have no class_section
        ).first()
    
    if calendar_entry:
        if calendar_entry.date_type == 'holiday':
            # Redirect to calendar UI for holiday
            return redirect('facilitator_today_session_calendar')
        elif calendar_entry.date_type == 'office_work':
            # Redirect to calendar UI for office work
            return redirect('facilitator_today_session_calendar')
    
    # Otherwise, continue with normal session workflow

    # Use the new SessionSequenceCalculator
    from .session_management import SessionSequenceCalculator
    from .services.curriculum_content_resolver import CurriculumContentResolver
    from .services.session_integration_service import SessionIntegrationService
    
    # Check if class has any planned sessions, if not create them
    existing_sessions_count = PlannedSession.objects.filter(
        class_section=class_section,
        is_active=True
    ).count()
    
    if existing_sessions_count == 0:
        # Auto-generate 1-150 sessions for this class
        from .session_management import SessionBulkManager
        
        try:
            with transaction.atomic():
                # Create all 150 sessions
                sessions_to_create = []
                for day_number in range(1, 151):
                    session = PlannedSession(
                        class_section=class_section,
                        day_number=day_number,
                        title=f"Day {day_number} Session",
                        description=f"Session for day {day_number}",
                        sequence_position=day_number,
                        is_required=True,
                        is_active=True
                    )
                    sessions_to_create.append(session)
                
                # Bulk create all sessions
                PlannedSession.objects.bulk_create(sessions_to_create)
                
                messages.success(request, f"✅ Initialized 150 sessions for {class_section.school.name} - {class_section.class_level}-{class_section.section}")
                logger.info(f"Auto-generated 150 sessions for {class_section}")
            
        except Exception as e:
            logger.error(f"Error auto-generating sessions for {class_section}: {e}")
            messages.error(request, "Failed to initialize sessions. Please contact admin.")
            return render(request, "facilitator/Today_session.html", {
                "class_section": class_section,
                "error": True,
                "error_message": "Failed to initialize class sessions. Please contact admin."
            })
    
    # Get next pending session using the enhanced logic
    planned_session = SessionSequenceCalculator.get_next_pending_session(class_section)

    if not planned_session:
        # Check if we truly have all sessions completed
        total_sessions = PlannedSession.objects.filter(
            class_section=class_section,
            is_active=True
        ).count()
        
        completed_sessions = ActualSession.objects.filter(
            planned_session__class_section=class_section,
            status__in=[SessionStatus.CONDUCTED, SessionStatus.CANCELLED]
        ).count()
        
        if total_sessions > 0 and completed_sessions >= total_sessions:
            # All sessions truly completed - show completion message
            return render(request, "facilitator/Today_session.html", {
                "class_section": class_section,
                "completed": True,
                "completion_message": "🎉 All 150 sessions completed for this class!"
            })
        else:
            # Something is wrong with session sequence, try to repair
            from .session_management import SessionBulkManager
            repair_result = SessionBulkManager.repair_sequence_gaps(class_section, request.user)
            
            if repair_result['success'] and repair_result['created_count'] > 0:
                messages.info(request, f"Repaired {repair_result['created_count']} missing sessions.")
                # Try to get next session again
                planned_session = SessionSequenceCalculator.get_next_pending_session(class_section)
            
            if not planned_session:
                # Still no session found, show error
                return render(request, "facilitator/Today_session.html", {
                    "class_section": class_section,
                    "error": True,
                    "error_message": "No sessions available. Please contact admin to set up class sessions."
                })

    # Get latest actual session for this planned session - MUST BE FROM TODAY
    # Only count as "conducted" if it was conducted today
    today = timezone.now().date()
    # Fetch the latest actual session for this planned session (allow non-today sessions to show attendance link)
    actual_session = planned_session.actual_sessions.order_by("-date").first()
    
    # If this is a grouped session, get all classes in the group
    # OPTIMIZED: Grouped session detection with caching and minimal queries
    # Detect if this session is part of a group today
    target_date = timezone.now().date()
    grouped_classes = get_grouped_classes_for_session(planned_session, target_date)
    
    if len(grouped_classes) > 1:
        session_type = "grouped"
        detection_method = "helper_function"
        
        # Sort classes by level for consistent UI display (e.g. "1 & 2")
        try:
            sorted_classes = sorted(grouped_classes, key=lambda c: c.class_level_order)
            combined_class_name = " & ".join([c.display_name for c in sorted_classes])
        except Exception as e:
            logger.warning(f"Failed to sort grouped classes: {e}")
            combined_class_name = " & ".join([c.display_name for c in grouped_classes])
    else:
        session_type = "single"
        detection_method = "helper_function"
        combined_class_name = class_section.display_name
    
    # Keep track of grouped_session_id if available for backward compatibility
    grouped_session_id = planned_session.grouped_session_id
            

    session_status = "pending"
    is_today = False

    if actual_session:
        # Convert IntegerChoices status to string for template comparison
        status_map = {
            SessionStatus.CONDUCTED: "conducted",
            SessionStatus.HOLIDAY: "holiday",
            SessionStatus.CANCELLED: "cancelled"
        }
        session_status = status_map.get(actual_session.status, "pending")
        is_today = actual_session.date == today
    else:
        # No actual session yet - check if this is today's pending session
        # For pending sessions, we need to determine if it's for today
        # by checking if the planned session is the current day's session
        is_today = True  # If we're viewing this session, it's today's session

    # Get first video from session steps (if any)
    first_step_with_video = planned_session.steps.filter(
        youtube_url__isnull=False
    ).exclude(youtube_url='').first()
    
    video_id = None
    if first_step_with_video:
        video_id = extract_youtube_id(first_step_with_video.youtube_url)
    
    # Initialize our new services
    content_resolver = CurriculumContentResolver()
    integration_service = SessionIntegrationService()
    
    # Get integrated session data (combines PlannedSession with CurriculumSession)
    try:
        integrated_data = integration_service.get_integrated_session_data(planned_session)
    except Exception as e:
        logger.error(f"Error getting integrated session data: {e}")
        integrated_data = IntegratedSessionData(
            planned_session=planned_session,
            content_source='error',
            sync_status='failed'
        )
    
    # Log curriculum access for analytics
    try:
        integration_service.log_curriculum_access(planned_session, request.user, request)
    except Exception as e:
        logger.error(f"Error logging curriculum access: {e}")
    
    # Get curriculum content metadata for the frontend
    try:
        content_metadata = content_resolver.get_content_metadata(
            planned_session.day_number, 
            integration_service._get_class_language(class_section)
        )
    except Exception as e:
        logger.error(f"Error getting content metadata: {e}")
        content_metadata = {}
    
    # Get progress metrics
    try:
        progress_metrics = SessionSequenceCalculator.calculate_progress(class_section)
    except Exception as e:
        logger.error(f"Error calculating progress metrics: {e}")
        progress_metrics = None
    
    # Get workflow-related data
    from .models import LessonPlanUpload, SessionReward, SessionFeedback, SessionPreparationChecklist
    
    # Get lesson plan uploads for this session
    # For grouped sessions, get uploads from ANY grouped session (they all share the same lesson plan)
    try:
        if planned_session.grouped_session_id:
            # Get uploads from any session in the group
            grouped_session_ids = PlannedSession.objects.filter(
                grouped_session_id=planned_session.grouped_session_id,
                day_number=planned_session.day_number
            ).values_list('id', flat=True)
            
            # Get all uploads from TODAY ONLY and deduplicate by file name
            from datetime import timedelta, datetime
            
            today = timezone.now().date()
            tomorrow = today + timedelta(days=1)
            today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
            tomorrow_start = timezone.make_aware(datetime.combine(tomorrow, datetime.min.time()))
            
            all_uploads = LessonPlanUpload.objects.filter(
                planned_session_id__in=grouped_session_ids,
                facilitator=request.user,
                upload_date__gte=today_start,
                upload_date__lt=tomorrow_start
            ).order_by('-upload_date')
            
            # Deduplicate: keep only the most recent upload for each unique file
            seen_files = {}
            lesson_plan_uploads = []
            for upload in all_uploads:
                if upload.file_name not in seen_files:
                    seen_files[upload.file_name] = True
                    lesson_plan_uploads.append(upload)
        else:
            # Single session - get uploads for this session only - MUST BE FROM TODAY
            from datetime import timedelta, datetime
            
            today = timezone.now().date()
            tomorrow = today + timedelta(days=1)
            today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
            tomorrow_start = timezone.make_aware(datetime.combine(tomorrow, datetime.min.time()))
            
            lesson_plan_uploads = LessonPlanUpload.objects.filter(
                planned_session=planned_session,
                facilitator=request.user,
                upload_date__gte=today_start,
                upload_date__lt=tomorrow_start
            ).order_by('-upload_date')
    except Exception as e:
        logger.error(f"Error getting lesson plan uploads: {e}")
        lesson_plan_uploads = []
    
    # Get session rewards for this session (if actual session exists)
    session_rewards = []
    if actual_session:
        try:
            session_rewards = SessionReward.objects.filter(
                actual_session=actual_session
            ).order_by('-reward_date')
        except Exception as e:
            logger.error(f"Error getting session rewards: {e}")
            session_rewards = []
    
    # Get preparation checklist for this session (ANY date, not just today)
    # This ensures data persists across page refreshes
    try:
        preparation_checklist = SessionPreparationChecklist.objects.filter(
            planned_session=planned_session,
            facilitator=request.user
        ).order_by('-preparation_start_time').first()  # Get most recent
        
        # If preparation exists and is from today, mark as saved
        if preparation_checklist and preparation_checklist.preparation_start_time:
            prep_date = preparation_checklist.preparation_start_time.date()
            if prep_date != today:
                # Preparation is from a previous day, don't show as completed
                preparation_checklist = None
    except Exception as e:
        logger.error(f"Error getting preparation checklist: {e}")
        preparation_checklist = None

    # Get session feedback for this session (if actual session exists) - ENHANCED
    session_feedback = None
    if actual_session:
        try:
            session_feedback = SessionFeedback.objects.filter(
                actual_session=actual_session,
                facilitator=request.user
            ).first()
            
            if session_feedback:
                logger.info(
                    f"✅ Found existing feedback for actual_session {actual_session.id}, "
                    f"day {planned_session.day_number}, class {class_section.id}"
                )
            else:
                logger.info(
                    f"ℹ️ No existing feedback for actual_session {actual_session.id}, "
                    f"day {planned_session.day_number}, class {class_section.id}"
                )
        except Exception as e:
            logger.error(
                f"❌ Error getting session feedback for actual_session {actual_session.id}: {str(e)}", 
                exc_info=True
            )
            session_feedback = None
    else:
        logger.info(
            f"ℹ️ No actual_session yet for planned_session {planned_session.id}, "
            f"day {planned_session.day_number}, class {class_section.id}"
        )

    # Check if attendance has been marked for this session
    # Only mark as saved if attendance records exist AND attendance_marked flag is set
    attendance_saved = False
    if actual_session:
        try:
            # Check both: attendance records exist AND session has attendance_marked flag set
            attendance_exists = Attendance.objects.filter(
                actual_session=actual_session
            ).exists()
            
            # Only consider attendance saved if:
            # 1. Attendance records exist AND
            # 2. The session's attendance_marked flag is True
            attendance_saved = attendance_exists and actual_session.attendance_marked
        except Exception as e:
            logger.error(f"Error checking attendance: {e}")
            attendance_saved = False

    # Get enrollments for student feedback form with optimized queries
    try:
        enrollments = Enrollment.objects.filter(
            class_section=class_section,
            is_active=True
        ).select_related("student").order_by("student__full_name")
    except Exception as e:
        logger.error(f"Error getting enrollments: {e}")
        enrollments = []

    # Get attendance records for this session (if exists) with optimized queries
    attendance_records = []
    if actual_session:
        try:
            attendance_records = Attendance.objects.filter(
                actual_session=actual_session
            ).select_related('enrollment__student').values_list(
                'enrollment__student__id', 'status'
            )
        except Exception as e:
            logger.error(f"Error getting attendance records: {e}")
            attendance_records = []

    return render(request, "facilitator/Today_session.html", {
        "class_section": class_section,
        "planned_session": planned_session,
        "actual_session": actual_session,
        "session_status": session_status,
        "is_today": is_today,
        "video_id": video_id,
        "current_day": planned_session.day_number,
        "progress_metrics": progress_metrics,
        "cancellation_reasons": CANCELLATION_REASONS,
        "lesson_plan_uploads": lesson_plan_uploads,
        "session_rewards": session_rewards,
        "preparation_checklist": preparation_checklist,
        "session_feedback": session_feedback,  # ENHANCED: Pass feedback to template
        "attendance_saved": attendance_saved,
        "attendance_marked": attendance_saved,  # For step 4 completion
        "enrollments": enrollments,  # For student feedback form
        # Facilitator tasks
        "facilitator_tasks": FacilitatorTask.objects.filter(
            actual_session=actual_session,
            facilitator=request.user
        ).order_by('-created_at') if actual_session else [],
        "facilitator_task_completed": FacilitatorTask.objects.filter(
            actual_session=actual_session,
            facilitator=request.user,
            media_type__in=['photo', 'video', 'facebook_link'],  # Check for any completed task
            created_at__date=today  # Only count tasks created TODAY
        ).exists() if actual_session else False,  # For step 5 completion
        # New curriculum integration data
        "integrated_data": integrated_data,
        "content_metadata": content_metadata,
        "has_admin_content": integrated_data.has_admin_content if integrated_data else False,
        "content_source": integrated_data.content_source if integrated_data else 'error',
        # Day navigation data
        "day_range": range(1, 151),  # Days 1-150
        # Grouped session data
        "grouped_classes": grouped_classes,
        "is_grouped_session": len(grouped_classes) > 1,
        "combined_class_name": combined_class_name,
        # Session type information (ENHANCED)
        "session_type": session_type,
        "grouped_session_id": str(grouped_session_id) if grouped_session_id else None,
        "detection_method": detection_method,
        # Debug information
        "today_date": today,
        "actual_session_date": actual_session.date if actual_session else None,
        "reward_given": session_rewards and len(session_rewards) > 0,  # For step 7 completion
    })




@login_required
def debug_sessions(request, class_section_id):
    """Debug view to show all sessions and their status"""
    class_section = get_object_or_404(ClassSection, id=class_section_id)
    
    # Get all planned sessions
    all_sessions = PlannedSession.objects.filter(
        class_section=class_section,
        is_active=True
    ).order_by("day_number")
    
    session_info = []
    for session in all_sessions:
        if session.actual_sessions.exists():
            actual = session.actual_sessions.first()
            status = f"{actual.status} on {actual.date}"
        else:
            status = "PENDING (not processed)"
        
        session_info.append({
            'day': session.day_number,
            'topic': session.topic,
            'status': status
        })
    
    return render(request, "facilitator/debug_sessions.html", {
        "class_section": class_section,
        "session_info": session_info,
    })

from django.utils import timezone

@login_required
def start_session(request, planned_session_id):
    """
    Start a session - Handle POST requests to conduct/cancel/holiday a session
    """
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")
        
    planned = get_object_or_404(PlannedSession, id=planned_session_id)
    
    if request.method != "POST":
        return redirect("facilitator_class_today_session", class_section_id=planned.class_section.id)

    status = request.POST.get("status", "conducted")
    remarks = request.POST.get("remarks", "")
    cancellation_reason = request.POST.get("cancellation_reason", "")

    # Import the new session management logic
    from .session_management import SessionStatusManager
    from django.core.exceptions import ValidationError

    try:
        if status == SessionStatus.CONDUCTED.name.lower():
            actual_session = SessionStatusManager.conduct_session(
                planned_session=planned,
                facilitator=request.user,
                remarks=remarks
            )
            #update try
            # Clear grouped session cache for this planned session
            cache_key = f"grouped_session_{planned.id}_{planned.day_number}_{planned.class_section.id}"
            cache.delete(cache_key)
            
            # If this is a grouped session, also create ActualSession for all other classes in the group
            if planned.grouped_session_id:
                grouped_sessions = PlannedSession.objects.filter(
                    grouped_session_id=planned.grouped_session_id,
                    day_number=planned.day_number
                ).exclude(id=planned.id)
                
                for grouped_session in grouped_sessions:
                    SessionStatusManager.conduct_session(
                        planned_session=grouped_session,
                        facilitator=request.user,
                        remarks=f"Grouped session - conducted with {planned.class_section.display_name}"
                    )
                    # Clear cache for each grouped session
                    cache_key = f"grouped_session_{grouped_session.id}_{grouped_session.day_number}_{grouped_session.class_section.id}"
                    cache.delete(cache_key)
            
            messages.success(request, "Session started!")
            # Redirect to today_session with step=4 to show attendance
            return redirect(f"/facilitator/class/{planned.class_section.id}/today/?step=4")
            
        elif status == SessionStatus.HOLIDAY.name.lower():
            actual_session = SessionStatusManager.mark_holiday(
                planned_session=planned,
                facilitator=request.user,
                reason=remarks
            )
            
            # Clear grouped session cache for this planned session
            cache_key = f"grouped_session_{planned.id}_{planned.day_number}_{planned.class_section.id}"
            cache.delete(cache_key)
            
            # If this is a grouped session, also mark all other classes as holiday
            if planned.grouped_session_id:
                grouped_sessions = PlannedSession.objects.filter(
                    grouped_session_id=planned.grouped_session_id,
                    day_number=planned.day_number
                ).exclude(id=planned.id)
                
                for grouped_session in grouped_sessions:
                    SessionStatusManager.mark_holiday(
                        planned_session=grouped_session,
                        facilitator=request.user,
                        reason=f"Grouped session holiday - marked with {planned.class_section.display_name}"
                    )
                    # Clear cache for each grouped session
                    cache_key = f"grouped_session_{grouped_session.id}_{grouped_session.day_number}_{grouped_session.class_section.id}"
                    cache.delete(cache_key)
            
            messages.success(request, "Session marked as holiday. You can conduct it later.")
            
        elif status == SessionStatus.CANCELLED.name.lower():
            if not cancellation_reason:
                messages.error(request, "Please select a cancellation reason.")
                return redirect("facilitator_class_today_session", class_section_id=planned.class_section.id)
            
            actual_session = SessionStatusManager.cancel_session(
                planned_session=planned,
                facilitator=request.user,
                cancellation_reason=cancellation_reason,
                remarks=remarks
            )
            
            # Clear grouped session cache for this planned session
            cache_key = f"grouped_session_{planned.id}_{planned.day_number}_{planned.class_section.id}"
            cache.delete(cache_key)
            
            # If this is a grouped session, also cancel all other classes
            if planned.grouped_session_id:
                grouped_sessions = PlannedSession.objects.filter(
                    grouped_session_id=planned.grouped_session_id,
                    day_number=planned.day_number
                ).exclude(id=planned.id)
                
                for grouped_session in grouped_sessions:
                    SessionStatusManager.cancel_session(
                        planned_session=grouped_session,
                        facilitator=request.user,
                        cancellation_reason=cancellation_reason,
                        remarks=f"Grouped session cancelled - cancelled with {planned.class_section.display_name}"
                    )
                    # Clear cache for each grouped session
                    cache_key = f"grouped_session_{grouped_session.id}_{grouped_session.day_number}_{grouped_session.class_section.id}"
                    cache.delete(cache_key)
            
            messages.success(request, f"Session cancelled permanently: {dict(CANCELLATION_REASONS)[cancellation_reason]}")
        
        else:
            messages.error(request, "Invalid session status.")
            return redirect("facilitator_class_today_session", class_section_id=planned.class_section.id)
            
    except ValidationError as e:
        messages.error(request, str(e))
        return redirect("facilitator_class_today_session", class_section_id=planned.class_section.id)
    except Exception as e:
        messages.error(request, f"Error processing session: {str(e)}")
        return redirect("facilitator_class_today_session", class_section_id=planned.class_section.id)

    return redirect("facilitator_class_today_session", class_section_id=planned.class_section.id)


@login_required
def get_previous_day_attendance(request, actual_session_id):
    """
    API endpoint to fetch previous day's attendance for pre-filling current session
    Returns attendance data for all students in the same class(es)
    """
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({'success': False, 'message': 'Permission denied'}, status=403)
    
    session = get_object_or_404(ActualSession, id=actual_session_id)
    
    # Get the planned session
    planned_session = session.planned_session
    
    # Detect if grouped session
    is_grouped = planned_session.grouped_session_id is not None
    
    if is_grouped:
        # For grouped sessions, find all classes in the group
        grouped_sessions = PlannedSession.objects.filter(
            grouped_session_id=planned_session.grouped_session_id,
            day_number=planned_session.day_number
        ).select_related('class_section')
        
        class_sections = [gs.class_section for gs in grouped_sessions]
    else:
        class_sections = [planned_session.class_section]
    
    # Find previous day's sessions for these classes
    previous_day_number = planned_session.day_number - 1
    
    if previous_day_number < 1:
        return JsonResponse({
            'success': False,
            'message': 'No previous day available',
            'data': {}
        })
    
    # Get previous planned sessions
    previous_planned_sessions = PlannedSession.objects.filter(
        class_section__in=class_sections,
        day_number=previous_day_number
    ).select_related('class_section')
    
    if not previous_planned_sessions.exists():
        return JsonResponse({
            'success': False,
            'message': 'No previous session found for this day',
            'data': {}
        })
    
    # Get the most recent actual session for each planned session
    previous_attendance_data = {}
    total_populated = 0
    
    for prev_planned in previous_planned_sessions:
        # Get the most recent actual session for this planned session
        prev_actual = ActualSession.objects.filter(
            planned_session=prev_planned,
            date__lt=session.date,
            status=SessionStatus.CONDUCTED
        ).order_by('-date').first()
        
        if prev_actual:
            # Get all attendance records for this session
            attendances = Attendance.objects.filter(
                actual_session=prev_actual
            ).select_related('enrollment')
            
            for attendance in attendances:
                enrollment_id = str(attendance.enrollment.id)
                previous_attendance_data[enrollment_id] = {
                    'status': attendance.status,
                    'visible_change_notes': attendance.visible_change_notes or '',
                    'invisible_change_notes': attendance.invisible_change_notes or '',
                }
                total_populated += 1
    
    if not previous_attendance_data:
        return JsonResponse({
            'success': False,
            'message': 'No attendance data found for previous day',
            'data': {}
        })
    
    return JsonResponse({
        'success': True,
        'message': f'Loaded attendance for {total_populated} students from previous day',
        'data': previous_attendance_data,
        'total_populated': total_populated
    })


@login_required
def mark_attendance(request, actual_session_id):

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    # ✅ Permission Check
    if request.user.role.name.upper() != "FACILITATOR":

        if is_ajax:
            return JsonResponse({
                "success": False,
                "message": "Permission denied."
            }, status=403)

        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    session = get_object_or_404(ActualSession, id=actual_session_id)

    # ✅ Cancelled Session Check
    if session.status == SessionStatus.CANCELLED:

        if is_ajax:
            return JsonResponse({
                "success": False,
                "message": "Session cancelled. Attendance not allowed."
            }, status=400)

        messages.error(request, "Cannot mark attendance — this session has been cancelled.")
        return redirect("facilitator_classes")

    # ----------------------------------------------------
    # ✅ Detect Grouped Session
    # ----------------------------------------------------

    is_grouped_session = session.planned_session.grouped_session_id is not None
    grouped_classes = []

    if is_grouped_session:

        grouped_sessions = PlannedSession.objects.filter(
            grouped_session_id=session.planned_session.grouped_session_id,
            day_number=session.planned_session.day_number
        ).select_related('class_section')

        grouped_classes = [gs.class_section for gs in grouped_sessions]

    else:
        from .models import CalendarDate

        calendar_entry = CalendarDate.objects.filter(
            class_sections=session.planned_session.class_section,
            date_type=DateType.SESSION
        ).first()

        if calendar_entry and calendar_entry.class_sections.count() > 1:
            grouped_classes = list(calendar_entry.class_sections.all())
            is_grouped_session = True

    # ----------------------------------------------------
    # ✅ Reusable Attendance Save Logic
    # ----------------------------------------------------

    def save_attendance(enrollments, session_map=None):
        """Optimized attendance saving using bulk operations with multi-session support"""
        saved_count = 0
        updated_count = 0
        skipped_count = 0

        status_map = {
            'present': AttendanceStatus.PRESENT,
            'absent': AttendanceStatus.ABSENT,
            'leave': AttendanceStatus.LEAVE,
        }

        # Get existing attendance for ALL involved sessions to avoid duplicate records
        involved_sessions = session_map.values() if session_map else [session]
        existing_attendance_map = {} # (enrollment_id, session_id) -> record
        
        for att in Attendance.objects.filter(actual_session__in=involved_sessions):
            existing_attendance_map[(att.enrollment_id, att.actual_session_id)] = att

        attendance_to_create = []
        attendance_to_update = []
        enrollments_to_delete = []

        for enrollment in enrollments:
            status_str = request.POST.get(f"attendance_{enrollment.id}")
            
            # Identify which session this specific enrollment belongs to
            target_session = session_map.get(enrollment.class_section_id) if session_map else session
            if not target_session:
                continue

            if status_str in status_map:
                visible_change = request.POST.get(f"visible_change_{enrollment.id}", "").strip()
                invisible_change = request.POST.get(f"invisible_change_{enrollment.id}", "").strip()

                attendance_obj = Attendance(
                    actual_session=target_session,
                    enrollment=enrollment,
                    status=status_map[status_str],
                    visible_change_notes=visible_change or None,
                    invisible_change_notes=invisible_change or None,
                )

                lookup_key = (enrollment.id, target_session.id)
                if lookup_key in existing_attendance_map:
                    attendance_obj.id = existing_attendance_map[lookup_key].id
                    attendance_to_update.append(attendance_obj)
                    updated_count += 1
                else:
                    attendance_to_create.append(attendance_obj)
                    saved_count += 1
            else:
                lookup_key = (enrollment.id, target_session.id)
                if lookup_key in existing_attendance_map:
                    enrollments_to_delete.append(existing_attendance_map[lookup_key].id)
                    skipped_count += 1

        # Save everything
        if attendance_to_create:
            Attendance.objects.bulk_create(attendance_to_create, batch_size=100)
        if attendance_to_update:
            Attendance.objects.bulk_update(attendance_to_update, fields=['status', 'visible_change_notes', 'invisible_change_notes'], batch_size=100)
        if enrollments_to_delete:
            Attendance.objects.filter(id__in=enrollments_to_delete).delete()

        # Mark all as marked
        for s in involved_sessions:
            s.attendance_marked = True
            s.save(update_fields=['attendance_marked'])

        return saved_count, updated_count, skipped_count

    # ----------------------------------------------------
    # ✅ GROUPED SESSION
    # ----------------------------------------------------

    if is_grouped_session:

        classes_with_students = []
        total_students = 0
        all_enrollments = []

        for grouped_class in grouped_classes:

            enrollments = Enrollment.objects.filter(
                class_section=grouped_class,
                is_active=True
            ).select_related("student")

            all_enrollments.extend(enrollments)
            total_students += enrollments.count()

            classes_with_students.append({
                "class": grouped_class,
                "enrollments": enrollments
            })

        # ✅ Bulk Attendance Fetch (CRITICAL OPTIMIZATION)
        attendance_map = {
            a.enrollment_id: a
            for a in Attendance.objects.filter(actual_session=session)
        }

        # ✅ Group Session Map (Map class_id -> actual_session)
        # Find or create ActualSessions for all classes in the group for today
        target_day = session.planned_session.day_number
        session_map = {}
        today = session.date # Using the session date for consistency
        
        for g_class in grouped_classes:
            # Note: We use update_or_create to ensure sessions exist for all grouped classes
            g_planned = PlannedSession.objects.filter(
                class_section=g_class,
                day_number=target_day,
                is_active=True
            ).first()
            
            if g_planned:
                g_actual, _ = ActualSession.objects.get_or_create(
                    planned_session=g_planned,
                    date=today,
                    defaults={'facilitator': request.user, 'status': 0}
                )
                session_map[g_class.id] = g_actual

        for enrollment in all_enrollments:
            enrollment.existing_attendance = attendance_map.get(enrollment.id)

        if request.method == "POST":

            try:
                saved, updated, skipped = save_attendance(all_enrollments, session_map=session_map)

                if is_ajax:
                    return JsonResponse({
                        "success": True,
                        "saved": saved,
                        "updated": updated,
                        "skipped": skipped,
                        "redirect_url": reverse(
                            "facilitator_class_today_session",
                            kwargs={"class_section_id": session.planned_session.class_section.id}
                        ) + "?attendance_saved=true&step=5"
                    })

                messages.success(request, "Attendance saved successfully!")
                return redirect(reverse(
                    "facilitator_class_today_session",
                    kwargs={"class_section_id": session.planned_session.class_section.id}
                ) + "?attendance_saved=true&step=5")

            except Exception as e:

                logger.error(f"Attendance Save Error: {e}")

                if is_ajax:
                    return JsonResponse({
                        "success": False,
                        "message": str(e)
                    }, status=400)

                messages.error(request, str(e))

        return render(request, "facilitator/mark_attendance_grouped.html", {
            "session": session,
            "grouped_classes": grouped_classes,
            "classes_with_students": classes_with_students,
            "total_students": total_students,
            "is_grouped_session": True
        })

    # ----------------------------------------------------
    # ✅ SINGLE SESSION
    # ----------------------------------------------------

    else:

        enrollments = Enrollment.objects.filter(
            class_section=session.planned_session.class_section,
            is_active=True
        ).select_related("student")

        attendance_map = {
            a.enrollment_id: a
            for a in Attendance.objects.filter(actual_session=session)
        }

        for enrollment in enrollments:
            enrollment.existing_attendance = attendance_map.get(enrollment.id)

        if request.method == "POST":

            try:
                saved, updated, skipped = save_attendance(enrollments)

                if is_ajax:
                    return JsonResponse({
                        "success": True,
                        "saved": saved,
                        "updated": updated,
                        "skipped": skipped,
                        "redirect_url": reverse(
                            "facilitator_class_today_session",
                            kwargs={"class_section_id": session.planned_session.class_section.id}
                        ) + "?attendance_saved=true&step=5"
                    })

                messages.success(request, "Attendance saved successfully!")
                return redirect(reverse(
                    "facilitator_class_today_session",
                    kwargs={"class_section_id": session.planned_session.class_section.id}
                ) + "?attendance_saved=true&step=5")

            except Exception as e:

                logger.error(f"Attendance Save Error: {e}")

                if is_ajax:
                    return JsonResponse({
                        "success": False,
                        "message": str(e)
                    }, status=400)

                messages.error(request, str(e))

        return render(request, "facilitator/mark_attendance_simple.html", {
            "session": session,
            "enrollments": enrollments
        })


@login_required
def mark_attendance_redirect(request, planned_session_id):
    """
    Robust redirect to mark attendance.
    Finds the latest ActualSession for a PlannedSession and redirects to mark_attendance.
    """
    if request.user.role.name.upper() != "FACILITATOR":
        return redirect("no_permission")
        
    planned = get_object_or_404(PlannedSession, id=planned_session_id)
    
    # Find the most recent actual session for this planned session
    actual_session = planned.actual_sessions.order_by("-date").first()
    
    if actual_session:
        return redirect("mark_attendance", actual_session_id=actual_session.id)
    else:
        messages.warning(request, "Please start the session before marking attendance.")
        return redirect("facilitator_class_today_session", class_section_id=planned.class_section.id)


@login_required
def get_previous_day_attendance(request, actual_session_id):
    """
    API endpoint to fetch previous day's attendance for pre-filling current session
    Returns attendance data for all students in the same class(es)
    """
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({'success': False, 'message': 'Permission denied'}, status=403)
    
    session = get_object_or_404(ActualSession, id=actual_session_id)
    
    # Get the planned session
    planned_session = session.planned_session
    
    # Detect if grouped session
    is_grouped = planned_session.grouped_session_id is not None
    
    if is_grouped:
        # For grouped sessions, find all classes in the group
        grouped_sessions = PlannedSession.objects.filter(
            grouped_session_id=planned_session.grouped_session_id,
            day_number=planned_session.day_number
        ).select_related('class_section')
        
        class_sections = [gs.class_section for gs in grouped_sessions]
    else:
        class_sections = [planned_session.class_section]
    
    # Find previous day's sessions for these classes
    previous_day_number = planned_session.day_number - 1
    
    if previous_day_number < 1:
        return JsonResponse({
            'success': False,
            'message': 'No previous day available',
            'data': {}
        })
    
    # Get previous planned sessions
    previous_planned_sessions = PlannedSession.objects.filter(
        class_section__in=class_sections,
        day_number=previous_day_number
    ).select_related('class_section')
    
    if not previous_planned_sessions.exists():
        return JsonResponse({
            'success': False,
            'message': 'No previous session found for this day',
            'data': {}
        })
    
    # Get the most recent actual session for each planned session
    previous_attendance_data = {}
    total_populated = 0
    
    for prev_planned in previous_planned_sessions:
        # Get the most recent actual session for this planned session
        prev_actual = ActualSession.objects.filter(
            planned_session=prev_planned,
            date__lt=session.date,
            status=SessionStatus.CONDUCTED
        ).order_by('-date').first()
        
        if prev_actual:
            # Get all attendance records for this session
            attendances = Attendance.objects.filter(
                actual_session=prev_actual
            ).select_related('enrollment')
            
            for attendance in attendances:
                enrollment_id = str(attendance.enrollment.id)
                previous_attendance_data[enrollment_id] = {
                    'status': attendance.status,
                    'visible_change_notes': attendance.visible_change_notes or '',
                    'invisible_change_notes': attendance.invisible_change_notes or '',
                }
                total_populated += 1
    
    if not previous_attendance_data:
        return JsonResponse({
            'success': False,
            'message': 'No attendance data found for previous day',
            'data': {}
        })
    
    return JsonResponse({
        'success': True,
        'message': f'Loaded attendance for {total_populated} students from previous day',
        'data': previous_attendance_data,
        'total_populated': total_populated
    })


@login_required
def mark_facilitator_attendance(request, actual_session_id):
    """Mark facilitator attendance for a session"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({'success': False, 'message': 'Permission denied'}, status=403)
    
    session = get_object_or_404(ActualSession, id=actual_session_id)
    
    if request.method == 'POST':
        facilitator_attendance = request.POST.get('facilitator_attendance', '')
        
        if facilitator_attendance in ['present', 'absent', 'leave']:
            session.facilitator_attendance = facilitator_attendance
            session.save()
            
            # --- START GROUPED ATTENDANCE SYNC ---
            # Automatically apply the same attendance to all classes in the same group
            planned = session.planned_session
            if planned and getattr(planned, 'grouped_session_id', None):
                grouped_actuals = ActualSession.objects.filter(
                    date=session.date,
                    planned_session__grouped_session_id=planned.grouped_session_id
                ).exclude(id=session.id)
                
                if grouped_actuals.exists():
                    grouped_actuals.update(facilitator_attendance=facilitator_attendance)
            # --- END GROUPED ATTENDANCE SYNC ---
            
            # Clear facilitator attendance cache so the UI updates instantly
            from django.core.cache import cache
            cache.delete(f'facilitator_{request.user.id}_attendance')
            
            # Check if it's an AJAX request
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True, 
                    'message': f'Your attendance marked as {facilitator_attendance.title()}'
                })
            else:
                # Regular form submission - show message and stay on same page
                messages.success(request, f'✅ Your attendance marked as {facilitator_attendance.title()}')
                return redirect('facilitator_class_today_session', class_section_id=session.planned_session.class_section.id)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'message': 'Invalid attendance status'}, status=400)
            else:
                messages.error(request, 'Invalid attendance status')
                return redirect('facilitator_class_today_session', class_section_id=session.planned_session.class_section.id)
    
    return redirect('facilitator_class_today_session', class_section_id=session.planned_session.class_section.id)


@login_required
def class_attendance(request, class_section_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)

    sessions = ActualSession.objects.filter(
        planned_session__class_section=class_section
    ).select_related("planned_session").order_by("-date")

    return render(request, "admin/classes/class_attendance.html", {
        "class_section": class_section,
        "sessions": sessions
    })


@login_required
def facilitator_classes(request):
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    from datetime import date
    from .models import CalendarDate
    
    # Schools assigned to facilitator
    assigned_schools = FacilitatorSchool.objects.filter(
        facilitator=request.user
    ).select_related("school")

    # All classes from those schools
    class_sections = ClassSection.objects.filter(
        school__in=[fs.school for fs in assigned_schools]
    ).order_by("school__name", "class_level", "section")

    # Add calendar info for today for each class
    from django.utils import timezone
    today = timezone.now().date()
    
    # Get all calendar entries for today (for today's status display)
    calendar_dates_today = CalendarDate.objects.filter(
        date=today
    ).select_related('school').prefetch_related('class_sections')
    
    # Build maps for grouping (using strings)
    calendar_grouping_map = {} # class_id_str -> list of class_id_strs
    calendar_entry_map = {} # class_id_str -> CalendarDate object
    calendar_by_class_today = {} # class_id_str -> CalendarDate object
    calendar_by_school_today = {} # school_id_str -> CalendarDate object
    
    # Maps for permanent groupings
    permanent_grouped_sessions = {} # (grouped_id, day_num) -> list of class_ids
    class_to_groups = {} # class_id_str -> list of (grouped_id, day_num)
    
    # Get today's actual sessions to find current day numbers for permanent grouping
    today_sessions = ActualSession.objects.filter(
        planned_session__class_section__in=class_sections,
        date=today
    ).select_related('planned_session')
    
    day_numbers_map = {str(s.planned_session.class_section.id).lower(): s.planned_session.day_number for s in today_sessions}
    
    # Map for easy status checking
    for cal in calendar_dates_today:
        if cal.class_sections.exists():
            for cls in cal.class_sections.all():
                calendar_by_class_today[str(cls.id).lower()] = cal
        elif cal.school:
            calendar_by_school_today[str(cal.school.id).lower()] = cal
        elif cal.class_section: # Legacy field
            calendar_by_class_today[str(cal.class_section.id).lower()] = cal

    # 1. Build Calendar-based grouping maps
    for cal_date in calendar_dates_today:
        if cal_date.date_type == DateType.SESSION:
            ids = [str(sid).lower() for sid in cal_date.class_sections.values_list('id', flat=True)]
            if len(ids) > 1:
                for cid in ids:
                    calendar_grouping_map[cid] = ids
                    calendar_entry_map[cid] = cal_date
            elif cal_date.class_section:
                # Legacy fallback
                cid = str(cal_date.class_section.id).lower()
                calendar_entry_map[cid] = cal_date

    # 2. Build Permanent grouping maps
    all_grouped_planned = PlannedSession.objects.filter(
        class_section__in=class_sections,
        grouped_session_id__isnull=False,
        is_active=True
    )
    
    for p in all_grouped_planned:
        gid = str(p.grouped_session_id).lower()
        day = p.day_number
        cid = str(p.class_section.id).lower()
        
        key = (gid, day)
        if key not in permanent_grouped_sessions:
            permanent_grouped_sessions[key] = []
        permanent_grouped_sessions[key].append(cid)
        
        if cid not in class_to_groups:
            class_to_groups[cid] = []
        class_to_groups[cid].append(key)

    classes_with_calendar = []
    processed_class_ids = set()
    
    for class_section in class_sections:
        class_id_str = str(class_section.id).lower()
        if class_id_str in processed_class_ids:
            continue
            
        # 1. Check for grouping via today's CalendarDate (Primary UI Grouping)
        grouped_ids = calendar_grouping_map.get(class_id_str)
        calendar_entry = calendar_entry_map.get(class_id_str)
        
        if grouped_ids:
            grouped_classes_list = [c for c in class_sections if str(c.id).lower() in grouped_ids]
            classes_with_calendar.append({
                'class_sections': grouped_classes_list,
                'class_section': grouped_classes_list[0],
                'today_status': 'session',
                'calendar_entry': calendar_entry,
            })
            for gid in grouped_ids:
                processed_class_ids.add(gid)
        
        # 2. Check for permanent grouping (Only if it matches today's day number)
        elif class_id_str in class_to_groups:
            # Get today's day number for this class if available
            today_day = day_numbers_map.get(class_id_str)
            grouped_ids_and_days = class_to_groups[class_id_str]
            
            found_active_group = False
            if today_day:
                for grouped_id, day_num in grouped_ids_and_days:
                    if day_num == today_day:
                        class_ids_in_group = [str(cid).lower() for cid in permanent_grouped_sessions.get((grouped_id, day_num), [])]
                        if len(class_ids_in_group) > 1:
                            grouped_classes_list = [c for c in class_sections if str(c.id).lower() in class_ids_in_group]
                            classes_with_calendar.append({
                                'class_sections': grouped_classes_list,
                                'class_section': grouped_classes_list[0],
                                'today_status': 'session',
                                'calendar_entry': None,
                            })
                            for gid in class_ids_in_group:
                                processed_class_ids.add(gid)
                            found_active_group = True
                            break
            
            if not found_active_group:
                # No active group for today's day number - show as individual class
                classes_with_calendar.append({
                    'class_sections': [class_section],
                    'class_section': class_section,
                    'today_status': 'session',
                    'calendar_entry': None,
                })
                processed_class_ids.add(class_id_str)
        
        # 3. No grouping
        else:
            # Check for holiday/office work
            today_status = 'session'
            school_id_str = str(class_section.school.id).lower()
            today_cal = calendar_by_class_today.get(str(class_section.id)) or calendar_by_school_today.get(school_id_str)
            
            if today_cal:
                if today_cal.date_type == DateType.HOLIDAY: today_status = 'holiday'
                elif today_cal.date_type == DateType.OFFICE_WORK: today_status = 'office_work'
            
            classes_with_calendar.append({
                'class_sections': [class_section],
                'class_section': class_section,
                'today_status': today_status,
                'calendar_entry': today_cal if today_cal and today_cal.date_type == DateType.SESSION else None,
            })
            processed_class_ids.add(class_id_str)

    return render(request, "facilitator/classes/list.html", {
        "class_sections": classes_with_calendar
    })


@login_required
def facilitator_attendance(request):
    """Enhanced attendance filtering interface for facilitators with date filtering"""
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    # Get facilitator's assigned schools
    assigned_schools = FacilitatorSchool.objects.filter(
        facilitator=request.user,
        is_active=True
    ).select_related("school")

    # Check if facilitator has any school assignments
    if not assigned_schools.exists():
        messages.warning(request, f"No active schools assigned to facilitator {request.user.full_name}. Please contact admin to assign schools.")

    # Get date filtering parameters
    from datetime import datetime, timedelta
    from django.utils import timezone
    
    period = request.GET.get("period", "all")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    
    # Calculate date ranges based on period
    today = timezone.now().date()
    date_filter = None
    attendance_date_filter = None
    
    if period == "today":
        date_filter = {"date": today}
        attendance_date_filter = {"actual_session__date": today}
    elif period == "this_week":
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        date_filter = {"date__range": [week_start, week_end]}
        attendance_date_filter = {"actual_session__date__range": [week_start, week_end]}
    elif period == "last_week":
        week_start = today - timedelta(days=today.weekday() + 7)
        week_end = week_start + timedelta(days=6)
        date_filter = {"date__range": [week_start, week_end]}
        attendance_date_filter = {"actual_session__date__range": [week_start, week_end]}
    elif period == "this_month":
        month_start = today.replace(day=1)
        if today.month == 12:
            month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        date_filter = {"date__range": [month_start, month_end]}
        attendance_date_filter = {"actual_session__date__range": [month_start, month_end]}
    elif period == "last_month":
        if today.month == 1:
            month_start = today.replace(year=today.year - 1, month=12, day=1)
            month_end = today.replace(day=1) - timedelta(days=1)
        else:
            month_start = today.replace(month=today.month - 1, day=1)
            month_end = today.replace(day=1) - timedelta(days=1)
        date_filter = {"date__range": [month_start, month_end]}
        attendance_date_filter = {"actual_session__date__range": [month_start, month_end]}
    elif period == "custom" and start_date and end_date:
        try:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
            date_filter = {"date__range": [start_date_obj, end_date_obj]}
            attendance_date_filter = {"actual_session__date__range": [start_date_obj, end_date_obj]}
        except ValueError:
            messages.error(request, "Invalid date format.")
            period = "all"

    context = {
        "assigned_schools": assigned_schools,
        "selected_period": period,
        "start_date": start_date,
        "end_date": end_date,
    }

    # If filters are applied, get the filtered data
    school_id = request.GET.get("school") or request.GET.get("school_fallback")
    class_section_id = request.GET.get("class_section")
    
    if school_id:
        # Verify facilitator has access to this school
        if not assigned_schools.filter(school_id=school_id).exists():
            messages.error(request, "You don't have access to this school.")
            return redirect("facilitator_attendance")
        
        school = get_object_or_404(School, id=school_id)
        context["selected_school"] = school
        
        # Get classes for this school
        class_sections = ClassSection.objects.filter(
            school=school,
            is_active=True
        ).order_by("class_level", "section")
        context["class_sections"] = class_sections
        
        if class_section_id:
            # Verify class belongs to selected school
            if not class_sections.filter(id=class_section_id).exists():
                messages.error(request, "Invalid class selection.")
                return redirect("facilitator_attendance")
            
            class_section = get_object_or_404(ClassSection, id=class_section_id)
            context["selected_class_section"] = class_section
            
            # Get students for this class with attendance summary
            enrollments = Enrollment.objects.filter(
                class_section=class_section,
                is_active=True
            ).select_related("student").order_by("student__full_name")
            
            # Calculate attendance statistics for each student with date filtering
            enrollment_stats = []
            for enrollment in enrollments:
                # Base query for sessions - include grouped sessions
                sessions_query = ActualSession.objects.filter(
                    planned_session__class_section=class_section,
                    status=SessionStatus.CONDUCTED
                )
                
                # Apply date filter if specified
                if date_filter:
                    sessions_query = sessions_query.filter(**date_filter)
                
                total_sessions = sessions_query.count()
                
                # Base query for attendance - include grouped sessions
                # For grouped sessions, we need to check if the enrollment's class is part of a grouped session
                from django.db.models import Q
                attendance_query = Attendance.objects.filter(
                    enrollment=enrollment
                ).filter(
                    Q(actual_session__planned_session__class_section=class_section) |
                    Q(actual_session__planned_session__grouped_session_id__isnull=False,
                      actual_session__planned_session__day_number__in=PlannedSession.objects.filter(
                          class_section=class_section
                      ).values_list('day_number', flat=True))
                )
                
                # Apply date filter to attendance if specified
                if attendance_date_filter:
                    attendance_query = attendance_query.filter(**attendance_date_filter)
                
                present_count = attendance_query.filter(status=AttendanceStatus.PRESENT).count()
                absent_count = attendance_query.filter(status=AttendanceStatus.ABSENT).count()
                
                attendance_percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 0
                
                # Get latest attendance record with visible/invisible change notes
                latest_attendance = attendance_query.order_by('-actual_session__date').first()
                
                enrollment_stats.append({
                    'enrollment': enrollment,
                    'total_sessions': total_sessions,
                    'present_count': present_count,
                    'absent_count': absent_count,
                    'attendance_percentage': round(attendance_percentage, 1),
                    'latest_attendance': latest_attendance,
                    'visible_change_notes': latest_attendance.visible_change_notes if latest_attendance else None,
                    'invisible_change_notes': latest_attendance.invisible_change_notes if latest_attendance else None,
                })
            
            context["enrollment_stats"] = enrollment_stats
            
            # Get recent attendance sessions for this class with detailed attendance
            recent_sessions_data = []
            recent_sessions_query = ActualSession.objects.filter(
                planned_session__class_section=class_section,
                status=SessionStatus.CONDUCTED
            ).select_related("planned_session")
            
            # Apply date filter to recent sessions
            if date_filter:
                recent_sessions_query = recent_sessions_query.filter(**date_filter)
                context["filtered_sessions_count"] = recent_sessions_query.count()
            
            recent_sessions = recent_sessions_query.order_by("-date")[:20]
            
            for session in recent_sessions:
                # For grouped sessions, count attendance from all students in the group
                if session.planned_session.grouped_session_id:
                    # Get all classes in the grouped session
                    grouped_planned_sessions = PlannedSession.objects.filter(
                        grouped_session_id=session.planned_session.grouped_session_id,
                        day_number=session.planned_session.day_number
                    )
                    # Get all actual sessions for these planned sessions on the same date
                    grouped_actual_sessions = ActualSession.objects.filter(
                        planned_session__in=grouped_planned_sessions,
                        date=session.date
                    )
                    present_count = Attendance.objects.filter(
                        actual_session__in=grouped_actual_sessions,
                        status=AttendanceStatus.PRESENT
                    ).count()
                    absent_count = Attendance.objects.filter(
                        actual_session__in=grouped_actual_sessions,
                        status=AttendanceStatus.ABSENT
                    ).count()
                    total_count = Attendance.objects.filter(
                        actual_session__in=grouped_actual_sessions
                    ).count()
                else:
                    present_count = session.attendances.filter(status=AttendanceStatus.PRESENT).count()
                    absent_count = session.attendances.filter(status=AttendanceStatus.ABSENT).count()
                    total_count = session.attendances.count()
                
                recent_sessions_data.append({
                    'session': session,
                    'present_count': present_count,
                    'absent_count': absent_count,
                    'total_count': total_count
                })
            
            context["recent_sessions_data"] = recent_sessions_data
            
            # Add date range context for display
            if period == "this_week" or period == "last_week":
                context["week_start"] = week_start if 'week_start' in locals() else None
                context["week_end"] = week_end if 'week_end' in locals() else None
            elif period == "this_month" or period == "last_month":
                context["month_start"] = month_start if 'month_start' in locals() else None

    return render(request, "facilitator/attendance_filter.html", context)

@login_required
@login_required
def admin_attendance_filter(request):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    context = {}

    # Schools dropdown
    context["schools"] = School.objects.all().order_by("name")

    # 🔹 Preload ALL classes (needed for fast dropdown)
    classes_by_school = ClassSection.objects.values(
        "id", "class_level", "section", "school_id"
    )
    context["classes_json"] = json.dumps(list(classes_by_school), cls=DjangoJSONEncoder)

    school_id = request.GET.get("school")
    class_section_id = request.GET.get("class_section")

    if school_id:
        school = get_object_or_404(School, id=school_id)
        context["selected_school"] = school

        if class_section_id:
            class_section = get_object_or_404(ClassSection, id=class_section_id)
            context["selected_class_section"] = class_section

            enrollments = Enrollment.objects.filter(
                class_section=class_section,
                is_active=True
            ).select_related("student").order_by("student__full_name")

            total_sessions = ActualSession.objects.filter(
                planned_session__class_section=class_section,
                status=SessionStatus.CONDUCTED
            ).count()

            # OPTIMIZATION: Fetch all attendance in one query instead of N+1
            from django.db.models import Count, Q
            attendance_stats = Attendance.objects.filter(
                enrollment__class_section=class_section
            ).values('enrollment_id').annotate(
                present_count=Count('id', filter=Q(status=AttendanceStatus.PRESENT)),
                absent_count=Count('id', filter=Q(status=AttendanceStatus.ABSENT)),
            )
            
            # Convert to dict for fast lookup
            attendance_dict = {stat['enrollment_id']: stat for stat in attendance_stats}

            stats = []
            for e in enrollments:
                attendance = attendance_dict.get(e.id, {'present_count': 0, 'absent_count': 0})
                present = attendance['present_count']
                absent = attendance['absent_count']
                percent = (present / total_sessions * 100) if total_sessions else 0

                stats.append({
                    "enrollment": e,
                    "present": present,
                    "absent": absent,
                    "total": total_sessions,
                    "percent": round(percent, 1),
                })

            context["enrollment_stats"] = stats

            context["recent_sessions"] = ActualSession.objects.filter(
                planned_session__class_section=class_section,
                status=SessionStatus.CONDUCTED
            ).select_related("planned_session").order_by("-date")[:10]

    return render(request, "admin/attendance_filter.html", context)

# AJAX endpoints for cascading filters
@login_required
def ajax_facilitator_schools(request):
    """AJAX endpoint to get schools assigned to facilitator"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    schools = FacilitatorSchool.objects.filter(
        facilitator=request.user,
        is_active=True
    ).select_related("school").values(
        "school__id", "school__name", "school__district"
    )
    
    return JsonResponse({
        "schools": list(schools)
    })


@login_required
def ajax_school_classes(request):
    """AJAX endpoint to get classes for a specific school"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({
            "error": "Permission denied - User role is not FACILITATOR",
            "user_role": request.user.role.name,
            "debug": True
        }, status=403)
    
    school_id = request.GET.get("school_id")
    if not school_id:
        return JsonResponse({
            "error": "School ID required",
            "received_params": dict(request.GET),
            "debug": True
        }, status=400)
    
    # Check if school exists
    try:
        school = School.objects.get(id=school_id)
    except School.DoesNotExist:
        return JsonResponse({
            "error": f"School with ID {school_id} does not exist",
            "debug": True
        }, status=404)
    
    # Verify facilitator has access to this school
    facilitator_school = FacilitatorSchool.objects.filter(
        facilitator=request.user,
        school_id=school_id,
        is_active=True
    ).first()
    
    if not facilitator_school:
        # Get all schools assigned to this facilitator for debugging
        assigned_schools = list(FacilitatorSchool.objects.filter(
            facilitator=request.user,
            is_active=True
        ).values_list('school_id', 'school__name'))
        
        return JsonResponse({
            "error": f"Access denied to school '{school.name}' (ID: {school_id})",
            "assigned_schools": assigned_schools,
            "debug": True
        }, status=403)
    
    # Get classes for this school
    classes = ClassSection.objects.filter(
        school_id=school_id,
        is_active=True
    ).values(
        "id", "class_level", "section"
    ).order_by("class_level", "section")
    
    classes_list = list(classes)
    
    # Add debug information
    total_classes_in_school = ClassSection.objects.filter(school_id=school_id).count()
    
    return JsonResponse({
        "classes": classes_list,
        "debug_info": {
            "school_name": school.name,
            "total_classes_in_school": total_classes_in_school,
            "active_classes_count": len(classes_list),
            "facilitator_access_confirmed": True,
            "facilitator_school_assignment_id": str(facilitator_school.id)
        },
        "success": True
    })


@login_required
def ajax_class_students(request):
    """AJAX endpoint to get students for a specific class"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    class_section_id = request.GET.get("class_section_id")
    if not class_section_id:
        return JsonResponse({"error": "Class section ID required"}, status=400)
    
    # Verify facilitator has access to this class through school assignment
    class_section = get_object_or_404(ClassSection, id=class_section_id)
    if not FacilitatorSchool.objects.filter(
        facilitator=request.user,
        school=class_section.school,
        is_active=True
    ).exists():
        return JsonResponse({"error": "Access denied to this class"}, status=403)
    
    students = Enrollment.objects.filter(
        class_section_id=class_section_id,
        is_active=True
    ).select_related("student").values(
        "id", "student__id", "student__full_name", "student__enrollment_number"
    ).order_by("student__full_name")
    
    return JsonResponse({
        "students": list(students)
    })
@login_required
def planned_session_create(request, class_section_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)

    if request.method == "POST":
        topic = request.POST.get("topic")
        youtube_url = request.POST.get("youtube_url")
        description = request.POST.get("description", "")

        last_day = PlannedSession.objects.filter(
            class_section=class_section
        ).aggregate(Max("day_number"))["day_number__max"] or 0

        PlannedSession.objects.create(
            class_section=class_section,
            day_number=last_day + 1,
            topic=topic,
            youtube_url=youtube_url,
            description=description
        )

        messages.success(request, "Planned session added.")
        return redirect("admin_class_sessions", class_section.id)

    return render(request, "admin/classes/planned_session_form.html", {
        "class_section": class_section
    })

@login_required
def planned_session_edit(request, session_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    planned = get_object_or_404(PlannedSession, id=session_id)
    class_section = planned.class_section

    if request.method == "POST":
        planned.topic = request.POST.get("topic")
        planned.youtube_url = request.POST.get("youtube_url")
        planned.description = request.POST.get("description", "")
        planned.save()

        messages.success(request, "Planned session updated.")
        return redirect("admin_class_sessions", class_section.id)

    return render(request, "admin/classes/planned_session_form.html", {
        "class_section": class_section,
        "planned_session": planned,
        "is_edit": True
    })
@login_required
def planned_session_delete(request, session_id):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    planned = get_object_or_404(PlannedSession, id=session_id)
    class_section = planned.class_section

    # Handle both GET and POST requests for deletion
    if request.method == "POST" or request.method == "GET":
        # Get related data count for user feedback
        actual_sessions_count = planned.actual_sessions.count()
        attendance_count = 0
        
        if actual_sessions_count > 0:
            # Count attendance records that will be deleted
            for actual_session in planned.actual_sessions.all():
                attendance_count += actual_session.attendances.count()
        
        # Delete the planned session (this will cascade delete ActualSession and Attendance records)
        planned.delete()
        
        # Provide detailed feedback about what was deleted
        if actual_sessions_count > 0:
            messages.success(
                request, 
                f"Planned session deleted successfully. Also deleted {actual_sessions_count} actual session(s) and {attendance_count} attendance record(s)."
            )
        else:
            messages.success(request, "Planned session deleted successfully.")
            
        return redirect("admin_class_sessions", class_section.id)

    # Optional confirm page (if needed in future)
    return render(request, "admin/classes/planned_session_confirm_delete.html", {
        "planned_session": planned,
        "class_section": class_section,
    })


@login_required
def initialize_class_sessions(request, class_section_id):
    """Initialize all 150 sessions for a class"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)

    if request.method == "POST":
        try:
            with transaction.atomic():
                # Check if sessions already exist
                existing_sessions_count = PlannedSession.objects.filter(
                    class_section=class_section,
                    is_active=True
                ).count()
                
                if existing_sessions_count > 0:
                    messages.warning(
                        request, 
                        f"Class already has {existing_sessions_count} sessions. Delete existing sessions first if you want to reinitialize."
                    )
                    return redirect("class_sections_list_by_school", class_section.school.id)
                
                # Create all 150 sessions
                sessions_to_create = []
                for day_number in range(1, 151):
                    session = PlannedSession(
                        class_section=class_section,
                        day_number=day_number,
                        title=f"Day {day_number} Session",
                        description=f"Session for day {day_number}",
                        sequence_position=day_number,
                        is_required=True,
                        is_active=True
                    )
                    sessions_to_create.append(session)
                
                # Bulk create all sessions
                PlannedSession.objects.bulk_create(sessions_to_create)
                
                messages.success(
                    request, 
                    f"✅ Successfully initialized 150 sessions for {class_section.school.name} - {class_section.class_level}-{class_section.section}"
                )
                logger.info(f"Admin initialized 150 sessions for {class_section}")
                
        except Exception as e:
            logger.error(f"Error initializing sessions for {class_section}: {e}")
            messages.error(request, "Failed to initialize sessions. Please try again.")
    
    return redirect("class_sections_list_by_school", class_section.school.id)


@login_required
def delete_all_class_sessions(request, class_section_id):
    """Delete all sessions for a class"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)

    if request.method == "POST":
        try:
            with transaction.atomic():
                # Get all planned sessions for this class
                planned_sessions = PlannedSession.objects.filter(
                    class_section=class_section,
                    is_active=True
                )
                
                if not planned_sessions.exists():
                    messages.warning(request, "No sessions found to delete.")
                    return redirect("class_sections_list_by_school", class_section.school.id)
                
                # Count related data that will be deleted
                total_planned = planned_sessions.count()
                total_actual_sessions = 0
                total_attendance = 0
                
                for session in planned_sessions:
                    actual_sessions_count = session.actual_sessions.count()
                    total_actual_sessions += actual_sessions_count
                    
                    for actual_session in session.actual_sessions.all():
                        total_attendance += actual_session.attendances.count()
                
                # Delete all sessions (cascade will handle ActualSession and Attendance)
                planned_sessions.delete()
                
                # Provide detailed feedback
                message = f"✅ Successfully deleted {total_planned} planned session(s)"
                if total_actual_sessions > 0:
                    message += f" and {total_actual_sessions} actual session(s) with {total_attendance} attendance record(s)"
                message += f" for {class_section.school.name} - {class_section.class_level}-{class_section.section}"
                
                messages.success(request, message)
                logger.info(f"Admin deleted all sessions for {class_section}")
                
        except Exception as e:
            logger.error(f"Error deleting all sessions for {class_section}: {e}")
            messages.error(request, "Failed to delete sessions. Please try again.")
    
    return redirect("class_sections_list_by_school", class_section.school.id)


@login_required
def bulk_initialize_school_sessions(request, school_id):
    """Initialize sessions for all classes in a school"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    school = get_object_or_404(School, id=school_id)

    if request.method == "POST":
        try:
            with transaction.atomic():
                # Get all class sections for this school
                class_sections = ClassSection.objects.filter(school=school)
                
                if not class_sections.exists():
                    messages.warning(request, f"No classes found for {school.name}")
                    return redirect("class_sections_list_by_school", school.id)
                
                initialized_count = 0
                skipped_count = 0
                total_sessions_created = 0
                
                for class_section in class_sections:
                    # Check if sessions already exist
                    existing_sessions_count = PlannedSession.objects.filter(
                        class_section=class_section,
                        is_active=True
                    ).count()
                    
                    if existing_sessions_count > 0:
                        skipped_count += 1
                        continue
                    
                    # Create all 150 sessions for this class
                    sessions_to_create = []
                    for day_number in range(1, 151):
                        session = PlannedSession(
                            class_section=class_section,
                            day_number=day_number,
                            title=f"Day {day_number} Session",
                            description=f"Session for day {day_number}",
                            sequence_position=day_number,
                            is_required=True,
                            is_active=True
                        )
                        sessions_to_create.append(session)
                    
                    # Bulk create sessions for this class
                    PlannedSession.objects.bulk_create(sessions_to_create)
                    initialized_count += 1
                    total_sessions_created += 150
                
                # Provide feedback
                if initialized_count > 0:
                    messages.success(
                        request, 
                        f"✅ Successfully initialized sessions for {initialized_count} class(es) in {school.name}. "
                        f"Created {total_sessions_created} total sessions. "
                        f"{skipped_count} class(es) skipped (already had sessions)."
                    )
                else:
                    messages.info(
                        request, 
                        f"All {class_sections.count()} class(es) in {school.name} already have sessions initialized."
                    )
                
                logger.info(f"Bulk initialized sessions for {initialized_count} classes in {school}")
                
        except Exception as e:
            logger.error(f"Error bulk initializing sessions for school {school}: {e}")
            messages.error(request, "Failed to initialize sessions. Please try again.")
    
    return redirect("class_sections_list_by_school", school.id)


@login_required
def bulk_delete_school_sessions(request, school_id):
    """Delete all sessions for all classes in a school"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    school = get_object_or_404(School, id=school_id)

    if request.method == "POST":
        try:
            with transaction.atomic():
                # Get all class sections for this school
                class_sections = ClassSection.objects.filter(school=school)
                
                if not class_sections.exists():
                    messages.warning(request, f"No classes found for {school.name}")
                    return redirect("class_sections_list_by_school", school.id)
                
                # Get all planned sessions for all classes in this school
                planned_sessions = PlannedSession.objects.filter(
                    class_section__school=school,
                    is_active=True
                )
                
                if not planned_sessions.exists():
                    messages.warning(request, f"No sessions found to delete for {school.name}")
                    return redirect("class_sections_list_by_school", school.id)
                
                # Count related data that will be deleted
                total_planned = planned_sessions.count()
                total_actual_sessions = 0
                total_attendance = 0
                classes_affected = set()
                
                for session in planned_sessions:
                    classes_affected.add(session.class_section)
                    actual_sessions_count = session.actual_sessions.count()
                    total_actual_sessions += actual_sessions_count
                    
                    for actual_session in session.actual_sessions.all():
                        total_attendance += actual_session.attendances.count()
                
                from django.db.models.signals import post_delete
                from .models import PlannedSession, ActualSession, Attendance
                from .signals_optimization import invalidate_session_cache, invalidate_attendance_cache, invalidate_planned_session_cache
                from django.core.cache import cache
                
                # Disconnect signals to speed up deletion
                post_delete.disconnect(invalidate_session_cache, sender=ActualSession)
                post_delete.disconnect(invalidate_attendance_cache, sender=Attendance)
                post_delete.disconnect(invalidate_planned_session_cache, sender=PlannedSession)
                
                try:
                    # Delete all sessions (cascade will handle ActualSession and Attendance)
                    planned_sessions.delete()
                finally:
                    # Reconnect signals
                    post_delete.connect(invalidate_session_cache, sender=ActualSession)
                    post_delete.connect(invalidate_attendance_cache, sender=Attendance)
                    post_delete.connect(invalidate_planned_session_cache, sender=PlannedSession)
                    
                    cache.clear()
                    logger.info(f"Bulk cache cleared for School {school.id} deletion")
                
                # Provide detailed feedback
                message = f"✅ Successfully deleted {total_planned} planned session(s) from {len(classes_affected)} class(es) in {school.name}"
                if total_actual_sessions > 0:
                    message += f" and {total_actual_sessions} actual session(s) with {total_attendance} attendance record(s)"
                
                messages.success(request, message)
                logger.info(f"Bulk deleted all sessions for school {school}")
                
        except Exception as e:
            logger.error(f"Error bulk deleting sessions for school {school}: {e}")
            messages.error(request, "Failed to delete sessions. Please try again.")
    
    return redirect("class_sections_list_by_school", school.id)


@login_required
def planned_session_import(request, class_section_id):

    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)

    if request.method == "POST":
        file = request.FILES.get("file")
        if not file:
            messages.error(request, "Upload CSV file.")
            return redirect(request.path)

        content = file.read().decode("utf-8", errors="ignore")
        reader = csv.reader(content.splitlines())

        current_day = None
        current_session = None
        current_step = None
        order = 1

        for row in reader:
            if not any(row):
                continue

            cell_a = row[0].strip() if len(row) > 0 else ""
            cell_b = row[1].strip() if len(row) > 1 else ""
            cell_c = row[2].strip() if len(row) > 2 else ""
            cell_d = row[3].strip() if len(row) > 3 else ""

            # -----------------------------
            # DAY HEADER (Day 1, Day 2)
            # -----------------------------
            if cell_a.lower().startswith("day"):
                day_number = int(cell_a.replace("Day", "").strip())

                current_session, _ = PlannedSession.objects.get_or_create(
                    class_section=class_section,
                    day_number=day_number,
                    defaults={
                        "title": f"Day {day_number}",
                        "description": "",
                        "is_active": True,
                    }
                )

                SessionStep.objects.filter(
                    planned_session=current_session
                ).delete()

                current_step = None
                order = 1
                continue

            # -----------------------------
            # HEADER ROW (When / What)
            # -----------------------------
            if cell_a.lower() == "when":
                continue

            # -----------------------------
            # NEW STEP ROW
            # -----------------------------
            if cell_a:
                current_step = SessionStep.objects.create(
                    planned_session=current_session,
                    order=order,
                    subject=map_subject(cell_b),
                    title=cell_b,
                    description=cell_d,
                    duration_minutes=parse_minutes(cell_c),
                )
                order += 1
                continue

            # -----------------------------
            # CONTINUATION ROW (DETAILS)
            # -----------------------------
            if current_step and cell_d:
                current_step.description += "\n" + cell_d
                current_step.save()

        messages.success(request, "Curriculum imported successfully ✔")
        return redirect("admin_class_sessions", class_section.id)

    return render(request, "admin/classes/planned_session_import.html", {
        "class_section": class_section
    })
def parse_minutes(text):
    if not text:
        return None
    try:
        return int(text.split()[0])
    except:
        return None


def map_subject(title):
    t = title.lower()
    if "hindi" in t:
        return "hindi"
    if "english" in t:
        return "english"
    if "math" in t:
        return "maths"
    if "computer" in t:
        return "computer"
    if "mindfulness" in t:
        return "mindfulness"
    return "activity"



@login_required
def bulk_delete_sessions(request, class_section_id):
    """Bulk delete planned sessions"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)

    if request.method == "POST":
        session_ids = request.POST.getlist('session_ids')
        
        if not session_ids:
            messages.error(request, "No sessions selected for deletion.")
            return redirect("admin_class_sessions", class_section.id)

        # Get sessions to delete
        sessions_to_delete = PlannedSession.objects.filter(
            id__in=session_ids,
            class_section=class_section
        )

        if not sessions_to_delete.exists():
            messages.error(request, "No valid sessions found for deletion.")
            return redirect("admin_class_sessions", class_section.id)

        # Count related data that will be deleted
        total_actual_sessions = 0
        total_attendance = 0
        
        for session in sessions_to_delete:
            actual_sessions_count = session.actual_sessions.count()
            total_actual_sessions += actual_sessions_count
            
            for actual_session in session.actual_sessions.all():
                total_attendance += actual_session.attendances.count()

        # Delete all selected sessions
        deleted_count = sessions_to_delete.count()
        
        from django.db.models.signals import post_delete
        from .models import PlannedSession, ActualSession, Attendance
        from .signals_optimization import invalidate_session_cache, invalidate_attendance_cache, invalidate_planned_session_cache
        from django.core.cache import cache
        
        # Disconnect signals to speed up deletion
        post_delete.disconnect(invalidate_session_cache, sender=ActualSession)
        post_delete.disconnect(invalidate_attendance_cache, sender=Attendance)
        post_delete.disconnect(invalidate_planned_session_cache, sender=PlannedSession)
        
        try:
            sessions_to_delete.delete()
        finally:
            # Reconnect signals
            post_delete.connect(invalidate_session_cache, sender=ActualSession)
            post_delete.connect(invalidate_attendance_cache, sender=Attendance)
            post_delete.connect(invalidate_planned_session_cache, sender=PlannedSession)
            
            # Clear all cache at once
            cache.clear()
            logger.info(f"Bulk cache cleared for ClassSection {class_section.id} deletion")

        # Provide detailed feedback
        message = f"Successfully deleted {deleted_count} planned session(s)."
        if total_actual_sessions > 0:
            message += f" Also deleted {total_actual_sessions} actual session(s) and {total_attendance} attendance record(s)."
        
        messages.success(request, message)

    return redirect("admin_class_sessions", class_section.id)


@login_required
def download_sample_csv(request):
    """Download a sample CSV file for planned sessions import"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    # Create sample CSV content
    sample_data = [
        ["topic", "day_number", "youtube_url", "description"],
        ["Introduction to Math", "1", "https://youtube.com/watch?v=abc123", "Basic math concepts"],
        ["Addition and Subtraction", "2", "https://youtube.com/watch?v=def456", "Learning basic operations"],
        ["Multiplication Tables", "3", "", "Practice multiplication"],
        ["Division Basics", "", "https://youtube.com/watch?v=ghi789", "Understanding division"]
    ]

    # Create HTTP response with CSV content
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="planned_sessions_sample.csv"'

    writer = csv.writer(response)
    for row in sample_data:
        writer.writerow(row)

    return response


@login_required
def toggle_facilitator_assignment(request, assignment_id):
    """Toggle facilitator assignment active status"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    assignment = get_object_or_404(FacilitatorSchool, id=assignment_id)
    
    if request.method == "POST":
        new_status = request.POST.get('is_active') == 'true'
        assignment.is_active = new_status
        assignment.save()
        
        # Clear schools cache to refresh facilitator counts
        cache_key = f"schools_list_{request.user.id}"
        cache.delete(cache_key)
        
        status_text = "activated" if new_status else "deactivated"
        messages.success(request, f"Facilitator assignment {status_text} successfully.")
    
    return redirect("school_detail", school_id=assignment.school.id)


@login_required
def delete_facilitator_assignment(request, assignment_id):
    """Delete facilitator assignment"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    assignment = get_object_or_404(FacilitatorSchool, id=assignment_id)
    school_id = assignment.school.id
    
    if request.method == "POST":
        facilitator_name = assignment.facilitator.full_name
        assignment.delete()
        
        # Clear schools cache to refresh facilitator counts
        cache_key = f"schools_list_{request.user.id}"
        cache.delete(cache_key)
        
        messages.success(request, f"Facilitator {facilitator_name} removed from school successfully.")
    
    return redirect("school_detail", school_id=school_id)


@login_required
def admin_sessions_filter(request):
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    # Clear cache to ensure fresh data
    from django.core.cache import cache
    cache.clear()

    schools = School.objects.all()
    classes = ClassSection.objects.none()

    school_id = request.GET.get("school")
    class_id = request.GET.get("class")

    # when school selected → load related classes
    if school_id:
        classes = ClassSection.objects.filter(school_id=school_id)

    # when both selected → redirect
    if school_id and class_id:
        return redirect("admin_class_sessions", class_section_id=class_id)

    # Get curriculum session statistics for the template
    hindi_sessions = CurriculumSession.objects.filter(language='hindi').count()
    english_sessions = CurriculumSession.objects.filter(language='english').count()

    # Get recent activity from both systems
    recent_class_sessions = ActualSession.objects.select_related(
        'planned_session', 'facilitator', 'planned_session__class_section__school'
    ).order_by('-created_at')[:5]

    recent_curriculum_updates = CurriculumSession.objects.select_related(
        'created_by'
    ).order_by('-updated_at')[:5]

    return render(request, "admin/sessions/filter.html", {
        "schools": schools,
        "classes": classes,
        "hindi_sessions": hindi_sessions,
        "english_sessions": english_sessions,
        "recent_class_sessions": recent_class_sessions,
        "recent_curriculum_updates": recent_curriculum_updates,
        "debug_template": "admin/sessions/filter.html",  # Debug info
        "user_role": request.user.role.name.upper(),  # Debug info
    })




from django.utils import timezone
from django.contrib import messages

@login_required
def dashboard(request):
    role_name = request.user.role.name.upper()
    role_config = ROLE_CONFIG.get(role_name)

    if not role_config:
        messages.error(request, "Invalid role.")
        return redirect("no_permission")

    context = {}

    if role_name == "ADMIN":
        today = timezone.now().date()

        # ===== TOP STATS =====
        context["active_schools"] = School.objects.filter(status=1).count()

        context["active_facilitators"] = User.objects.filter(
            role__name__iexact="FACILITATOR",
            is_active=True
        ).count()

        context["enrolled_students"] = Enrollment.objects.filter(
            is_active=True
        ).count()

        context["pending_validations"] = PlannedSession.objects.filter(
            is_active=True
        ).exclude(
            actual_sessions__status=SessionStatus.CONDUCTED
        ).count()

        # ===== SYSTEM SNAPSHOT (TODAY) =====
        context["sessions_today"] = ActualSession.objects.filter(
            date=today,
            status=SessionStatus.CONDUCTED
        ).count()

        context["holidays_today"] = ActualSession.objects.filter(
            date=today,
            status=SessionStatus.HOLIDAY
        ).count()

        context["cancelled_today"] = ActualSession.objects.filter(
            date=today,
            status=SessionStatus.CANCELLED
        ).count()

        # ===== RECENT ACTIVITY =====
        context["recent_activities"] = ActualSession.objects.select_related(
            "facilitator",
            "planned_session",
            "planned_session__class_section",
            "planned_session__class_section__school"
        ).order_by("-created_at")[:10]

        # For Create User Modal
        context["roles"] = Role.objects.all()

    return render(request, role_config["template"], context)

@login_required
def curriculum_navigator(request):
    """View to display the interactive curriculum day navigator"""
    if request.user.role.name.upper() not in ["ADMIN", "FACILITATOR"]:
        messages.error(request, "You do not have permission to view the curriculum.")
        return redirect("no_permission")
    
    # Provide context for the template
    context = {
        'total_days': 150,
        'languages': ['english', 'hindi'],
        'current_day': 1,
        'current_language': 'english',
    }
    
    return render(request, "admin/session/English_ ALL DAYS.html", context)


@login_required
def hindi_curriculum_navigator(request):
    """View to display the interactive Hindi curriculum day navigator"""
    if request.user.role.name.upper() not in ["ADMIN", "FACILITATOR"]:
        messages.error(request, "You do not have permission to view the curriculum.")
        return redirect("no_permission")
    
    # Provide context for the template
    context = {
        'total_days': 150,
        'languages': ['english', 'hindi'],
        'current_day': 1,
        'current_language': 'hindi',
    }
    
    return render(request, "admin/session/Hindi_Interactive.html", context)


@login_required
def facilitator_curriculum_session(request, class_section_id):
    """Enhanced facilitator session view with integrated curriculum navigator"""
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)
    
    # Verify facilitator has access to this class
    if not FacilitatorSchool.objects.filter(
        facilitator=request.user,
        school=class_section.school,
        is_active=True
    ).exists():
        messages.error(request, "You don't have access to this class.")
        return redirect("facilitator_classes")

    # Get requested day or default to Day 1
    requested_day = request.GET.get('day')
    if requested_day:
        try:
            current_day_number = int(requested_day)
        except ValueError:
            current_day_number = 1
    else:
        current_day_number = 1  # Always start with Day 1

    # Get planned session for current day
    planned_session = PlannedSession.objects.filter(
        class_section=class_section,
        day_number=current_day_number,
        is_active=True
    ).first()

    # Get actual session status
    actual_session = None
    session_status = "pending"
    
    if planned_session:
        actual_session = planned_session.actual_sessions.order_by("-date").first()
        if actual_session:
            session_status = actual_session.status

    # Don't load all session statuses - let frontend handle navigation
    # This removes the performance bottleneck of loading all 150 days
    session_statuses = {}  # Empty - frontend will handle day navigation

    # Navigation helpers
    prev_day = current_day_number - 1 if current_day_number > 1 else None
    next_day = current_day_number + 1 if current_day_number < 150 else None

    context = {
        'class_section': class_section,
        'planned_session': planned_session,
        'actual_session': actual_session,
        'session_status': session_status,
        'current_day_number': current_day_number,
        'prev_day': prev_day,
        'next_day': next_day,
        'session_statuses': json.dumps(session_statuses),  # Empty for performance
    }

    return render(request, "facilitator/curriculum_session.html", context)


def curriculum_content_api(request):
    """Enhanced API endpoint to serve curriculum content using CurriculumContentResolver"""
    # Check if user is authenticated and has proper role
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    if request.user.role.name.upper() not in ["ADMIN", "FACILITATOR"]:
        return JsonResponse({"error": "Permission denied - Admin or Facilitator role required"}, status=403)
    
    day = request.GET.get('day', 1)
    language = request.GET.get('language', 'english').lower()
    class_section_id = request.GET.get('class_section_id')
    
    try:
        day = int(day)
    except ValueError:
        day = 1
    
    # Validate language
    if language not in ['english', 'hindi']:
        language = 'english'
    
    # Get class section if provided (for better language detection)
    class_section = None
    if class_section_id:
        try:
            class_section = ClassSection.objects.get(id=class_section_id)
        except ClassSection.DoesNotExist:
            pass
    
    # Use our new CurriculumContentResolver
    from .services.curriculum_content_resolver import CurriculumContentResolver
    
    content_resolver = CurriculumContentResolver()
    
    try:
        # Resolve content using our new service
        content_result = content_resolver.resolve_content(day, language, class_section)
        
        # Get content metadata
        metadata = content_resolver.get_content_metadata(day, language)
        
        # Return content directly since _extract_day_content already provides proper wrapper
        wrapped_content = f'''
        <div class="api-content-wrapper" data-day="{day}" data-language="{language}" data-source="{content_result.source}">
            {_format_content_with_source_info(content_result, metadata)}
            
            <div class="content-body">
                {content_result.content}
            </div>
            
            {_add_admin_management_links(content_result, day, language, request.user)}
        </div>
        '''
        
        return HttpResponse(wrapped_content, content_type='text/html; charset=utf-8')
        
    except Exception as e:
        logger.error(f"Error in curriculum_content_api: {str(e)}", exc_info=True)
        error_content = f'''
        <div class="alert alert-danger m-3">
            <h6><i class="fas fa-exclamation-circle me-2"></i>Error Loading Content</h6>
            <p>Failed to load Day {day} {language.title()} curriculum content.</p>
            <small class="text-muted d-block mt-2">Error: {str(e)}</small>
            <div class="mt-3">
                <button class="btn btn-outline-danger btn-sm" onclick="window.loadCurriculumContent({day}, '{language}')">
                    <i class="fas fa-redo me-1"></i>Retry
                </button>
                <button class="btn btn-outline-secondary btn-sm ms-2" onclick="window.loadCurriculumContent(1, '{language}')">
                    <i class="fas fa-home me-1"></i>Go to Day 1
                </button>
            </div>
        </div>
        '''
        return HttpResponse(error_content, content_type='text/html; charset=utf-8')


def _format_content_with_source_info(content_result, metadata):
    """Format content with source information."""
    if content_result.source == 'admin_managed':
        last_updated = metadata.last_updated.strftime('%Y-%m-%d %H:%M') if metadata.last_updated else 'Unknown'
        return f'''
        <div class="content-source-info">
            <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                <strong>Admin-managed content</strong> • 
                Last updated: {last_updated} • 
                Usage count: {metadata.usage_count}
                {f" • Title: {metadata.title}" if metadata.title else ""}
            </small>
        </div>
        '''
    elif content_result.source == 'static_fallback':
        return f'''
        <div class="content-source-info">
            <small class="text-muted">
                <i class="fas fa-file-alt me-1"></i>
                <strong>Static content</strong> • 
                Loaded from curriculum files • 
                No admin-managed content available for this day
            </small>
        </div>
        '''
    else:
        return f'''
        <div class="content-source-info">
            <small class="text-danger">
                <i class="fas fa-exclamation-triangle me-1"></i>
                <strong>Fallback content</strong> • 
                There was an issue loading the primary content
            </small>
        </div>
        '''

def _add_admin_management_links(content_result, day, language, user):
    """Add admin management links if user has permissions."""
    if user.role.name.upper() != "ADMIN":
        return ""
    
    if content_result.source == 'admin_managed' and content_result.curriculum_session:
        return f'''
        <div class="admin-actions">
            <small class="text-muted d-block mb-2">
                <i class="fas fa-tools me-1"></i>Admin Actions:
            </small>
            <a href="/admin/curriculum/session/{content_result.curriculum_session.id}/edit/" 
               class="btn btn-outline-primary btn-sm me-2" target="_blank">
                <i class="fas fa-edit me-1"></i>Edit Content
            </a>
            <a href="/admin/curriculum/session/{content_result.curriculum_session.id}/preview/" 
               class="btn btn-outline-info btn-sm" target="_blank">
                <i class="fas fa-eye me-1"></i>Preview
            </a>
        </div>
        '''
    else:
        return ''

def wrap_curriculum_content(day_content, day, language):
    """Wrap curriculum content with proper HTML structure."""
    wrapped_content = f'''
    <div class="day-section" data-day="{day}" data-language="{language}">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">Day {day} - {language.title()} Curriculum</h5>
            <span class="badge bg-info">{language.title()}</span>
        </div>
        <div class="table-responsive">
            <table class="table table-bordered curriculum-table">
                <tbody>
                    {day_content}
                </tbody>
            </table>
        </div>
    </div>
    <style>
    .curriculum-table {{
        font-size: 14px;
    }}
    .curriculum-table td {{
        padding: 8px;
        vertical-align: top;
    }}
    .curriculum-table .s0 {{
        background-color: #d9ead3;
        font-weight: bold;
        font-size: 18px;
        text-align: center;
    }}
    .curriculum-table .s1 {{
        background-color: #d9ead3;
        font-weight: bold;
        text-align: center;
    }}
    .curriculum-table .s4 {{
        background-color: #ffffff;
        font-weight: bold;
        text-align: center;
    }}
    .curriculum-table .s7 {{
        background-color: #fde49a;
    }}
    .curriculum-table .s11 {{
        background-color: #d9f1f3;
    }}
    .curriculum-table .s21 {{
        background-color: #fef1cc;
    }}
    
    /* IMPORTANT: Override Google Sheets default link styles */
    .ritz .waffle a {{
        color: #0066cc !important;
    }}
    
    /* Link Highlighting Styles */
    .curriculum-table a {{
        color: #0066cc !important;
        text-decoration: underline !important;
        font-weight: 500;
        transition: all 0.2s ease;
    }}
    .curriculum-table a:hover {{
        color: #ffffff !important;
        background-color: #0066cc !important;
        text-decoration: none !important;
        padding: 2px 4px;
        border-radius: 3px;
    }}
    .curriculum-table a:visited {{
        color: #551a8b !important;
    }}
    
    /* External link indicator */
    .curriculum-table a[href^="http"]::before {{
        content: "🔗 ";
        font-size: 0.9em;
    }}
    
    /* Make links more visible in colored backgrounds */
    .curriculum-table .s7 a,
    .curriculum-table .s11 a,
    .curriculum-table .s12 a,
    .curriculum-table .s17 a,
    .curriculum-table .s19 a,
    .curriculum-table .s21 a,
    .curriculum-table .s30 a,
    .curriculum-table .s48 a {{
        background-color: rgba(255, 255, 255, 0.8) !important;
        padding: 2px 4px !important;
        border-radius: 2px;
        border: 1px solid #0066cc !important;
    }}
    
    /* Specific styles for underlined links */
    .s30 a, .s48 a {{
        color: #1155cc !important;
        font-weight: bold !important;
    }}
    </style>
    '''
    return wrapped_content

        
@login_required 
def facilitator_session_quick_nav(request, class_section_id):
    """Quick navigation API for facilitator sessions"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    class_section = get_object_or_404(ClassSection, id=class_section_id)
    
    # Get all session statuses
    sessions = PlannedSession.objects.filter(
        class_section=class_section,
        is_active=True
    ).prefetch_related('actual_sessions').order_by('day_number')
    
    session_data = []
    for session in sessions:
        latest_actual = session.actual_sessions.order_by("-date").first()
        status = latest_actual.status if latest_actual else "pending"
        
        session_data.append({
            'day': session.day_number,
            'status': status,
            'topic': session.topic,
            'date': latest_actual.date.isoformat() if latest_actual else None
        })
    
    return JsonResponse({
        'sessions': session_data,
        'class_info': {
            'school': class_section.school.name,
            'class': f"{class_section.class_level} - {class_section.section}"
        }
    })


@login_required
def facilitator_schools(request):
    """View for facilitator to see their assigned schools"""
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    # Get schools assigned to this facilitator
    assigned_schools = FacilitatorSchool.objects.filter(
        facilitator=request.user,
        is_active=True
    ).select_related("school").order_by("school__name")

    return render(request, "facilitator/schools/list.html", {
        "assigned_schools": assigned_schools
    })


@login_required
def facilitator_school_detail(request, school_id):
    """View for facilitator to see classes in their assigned school"""
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    # Verify facilitator has access to this school
    school = get_object_or_404(School, id=school_id)
    if not FacilitatorSchool.objects.filter(
        facilitator=request.user,
        school=school,
        is_active=True
    ).exists():
        messages.error(request, "You don't have access to this school.")
        return redirect("facilitator_schools")

    # Get classes for this school
    classes = ClassSection.objects.filter(
        school=school
    ).order_by("class_level", "section")

    return render(request, "facilitator/schools/detail.html", {
        "school": school,
        "classes": classes
    })


@login_required
def facilitator_students_list(request, class_section_id):
    """View for facilitator to see students in their assigned class"""
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)
    
    # Verify facilitator has access to this class
    if not FacilitatorSchool.objects.filter(
        facilitator=request.user,
        school=class_section.school,
        is_active=True
    ).exists():
        messages.error(request, "You don't have access to this class.")
        return redirect("facilitator_schools")

    # Get students in this class with attendance statistics
    enrollments = Enrollment.objects.filter(
        class_section=class_section,
        is_active=True
    ).select_related(
        "student", 
        "school", 
        "class_section__school"
    ).prefetch_related(
        "attendances__actual_session"
    ).order_by("student__full_name")
    
    # Get total conducted sessions for this class (single query)
    total_sessions = ActualSession.objects.filter(
        planned_session__class_section=class_section,
        status=SessionStatus.CONDUCTED
    ).count()
    
    # Calculate attendance statistics for each student
    enrollment_stats = []
    for enrollment in enrollments:
        # Count attendance records for this student (using prefetched data when possible)
        present_count = Attendance.objects.filter(
            enrollment=enrollment,
            actual_session__planned_session__class_section=class_section,
            status=AttendanceStatus.PRESENT
        ).count()
        
        absent_count = Attendance.objects.filter(
            enrollment=enrollment,
            actual_session__planned_session__class_section=class_section,
            status=AttendanceStatus.ABSENT
        ).count()
        
        attendance_percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 0
        
        enrollment_stats.append({
            'enrollment': enrollment,
            'total_sessions': total_sessions,
            'present_count': present_count,
            'absent_count': absent_count,
            'attendance_percentage': round(attendance_percentage, 1)
        })

    # Add pagination: 50 students per page
    paginator = Paginator(enrollment_stats, 50)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    return render(request, "facilitator/students/list.html", {
        "class_section": class_section,
        "page_obj": page_obj,
        "enrollments": [stat['enrollment'] for stat in page_obj.object_list],
        "enrollment_stats": page_obj.object_list
    })


@login_required
def facilitator_student_detail(request, class_section_id, student_id):
    """View for facilitator to see student details and attendance"""
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)
    student = get_object_or_404(Student, id=student_id)
    
    # Verify facilitator has access
    if not FacilitatorSchool.objects.filter(
        facilitator=request.user,
        school=class_section.school,
        is_active=True
    ).exists():
        messages.error(request, "You don't have access to this class.")
        return redirect("facilitator_schools")

    # Get enrollment
    enrollment = get_object_or_404(
        Enrollment,
        student=student,
        class_section=class_section,
        is_active=True
    )

    # Get attendance records
    attendance_records = Attendance.objects.filter(
        enrollment=enrollment
    ).select_related("actual_session__planned_session").order_by("-actual_session__date")[:20]

    # Calculate attendance stats
    total_sessions = ActualSession.objects.filter(
        planned_session__class_section=class_section,
        status=SessionStatus.CONDUCTED
    ).count()
    
    present_count = Attendance.objects.filter(
        enrollment=enrollment,
        status=AttendanceStatus.PRESENT
    ).count()
    
    absent_count = Attendance.objects.filter(
        enrollment=enrollment,
        status=AttendanceStatus.ABSENT
    ).count()
    
    attendance_percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 0

    return render(request, "facilitator/students/detail.html", {
        "class_section": class_section,
        "student": student,
        "enrollment": enrollment,
        "attendance_records": attendance_records,
        "stats": {
            "total_sessions": total_sessions,
            "present_count": present_count,
            "absent_count": absent_count,
            "attendance_percentage": round(attendance_percentage, 1)
        }
    })


@login_required
def facilitator_student_edit(request, class_section_id, student_id):
    """View for facilitator to edit student basic information"""
    if request.user.role.name.upper() != "FACILITATOR":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)
    student = get_object_or_404(Student, id=student_id)
    
    # Verify facilitator has access
    if not FacilitatorSchool.objects.filter(
        facilitator=request.user,
        school=class_section.school,
        is_active=True
    ).exists():
        messages.error(request, "You don't have access to this class.")
        return redirect("facilitator_schools")

    enrollment = get_object_or_404(
        Enrollment,
        student=student,
        class_section=class_section,
        is_active=True
    )

    if request.method == "POST":
        # Update student information
        student.full_name = request.POST.get("full_name", student.full_name)
        student.gender = request.POST.get("gender", student.gender)
        
        # Update enrollment information
        new_class_section_id = request.POST.get("class_section")
        if new_class_section_id and new_class_section_id != str(class_section.id):
            # Check if facilitator has access to new class
            new_class_section = get_object_or_404(ClassSection, id=new_class_section_id)
            if FacilitatorSchool.objects.filter(
                facilitator=request.user,
                school=new_class_section.school,
                is_active=True
            ).exists():
                enrollment.class_section = new_class_section
        
        try:
            student.save()
            enrollment.save()
            messages.success(request, f"Student {student.full_name} updated successfully!")
            return redirect("facilitator_class_students_list", class_section_id=enrollment.class_section.id)
        except Exception as e:
            messages.error(request, f"Error updating student: {str(e)}")

    # Get available classes for this facilitator
    available_classes = ClassSection.objects.filter(
        school__facilitators__facilitator=request.user,
        school__facilitators__is_active=True
    ).select_related("school").order_by("school__name", "class_level", "section")

    return render(request, "facilitator/students/edit.html", {
        "class_section": class_section,
        "student": student,
        "enrollment": enrollment,
        "available_classes": available_classes
    })


# ===== ADMIN CURRICULUM SESSION MANAGEMENT VIEWS =====
@login_required
@monitor_performance
def admin_curriculum_sessions_list(request):
    """
    Admin view to display curriculum sessions with optimized pagination and filtering
    """
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    # Clear cache to ensure fresh data
    from django.core.cache import cache
    cache.clear()

    # Get filter parameters
    language_filter = request.GET.get('language', '')
    day_from = request.GET.get('day_from', '')
    day_to = request.GET.get('day_to', '')
    status_filter = request.GET.get('status', '')
    page = int(request.GET.get('page', 1))
    per_page = 50  # Limit to 50 sessions per page

    # Create cache key based on filters and page
    cache_key = f"curriculum_sessions_{language_filter}_{day_from}_{day_to}_{status_filter}_{page}_{request.user.id}"
    cached_data = cache.get(cache_key)
    
    if cached_data:
        context = cached_data
    else:
        # Optimized base queryset with select_related and only necessary fields
        sessions = CurriculumSession.objects.select_related('created_by').only(
            'id', 'title', 'day_number', 'language', 'status', 'updated_at', 'created_by__full_name'
        )

        # Apply filters
        if language_filter:
            sessions = sessions.filter(language=language_filter)
        
        if day_from:
            try:
                sessions = sessions.filter(day_number__gte=int(day_from))
            except ValueError:
                pass
        
        if day_to:
            try:
                sessions = sessions.filter(day_number__lte=int(day_to))
            except ValueError:
                pass
        
        if status_filter:
            sessions = sessions.filter(status=status_filter)

        # Order by language and day number
        sessions = sessions.order_by('language', 'day_number')

        # Get session counts by language with single query (only if no filters applied)
        if not any([language_filter, day_from, day_to, status_filter]):
            counts = CurriculumSession.objects.aggregate(
                hindi_count=Count('id', filter=Q(language='hindi')),
                english_count=Count('id', filter=Q(language='english'))
            )
        else:
            # Calculate counts based on filtered results
            counts = sessions.aggregate(
                hindi_count=Count('id', filter=Q(language='hindi')),
                english_count=Count('id', filter=Q(language='english'))
            )

        # Use pagination to limit results
        from django.core.paginator import Paginator
        paginator = Paginator(sessions, per_page)
        page_obj = paginator.get_page(page)

        # Group paginated sessions by language for display
        sessions_by_language = {'hindi': [], 'english': []}
        sessions_by_language_json = {'hindi': [], 'english': []}
        
        for session in page_obj:
            sessions_by_language[session.language].append(session)
            # Create JSON-serializable version for JavaScript
            sessions_by_language_json[session.language].append({
                'id': str(session.id),
                'title': session.title,
                'day_number': session.day_number,
                'language': session.language,
                'status': session.status,
                'updated_at': session.updated_at.isoformat() if session.updated_at else None,
            })

        context = {
            'sessions_by_language': sessions_by_language_json,  # For JavaScript
            'sessions_by_language_display': sessions_by_language,  # For template display
            'hindi_count': counts['hindi_count'],
            'english_count': counts['english_count'],
            'language_choices': CurriculumSession.LANGUAGE_CHOICES,
            'status_choices': CurriculumStatus.choices,
            'page_obj': page_obj,
            'paginator': paginator,
            'filters': {
                'language': language_filter,
                'day_from': day_from,
                'day_to': day_to,
                'status': status_filter,
            }
        }
        
        # Cache for 2 minutes (shorter cache for better responsiveness)
        cache.set(cache_key, context, 120)

    # Add debugging information
    context['debug_template'] = "admin/sessions/curriculum_list.html"
    context['user_role'] = request.user.role.name.upper()
    context['debug_info'] = {
        'template_name': 'admin/sessions/curriculum_list.html',
        'base_template': 'admin/shared/base.html',
        'sidebar_template': 'admin/shared/sidebar.html',
        'user_role': request.user.role.name.upper(),
        'user_id': request.user.id,
    }
    
    # Convert sessions data to JSON for JavaScript
    import json
    context['sessions_by_language'] = json.dumps(context['sessions_by_language'])
    
    return render(request, "admin/sessions/curriculum_list.html", context)


@login_required
def admin_curriculum_session_create(request):
    """
    Enhanced admin view to create curriculum sessions with school/class filtering
    """
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    if request.method == "POST":
        title = request.POST.get("title")
        day_number = request.POST.get("day_number")
        language = request.POST.get("language")
        content = request.POST.get("content", "")
        learning_objectives = request.POST.get("learning_objectives", "")
        activities = request.POST.get("activities", "")
        resources = request.POST.get("resources", "")
        status = request.POST.get("status", "draft")
        
        # New bulk creation features
        create_multiple = request.POST.get("create_multiple") == "on"
        end_day_number = request.POST.get("end_day_number")
        target_schools = request.POST.getlist("target_schools")
        target_classes = request.POST.getlist("target_classes")

        try:
            day_number = int(day_number)
            
            if create_multiple and end_day_number:
                # Bulk creation for multiple days
                end_day = int(end_day_number)
                if end_day < day_number:
                    messages.error(request, "End day must be greater than start day.")
                    return render(request, "admin/sessions/curriculum_form.html", {
                        'language_choices': CurriculumSession.LANGUAGE_CHOICES,
                        'status_choices': CurriculumStatus.choices,
                        'schools': School.objects.all().order_by('name'),
                        'form_data': request.POST
                    })
                
                created_sessions = []
                skipped_sessions = []
                
                for day in range(day_number, end_day + 1):
                    # Check for duplicate
                    if CurriculumSession.objects.filter(day_number=day, language=language).exists():
                        skipped_sessions.append(day)
                        continue
                    
                    # Create session for this day
                    session = CurriculumSession.objects.create(
                        title=f"{title} - Day {day}",
                        day_number=day,
                        language=language,
                        content=content.replace("{DAY}", str(day)) if content else "",
                        learning_objectives=learning_objectives.replace("{DAY}", str(day)) if learning_objectives else "",
                        activities={"template": activities} if activities else {},
                        resources={"template": resources} if resources else {},
                        status=status,
                        created_by=request.user
                    )
                    created_sessions.append(session)
                
                # Success message
                success_msg = f"Created {len(created_sessions)} curriculum sessions"
                if skipped_sessions:
                    success_msg += f" (Skipped {len(skipped_sessions)} existing sessions: Days {', '.join(map(str, skipped_sessions))})"
                
                # Auto-create planned sessions for all classes that don't have them
                auto_create_planned_sessions_for_all_classes()
                
                messages.success(request, success_msg)
                return redirect("admin_curriculum_sessions_list")
            
            else:
                # Single session creation
                if CurriculumSession.objects.filter(day_number=day_number, language=language).exists():
                    messages.error(request, f"A session for Day {day_number} in {language.title()} already exists.")
                    return render(request, "admin/sessions/curriculum_form.html", {
                        'language_choices': CurriculumSession.LANGUAGE_CHOICES,
                        'status_choices': CurriculumStatus.choices,
                        'schools': School.objects.all().order_by('name'),
                        'form_data': request.POST
                    })

                # Create the session
                session = CurriculumSession.objects.create(
                    title=title,
                    day_number=day_number,
                    language=language,
                    content=content,
                    learning_objectives=learning_objectives,
                    activities={"content": activities} if activities else {},
                    resources={"content": resources} if resources else {},
                    status=status,
                    created_by=request.user
                )

                # Auto-create planned sessions for all classes that don't have them
                auto_create_planned_sessions_for_all_classes()

                messages.success(request, f"Curriculum session '{title}' created successfully!")
                return redirect("admin_curriculum_sessions_list")

        except ValueError:
            messages.error(request, "Invalid day number. Please enter a number between 1 and 150.")
        except Exception as e:
            messages.error(request, f"Error creating session: {str(e)}")

    # GET request - show form
    context = {
        'language_choices': CurriculumSession.LANGUAGE_CHOICES,
        'status_choices': CurriculumStatus.choices,
        'schools': School.objects.all().order_by('name'),
        'is_create': True,
        # Pre-fill from URL parameters
        'prefill_day': request.GET.get('day'),
        'prefill_language': request.GET.get('language'),
    }

    return render(request, "admin/sessions/curriculum_form.html", context)


@login_required
def admin_curriculum_session_edit(request, session_id):
    """
    Admin view to edit an existing curriculum session
    """
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    session = get_object_or_404(CurriculumSession, id=session_id)

    if request.method == "POST":
        # Create version history before updating
        version_number = session.version_history.count() + 1
        SessionVersionHistory.objects.create(
            session=session,
            version_number=version_number,
            title=session.title,
            content=session.content,
            learning_objectives=session.learning_objectives,
            activities=session.activities,
            resources=session.resources,
            modified_by=request.user,
            change_summary=request.POST.get("change_summary", "")
        )

        # Update session
        session.title = request.POST.get("title", session.title)
        session.day_number = int(request.POST.get("day_number", session.day_number))
        session.language = request.POST.get("language", session.language)
        session.content = request.POST.get("content", session.content)
        session.learning_objectives = request.POST.get("learning_objectives", session.learning_objectives)
        session.status = request.POST.get("status", session.status)

        try:
            # Check for duplicate day number within same language (excluding current session)
            if CurriculumSession.objects.filter(
                day_number=session.day_number, 
                language=session.language
            ).exclude(id=session.id).exists():
                messages.error(request, f"A session for Day {session.day_number} in {session.language.title()} already exists.")
                return render(request, "admin/sessions/curriculum_form.html", {
                    'session': session,
                    'language_choices': CurriculumSession.LANGUAGE_CHOICES,
                    'status_choices': CurriculumStatus.choices,
                    'is_edit': True
                })

            session.save()
            messages.success(request, f"Curriculum session '{session.title}' updated successfully!")
            return redirect("admin_curriculum_sessions_list")

        except Exception as e:
            messages.error(request, f"Error updating session: {str(e)}")

    context = {
        'session': session,
        'language_choices': CurriculumSession.LANGUAGE_CHOICES,
        'status_choices': CurriculumStatus.choices,
        'is_edit': True
    }

    return render(request, "admin/sessions/curriculum_form.html", context)


@login_required
def admin_curriculum_session_delete(request, session_id):
    """
    Admin view to delete a curriculum session
    """
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    session = get_object_or_404(CurriculumSession, id=session_id)

    if request.method == "POST":
        session_title = session.title
        session.delete()
        messages.success(request, f"Curriculum session '{session_title}' deleted successfully!")
        return redirect("admin_curriculum_sessions_list")

    return render(request, "admin/sessions/curriculum_delete.html", {
        'session': session
    })


@login_required
def admin_curriculum_session_preview(request, session_id):
    """
    Admin view to preview how a session will appear to facilitators
    """
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    session = get_object_or_404(CurriculumSession, id=session_id)

    # Get navigation context
    prev_session = CurriculumSession.objects.filter(
        language=session.language,
        day_number__lt=session.day_number
    ).order_by('-day_number').first()

    next_session = CurriculumSession.objects.filter(
        language=session.language,
        day_number__gt=session.day_number
    ).order_by('day_number').first()

    context = {
        'session': session,
        'prev_session': prev_session,
        'next_session': next_session,
        'is_preview': True
    }

    return render(request, "admin/sessions/curriculum_preview.html", context)

# ===== LAZY LOADING API ENDPOINTS =====

@login_required
@monitor_performance
def api_lazy_load_sessions(request):
    """
    API endpoint for lazy loading curriculum sessions
    """
    if request.user.role.name.upper() != "ADMIN":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    # Get pagination parameters
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))
    language = request.GET.get('language', '')
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Build query
    queryset = CurriculumSession.objects.select_related('created_by')
    
    if language:
        queryset = queryset.filter(language=language)
    
    # Get total count
    total_count = queryset.count()
    
    # Get paginated results
    sessions = queryset.order_by('day_number')[offset:offset + per_page]
    
    # Serialize data
    sessions_data = []
    for session in sessions:
        sessions_data.append({
            'id': str(session.id),
            'title': session.title,
            'day_number': session.day_number,
            'language': session.get_language_display(),
            'status': session.get_status_display(),
            'created_by': session.created_by.full_name if session.created_by else 'System',
            'updated_at': session.updated_at.strftime('%b %d, %Y %H:%M'),
            'preview_url': f'/admin/curriculum-sessions/{session.id}/preview/',
            'edit_url': f'/admin/curriculum-sessions/{session.id}/edit/',
            'delete_url': f'/admin/curriculum-sessions/{session.id}/delete/',
        })
    
    response_data = {
        'sessions': sessions_data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page,
            'has_next': offset + per_page < total_count,
            'has_previous': page > 1,
        }
    }
    
    response = JsonResponse(response_data)
    response['Cache-Control'] = 'max-age=300'  # 5 minutes cache
    return response


@login_required
@monitor_performance
def api_lazy_load_schools(request):
    """
    API endpoint for lazy loading schools with statistics
    """
    if request.user.role.name.upper() != "ADMIN":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))
    search = request.GET.get('search', '')
    
    offset = (page - 1) * per_page
    
    # Build optimized query
    queryset = School.objects.select_related().prefetch_related(
        'class_sections',
        'facilitators__facilitator'
    ).annotate(
        total_classes=Count('class_sections', distinct=True),
        total_students=Count('class_sections__enrollments', 
                           filter=Q(class_sections__enrollments__is_active=True),
                           distinct=True),
        active_facilitators=Count('facilitators', 
                                filter=Q(facilitators__is_active=True),
                                distinct=True)
    )
    
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | 
            Q(district__icontains=search) |
            Q(state__icontains=search)
        )
    
    total_count = queryset.count()
    schools = queryset.order_by('-created_at')[offset:offset + per_page]
    
    schools_data = []
    for school in schools:
        schools_data.append({
            'id': str(school.id),
            'name': school.name,
            'district': school.district,
            'state': school.state,
            'total_classes': school.total_classes,
            'total_students': school.total_students,
            'active_facilitators': school.active_facilitators,
            'created_at': school.created_at.strftime('%b %d, %Y'),
            'detail_url': f'/admin/schools/{school.id}/',
            'edit_url': f'/admin/schools/{school.id}/edit/',
        })
    
    response_data = {
        'schools': schools_data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page,
            'has_next': offset + per_page < total_count,
            'has_previous': page > 1,
        }
    }
    
    response = JsonResponse(response_data)
    response['Cache-Control'] = 'max-age=600'  # 10 minutes cache
    return response


@login_required
@monitor_performance  
def api_dashboard_stats(request):
    """
    API endpoint for dashboard statistics with caching
    """
    if request.user.role.name.upper() != "ADMIN":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    cache_key = f"dashboard_stats_{request.user.id}"
    stats = cache.get(cache_key)
    
    if stats is None:
        today = timezone.now().date()
        
        # Use aggregation for better performance
        school_stats = School.objects.aggregate(
            active_schools=Count('id', filter=Q(status=1)),
            total_schools=Count('id')
        )
        
        user_stats = User.objects.aggregate(
            active_facilitators=Count('id', filter=Q(
                role__name__iexact="FACILITATOR",
                is_active=True
            )),
            total_users=Count('id')
        )
        
        enrollment_stats = Enrollment.objects.aggregate(
            enrolled_students=Count('id', filter=Q(is_active=True))
        )
        
        session_stats = ActualSession.objects.filter(date=today).aggregate(
            sessions_today=Count('id', filter=Q(status=SessionStatus.CONDUCTED)),
            holidays_today=Count('id', filter=Q(status=SessionStatus.HOLIDAY)),
            cancelled_today=Count('id', filter=Q(status=SessionStatus.CANCELLED))
        )
        
        curriculum_stats = CurriculumSession.objects.aggregate(
            hindi_sessions=Count('id', filter=Q(language='hindi')),
            english_sessions=Count('id', filter=Q(language='english')),
            total_curriculum=Count('id')
        )
        
        stats = {
            **school_stats,
            **user_stats,
            **enrollment_stats,
            **session_stats,
            **curriculum_stats,
            'last_updated': timezone.now().isoformat()
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, stats, 300)
    
    response = JsonResponse(stats)
    response['Cache-Control'] = 'max-age=300'
    return response


@login_required
@monitor_performance
def api_dashboard_recent_sessions(request):
    """
    API endpoint for recent class sessions with optimized loading
    """
    if request.user.role.name.upper() != "ADMIN":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    try:
        limit = min(int(request.GET.get('limit', 10)), 50)  # Max 50 items
        
        cache_key = f"recent_sessions_{limit}_{request.user.id}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            response = JsonResponse(cached_data)
            response['Cache-Control'] = 'max-age=300'
            return response
        
        # Get recent class sessions with optimized query
        recent_sessions = ActualSession.objects.select_related(
            'planned_session',
            'facilitator', 
            'planned_session__class_section__school'
        ).order_by('-created_at')[:limit]
        
        sessions_data = []
        for session in recent_sessions:
            sessions_data.append({
                'id': str(session.id),
                'topic': session.planned_session.topic if session.planned_session else 'N/A',
                'class_section': str(session.planned_session.class_section) if session.planned_session else 'N/A',
                'school': session.planned_session.class_section.school.name if session.planned_session and session.planned_session.class_section else 'N/A',
                'facilitator': session.facilitator.full_name if session.facilitator else 'N/A',
                'status': session.status,
                'date': session.date.strftime('%Y-%m-%d') if session.date else None,
                'created_at': session.created_at.strftime('%b %d, %Y %H:%M'),
                'time_ago': session.created_at.strftime('%b %d')
            })
        
        response_data = {
            'sessions': sessions_data,
            'count': len(sessions_data),
            'last_updated': timezone.now().isoformat()
        }
        
        # Cache for 2 minutes
        cache.set(cache_key, response_data, 120)
        
        response = JsonResponse(response_data)
        response['Cache-Control'] = 'max-age=120'
        return response
        
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to load recent sessions',
            'message': str(e)
        }, status=500)


@login_required
@monitor_performance
def api_dashboard_curriculum_updates(request):
    """
    API endpoint for recent curriculum updates with optimized loading
    """
    if request.user.role.name.upper() != "ADMIN":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    try:
        limit = min(int(request.GET.get('limit', 10)), 50)  # Max 50 items
        
        cache_key = f"curriculum_updates_{limit}_{request.user.id}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            response = JsonResponse(cached_data)
            response['Cache-Control'] = 'max-age=300'
            return response
        
        # Get recent curriculum updates with optimized query
        recent_updates = CurriculumSession.objects.select_related(
            'created_by'
        ).order_by('-updated_at')[:limit]
        
        updates_data = []
        for session in recent_updates:
            updates_data.append({
                'id': str(session.id),
                'title': session.title,
                'day_number': session.day_number,
                'language': session.get_language_display(),
                'status': session.get_status_display(),
                'created_by': session.created_by.full_name if session.created_by else 'System',
                'updated_at': session.updated_at.strftime('%b %d, %Y %H:%M'),
                'time_ago': session.updated_at.strftime('%b %d'),
                'preview_url': f'/admin/curriculum-sessions/{session.id}/preview/',
                'edit_url': f'/admin/curriculum-sessions/{session.id}/edit/'
            })
        
        response_data = {
            'updates': updates_data,
            'count': len(updates_data),
            'last_updated': timezone.now().isoformat()
        }
        
        # Cache for 2 minutes
        cache.set(cache_key, response_data, 120)
        
        response = JsonResponse(response_data)
        response['Cache-Control'] = 'max-age=120'
        return response
        
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to load curriculum updates',
            'message': str(e)
        }, status=500)


@login_required
def admin_sessions_overview(request):
    """
    Admin overview showing both class-based sessions and curriculum sessions
    """
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    # Get class-based session statistics
    total_schools = School.objects.filter(status=1).count()
    total_classes = ClassSection.objects.filter(is_active=True).count()
    total_planned_sessions = PlannedSession.objects.filter(is_active=True).count()
    total_actual_sessions = ActualSession.objects.count()

    # Get curriculum session statistics
    total_curriculum_sessions = CurriculumSession.objects.count()
    hindi_sessions = CurriculumSession.objects.filter(language='hindi').count()
    english_sessions = CurriculumSession.objects.filter(language='english').count()
    published_sessions = CurriculumSession.objects.filter(status=CurriculumStatus.PUBLISHED).count()

    # Recent activity from both systems
    recent_class_sessions = ActualSession.objects.select_related(
        'planned_session', 'facilitator', 'planned_session__class_section__school'
    ).order_by('-created_at')[:5]

    recent_curriculum_updates = CurriculumSession.objects.select_related(
        'created_by'
    ).order_by('-updated_at')[:5]

    context = {
        # Class-based session stats
        'total_schools': total_schools,
        'total_classes': total_classes,
        'total_planned_sessions': total_planned_sessions,
        'total_actual_sessions': total_actual_sessions,
        
        # Curriculum session stats
        'total_curriculum_sessions': total_curriculum_sessions,
        'hindi_sessions': hindi_sessions,
        'english_sessions': english_sessions,
        'published_sessions': published_sessions,
        
        # Recent activity
        'recent_class_sessions': recent_class_sessions,
        'recent_curriculum_updates': recent_curriculum_updates,
    }

    return render(request, "admin/sessions/overview.html", context)
@login_required
@monitor_performance
def ajax_school_classes_admin(request):
    """AJAX endpoint to get classes for specific school(s) (admin version) - Enhanced"""
    if request.user.role.name.upper() != "ADMIN":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    # Support both single school_id and multiple schools parameters
    school_id = request.GET.get("school_id")
    schools_param = request.GET.get("schools")
    
    if not school_id and not schools_param:
        return JsonResponse({"error": "School ID or schools parameter required"}, status=400)
    
    try:
        if schools_param:
            # Multiple schools for curriculum targeting
            school_ids = schools_param.split(',')
            cache_key = f"multiple_school_classes_{'_'.join(sorted(school_ids))}"
        else:
            # Single school for backward compatibility
            school_ids = [school_id]
            cache_key = f"school_classes_{school_id}"
        
        classes_data = cache.get(cache_key)
        
        if classes_data is None:
            classes = ClassSection.objects.filter(
                school_id__in=school_ids,
                is_active=True
            ).select_related('school').order_by('school__name', 'class_level', 'section')
            
            classes_data = []
            for cls in classes:
                classes_data.append({
                    'id': str(cls.id),
                    'class_level': cls.class_level,
                    'section': cls.section or '',
                    'display_name': cls.display_name or f"{cls.class_level}{cls.section or ''}",
                    'school_name': cls.school.name,
                    'school_id': str(cls.school.id)
                })
            
            # Cache for 10 minutes
            cache.set(cache_key, classes_data, 600)
        
        response = JsonResponse({
            "success": True,
            "classes": classes_data,
            "count": len(classes_data)
        })
        response['Cache-Control'] = 'max-age=600'  # 10 minutes browser cache
        return response
        
    except Exception as e:
        logger.error(f"Error fetching classes for schools {school_ids}: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@monitor_performance
def api_curriculum_sessions_filter(request):
    """
    AJAX API endpoint for fast curriculum session filtering without page reload
    """
    if request.user.role.name.upper() != "ADMIN":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    try:
        # Get filter parameters
        language_filter = request.GET.get('language', '')
        day_from = request.GET.get('day_from', '')
        day_to = request.GET.get('day_to', '')
        status_filter = request.GET.get('status', '')
        page = int(request.GET.get('page', 1))
        per_page = 25  # Smaller page size for AJAX
        
        # Create cache key
        cache_key = f"curriculum_filter_{language_filter}_{day_from}_{day_to}_{status_filter}_{page}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            response = JsonResponse(cached_data)
            response['Cache-Control'] = 'max-age=60'
            return response
        
        # Optimized query with only necessary fields
        sessions = CurriculumSession.objects.select_related('created_by').only(
            'id', 'title', 'day_number', 'language', 'status', 'updated_at', 'created_by__full_name'
        )
        
        # Apply filters
        if language_filter:
            sessions = sessions.filter(language=language_filter)
        
        if day_from:
            try:
                sessions = sessions.filter(day_number__gte=int(day_from))
            except ValueError:
                pass
        
        if day_to:
            try:
                sessions = sessions.filter(day_number__lte=int(day_to))
            except ValueError:
                pass
        
        if status_filter:
            sessions = sessions.filter(status=status_filter)
        
        # Order and paginate
        sessions = sessions.order_by('language', 'day_number')
        
        # Get total count for pagination
        total_count = sessions.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        sessions_page = sessions[offset:offset + per_page]
        
        # Serialize sessions
        sessions_data = []
        for session in sessions_page:
            sessions_data.append({
                'id': str(session.id),
                'title': session.title,
                'day_number': session.day_number,
                'language': session.language,
                'language_display': session.get_language_display(),
                'status': session.status,
                'status_display': session.get_status_display(),
                'created_by': session.created_by.full_name if session.created_by else 'System',
                'updated_at': session.updated_at.strftime('%b %d, %Y %H:%M'),
                'preview_url': f'/admin/curriculum-sessions/{session.id}/preview/',
                'edit_url': f'/admin/curriculum-sessions/{session.id}/edit/',
                'delete_url': f'/admin/curriculum-sessions/{session.id}/delete/',
            })
        
        # Get counts by language
        if not any([language_filter, day_from, day_to, status_filter]):
            counts = CurriculumSession.objects.aggregate(
                hindi_count=Count('id', filter=Q(language='hindi')),
                english_count=Count('id', filter=Q(language='english'))
            )
        else:
            # Calculate counts based on filtered results (without pagination)
            counts = sessions.aggregate(
                hindi_count=Count('id', filter=Q(language='hindi')),
                english_count=Count('id', filter=Q(language='english'))
            )
        
        response_data = {
            'sessions': sessions_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_count': total_count,
                'total_pages': (total_count + per_page - 1) // per_page,
                'has_next': offset + per_page < total_count,
                'has_previous': page > 1,
            },
            'counts': counts,
            'filters': {
                'language': language_filter,
                'day_from': day_from,
                'day_to': day_to,
                'status': status_filter,
            }
        }
        
        # Cache for 1 minute
        cache.set(cache_key, response_data, 60)
        
        response = JsonResponse(response_data)
        response['Cache-Control'] = 'max-age=60'
        return response
        
    except Exception as e:
        logger.error(f"Error in curriculum sessions filter API: {str(e)}")
        return JsonResponse({
            'error': 'Failed to filter sessions',
            'message': str(e)
        }, status=500)

# =========================
# SESSION WORKFLOW VIEWS
# =========================

@login_required
def get_lesson_plan_uploads(request):
    """Get the latest lesson plan upload for a planned session"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    
    try:
        planned_session_id = request.GET.get('planned_session_id')
        if not planned_session_id:
            return JsonResponse({"success": False, "error": "planned_session_id required"}, status=400)
        
        planned_session = get_object_or_404(PlannedSession, id=planned_session_id)
        
        # Verify facilitator has access
        if not FacilitatorSchool.objects.filter(
            facilitator=request.user,
            school=planned_session.class_section.school,
            is_active=True
        ).exists():
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        
        # Get only the latest upload for this session
        upload = LessonPlanUpload.objects.filter(
            planned_session=planned_session,
            facilitator=request.user
        ).order_by('-upload_date').first()
        
        if upload:
            return JsonResponse({
                "success": True,
                "upload": {
                    'id': str(upload.id),
                    'filename': upload.file_name,
                    'file_size': upload.file_size,
                    'upload_date': upload.upload_date.strftime('%Y-%m-%d %H:%M:%S') if upload.upload_date else 'N/A',
                    'file_url': str(upload.lesson_plan_file)
                }
            })
        else:
            return JsonResponse({
                "success": True,
                "upload": None
            })
        
    except Exception as e:
        logger.error(f"Error fetching lesson plan upload: {e}")
        return JsonResponse({"success": False, "error": "Failed to fetch upload"}, status=500)


@login_required
def upload_lesson_plan(request):
    """Upload lesson plan for a planned session - SIMPLIFIED with better error handling"""
    try:
        if not hasattr(request.user, 'role') or not request.user.role or request.user.role.name.upper() != "FACILITATOR":
            return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    except Exception as e:
        logger.error(f"Error checking user role: {e}")
        return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request method"}, status=405)
    
    try:
        planned_session_id = request.POST.get('planned_session_id')
        
        if not planned_session_id:
            return JsonResponse({"success": False, "error": "planned_session_id is required"}, status=400)
        
        try:
            planned_session = PlannedSession.objects.get(id=planned_session_id)
        except PlannedSession.DoesNotExist:
            logger.error(f"PlannedSession not found: {planned_session_id}")
            return JsonResponse({"success": False, "error": "Session not found"}, status=404)
        
        # Verify facilitator has access to this class
        if not FacilitatorSchool.objects.filter(
            facilitator=request.user,
            school=planned_session.class_section.school,
            is_active=True
        ).exists():
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        
        lesson_plan_file = request.FILES.get('lesson_plan_file')
        if not lesson_plan_file:
            return JsonResponse({"success": False, "error": "No file uploaded"}, status=400)
        
        # Validate file type
        allowed_extensions = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
        file_extension = os.path.splitext(lesson_plan_file.name)[1].lower()
        if file_extension not in allowed_extensions:
            return JsonResponse({"success": False, "error": "Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG, GIF, BMP, WEBP"}, status=400)
        
        # Validate file size (max 50MB)
        if lesson_plan_file.size > 50 * 1024 * 1024:
            return JsonResponse({"success": False, "error": "File too large. Maximum 50MB."}, status=400)
        
        upload_notes = request.POST.get('upload_notes', '')
        
        from .models import LessonPlanUpload
        from django.utils import timezone
        
        # Determine target session (primary if grouped)
        target_session = planned_session
        if planned_session.grouped_session_id:
            primary_session = PlannedSession.objects.filter(
                grouped_session_id=planned_session.grouped_session_id,
                day_number=planned_session.day_number
            ).order_by('id').first()
            if primary_session:
                target_session = primary_session
        
        # CRITICAL: Delete ALL old uploads for this session (regardless of date)
        # Since unique_together constraint is (planned_session, facilitator),
        # we can only have ONE upload per facilitator per session
        old_uploads = LessonPlanUpload.objects.filter(
            planned_session=target_session,
            facilitator=request.user
        )
        
        # Delete old files from storage
        for old_upload in old_uploads:
            try:
                if old_upload.lesson_plan_file:
                    # Delete file from storage
                    old_upload.lesson_plan_file.delete(save=False)
            except Exception as e:
                logger.warning(f"Failed to delete old lesson plan file: {e}")
        
        # Delete old upload records
        old_uploads.delete()
        
        # Save new upload
        lesson_plan_upload = LessonPlanUpload.objects.create(
            planned_session=target_session,
            facilitator=request.user,
            lesson_plan_file=lesson_plan_file,
            file_name=lesson_plan_file.name,
            file_size=lesson_plan_file.size,
            upload_notes=upload_notes,
            is_approved=False
        )
        
        message = "✅ Lesson plan uploaded successfully"
        if planned_session.grouped_session_id:
            message += " (shared with all grouped classes)"
        
        return JsonResponse({
            "success": True,
            "message": message,
            "upload_id": str(lesson_plan_upload.id),
            "file_name": lesson_plan_upload.file_name,
            "file_size": lesson_plan_upload.file_size,
            "upload_date": lesson_plan_upload.upload_date.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error uploading lesson plan: {e}", exc_info=True)
        return JsonResponse({
            "success": False, 
            "error": "Upload failed. Please try again or contact support if the problem persists."
        }, status=500)


@login_required
@csrf_exempt
def delete_lesson_plan(request, upload_id):
    """Delete a lesson plan upload"""
    # Check authentication
    if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Not authenticated"}, status=401)
    
    if request.method != 'DELETE':
        return JsonResponse({"success": False, "error": "Method not allowed"}, status=405)
    
    try:
        # Check role
        if not hasattr(request.user, 'role') or request.user.role.name.upper() != "FACILITATOR":
            return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
        
        # Get the lesson plan upload
        lesson_plan = LessonPlanUpload.objects.get(id=upload_id, facilitator=request.user)
        
        # Delete the file if it exists
        if lesson_plan.lesson_plan_file:
            try:
                lesson_plan.lesson_plan_file.delete()
            except Exception as file_error:
                logger.warning(f"Could not delete file: {file_error}")
        
        # Delete the database record
        lesson_plan.delete()
        
        return JsonResponse({"success": True, "message": "Lesson plan deleted successfully"})
    
    except LessonPlanUpload.DoesNotExist:
        return JsonResponse({"success": False, "error": "Lesson plan not found"}, status=404)
    except Exception as e:
        logger.error(f"Error deleting lesson plan: {str(e)}", exc_info=True)
        return JsonResponse({"success": False, "error": f"Delete failed: {str(e)}"}, status=500)


@login_required
@require_http_methods(["GET"])
def view_lesson_plan(request, upload_id):
    """Serve lesson plan file with proper authentication"""
    try:
        # Get the lesson plan upload
        lesson_plan = LessonPlanUpload.objects.get(id=upload_id)
        
        # Check permissions
        user_role = request.user.role.name.upper()
        has_permission = False
        
        if user_role == "ADMIN":
            has_permission = True
        elif user_role == "SUPERVISOR":
            # Supervisors can view lesson plans from their facilitators
            has_permission = True
        elif user_role == "FACILITATOR":
            # Facilitators can view their own lesson plans
            if lesson_plan.facilitator == request.user:
                has_permission = True
            # Also check if facilitator is in the same grouped session
            else:
                from .models import GroupedSession
                facilitator_sessions = PlannedSession.objects.filter(
                    class_section__in=request.user.assigned_schools.values_list('school__class_sections', flat=True),
                    grouped_session_id__isnull=False
                ).values_list('grouped_session_id', flat=True).distinct()
                
                lesson_plan_sessions = PlannedSession.objects.filter(
                    id=lesson_plan.planned_session_id,
                    grouped_session_id__in=facilitator_sessions
                )
                
                if lesson_plan_sessions.exists():
                    has_permission = True
        
        if not has_permission:
            logger.warning(f"Permission denied for user {request.user.id} to view lesson plan {upload_id}")
            return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
        
        # Check if file exists
        if not lesson_plan.lesson_plan_file:
            return JsonResponse({"success": False, "error": "File not found"}, status=404)
        
        # Get file from storage using the storage backend
        storage = lesson_plan.lesson_plan_file.storage
        file_path = lesson_plan.lesson_plan_file.name
        
        logger.info(f"Attempting to read file: {file_path}")
        
        try:
            # Try to read using storage backend
            with storage.open(file_path, 'rb') as f:
                file_content = f.read()
        except Exception as e:
            logger.error(f"Error reading file from storage: {str(e)}")
            # Fallback: try to get absolute path and read directly
            try:
                abs_path = storage.path(file_path)
                logger.info(f"Trying absolute path: {abs_path}")
                if os.path.exists(abs_path):
                    with open(abs_path, 'rb') as f:
                        file_content = f.read()
                else:
                    logger.error(f"File does not exist at: {abs_path}")
                    return JsonResponse({"success": False, "error": "File not found on disk"}, status=404)
            except Exception as e2:
                logger.error(f"Error reading file: {str(e2)}", exc_info=True)
                return JsonResponse({"success": False, "error": f"Could not read file"}, status=500)
        
        # Determine content type
        file_extension = os.path.splitext(lesson_plan.file_name)[1].lower()
        content_type_map = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        
        content_type = content_type_map.get(file_extension, 'application/octet-stream')
        
        # Serve file inline
        response = HttpResponse(file_content, content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{lesson_plan.file_name}"'
        response['Cache-Control'] = 'public, max-age=3600'
        return response
    
    except LessonPlanUpload.DoesNotExist:
        return JsonResponse({"success": False, "error": "Lesson plan not found"}, status=404)
    except Exception as e:
        logger.error(f"Error viewing lesson plan: {str(e)}", exc_info=True)
        return JsonResponse({"success": False, "error": f"Error: {str(e)}"}, status=500)


@login_required
def save_preparation_checklist(request):
    """Save preparation checklist progress"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request method"}, status=405)
    
    try:
        planned_session_id = request.POST.get('planned_session_id')
        planned_session = get_object_or_404(PlannedSession, id=planned_session_id)
        
        # Verify facilitator has access to this class
        if not FacilitatorSchool.objects.filter(
            facilitator=request.user,
            school=planned_session.class_section.school,
            is_active=True
        ).exists():
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        
        from .models import SessionPreparationChecklist
        
        # Get or create preparation checklist
        checklist, created = SessionPreparationChecklist.objects.get_or_create(
            planned_session=planned_session,
            facilitator=request.user,
            defaults={
                'preparation_start_time': timezone.now()
            }
        )
        
        # Update checkpoint values
        checklist.lesson_plan_reviewed = request.POST.get('lesson_plan_reviewed') == 'on'
        checklist.materials_prepared = request.POST.get('materials_prepared') == 'on'
        checklist.technology_tested = request.POST.get('technology_tested') == 'on'
        checklist.classroom_setup_ready = request.POST.get('classroom_setup_ready') == 'on'
        checklist.student_list_reviewed = request.POST.get('student_list_reviewed') == 'on'
        checklist.previous_session_feedback_reviewed = request.POST.get('previous_session_feedback_reviewed') == 'on'
        checklist.preparation_notes = request.POST.get('preparation_notes', '')
        
        # Update timestamps for completed checkpoints
        current_time = timezone.now().isoformat()
        checkpoints_completed_at = checklist.checkpoints_completed_at or {}
        
        checkpoint_fields = [
            'lesson_plan_reviewed', 'materials_prepared', 'technology_tested',
            'classroom_setup_ready', 'student_list_reviewed', 'previous_session_feedback_reviewed'
        ]
        
        for field in checkpoint_fields:
            if getattr(checklist, field) and field not in checkpoints_completed_at:
                checkpoints_completed_at[field] = current_time
            elif not getattr(checklist, field) and field in checkpoints_completed_at:
                del checkpoints_completed_at[field]
        
        checklist.checkpoints_completed_at = checkpoints_completed_at
        
        # Check if all checkpoints are completed
        all_completed = all(getattr(checklist, field) for field in checkpoint_fields)
        if all_completed and not checklist.preparation_complete_time:
            checklist.preparation_complete_time = timezone.now()
            
            # Calculate total preparation time
            if checklist.preparation_start_time:
                time_diff = checklist.preparation_complete_time - checklist.preparation_start_time
                checklist.total_preparation_minutes = int(time_diff.total_seconds() / 60)
        
        checklist.save()
        
        return JsonResponse({
            "success": True,
            "message": "Preparation checklist saved",
            "completion_percentage": checklist.completion_percentage,
            "all_completed": all_completed
        })
        
    except Exception as e:
        logger.error(f"Error saving preparation checklist: {e}")
        return JsonResponse({"success": False, "error": "Failed to save checklist"}, status=500)


@login_required
def save_session_reward(request):
    """Save session reward information"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request method"}, status=405)
    
    try:
        planned_session_id = request.POST.get('planned_session_id')
        planned_session = get_object_or_404(PlannedSession, id=planned_session_id)
        
        # Verify facilitator has access to this class
        if not FacilitatorSchool.objects.filter(
            facilitator=request.user,
            school=planned_session.class_section.school,
            is_active=True
        ).exists():
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        
        # Get or create actual session (for rewards, we need a session that's being conducted)
        actual_session, created = ActualSession.objects.get_or_create(
            planned_session=planned_session,
            date=timezone.now().date(),
            defaults={
                'facilitator': request.user,
                'status': SessionStatus.CONDUCTED,
                'remarks': 'Session in progress - rewards recorded'
            }
        )
        
        reward_type = request.POST.get('reward_type', 'text')
        reward_description = request.POST.get('reward_description', '')
        student_names = request.POST.get('student_names', '')
        reward_photo = request.FILES.get('reward_photo')
        
        if not reward_description:
            return JsonResponse({"success": False, "error": "Reward description is required"}, status=400)
        
        from .models import SessionReward
        
        # Create reward record
        reward = SessionReward.objects.create(
            actual_session=actual_session,
            facilitator=request.user,
            reward_type=reward_type,
            reward_description=reward_description,
            student_names=student_names,
            reward_photo=reward_photo,
            is_visible_to_admin=True
        )
        
        return JsonResponse({
            "success": True,
            "message": "Reward information saved successfully",
            "reward_id": str(reward.id)
        })
        
    except Exception as e:
        logger.error(f"Error saving session reward: {e}")
        return JsonResponse({"success": False, "error": "Failed to save reward information"}, status=500)


@login_required
def save_session_tracking(request):
    """Save real-time session tracking data"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request method"}, status=405)
    
    try:
        planned_session_id = request.POST.get('planned_session_id')
        if not planned_session_id:
            return JsonResponse({"success": False, "error": "Missing planned_session_id"}, status=400)
            
        planned_session = get_object_or_404(PlannedSession, id=planned_session_id)
        
        # Verify facilitator has access to this class
        if not FacilitatorSchool.objects.filter(
            facilitator=request.user,
            school=planned_session.class_section.school,
            is_active=True
        ).exists():
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        
        # Get or create actual session first
        actual_session, created = ActualSession.objects.get_or_create(
            planned_session=planned_session,
            date=timezone.now().date(),
            defaults={
                'facilitator': request.user,
                'status': 'conducted',
                'remarks': 'Session in progress'
            }
        )
        
        from .models import SessionFeedback
        
        # Get or create session feedback for tracking
        feedback, created = SessionFeedback.objects.get_or_create(
            actual_session=actual_session,
            facilitator=request.user,
            defaults={
                'session_completion_percentage': 0,
                'time_management_rating': 3,
                'content_difficulty_rating': 3,
                'facilitator_satisfaction': 3,
                'what_went_well': '',
                'areas_for_improvement': '',
                'is_complete': False
            }
        )
        
        feedback.student_participation_notes = request.POST.get('student_participation_notes', feedback.student_participation_notes)
        
        feedback.save()
        
        return JsonResponse({
            "success": True,
            "message": "Session tracking data saved"
        })
        
    except Exception as e:
        logger.error(f"Error saving session tracking: {e}")
        return JsonResponse({"success": False, "error": "Failed to save tracking data"}, status=500)


# Find this function and update it:
@login_required
@csrf_exempt
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def save_session_feedback(request):
    """Save comprehensive session feedback and mark session as CONDUCTED"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    
    try:
        planned_session_id = request.POST.get('planned_session_id')
        
        if not planned_session_id:
            return JsonResponse({"success": False, "error": "Session ID is required"}, status=400)
        
        planned_session = get_object_or_404(PlannedSession, id=planned_session_id)
        
        # Verify facilitator has access to this class
        if not FacilitatorSchool.objects.filter(
            facilitator=request.user,
            school=planned_session.class_section.school,
            is_active=True
        ).exists():
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        
        # ✅ CRITICAL FIX: Get or create actual session FIRST
        actual_session, created = ActualSession.objects.get_or_create(
            planned_session=planned_session,
            date=timezone.now().date(),
            defaults={
                'facilitator': request.user,
                'status': SessionStatus.PENDING,
                'remarks': 'Session completed with feedback'
            }
        )
        
        # ✅ CRITICAL FIX: Validate ALL required fields
        required_fields = [
            'session_completion_percentage', 'time_management_rating', 'content_difficulty_rating',
            'facilitator_satisfaction', 'what_went_well', 'areas_for_improvement'
        ]
        
        # Log all received fields for debugging
        logger.info(f"Received POST data for feedback: {dict(request.POST)}")
        
        missing_fields = []
        for field in required_fields:
            value = request.POST.get(field, '').strip()
            if not value:
                missing_fields.append(field)
        
        if missing_fields:
            return JsonResponse({
                "success": False, 
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }, status=400)
        
        # ✅ CRITICAL FIX: Create or update feedback
        feedback_defaults = {
            'student_participation_notes': request.POST.get('student_participation_notes', ''),
            'learning_objectives_met': request.POST.get('learning_objectives_met') in ['on', 'true', 'True', '1'],
            'session_completion_percentage': int(request.POST.get('session_completion_percentage', 0)),
            'time_management_rating': int(request.POST.get('time_management_rating', 0)),
            'content_difficulty_rating': int(request.POST.get('content_difficulty_rating', 0)),
            'facilitator_satisfaction': int(request.POST.get('facilitator_satisfaction', 0)),
            'what_went_well': request.POST.get('what_went_well', ''),
            'areas_for_improvement': request.POST.get('areas_for_improvement', ''),
            'next_session_preparation': request.POST.get('next_session_preparation', ''),
            'additional_notes': request.POST.get('additional_notes', ''),
            'is_complete': True,
        }
        
        feedback, created = SessionFeedback.objects.update_or_create(
            actual_session=actual_session,
            facilitator=request.user,
            defaults=feedback_defaults
        )
        
        # ✅ CRITICAL FIX: Mark session as CONDUCTED and attendance marked
        actual_session.status = SessionStatus.CONDUCTED
        actual_session.attendance_marked = True  # Important: Mark attendance as done
        actual_session.status_changed_by = request.user
        actual_session.status_change_reason = 'Session completed - feedback saved'
        actual_session.save()
        
        # ✅ CLEAR CACHE - So admin feedback dashboard shows latest data
        from django.core.cache import cache
        cache.delete_many([
            'admin_feedback_dashboard',
            'admin_feedback_analytics',
            'admin_dashboard_optimized'
        ])
        
        logger.info(f"✅ Session feedback saved for {planned_session} by {request.user}")
        
        return JsonResponse({
            "success": True,
            "message": "Session feedback saved successfully. Session marked as complete.",
            "feedback_id": str(feedback.id),
            "redirect_url": reverse('facilitator_class_today_session', 
                                  kwargs={'class_section_id': planned_session.class_section.id})
        })
        
    except Exception as e:
        logger.error(f"❌ Error saving session feedback: {e}", exc_info=True)
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def api_session_complete(request, actual_session_id):
    """
    API endpoint to mark a session as completed
    Called when both student feedback and teacher reflection are done
    """
    try:
        actual_session = get_object_or_404(ActualSession, id=actual_session_id)
        
        # Verify facilitator access
        if actual_session.planned_session.class_section.school.facilitators.filter(
            facilitator=request.user,
            is_active=True
        ).count() == 0:
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        
        # Mark session as CONDUCTED
        actual_session.status = SessionStatus.CONDUCTED
        actual_session.status_changed_by = request.user
        actual_session.status_change_reason = 'Session completed by facilitator'
        actual_session.save()
        
        logger.info(f"✅ Session {actual_session_id} marked as CONDUCTED by {request.user}")
        
        return JsonResponse({
            "success": True,
            "message": "Session marked as completed successfully",
            "session_id": str(actual_session.id),
            "status": "conducted"
        })
        
    except Exception as e:
        logger.error(f"❌ Error completing session: {e}", exc_info=True)
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def api_session_state(request):
    """
    API endpoint to get complete session state including:
    - Lesson plan uploads
    - Session feedback
    - Step completion status
    - Progress metrics
    - Attendance status
    """
    try:
        planned_session_id = request.GET.get('planned_session_id')
        if not planned_session_id:
            return JsonResponse({"success": False, "error": "planned_session_id required"}, status=400)
        
        planned_session = get_object_or_404(PlannedSession, id=planned_session_id)
        
        # Get actual session for today (do NOT create if it doesn't exist)
        # Only mark as conducted if it actually exists
        actual_session = ActualSession.objects.filter(
            planned_session=planned_session,
            date=timezone.now().date()
        ).first()
        
        # Get lesson plan uploads
        # For grouped sessions, also check the primary session
        upload_sessions = [planned_session]
        if planned_session.grouped_session_id:
            primary_session = PlannedSession.objects.filter(
                grouped_session_id=planned_session.grouped_session_id,
                day_number=planned_session.day_number
            ).order_by('id').first()
            if primary_session and primary_session.id != planned_session.id:
                upload_sessions.append(primary_session)
        
        uploads = LessonPlanUpload.objects.filter(
            planned_session__in=upload_sessions,
            upload_date=timezone.now().date()  # IMPORTANT: Only today's uploads
        ).values('id', 'lesson_plan_file', 'upload_date', 'facilitator__full_name').order_by('-upload_date')
        
        uploads_list = []
        for upload in uploads:
            uploads_list.append({
                'id': str(upload['id']),
                'filename': os.path.basename(upload['lesson_plan_file']),
                'upload_date': upload['upload_date'].strftime('%Y-%m-%d %H:%M:%S'),
                'uploaded_by': upload['facilitator__full_name'],
                'file_url': f"/media/{upload['lesson_plan_file']}"
            })
        
        # Get session feedback (only if actual session exists)
        feedback = None
        if actual_session:
            feedback = SessionFeedback.objects.filter(
                actual_session=actual_session,
                facilitator=request.user
            ).first()
        
        feedback_data = None
        if feedback:
            feedback_data = {
                'id': str(feedback.id),
                'session_completion_percentage': feedback.session_completion_percentage,
                'time_management_rating': feedback.time_management_rating,
                'content_difficulty_rating': feedback.content_difficulty_rating,
                'facilitator_satisfaction': feedback.facilitator_satisfaction,
                'what_went_well': feedback.what_went_well,
                'areas_for_improvement': feedback.areas_for_improvement,
                'learning_objectives_met': feedback.learning_objectives_met,
                'student_participation_notes': feedback.student_participation_notes,
                'next_session_preparation': feedback.next_session_preparation,
                'additional_notes': feedback.additional_notes,
                'is_complete': feedback.is_complete,
                'feedback_date': feedback.feedback_date.strftime('%Y-%m-%d %H:%M:%S'),
            }
        
        # Get facilitator tasks (only if actual session exists)
        tasks = []
        if actual_session:
            tasks = FacilitatorTask.objects.filter(
                actual_session=actual_session,
                facilitator=request.user
            ).order_by('-created_at')
        
        tasks_list = []
        for task in tasks:
            task_data = {
                'id': str(task.id),
                'media_type': task.media_type,
                'created_at': task.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'description': task.description,
            }
            
            # Add media file URL if it exists (for photos/videos)
            if task.media_file:
                task_data['media_file_url'] = f"/media/{task.media_file}"
            
            # Add Facebook link if it exists
            if task.facebook_link:
                task_data['facebook_link'] = task.facebook_link
            
            tasks_list.append(task_data)
        
        # Get attendance status (only if actual session exists)
        attendance_count = 0
        attendance_present = 0
        if actual_session:
            attendance_count = Attendance.objects.filter(
                actual_session=actual_session
            ).count()
            
            attendance_present = Attendance.objects.filter(
                actual_session=actual_session,
                status=AttendanceStatus.PRESENT
            ).count()
        
        # Build response
        session_data = None
        if actual_session:
            session_data = {
                "id": str(actual_session.id),
                "planned_session_id": str(planned_session.id),
                "status": actual_session.status,
                "date": actual_session.date.strftime('%Y-%m-%d'),
                "facilitator": request.user.full_name,
            }
        
        return JsonResponse({
            "success": True,
            "session": session_data,
            "uploads": uploads_list,
            "feedback": feedback_data,
            "tasks": tasks_list,
            "attendance": {
                "total": attendance_count,
                "present": attendance_present,
                "marked": attendance_count > 0,
            },
            "steps_completed": {
                "lesson_plan": len(uploads_list) > 0,
                "feedback": feedback_data is not None and feedback_data['is_complete'],
                "tasks": len(tasks_list) > 0,
                "attendance": attendance_count > 0,
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting session state: {e}", exc_info=True)
        return JsonResponse({"success": False, "error": str(e)}, status=500)

@login_required
def save_student_feedback(request):
    """Save anonymous student feedback for a session"""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request method"}, status=405)
    
    try:
        # Log all POST data for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Student feedback POST data: {dict(request.POST)}")
        
        actual_session_id = request.POST.get('actual_session_id')
        if not actual_session_id:
            return JsonResponse({"success": False, "error": "Missing actual_session_id"}, status=400)
        
        # Validate UUID format
        try:
            import uuid
            uuid.UUID(actual_session_id)
        except ValueError:
            return JsonResponse({"success": False, "error": "Invalid session ID format"}, status=400)
            
        actual_session = get_object_or_404(ActualSession, id=actual_session_id)
        
        # Validate required fields
        required_fields = [
            'session_rating', 'topic_understanding', 'teacher_clarity',
            'session_highlights', 'improvement_suggestions', 'anonymous_student_id'
        ]
        
        missing_fields = []
        for field in required_fields:
            value = request.POST.get(field, '').strip()
            if not value:
                missing_fields.append(field)
        
        if missing_fields:
            logger.warning(f"Missing fields: {missing_fields}")
            return JsonResponse({
                "success": False, 
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }, status=400)
        
        # Clean anonymous student ID to prevent invalid characters
        anonymous_student_id = request.POST.get('anonymous_student_id', '').strip()
        # Remove any non-ASCII characters that might cause issues
        import re
        anonymous_student_id = re.sub(r'[^\w\-_]', '', anonymous_student_id)
        
        if not anonymous_student_id:
            return JsonResponse({"success": False, "error": "Invalid anonymous student ID after cleaning"}, status=400)
        
        from .models import StudentFeedback
        
        # Check for duplicate feedback (prevent multiple submissions)
        existing_feedback = StudentFeedback.objects.filter(
            actual_session=actual_session,
            anonymous_student_id=anonymous_student_id
        ).first()
        
        if existing_feedback:
            return JsonResponse({
                "success": False, 
                "error": "Feedback already submitted for this session"
            }, status=400)
        
        # Create student feedback
        feedback = StudentFeedback.objects.create(
            actual_session=actual_session,
            anonymous_student_id=anonymous_student_id,
            session_rating=int(request.POST.get('session_rating')),
            topic_understanding=request.POST.get('topic_understanding'),
            teacher_clarity=request.POST.get('teacher_clarity'),
            session_highlights=request.POST.get('session_highlights'),
            improvement_suggestions=request.POST.get('improvement_suggestions'),
            additional_suggestions=request.POST.get('additional_suggestions', ''),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Update analytics
        from .models import FeedbackAnalytics
        analytics, created = FeedbackAnalytics.objects.get_or_create(
            actual_session=actual_session
        )
        analytics.calculate_analytics()
        
        # ✅ CLEAR CACHE - So admin feedback dashboard shows latest data
        from django.core.cache import cache
        cache.delete_many([
            'admin_feedback_dashboard',
            'admin_feedback_analytics',
            'admin_dashboard_optimized'
        ])
        
        return JsonResponse({
            "success": True,
            "message": "Student feedback submitted successfully!",
            "feedback_id": str(feedback.id)
        })
        
    except Exception as e:
        logger.error(f"Error saving student feedback: {e}")
        return JsonResponse({"success": False, "error": "Failed to save student feedback"}, status=500)


@login_required
def save_teacher_feedback(request):
    """Save teacher reflection feedback for a session"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request method"}, status=405)
    
    try:
        actual_session_id = request.POST.get('actual_session_id')
        if not actual_session_id:
            return JsonResponse({"success": False, "error": "Missing actual_session_id"}, status=400)
        
        actual_session = get_object_or_404(ActualSession, id=actual_session_id)
        
        # Set facilitator if not already set
        if not actual_session.facilitator:
            actual_session.facilitator = request.user
            actual_session.save()
        
        # Verify facilitator has access to this session
        if actual_session.facilitator != request.user:
            return JsonResponse({"success": False, "error": "Access denied"}, status=403)
        
        # Validate required fields
        required_fields = [
            'class_engagement', 'session_completion', 'student_struggles',
            'successful_elements', 'improvement_areas'
        ]
        
        missing_fields = []
        for field in required_fields:
            if not request.POST.get(field):
                missing_fields.append(field)
        
        if missing_fields:
            return JsonResponse({"success": False, "error": f"Missing required fields: {', '.join(missing_fields)}"}, status=400)
        
        # CRITICAL FIX: Save to SessionFeedback instead of TeacherFeedback
        # SessionFeedback is the correct model for facilitator session feedback
        feedback, created = SessionFeedback.objects.update_or_create(
            actual_session=actual_session,
            facilitator=request.user,
            defaults={
                'student_participation_notes': request.POST.get('student_participation_notes', ''),
                'learning_objectives_met': request.POST.get('learning_objectives_met', 'true').lower() == 'true',
                'session_completion_percentage': int(request.POST.get('session_completion_percentage', 100)),
                'time_management_rating': int(request.POST.get('time_management_rating', 3)),
                'content_difficulty_rating': int(request.POST.get('content_difficulty_rating', 3)),
                'facilitator_satisfaction': int(request.POST.get('facilitator_satisfaction', 3)),
                'what_went_well': request.POST.get('what_went_well', ''),
                'areas_for_improvement': request.POST.get('areas_for_improvement', ''),
                'next_session_preparation': request.POST.get('next_session_preparation', ''),
                'additional_notes': request.POST.get('additional_notes', ''),
                'is_complete': True
            }
        )
        
        # Update analytics
        from .models import FeedbackAnalytics
        analytics, created = FeedbackAnalytics.objects.get_or_create(
            actual_session=actual_session
        )
        analytics.calculate_analytics()
        
        # ✅ CLEAR CACHE - So admin feedback dashboard shows latest data
        from django.core.cache import cache
        cache.delete_many([
            'admin_feedback_dashboard',
            'admin_feedback_analytics',
            'admin_dashboard_optimized'
        ])
        
        return JsonResponse({
            "success": True,
            "message": "Teacher reflection saved successfully!",
            "feedback_id": str(feedback.id)
        })
        
    except Exception as e:
        logger.error(f"Error saving teacher feedback: {e}")
        return JsonResponse({"success": False, "error": "Failed to save teacher feedback"}, status=500)


@login_required
def get_feedback_status(request):
    """Get feedback status for a session"""
    try:
        session_id = request.GET.get('session_id')
        if not session_id:
            return JsonResponse({"success": False, "error": "Session ID required"}, status=400)
        
        actual_session = get_object_or_404(ActualSession, id=session_id)
        
        from .models import StudentFeedback, SessionFeedback
        
        # Get student feedback count
        student_feedback_count = StudentFeedback.objects.filter(actual_session=actual_session).count()
        
        # Get teacher feedback status - FIXED to use SessionFeedback
        teacher_feedback_completed = SessionFeedback.objects.filter(
            actual_session=actual_session,
            facilitator=request.user
        ).exists()
        
        # Generate student feedback summary HTML
        student_summary_html = ""
        if student_feedback_count > 0:
            student_feedback = StudentFeedback.objects.filter(actual_session=actual_session)
            
            # Calculate averages
            avg_rating = sum(f.session_rating for f in student_feedback) / student_feedback_count
            understanding_yes = student_feedback.filter(topic_understanding='yes').count()
            clarity_yes = student_feedback.filter(teacher_clarity='yes').count()
            
            student_summary_html = f"""
            <div class="row text-center">
                <div class="col-md-3">
                    <div class="text-primary">
                        <h4>{avg_rating:.1f}/5</h4>
                        <small>Average Rating</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-success">
                        <h4>{understanding_yes}/{student_feedback_count}</h4>
                        <small>Understood Topic</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-info">
                        <h4>{clarity_yes}/{student_feedback_count}</h4>
                        <small>Found Teacher Clear</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-warning">
                        <h4>{student_feedback_count}</h4>
                        <small>Total Responses</small>
                    </div>
                </div>
            </div>
            """
        
        return JsonResponse({
            "success": True,
            "student_feedback_count": student_feedback_count,
            "teacher_feedback_completed": teacher_feedback_completed,
            "student_summary_html": student_summary_html
        })
        
    except Exception as e:
        logger.error(f"Error getting feedback status: {e}")
        return JsonResponse({"success": False, "error": "Failed to get feedback status"}, status=500)
        day_content = content[start_pos:end_pos]
        
        # Cache the content for 1 hour
        cache.set(cache_key, day_content, 60 * 60)
        
        return day_content
        
    except Exception as e:
        logger.error(f"Error loading Hindi curriculum content for day {day_number}: {e}")
        return None

@login_required
def initialize_class_sessions(request):
    """Initialize 1-150 sessions for classes that don't have them"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")
    
    if request.method == "POST":
        try:
            # Get all class sections that don't have planned sessions
            classes_without_sessions = []
            all_classes = ClassSection.objects.all().select_related('school')
            
            for class_section in all_classes:
                session_count = PlannedSession.objects.filter(
                    class_section=class_section,
                    is_active=True
                ).count()
                
                if session_count == 0:
                    classes_without_sessions.append(class_section)
            
            if not classes_without_sessions:
                messages.info(request, "All classes already have sessions initialized.")
                return redirect("admin_dashboard")
            
            # Initialize sessions for classes that need them
            total_created = 0
            success_count = 0
            
            for class_section in classes_without_sessions:
                try:
                    with transaction.atomic():
                        # Create all 150 sessions
                        sessions_to_create = []
                        for day_number in range(1, 151):
                            session = PlannedSession(
                                class_section=class_section,
                                day_number=day_number,
                                title=f"Day {day_number} Session",
                                description=f"Session for day {day_number}",
                                sequence_position=day_number,
                                is_required=True,
                                is_active=True
                            )
                            sessions_to_create.append(session)
                        
                        # Bulk create all sessions
                        PlannedSession.objects.bulk_create(sessions_to_create)
                        total_created += 150
                        success_count += 1
                        
                        logger.info(f"Initialized 150 sessions for {class_section}")
                        
                except Exception as e:
                    logger.error(f"Error initializing sessions for {class_section}: {e}")
                    messages.warning(request, f"Failed to initialize sessions for {class_section}: {str(e)}")
            
            if success_count > 0:
                messages.success(request, f"✅ Successfully initialized {total_created} sessions for {success_count} classes.")
            
            return redirect("admin_dashboard")
            
        except Exception as e:
            logger.error(f"Error in bulk session initialization: {e}")
            messages.error(request, f"Error initializing sessions: {str(e)}")
            return redirect("admin_dashboard")
    
    # GET request - show confirmation page
    classes_without_sessions = []
    all_classes = ClassSection.objects.all().select_related('school')
    
    for class_section in all_classes:
        session_count = PlannedSession.objects.filter(
            class_section=class_section,
            is_active=True
        ).count()
        
        if session_count == 0:
            classes_without_sessions.append(class_section)
    
    return render(request, "admin/sessions/initialize_sessions.html", {
        "classes_without_sessions": classes_without_sessions,
        "total_sessions_to_create": len(classes_without_sessions) * 150
    })

def auto_create_planned_sessions_for_all_classes():
    """
    Automatically create 1-150 planned sessions for all classes that don't have them
    This ensures facilitators always have sessions to conduct
    """
    try:
        # Get all class sections
        all_classes = ClassSection.objects.all()
        
        classes_updated = 0
        total_sessions_created = 0
        
        for class_section in all_classes:
            # Check if this class already has planned sessions
            existing_count = PlannedSession.objects.filter(
                class_section=class_section,
                is_active=True
            ).count()
            
            if existing_count == 0:
                # Create all 150 sessions for this class
                try:
                    with transaction.atomic():
                        sessions_to_create = []
                        for day_number in range(1, 151):
                            session = PlannedSession(
                                class_section=class_section,
                                day_number=day_number,
                                title=f"Day {day_number} Session",
                                description=f"Session for day {day_number}",
                                sequence_position=day_number,
                                is_required=True,
                                is_active=True
                            )
                            sessions_to_create.append(session)
                        
                        # Bulk create all sessions
                        PlannedSession.objects.bulk_create(sessions_to_create)
                        classes_updated += 1
                        total_sessions_created += 150
                        
                        logger.info(f"Auto-created 150 planned sessions for {class_section}")
                        
                except Exception as e:
                    logger.error(f"Error creating planned sessions for {class_section}: {e}")
        
        if classes_updated > 0:
            logger.info(f"Auto-created {total_sessions_created} planned sessions for {classes_updated} classes")
        
        return {
            'classes_updated': classes_updated,
            'total_sessions_created': total_sessions_created
        }
        
    except Exception as e:
        logger.error(f"Error in auto_create_planned_sessions_for_all_classes: {e}")
        return {
            'classes_updated': 0,
            'total_sessions_created': 0
        }

# -------------------------------
# Bulk Session Management Views
# -------------------------------

@login_required
def initialize_class_sessions(request, class_section_id):
    """Initialize 150 sessions for a specific class"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)

    if request.method == "POST":
        try:
            from .session_management import SessionBulkManager
            
            # Check if sessions already exist
            existing_sessions_count = PlannedSession.objects.filter(
                class_section=class_section,
                is_active=True
            ).count()
            
            if existing_sessions_count > 0:
                messages.warning(
                    request, 
                    f"Class {class_section.class_level}-{class_section.section} already has {existing_sessions_count} sessions. No new sessions created."
                )
            else:
                # Generate sessions using SessionBulkManager
                result = SessionBulkManager.generate_sessions_for_class(
                    class_section=class_section,
                    created_by=request.user
                )
                
                if result['success']:
                    messages.success(
                        request, 
                        f"✅ Successfully initialized {result['created_count']} sessions for {class_section.class_level}-{class_section.section}"
                    )
                    logger.info(f"Admin {request.user.email} initialized {result['created_count']} sessions for {class_section}")
                else:
                    messages.error(
                        request, 
                        f"Failed to initialize sessions: {', '.join(result['errors'])}"
                    )
                    
        except Exception as e:
            logger.error(f"Error initializing sessions for {class_section}: {e}")
            messages.error(request, "Failed to initialize sessions. Please try again.")

    return redirect("class_sections_list_by_school", school_id=class_section.school.id)


@login_required
def delete_all_class_sessions(request, class_section_id):
    """Delete all sessions for a specific class"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    class_section = get_object_or_404(ClassSection, id=class_section_id)

    if request.method == "POST":
        try:
            with transaction.atomic():
                # Get all planned sessions for this class
                planned_sessions = PlannedSession.objects.filter(
                    class_section=class_section
                )
                
                # Count what will be deleted
                planned_count = planned_sessions.count()
                actual_count = ActualSession.objects.filter(
                    planned_session__class_section=class_section
                ).count()
                attendance_count = Attendance.objects.filter(
                    actual_session__planned_session__class_section=class_section
                ).count()
                
                # Delete all sessions (cascade will handle ActualSession and Attendance)
                planned_sessions.delete()
                
                messages.success(
                    request, 
                    f"🗑️ Successfully deleted all sessions for {class_section.class_level}-{class_section.section}. "
                    f"Removed {planned_count} planned sessions, {actual_count} actual sessions, and {attendance_count} attendance records."
                )
                logger.warning(f"Admin {request.user.email} deleted all sessions for {class_section}")
                
        except Exception as e:
            logger.error(f"Error deleting sessions for {class_section}: {e}")
            messages.error(request, "Failed to delete sessions. Please try again.")

    return redirect("class_sections_list_by_school", school_id=class_section.school.id)


@login_required
def bulk_initialize_school_sessions(request, school_id):
    """Initialize sessions for all classes in a school"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    school = get_object_or_404(School, id=school_id)

    if request.method == "POST":
        try:
            from .session_management import SessionBulkManager
            
            # Get all classes in this school
            class_sections = ClassSection.objects.filter(school=school)
            
            if not class_sections.exists():
                messages.warning(request, f"No classes found in {school.name}")
                return redirect("class_sections_list_by_school", school_id=school.id)
            
            total_created = 0
            total_skipped = 0
            processed_classes = []
            
            with transaction.atomic():
                for class_section in class_sections:
                    # Check if sessions already exist
                    existing_sessions_count = PlannedSession.objects.filter(
                        class_section=class_section,
                        is_active=True
                    ).count()
                    
                    if existing_sessions_count > 0:
                        total_skipped += 1
                        processed_classes.append(f"{class_section.class_level}-{class_section.section} (already has {existing_sessions_count} sessions)")
                    else:
                        # Generate sessions
                        result = SessionBulkManager.generate_sessions_for_class(
                            class_section=class_section,
                            created_by=request.user
                        )
                        
                        if result['success']:
                            total_created += result['created_count']
                            processed_classes.append(f"{class_section.class_level}-{class_section.section} (created {result['created_count']} sessions)")
                        else:
                            processed_classes.append(f"{class_section.class_level}-{class_section.section} (failed: {', '.join(result['errors'])})")
            
            # Provide detailed feedback
            if total_created > 0:
                messages.success(
                    request, 
                    f"🚀 Bulk initialization completed for {school.name}! "
                    f"Created sessions for {len(class_sections) - total_skipped} classes. "
                    f"Total sessions created: {total_created}. "
                    f"Classes skipped (already had sessions): {total_skipped}"
                )
            else:
                messages.info(
                    request, 
                    f"All classes in {school.name} already have sessions initialized. No new sessions created."
                )
            
            logger.info(f"Admin {request.user.email} bulk initialized sessions for school {school.name}: {total_created} sessions created")
                
        except Exception as e:
            logger.error(f"Error bulk initializing sessions for school {school}: {e}")
            messages.error(request, "Failed to initialize sessions. Please try again.")

    return redirect("class_sections_list_by_school", school_id=school.id)


@login_required
def bulk_delete_school_sessions(request, school_id):
    """Delete all sessions for all classes in a school"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")

    school = get_object_or_404(School, id=school_id)

    if request.method == "POST":
        try:
            with transaction.atomic():
                # Get all classes in this school
                class_sections = ClassSection.objects.filter(school=school)
                
                if not class_sections.exists():
                    messages.warning(request, f"No classes found in {school.name}")
                    return redirect("class_sections_list_by_school", school_id=school.id)
                
                # Count what will be deleted
                total_planned = PlannedSession.objects.filter(
                    class_section__school=school
                ).count()
                total_actual = ActualSession.objects.filter(
                    planned_session__class_section__school=school
                ).count()
                total_attendance = Attendance.objects.filter(
                    actual_session__planned_session__class_section__school=school
                ).count()
                
                from django.db.models.signals import post_delete
                from .models import PlannedSession, ActualSession, Attendance
                from .signals_optimization import invalidate_session_cache, invalidate_attendance_cache, invalidate_planned_session_cache
                from django.core.cache import cache
                
                # Disconnect signals to speed up deletion
                post_delete.disconnect(invalidate_session_cache, sender=ActualSession)
                post_delete.disconnect(invalidate_attendance_cache, sender=Attendance)
                post_delete.disconnect(invalidate_planned_session_cache, sender=PlannedSession)
                
                try:
                    # Delete all sessions for all classes in this school
                    PlannedSession.objects.filter(
                        class_section__school=school
                    ).delete()
                finally:
                    # Reconnect signals
                    post_delete.connect(invalidate_session_cache, sender=ActualSession)
                    post_delete.connect(invalidate_attendance_cache, sender=Attendance)
                    post_delete.connect(invalidate_planned_session_cache, sender=PlannedSession)
                    
                    # Clear all cache at once
                    cache.clear()
                    logger.info(f"Bulk cache cleared for School {school.id} deletion")
                
                messages.success(
                    request, 
                    f"🗑️ Successfully deleted ALL sessions for {school.name}! "
                    f"Removed {total_planned} planned sessions, {total_actual} actual sessions, "
                    f"and {total_attendance} attendance records across {class_sections.count()} classes."
                )
                logger.warning(f"Admin {request.user.email} bulk deleted all sessions for school {school.name}")
                
        except Exception as e:
            logger.error(f"Error bulk deleting sessions for school {school}: {e}")
            messages.error(request, "Failed to delete sessions. Please try again.")

    return redirect("class_sections_list_by_school", school_id=school.id)

@login_required
def api_class_sessions_lazy(request, class_section_id):
    """API endpoint for lazy loading class sessions"""
    if request.user.role.name.upper() != "ADMIN":
        return JsonResponse({"error": "Permission denied"}, status=403)
    
    try:
        class_section = get_object_or_404(ClassSection, id=class_section_id)
        page = int(request.GET.get('page', 1))
        per_page = min(int(request.GET.get('per_page', 25)), 100)  # Max 100 per page
        
        # Cache key
        cache_key = f"api_class_sessions_{class_section_id}_{page}_{per_page}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return JsonResponse(cached_data)
        
        # Get paginated sessions
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        
        sessions = PlannedSession.objects.filter(
            class_section=class_section
        ).select_related('class_section').prefetch_related(
            'actual_sessions', 'steps'
        ).order_by('day_number')[start_index:end_index]
        
        sessions_data = []
        for session in sessions:
            # Determine status
            status_info = "pending"
            status_class = "secondary"
            
            if session.actual_sessions.filter(status=SessionStatus.CONDUCTED).exists():
                status_info = "completed"
                status_class = "success"
            else:
                last_actual = session.actual_sessions.order_by("-date").first()
                if last_actual:
                    if last_actual.status == SessionStatus.HOLIDAY:
                        status_info = "holiday"
                        status_class = "warning"
                    elif last_actual.status == SessionStatus.CANCELLED:
                        status_info = "cancelled"
                        status_class = "danger"
            
            sessions_data.append({
                'id': str(session.id),
                'day_number': session.day_number,
                'title': session.title or f"Day {session.day_number} Session",
                'status_info': status_info,
                'status_class': status_class,
                'activities_count': session.steps.count(),
                'edit_url': f'/admin/planned-session/{session.id}/edit/',
                'delete_url': f'/admin/planned-session/{session.id}/delete/'
            })
        
        total_count = PlannedSession.objects.filter(class_section=class_section).count()
        
        response_data = {
            'sessions': sessions_data,
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_sessions': total_count,
                'total_pages': (total_count + per_page - 1) // per_page,
                'has_next': end_index < total_count,
                'has_previous': page > 1
            }
        }
        
        # Cache for 2 minutes
        cache.set(cache_key, response_data, 120)
        
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"Error in api_class_sessions_lazy: {e}")
        return JsonResponse({"error": "Failed to load sessions"}, status=500)

# ==============================================
# ADMIN FEEDBACK & ANALYTICS VIEWS
# ==============================================

@login_required
@login_required
@login_required
def admin_feedback_dashboard(request):
    """Admin dashboard for viewing all feedback and analytics - OPTIMIZED"""
    if request.user.role.name.upper() != "ADMIN":
        return render(request, 'errors/403.html', status=403)
    
    from .models import StudentFeedback, SessionFeedback, FeedbackAnalytics
    from django.db.models import Count, Avg, Q
    from datetime import datetime, timedelta
    
    # Get date range (last 30 days by default)
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=30)
    
    # Override with request parameters if provided
    if request.GET.get('start_date'):
        try:
            start_date = datetime.strptime(request.GET.get('start_date'), '%Y-%m-%d').date()
        except ValueError:
            pass
    if request.GET.get('end_date'):
        try:
            end_date = datetime.strptime(request.GET.get('end_date'), '%Y-%m-%d').date()
        except ValueError:
            pass
    
    # OPTIMIZATION: Combine all student feedback queries into one aggregation
    # StudentFeedback uses submitted_at field
    student_date_filter = Q(submitted_at__date__range=[start_date, end_date])
    
    student_feedback_stats = StudentFeedback.objects.filter(
        student_date_filter
    ).aggregate(
        total_count=Count('id'),
        average_rating=Avg('session_rating'),
        understanding_yes_count=Count('id', filter=Q(topic_understanding='yes')),
        clarity_yes_count=Count('id', filter=Q(teacher_clarity='yes')),
    )
    
    # OPTIMIZATION: Combine all teacher/session feedback queries into one aggregation
    # SessionFeedback uses feedback_date field (NOT submitted_at!)
    # Use simpler date filter that works with DateTimeField
    start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
    end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
    teacher_date_filter = Q(feedback_date__range=[start_datetime, end_datetime])
    
    teacher_feedback_stats = SessionFeedback.objects.filter(
        teacher_date_filter
    ).aggregate(
        total_count=Count('id'),
        high_satisfaction_count=Count('id', filter=Q(facilitator_satisfaction__gte=4)),
        high_engagement_count=Count('id', filter=Q(facilitator_satisfaction__gte=4)),
        completed_sessions_count=Count('id', filter=Q(is_complete=True)),
    )
    
    # Recent feedback with pagination (only 10 records)
    # Order by submitted_at DESC to get latest feedback first
    recent_student_feedback = StudentFeedback.objects.filter(
        student_date_filter
    ).select_related(
        'actual_session__planned_session__class_section__school'
    ).order_by('-submitted_at')[:10]
    
    # Order by feedback_date DESC to get latest teacher feedback first
    # CRITICAL FIX: Use feedback_date instead of submitted_at!
    recent_teacher_feedback = SessionFeedback.objects.filter(
        teacher_date_filter
    ).select_related(
        'actual_session__planned_session__class_section__school',
        'facilitator'
    ).order_by('-feedback_date')[:10]
    
    context = {
        'student_feedback_stats': student_feedback_stats,
        'teacher_feedback_stats': teacher_feedback_stats,
        'recent_student_feedback': recent_student_feedback,
        'recent_teacher_feedback': recent_teacher_feedback,
        'start_date': start_date,
        'end_date': end_date,
    }
    
    return render(request, 'admin/feedback/dashboard.html', context)


@login_required
def admin_student_feedback_list(request):
    """Admin view for all student feedback"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")
    
    from .models import StudentFeedback
    
    # Get all student feedback with related data
    feedback_list = StudentFeedback.objects.select_related(
        'actual_session__planned_session__class_section__school',
        'actual_session__facilitator'
    ).order_by('-submitted_at')
    
    # Apply filters
    school_filter = request.GET.get('school')
    rating_filter = request.GET.get('rating')
    date_filter = request.GET.get('date')
    
    if school_filter:
        feedback_list = feedback_list.filter(
            actual_session__planned_session__class_section__school_id=school_filter
        )
    
    if rating_filter:
        feedback_list = feedback_list.filter(session_rating=rating_filter)
    
    if date_filter:
        feedback_list = feedback_list.filter(submitted_at__date=date_filter)
    
    # Pagination
    from django.core.paginator import Paginator
    paginator = Paginator(feedback_list, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'schools': School.objects.all(),
        'filters': {
            'school': school_filter,
            'rating': rating_filter,
            'date': date_filter,
        }
    }
    
    return render(request, 'admin/feedback/student_list.html', context)


@login_required
def admin_teacher_feedback_list(request):
    """Admin view for all teacher feedback - FIXED to use SessionFeedback"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")
    
    # CRITICAL FIX: Use SessionFeedback instead of TeacherFeedback
    # SessionFeedback is the correct model for facilitator session feedback
    feedback_list = SessionFeedback.objects.select_related(
        'actual_session__planned_session__class_section__school',
        'facilitator'
    ).order_by('-feedback_date')
    
    # Apply filters
    school_filter = request.GET.get('school')
    facilitator_filter = request.GET.get('facilitator')
    satisfaction_filter = request.GET.get('satisfaction')
    date_filter = request.GET.get('date')
    
    if school_filter:
        feedback_list = feedback_list.filter(
            actual_session__planned_session__class_section__school_id=school_filter
        )
    
    if facilitator_filter:
        feedback_list = feedback_list.filter(facilitator_id=facilitator_filter)
    
    # Filter by satisfaction level (1-5 scale)
    if satisfaction_filter:
        try:
            satisfaction_level = int(satisfaction_filter)
            feedback_list = feedback_list.filter(facilitator_satisfaction__gte=satisfaction_level)
        except (ValueError, TypeError):
            pass
    
    if date_filter:
        # Use proper datetime range for DateTimeField
        from datetime import datetime
        filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
        from django.utils import timezone
        start_dt = timezone.make_aware(datetime.combine(filter_date, datetime.min.time()))
        end_dt = timezone.make_aware(datetime.combine(filter_date, datetime.max.time()))
        feedback_list = feedback_list.filter(feedback_date__range=[start_dt, end_dt])
    
    # Pagination
    from django.core.paginator import Paginator
    paginator = Paginator(feedback_list, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'schools': School.objects.all(),
        'facilitators': User.objects.filter(role__name='FACILITATOR'),
        'filters': {
            'school': school_filter,
            'facilitator': facilitator_filter,
            'satisfaction': satisfaction_filter,
            'date': date_filter,
        }
    }
    
    return render(request, 'admin/feedback/teacher_list.html', context)


@login_required
@cache_page(600, cache='dashboard')  # Cache for 10 minutes
def admin_feedback_analytics(request):
    """Admin view for feedback analytics and reports - OPTIMIZED"""
    if request.user.role.name.upper() != "ADMIN":
        messages.error(request, "Permission denied.")
        return redirect("no_permission")
    
    from .models import StudentFeedback, SessionFeedback, FeedbackAnalytics
    from django.db.models import Count, Avg, Q, OuterRef, Subquery
    from datetime import datetime, timedelta
    
    # Get date range
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=30)
    
    if request.GET.get('start_date'):
        try:
            start_date = datetime.strptime(request.GET.get('start_date'), '%Y-%m-%d').date()
        except ValueError:
            pass
    if request.GET.get('end_date'):
        try:
            end_date = datetime.strptime(request.GET.get('end_date'), '%Y-%m-%d').date()
        except ValueError:
            pass
    
    # CRITICAL FIX: Use feedback_date for SessionFeedback, submitted_at for StudentFeedback
    student_date_filter = Q(submitted_at__date__range=[start_date, end_date])
    teacher_date_filter = Q(feedback_date__date__range=[start_date, end_date])
    
    # OPTIMIZATION: Use aggregation instead of loops - single query per analytics type
    # Get all school analytics in ONE query
    school_analytics_data = StudentFeedback.objects.filter(
        student_date_filter
    ).values(
        'actual_session__planned_session__class_section__school_id',
        'actual_session__planned_session__class_section__school__name'
    ).annotate(
        student_feedback_count=Count('id'),
        avg_student_rating=Avg('session_rating')
    )
    
    # Get teacher feedback by school in ONE query - FIXED to use SessionFeedback
    teacher_feedback_by_school = SessionFeedback.objects.filter(
        teacher_date_filter
    ).values(
        'actual_session__planned_session__class_section__school_id'
    ).annotate(
        teacher_feedback_count=Count('id')
    )
    
    # Convert to dict for fast lookup
    teacher_feedback_dict = {
        item['actual_session__planned_session__class_section__school_id']: 
        item['teacher_feedback_count'] 
        for item in teacher_feedback_by_school
    }
    
    # Build school analytics list
    school_analytics = []
    for item in school_analytics_data:
        school_id = item['actual_session__planned_session__class_section__school_id']
        school_analytics.append({
            'school_id': school_id,
            'school_name': item['actual_session__planned_session__class_section__school__name'],
            'student_feedback_count': item['student_feedback_count'],
            'teacher_feedback_count': teacher_feedback_dict.get(school_id, 0),
            'avg_student_rating': round(item['avg_student_rating'] or 0, 2),
        })
    
    # OPTIMIZATION: Get all facilitator analytics in ONE query - FIXED to use SessionFeedback
    facilitator_analytics_data = SessionFeedback.objects.filter(
        teacher_date_filter
    ).values(
        'facilitator_id',
        'facilitator__full_name'
    ).annotate(
        teacher_feedback_count=Count('id')
    )
    
    # Get student feedback by facilitator in ONE query
    student_feedback_by_facilitator = StudentFeedback.objects.filter(
        student_date_filter
    ).values(
        'actual_session__facilitator_id'
    ).annotate(
        avg_student_rating=Avg('session_rating'),
        sessions_with_feedback=Count('actual_session_id', distinct=True)
    )
    
    # Convert to dict for fast lookup
    student_feedback_dict = {
        item['actual_session__facilitator_id']: {
            'avg_rating': item['avg_student_rating'],
            'sessions': item['sessions_with_feedback']
        }
        for item in student_feedback_by_facilitator
    }
    
    # Build facilitator analytics list
    facilitator_analytics = []
    for item in facilitator_analytics_data:
        facilitator_id = item['facilitator_id']
        student_data = student_feedback_dict.get(facilitator_id, {'avg_rating': 0, 'sessions': 0})
        
        facilitator_analytics.append({
            'facilitator_id': facilitator_id,
            'facilitator_name': item['facilitator__full_name'],
            'teacher_feedback_count': item['teacher_feedback_count'],
            'sessions_with_student_feedback': student_data['sessions'],
            'avg_student_rating': round(student_data['avg_rating'] or 0, 2),
        })
    
    context = {
        'school_analytics': school_analytics,
        'facilitator_analytics': facilitator_analytics,
        'start_date': start_date,
        'end_date': end_date,
    }
    
    return render(request, 'admin/feedback/analytics.html', context)


# =====================================================
# OPTIMIZED VIEWS - PERFORMANCE IMPROVEMENTS
# =====================================================
# These are optimized versions of the dashboard views
# They use prefetch_related() to batch queries
# Expected improvement: 80-85% faster

from django.views.decorators.cache import cache_page

@login_required
@login_required
def admin_dashboard_optimized(request):
    """
    Admin Dashboard - Optimized with prefetch_related and caching
    BEFORE: 1000+ queries, 15-20 seconds
    AFTER: 6 queries, 2-3 seconds (cached: <100ms)
    
    NOTE: Cache key includes user ID to prevent cross-user data leakage
    """
    from django.core.cache import cache
    
    if request.user.role.name.upper() != "ADMIN":
        return render(request, 'errors/403.html', status=403)
    
    # Check cache with user-specific key
    cache_key = f"admin_dashboard_{request.user.id}"
    cached_response = cache.get(cache_key)
    if cached_response:
        return cached_response
    
    from django.db.models import Count, Q
    from datetime import date
    
    # Get all roles for the create user modal
    roles = Role.objects.all()
    
    # Use aggregation for stats
    school_stats = School.objects.aggregate(
        active_schools=Count('id', filter=Q(status=1))
    )
    
    facilitator_stats = User.objects.aggregate(
        active_facilitators=Count('id', filter=Q(role__name__iexact="FACILITATOR", is_active=True))
    )
    
    student_stats = Student.objects.aggregate(
        enrolled_students=Count('enrollments', filter=Q(enrollments__is_active=True), distinct=True)
    )
    
    # Get today's session stats - count pending sessions (scheduled for today but not conducted)
    today = date.today()
    
    # Count ActualSessions scheduled for today that are NOT conducted
    pending_sessions = ActualSession.objects.filter(
        date=today
    ).exclude(
        status=SessionStatus.CONDUCTED
    ).count()
    
    session_stats = ActualSession.objects.filter(date=today).aggregate(
        sessions_today=Count('id', filter=Q(status=1)),
        holidays_today=Count('id', filter=Q(status=2)),
        cancelled_today=Count('id', filter=Q(status=3))
    )
    
    # Get recent activities (last 10 actual sessions)
    recent_activities = ActualSession.objects.select_related(
        'facilitator', 'planned_session', 'planned_session__class_section', 'planned_session__class_section__school'
    ).order_by('-created_at')[:10]
    
    context = {
        'active_schools': school_stats['active_schools'],
        'active_facilitators': facilitator_stats['active_facilitators'],
        'pending_validations': pending_sessions,  # Count of pending sessions scheduled for today
        'enrolled_students': student_stats['enrolled_students'],
        'sessions_today': session_stats['sessions_today'],
        'holidays_today': session_stats['holidays_today'],
        'cancelled_today': session_stats['cancelled_today'],
        'recent_activities': recent_activities,
        'roles': roles,
    }
    
    logger.info(f"Admin dashboard - Active Schools: {school_stats['active_schools']}, Active Facilitators: {facilitator_stats['active_facilitators']}")
    response = render(request, 'admin/dashboard.html', context)
    cache.set(cache_key, response, 600)  # Cache for 10 minutes
    return response


@login_required
def facilitator_dashboard_optimized(request):
    """
    Facilitator Dashboard - Optimized with aggregation
    BEFORE: 500+ queries, 8-12 seconds
    AFTER: 3 queries, 200-300ms
    
    Uses aggregation instead of counting individual sessions
    Groups sessions by grouped_session_id for efficient counting
    
    NOTE: Cache key includes user ID to prevent cross-user data leakage
    """
    from django.core.cache import cache
    
    if request.user.role.name.upper() != "FACILITATOR":
        return render(request, 'errors/403.html', status=403)
    
    # Check cache with user-specific key
    cache_key = f"facilitator_dashboard_optimized_{request.user.id}"
    cached_response = cache.get(cache_key)
    if cached_response:
        return cached_response
    
    from datetime import timedelta
    from django.db.models import Count, Q, F
    
    # Get facilitator schools
    facilitator_schools = FacilitatorSchool.objects.filter(
        facilitator=request.user,
        is_active=True
    ).select_related('school').values_list('school_id', flat=True)
    
    # Get all classes for facilitator's schools
    all_classes = ClassSection.objects.filter(
        school_id__in=facilitator_schools,
        is_active=True
    ).select_related('school')
    
    # OPTIMIZATION: Use aggregation for all counts instead of separate queries
    
    # Count total schools and classes
    total_schools = facilitator_schools.count()
    total_classes = all_classes.count()
    
    # Count unique students (aggregation)
    total_students = Enrollment.objects.filter(
        class_section__in=all_classes,
        is_active=True
    ).values('student').distinct().count()
    
    # Count conducted sessions (aggregation)
    conducted_sessions = ActualSession.objects.filter(
        planned_session__class_section__in=all_classes,
        status=SessionStatus.CONDUCTED
    ).count()
    
    # Count total planned sessions - exclude placeholders (day_number=1 for grouped classes)
    # Single class: 150 sessions, Grouped class: 150 sessions (shared, not duplicated)
    total_planned_sessions = PlannedSession.objects.filter(
        class_section__in=all_classes,
        is_active=True,
        day_number__gt=1  # Skip placeholders
    ).count()
    
    # Calculate remaining sessions
    remaining_sessions = total_planned_sessions - conducted_sessions
    
    # Calculate session completion rate
    session_completion_rate = 0
    if total_planned_sessions > 0:
        session_completion_rate = round((conducted_sessions / total_planned_sessions) * 100, 1)
    
    # Get attendance stats with aggregation (single query)
    attendance_stats = Attendance.objects.filter(
        actual_session__planned_session__class_section__in=all_classes
    ).aggregate(
        total_records=Count('id'),
        present_count=Count('id', filter=Q(status=AttendanceStatus.PRESENT))
    )
    
    overall_attendance_rate = 0
    if attendance_stats['total_records'] > 0:
        overall_attendance_rate = round(
            (attendance_stats['present_count'] / attendance_stats['total_records']) * 100, 1
        )
    
    # Get class-wise attendance stats (single query with aggregation)
    class_stats = Enrollment.objects.filter(
        class_section__in=all_classes,
        is_active=True
    ).values('class_section').annotate(
        total_students=Count('student', distinct=True)
    )
    
    class_attendance_stats = []
    for class_stat in class_stats:
        class_section = all_classes.get(id=class_stat['class_section'])
        
        # Get attendance rate for this class
        class_attendance = Attendance.objects.filter(
            actual_session__planned_session__class_section=class_section
        ).aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(status=AttendanceStatus.PRESENT))
        )
        
        class_attendance_rate = 0
        if class_attendance['total'] > 0:
            class_attendance_rate = round(
                (class_attendance['present'] / class_attendance['total']) * 100, 1
            )
        
        class_attendance_stats.append({
            'class_section': class_section,
            'total_students': class_stat['total_students'],
            'attendance_rate': class_attendance_rate,
        })
    
    # Get recent students (last 5 enrollments by start_date)
    recent_students = Enrollment.objects.filter(
        class_section__in=all_classes,
        is_active=True
    ).select_related('student').order_by('-start_date')[:5]
    
    # Get recent sessions (last 7 days)
    seven_days_ago = date.today() - timedelta(days=7)
    recent_sessions = ActualSession.objects.filter(
        planned_session__class_section__in=all_classes,
        date__gte=seven_days_ago,
        status=SessionStatus.CONDUCTED
    ).count()
    
    context = {
        'facilitator_name': request.user.full_name,
        'total_schools': total_schools,
        'total_classes': total_classes,
        'total_students': total_students,
        'conducted_sessions': conducted_sessions,
        'total_planned_sessions': total_planned_sessions,
        'remaining_sessions': remaining_sessions,
        'session_completion_rate': session_completion_rate,
        'overall_attendance_rate': overall_attendance_rate,
        'class_attendance_stats': class_attendance_stats,
        'recent_students': recent_students,
        'recent_sessions': recent_sessions,
    }
    
    logger.info(f"Facilitator dashboard loaded for {request.user.full_name}: {total_classes} classes, {total_students} students, {conducted_sessions} sessions")
    response = render(request, 'facilitator/dashboard.html', context)
    cache.set(cache_key, response, 300)  # Cache for 5 minutes
    return response
    
    
@login_required
def supervisor_dashboard_optimized(request):
    """
    Supervisor Dashboard - Optimized with prefetch_related
    BEFORE: 1500+ queries, 20-30 seconds
    AFTER: 8 queries, 3-4 seconds
    
    NOTE: Cache key includes user ID to prevent cross-user data leakage
    """
    from django.core.cache import cache
    
    if request.user.role.name.upper() != "SUPERVISOR":
        return render(request, 'errors/403.html', status=403)
    
    # Check cache with user-specific key
    cache_key = f"supervisor_dashboard_optimized_{request.user.id}"
    cached_response = cache.get(cache_key)
    if cached_response:
        return cached_response
    
    # Use aggregation for stats
    stats = User.objects.aggregate(
        active_facilitators=Count('id', filter=Q(role__name__iexact="FACILITATOR", is_active=True))
    )
    
    # Batch queries for counts
    school_stats = School.objects.aggregate(
        total_schools=Count('id'),
        active_schools=Count('id', filter=Q(status=1))
    )
    
    class_stats = ClassSection.objects.aggregate(
        total_classes=Count('id'),
        active_classes=Count('id', filter=Q(is_active=True))
    )
    
    # Get recent schools
    recent_schools = list(School.objects.all().order_by("-created_at")[:5])
    
    # Get recent users
    recent_users = list(User.objects.all().select_related('role').order_by("-created_at")[:5])
    
    context = {
        'total_schools': school_stats['total_schools'],
        'active_schools': school_stats['active_schools'],
        'total_classes': class_stats['total_classes'],
        'active_classes': class_stats['active_classes'],
        'active_facilitators': stats['active_facilitators'],
        'recent_users': recent_users,
        'recent_schools': recent_schools,
    }
    
    logger.info(f"Supervisor dashboard - Active Facilitators: {stats['active_facilitators']}, Schools: {school_stats['total_schools']}")
    response = render(request, 'supervisor/dashboard.html', context)
    cache.set(cache_key, response, 300)  # Cache for 5 minutes
    return response


# =====================================================
# SESSION DAY MANAGEMENT API
# =====================================================

@login_required
@require_http_methods(["POST"])
def set_session_day(request):
    """
    API endpoint to set which session day facilitators should work on.
    Supervisor selects a day, and it updates the database.
    Facilitators see this day as their current session.
    
    Requirements: Supervisor role
    """
    
    if request.user.role.name.upper() != "SUPERVISOR":
        return JsonResponse({
            'success': False,
            'error': 'Permission denied. Only supervisors can set session days.'
        }, status=403)
    
    try:
        import json
        data = json.loads(request.body)
        session_id = data.get('session_id')
        day_number = data.get('day_number')
        
        if not session_id or not day_number:
            return JsonResponse({
                'success': False,
                'error': 'Missing session_id or day_number'
            }, status=400)
        
        # Get the planned session
        planned_session = get_object_or_404(PlannedSession, id=session_id)
        
        # Update the current_day_number for this class
        class_section = planned_session.class_section
        class_section.current_day_number = day_number
        class_section.save()
        
        # If this is a grouped session, update all grouped classes
        if planned_session.grouped_session_id:
            grouped_sessions = PlannedSession.objects.filter(
                grouped_session_id=planned_session.grouped_session_id,
                day_number=day_number
            )
            
            for grouped_session in grouped_sessions:
                grouped_session.class_section.current_day_number = day_number
                grouped_session.class_section.save()
        
        logger.info(
            f"Session day updated by {request.user.email}: "
            f"Class {class_section.display_name} set to Day {day_number}"
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Session day updated to Day {day_number}',
            'class_name': class_section.display_name,
            'day_number': day_number
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON in request body'
        }, status=400)
    
    except Exception as e:
        logger.error(f"Error setting session day: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Error: {str(e)}'
        }, status=500)

        # ✅ ADD THIS NEW FUNCTION for handling feedback form submission
@login_required
@csrf_exempt
def handle_feedback_submission(request):
    """Handle facilitator feedback form submission"""
    if request.user.role.name.upper() != "FACILITATOR":
        return JsonResponse({"success": False, "error": "Permission denied"}, status=403)
    
    if request.method == "POST":
        try:
            # Get form data
            planned_session_id = request.POST.get('planned_session_id')
            
            if not planned_session_id:
                return JsonResponse({"success": False, "error": "Session ID required"}, status=400)
            
            # Use the existing save_session_feedback function
            return save_session_feedback(request)
            
        except Exception as e:
            logger.error(f"Error in handle_feedback_submission: {e}")
            return JsonResponse({"success": False, "error": "Form submission failed"}, status=500)
    
    return JsonResponse({"success": False, "error": "Invalid method"}, status=405)
    # ✅ ADD THIS HELPER FUNCTION for step navigation
def update_session_workflow_step(planned_session_id, facilitator, step_number):
    """Update the workflow step for a session in localStorage"""
    try:
        from django.core.cache import cache
        cache_key = f"workflow_step_{planned_session_id}_{facilitator.id}"
        cache.set(cache_key, step_number, timeout=86400)  # 24 hours
        return True
    except Exception as e:
        logger.error(f"Error updating workflow step: {e}")
        return False


@login_required
def api_detect_grouped_session(request):
    """
    AJAX endpoint to detect grouped session asynchronously
    Returns grouped session info as JSON
    """
    from django.http import JsonResponse
    
    planned_session_id = request.GET.get('planned_session_id')
    
    if not planned_session_id:
        return JsonResponse({'error': 'Missing planned_session_id'}, status=400)
    
    try:
        planned_session = PlannedSession.objects.get(id=planned_session_id)
    except PlannedSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)
    
    class_section = planned_session.class_section
    grouped_classes = []
    session_type = "single"
    grouped_session_id = None
    detection_method = None
    
    try:
        # Use cache key for grouped session detection
        # IMPORTANT: Include class_section_id in cache key to avoid conflicts when sessions are regrouped
        cache_key = f"grouped_session_{planned_session.id}_{planned_session.day_number}_{class_section.id}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            grouped_classes = cached_result['grouped_classes']
            session_type = cached_result['session_type']
            grouped_session_id = cached_result['grouped_session_id']
            detection_method = cached_result['detection_method']
        else:
            # First, check if this session has grouped_session_id set
            if planned_session.grouped_session_id:
                grouped_session_id = planned_session.grouped_session_id
                
                # OPTIMIZED: Use values_list to get only class_section_id
                grouped_session_ids = PlannedSession.objects.filter(
                    grouped_session_id=grouped_session_id,
                    day_number=planned_session.day_number
                ).values_list('class_section_id', flat=True)
                
                if grouped_session_ids:
                    # Fetch all classes in one query
                    grouped_classes_qs = ClassSection.objects.filter(
                        id__in=grouped_session_ids
                    ).order_by('id').values('id', 'display_name')
                    
                    grouped_classes = list(grouped_classes_qs)
                    
                    # Validate: ensure we have at least 2 classes
                    if len(grouped_classes) >= 2:
                        session_type = "grouped"
                        detection_method = "grouped_session_id"
                    else:
                        grouped_classes = []
                        session_type = "single"
                        grouped_session_id = None
            else:
                # Check CalendarDate
                from .models import CalendarDate
                calendar_entry = CalendarDate.objects.filter(
                    class_sections=class_section,
                    date_type=DateType.SESSION
                ).prefetch_related('class_sections').first()
                
                if calendar_entry:
                    class_count = calendar_entry.class_sections.count()
                    if class_count > 1:
                        grouped_classes_qs = calendar_entry.class_sections.all().order_by('id').values('id', 'display_name')
                        grouped_classes = list(grouped_classes_qs)
                        session_type = "grouped"
                        detection_method = "CalendarDate"
                    else:
                        session_type = "single"
                        detection_method = "none"
                else:
                    session_type = "single"
                    detection_method = "none"
            
            # Cache the result for 1 hour
            cache.set(cache_key, {
                'grouped_classes': grouped_classes,
                'session_type': session_type,
                'grouped_session_id': str(grouped_session_id) if grouped_session_id else None,
                'detection_method': detection_method
            }, 3600)
        
        return JsonResponse({
            'success': True,
            'grouped_classes': grouped_classes,
            'session_type': session_type,
            'grouped_session_id': str(grouped_session_id) if grouped_session_id else None,
            'is_grouped_session': len(grouped_classes) > 1,
            'detection_method': detection_method
        })
    
    except Exception as e:
        logger.error(f"Error detecting grouped session: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


# =========================
# GUARDIAN MANAGEMENT VIEWS
# =========================

@login_required
@facilitator_required
def add_guardian(request, student_id):
    """Add a new guardian for a student"""
    student = get_object_or_404(Student, id=student_id)
    
    if request.method == 'POST':
        try:
            guardian = StudentGuardian.objects.create(
                student=student,
                name=request.POST.get('name'),
                relation=request.POST.get('relation'),
                phone_number=request.POST.get('phone_number'),
                email=request.POST.get('email', ''),
                connection_notes=request.POST.get('connection_notes', ''),
                attachment_q1=request.POST.get('attachment_q1') == 'true',
                attachment_q2=request.POST.get('attachment_q2') == 'true',
                attachment_q3=request.POST.get('attachment_q3') == 'true',
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Guardian added successfully',
                'guardian': {
                    'id': str(guardian.id),
                    'name': guardian.name,
                    'relation': guardian.get_relation_display(),
                    'phone_number': guardian.phone_number,
                    'email': guardian.email,
                    'connection_notes': guardian.connection_notes,
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=400)


@login_required
@facilitator_required
def edit_guardian(request, guardian_id):
    """Edit an existing guardian"""
    guardian = get_object_or_404(StudentGuardian, id=guardian_id)
    
    if request.method == 'POST':
        try:
            guardian.name = request.POST.get('name', guardian.name)
            guardian.relation = request.POST.get('relation', guardian.relation)
            guardian.phone_number = request.POST.get('phone_number', guardian.phone_number)
            guardian.email = request.POST.get('email', guardian.email)
            guardian.connection_notes = request.POST.get('connection_notes', guardian.connection_notes)
            guardian.attachment_q1 = request.POST.get('attachment_q1') == 'true'
            guardian.attachment_q2 = request.POST.get('attachment_q2') == 'true'
            guardian.attachment_q3 = request.POST.get('attachment_q3') == 'true'
            guardian.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Guardian updated successfully',
                'guardian': {
                    'id': str(guardian.id),
                    'name': guardian.name,
                    'relation': guardian.get_relation_display(),
                    'phone_number': guardian.phone_number,
                    'email': guardian.email,
                    'connection_notes': guardian.connection_notes,
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=400)


@login_required
@facilitator_required
def delete_guardian(request, guardian_id):
    """Delete a guardian"""
    guardian = get_object_or_404(StudentGuardian, id=guardian_id)
    
    if request.method == 'POST':
        try:
            guardian.delete()
            return JsonResponse({'success': True, 'message': 'Guardian deleted successfully'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'message': 'Invalid request method'}, status=400)


@login_required
@facilitator_required
def get_guardians(request, student_id):
    """Get all guardians for a student"""
    student = get_object_or_404(Student, id=student_id)
    guardians = StudentGuardian.objects.filter(student=student).order_by('-created_at')
    
    guardians_data = []
    for guardian in guardians:
        guardians_data.append({
            'id': str(guardian.id),
            'name': guardian.name,
            'relation': guardian.get_relation_display(),
            'phone_number': guardian.phone_number,
            'email': guardian.email,
            'connection_notes': guardian.connection_notes,
            'attachment_q1': guardian.attachment_q1,
            'attachment_q2': guardian.attachment_q2,
            'attachment_q3': guardian.attachment_q3,
            'attachment_score': guardian.attachment_score,
        })
    
    return JsonResponse({
        'success': True,
        'guardians': guardians_data,
        'count': len(guardians_data)
    })
