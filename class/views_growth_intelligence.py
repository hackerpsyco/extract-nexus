"""
Student Growth Intelligence API Views

Provides endpoints for:
- Student growth dashboard
- Daily session history
- Quiz history
- Attendance statistics
- Batch analysis
"""

import json
from datetime import datetime, timedelta
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Avg, Count

from class.models import (
    Enrollment, Student, StudentQuiz, StudentGrowthAnalysis,
    Attendance, SessionFeedback, ActualSession, School
)
from class.services.student_growth_service import StudentGrowthAnalysisService


# =========================
# DAILY SESSIO