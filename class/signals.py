"""
Django signals for automatic session generation and growth analysis
Handles automatic creation of 1-150 sessions when new classes are created
Handles automatic growth analysis when attendance or quiz data is added
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
import logging
from datetime import datetime, timedelta

from .models import ClassSection, PlannedSession, SessionBulkTemplate, Attendance, StudentQuiz
from .session_management import SessionBulkManager

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=ClassSection)
def auto_generate_sessions_for_new_class(sender, instance, created, **kwargs):
    """
    Automatically generate 1-150 sessions when a new class is created
    """
    if created:  # Only for newly created classes
        try:
            logger.info(f"Auto-generating sessions for new class: {instance}")
            
            # Check if sessions already exist (safety check)
            existing_sessions = PlannedSession.objects.filter(
                class_section=instance,
                is_active=True
            ).count()
            
            if existing_sessions > 0:
                logger.warning(f"Class {instance} already has {existing_sessions} sessions, skipping auto-generation")
                return
            
            # Try to get a default template
            default_template = SessionBulkTemplate.objects.filter(
                is_active=True,
                language='english'  # Default to English
            ).first()
            
            # Generate sessions using SessionBulkManager
            result = SessionBulkManager.generate_sessions_for_class(
                class_section=instance,
                template=default_template,
                created_by=None  # System generated
            )
            
            if result['success']:
                logger.info(f"Successfully auto-generated {result['created_count']} sessions for {instance}")
            else:
                logger.error(f"Failed to auto-generate sessions for {instance}: {result['errors']}")
                
        except Exception as e:
            logger.error(f"Error in auto-generating sessions for {instance}: {e}")


@receiver(post_save, sender=SessionBulkTemplate)
def update_template_usage_stats(sender, instance, created, **kwargs):
    """
    Update template statistics when templates are used
    """
    if not created:  # Only for updates, not new creations
        logger.info(f"Template {instance.name} usage updated")


@receiver(post_save, sender=Attendance)
def trigger_growth_analysis_on_attendance(sender, instance, created, **kwargs):
    """
    Trigger growth analysis when attendance is recorded
    """
    if created:
        try:
            from .services.student_growth_service import StudentGrowthAnalysisService
            
            enrollment = instance.enrollment
            logger.info(f"Triggering growth analysis for {enrollment.student.full_name}")
            StudentGrowthAnalysisService.update_growth_analysis(enrollment)
        except Exception as e:
            logger.error(f"Error triggering growth analysis on attendance: {e}")


@receiver(post_save, sender=StudentQuiz)
def trigger_growth_analysis_on_quiz(sender, instance, created, **kwargs):
    """
    Trigger growth analysis when quiz score is recorded
    """
    if created:
        try:
            from .services.student_growth_service import StudentGrowthAnalysisService
            
            enrollment = instance.enrollment
            logger.info(f"Triggering growth analysis for {enrollment.student.full_name}")
            StudentGrowthAnalysisService.update_growth_analysis(enrollment)
        except Exception as e:
            logger.error(f"Error triggering growth analysis on quiz: {e}")