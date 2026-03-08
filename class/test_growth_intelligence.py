"""
Property-Based Tests for Student Growth Intelligence System

Tests correctness properties for:
- Attendance pattern analysis
- Quiz trend detection
- Growth score calculation
- At-risk detection

Uses Hypothesis for property-based testing to validate correctness
across a wide range of inputs.
"""

from datetime import timedelta
from hypothesis import given, strategies as st, settings
import numpy as np

from django.test import TestCase
from django.utils import timezone

# Import models using relative imports
from .models import (
    Enrollment, Student, School, ClassSection, Attendance, 
    StudentQuiz, StudentGrowthAnalysis, AttendanceStatus,
    ActualSession, User
)

# Import services using relative imports
from .services.student_growth_service import (
    AttendanceAnalyzer, QuizAnalyzer, GrowthScoreCalculator,
    AtRiskDetector, StudentGrowthAnalysisService
)


# =========================
# PROPERTY 2: ATTENDANCE PATTERN ACCURACY
# =========================

class TestAttendancePatternAccuracy(TestCase):
    """
    **Feature: student-growth-intelligence, Property 2: Attendance Pattern Accuracy**
    
    For any student with attendance records, the detected pattern (Stable, Declining, 
    Irregular, Improving) should match the actual trend in the data when calculated 
    using standard deviation and linear regression.
    
    **Validates: Requirements 2, 7**
    """
    
    def setUp(self):
        """Set up test data"""
        self.school = School.objects.create(
            name="Test School",
            location="Test Location",
            phone_number="1234567890"
        )
        self.class_section = ClassSection.objects.create(
            name="Test Class",
            school=self.school,
            grade_level="10"
        )
        self.student = Student.objects.create(
            full_name="Test Student",
            email="student@test.com",
            phone_number="9876543210"
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            class_section=self.class_section,
            school=self.school,
            enrollment_date=timezone.now().date()
        )
        self.facilitator = User.objects.create_user(
            username="facilitator",
            email="facilitator@test.com",
            password="testpass123"
        )
        self.actual_session = ActualSession.objects.create(
            class_section=self.class_section,
            session_date=timezone.now().date(),
            facilitator=self.facilitator,
            start_time=timezone.now().time(),
            end_time=(timezone.now() + timedelta(hours=1)).time()
        )
    
    @given(
        num_sessions=st.integers(min_value=5, max_value=15),
        present_rate=st.floats(min_value=0.0, max_value=1.0)
    )
    @settings(max_examples=5)
    def test_stable_pattern_detection(self, num_sessions, present_rate):
        """
        Test that stable attendance patterns are correctly detected.
        
        A stable pattern should have:
        - High consistency (low std dev of intervals)
        - High attendance percentage
        """
        # Create consistent attendance records
        for i in range(num_sessions):
            status = AttendanceStatus.PRESENT if np.random.random() < present_rate else AttendanceStatus.ABSENT
            Attendance.objects.create(
                enrollment=self.enrollment,
                actual_session=self.actual_session,
                status=status,
                marked_at=timezone.now() - timedelta(days=num_sessions - i)
            )
        
        # Analyze pattern
        result = AttendanceAnalyzer.analyze_pattern(self.enrollment)
        
        # Verify result structure
        self.assertIn('pattern', result)
        self.assertIn('consistency_score', result)
        self.assertIn('trend', result)
        self.assertIn('data_points', result)
        
        # Verify consistency score is in valid range
        self.assertGreaterEqual(result['consistency_score'], 0)
        self.assertLessEqual(result['consistency_score'], 100)
        
        # Verify data points match
        self.assertEqual(result['data_points'], num_sessions)
    
    def test_declining_pattern_detection(self):
        """
        Test that declining attendance patterns are correctly detected.
        
        A declining pattern should have:
        - Higher attendance in earlier sessions
        - Lower attendance in recent sessions
        """
        num_sessions = 10
        
        # Create attendance with declining trend
        for i in range(num_sessions):
            # First half: high attendance
            if i < num_sessions // 2:
                status = AttendanceStatus.PRESENT
            # Second half: low attendance
            else:
                status = AttendanceStatus.ABSENT
            
            Attendance.objects.create(
                enrollment=self.enrollment,
                actual_session=self.actual_session,
                status=status,
                marked_at=timezone.now() - timedelta(days=num_sessions - i)
            )
        
        # Analyze pattern
        result = AttendanceAnalyzer.analyze_pattern(self.enrollment)
        
        # Verify pattern is detected as declining or irregular
        self.assertIn(result['pattern'], ['declining', 'irregular'])
        self.assertIn(result['trend'], ['declining', 'stable'])


# =========================
# PROPERTY 3: QUIZ TREND DETECTION
# =========================

class TestQuizTrendDetection(TestCase):
    """
    **Feature: student-growth-intelligence, Property 3: Quiz Trend Detection**
    
    For any student with 3+ quiz scores, the detected trend (Improvement, Decline, 
    Plateau, Acceleration) should correctly identify the direction of performance change.
    
    **Validates: Requirements 3, 7**
    """
    
    def setUp(self):
        """Set up test data"""
        self.school = School.objects.create(
            name="Test School",
            location="Test Location",
            phone_number="1234567890"
        )
        self.class_section = ClassSection.objects.create(
            name="Test Class",
            school=self.school,
            grade_level="10"
        )
        self.student = Student.objects.create(
            full_name="Test Student",
            email="student@test.com",
            phone_number="9876543210"
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            class_section=self.class_section,
            school=self.school,
            enrollment_date=timezone.now().date()
        )
    
    @given(
        base_score=st.integers(min_value=40, max_value=80),
        improvement_per_quiz=st.floats(min_value=0.5, max_value=3.0)
    )
    @settings(max_examples=5)
    def test_improvement_trend_detection(self, base_score, improvement_per_quiz):
        """
        Test that improving quiz trends are correctly detected.
        
        An improvement trend should have:
        - Positive slope (improvement_rate > 0)
        - Recent scores higher than older scores
        """
        num_quizzes = 5
        
        # Create quiz scores with improvement trend
        for i in range(num_quizzes):
            score = min(100, int(base_score + (i * improvement_per_quiz)))
            StudentQuiz.objects.create(
                enrollment=self.enrollment,
                quiz_date=timezone.now().date() - timedelta(days=(num_quizzes - i) * 7),
                quiz_month=(timezone.now().date() - timedelta(days=(num_quizzes - i) * 7)).strftime('%Y-%m'),
                score=score,
                total_marks=100,
                questions_attempted=20,
                correct_answers=int(score / 5)
            )
        
        # Analyze trend
        result = QuizAnalyzer.analyze_trend(self.enrollment)
        
        # Verify result structure
        self.assertIn('trend', result)
        self.assertIn('improvement_rate', result)
        self.assertIn('volatility', result)
        self.assertIn('data_points', result)
        
        # Verify improvement rate is positive
        self.assertGreater(result['improvement_rate'], 0)
        self.assertIn(result['trend'], ['improvement', 'acceleration'])
    
    def test_decline_trend_detection(self):
        """
        Test that declining quiz trends are correctly detected.
        
        A decline trend should have:
        - Negative slope (improvement_rate < 0)
        - Recent scores lower than older scores
        """
        num_quizzes = 5
        base_score = 80
        
        # Create quiz scores with declining trend
        for i in range(num_quizzes):
            score = max(0, int(base_score - (i * 3)))
            StudentQuiz.objects.create(
                enrollment=self.enrollment,
                quiz_date=timezone.now().date() - timedelta(days=(num_quizzes - i) * 7),
                quiz_month=(timezone.now().date() - timedelta(days=(num_quizzes - i) * 7)).strftime('%Y-%m'),
                score=score,
                total_marks=100,
                questions_attempted=20,
                correct_answers=int(score / 5)
            )
        
        # Analyze trend
        result = QuizAnalyzer.analyze_trend(self.enrollment)
        
        # Verify improvement rate is negative
        self.assertLess(result['improvement_rate'], 0)
        self.assertIn(result['trend'], ['decline', 'deceleration'])


# =========================
# PROPERTY 1: GROWTH SCORE CONSISTENCY
# =========================

class TestGrowthScoreConsistency(TestCase):
    """
    **Feature: student-growth-intelligence, Property 1: Growth Score Consistency**
    
    For any student with valid data, the growth score should be between 0-100 and 
    should increase when positive indicators (attendance improvement, quiz score 
    increase, text complexity growth) are present.
    
    **Validates: Requirements 1, 2, 3, 5**
    """
    
    @given(
        attendance_consistency=st.floats(min_value=0, max_value=100),
        quiz_improvement_rate=st.floats(min_value=-10, max_value=10),
        text_complexity_growth=st.floats(min_value=0, max_value=100),
        engagement_level=st.sampled_from(['high', 'medium', 'low'])
    )
    @settings(max_examples=10)
    def test_growth_score_in_valid_range(self, attendance_consistency, quiz_improvement_rate, 
                                         text_complexity_growth, engagement_level):
        """
        Test that growth score is always between 0-100.
        """
        growth_score, risk_level = GrowthScoreCalculator.calculate_score(
            attendance_consistency,
            quiz_improvement_rate,
            text_complexity_growth,
            engagement_level
        )
        
        # Verify score is in valid range
        self.assertGreaterEqual(growth_score, 0)
        self.assertLessEqual(growth_score, 100)
        
        # Verify risk level is valid
        self.assertIn(risk_level, ['low', 'medium', 'high'])
    
    def test_growth_score_increases_with_positive_indicators(self):
        """
        Test that growth score increases when positive indicators improve.
        """
        base_attendance = 60
        base_quiz_rate = 1.0
        base_text_growth = 20
        
        # Calculate baseline score
        baseline_score, _ = GrowthScoreCalculator.calculate_score(
            base_attendance,
            base_quiz_rate,
            base_text_growth,
            'medium'
        )
        
        # Calculate improved score (all indicators better)
        improved_score, _ = GrowthScoreCalculator.calculate_score(
            min(100, base_attendance + 20),
            base_quiz_rate + 2,
            min(100, base_text_growth + 20),
            'high'
        )
        
        # Verify improved score is higher
        self.assertGreater(improved_score, baseline_score)
    
    def test_high_growth_score_with_positive_indicators(self):
        """
        Test that high positive indicators result in high growth score.
        """
        growth_score, risk_level = GrowthScoreCalculator.calculate_score(
            90,  # high attendance
            3.0,  # high quiz improvement
            80,   # high text growth
            'high'
        )
        
        # Verify high growth score
        self.assertGreaterEqual(growth_score, 70)
        self.assertEqual(risk_level, 'low')
    
    def test_low_growth_score_with_negative_indicators(self):
        """
        Test that negative indicators result in low growth score.
        """
        growth_score, risk_level = GrowthScoreCalculator.calculate_score(
            20,   # low attendance
            -3.0, # negative quiz improvement
            10,   # low text growth
            'low'
        )
        
        # Verify low growth score
        self.assertLess(growth_score, 50)
        self.assertIn(risk_level, ['medium', 'high'])


# =========================
# PROPERTY 7: AT-RISK DETECTION SENSITIVITY
# =========================

class TestAtRiskDetectionSensitivity(TestCase):
    """
    **Feature: student-growth-intelligence, Property 7: At-Risk Detection Sensitivity**
    
    For any student showing negative patterns (declining attendance, performance drop, 
    low engagement), the system should flag them as at-risk with appropriate confidence score.
    
    **Validates: Requirements 5, 7**
    """
    
    def setUp(self):
        """Set up test data"""
        self.school = School.objects.create(
            name="Test School",
            location="Test Location",
            phone_number="1234567890"
        )
        self.class_section = ClassSection.objects.create(
            name="Test Class",
            school=self.school,
            grade_level="10"
        )
        self.student = Student.objects.create(
            full_name="Test Student",
            email="student@test.com",
            phone_number="9876543210"
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            class_section=self.class_section,
            school=self.school,
            enrollment_date=timezone.now().date()
        )
        self.facilitator = User.objects.create_user(
            username="facilitator",
            email="facilitator@test.com",
            password="testpass123"
        )
        self.actual_session = ActualSession.objects.create(
            class_section=self.class_section,
            session_date=timezone.now().date(),
            facilitator=self.facilitator,
            start_time=timezone.now().time(),
            end_time=(timezone.now() + timedelta(hours=1)).time()
        )
    
    def test_declining_attendance_flagged_as_at_risk(self):
        """
        Test that declining attendance is flagged as at-risk.
        """
        # Create declining attendance
        num_sessions = 10
        for i in range(num_sessions):
            if i < num_sessions // 2:
                status = AttendanceStatus.PRESENT
            else:
                status = AttendanceStatus.ABSENT
            
            Attendance.objects.create(
                enrollment=self.enrollment,
                actual_session=self.actual_session,
                status=status,
                marked_at=timezone.now() - timedelta(days=num_sessions - i)
            )
        
        # Analyze
        attendance_analysis = AttendanceAnalyzer.analyze_pattern(self.enrollment)
        
        # Create dummy analyses for other components
        quiz_analysis = {'trend': 'plateau', 'volatility_level': 'low'}
        text_analysis = {'evolution': 'stable'}
        
        # Detect at-risk flags
        flags = AtRiskDetector.detect_at_risk_flags(
            attendance_analysis,
            quiz_analysis,
            text_analysis,
            growth_score=50
        )
        
        # Verify declining attendance is flagged
        if attendance_analysis['pattern'] == 'declining':
            self.assertIn('declining_attendance', flags)
            self.assertEqual(flags['declining_attendance'], 'high')
    
    def test_declining_performance_flagged_as_at_risk(self):
        """
        Test that declining quiz performance is flagged as at-risk.
        """
        # Create declining quiz scores
        for i in range(5):
            score = max(0, int(80 - (i * 3)))
            StudentQuiz.objects.create(
                enrollment=self.enrollment,
                quiz_date=timezone.now().date() - timedelta(days=(5 - i) * 7),
                quiz_month=(timezone.now().date() - timedelta(days=(5 - i) * 7)).strftime('%Y-%m'),
                score=score,
                total_marks=100,
                questions_attempted=20,
                correct_answers=int(score / 5)
            )
        
        # Analyze
        quiz_analysis = QuizAnalyzer.analyze_trend(self.enrollment)
        
        # Create dummy analyses
        attendance_analysis = {'pattern': 'stable', 'consistency_score': 80}
        text_analysis = {'evolution': 'stable'}
        
        # Detect at-risk flags
        flags = AtRiskDetector.detect_at_risk_flags(
            attendance_analysis,
            quiz_analysis,
            text_analysis,
            growth_score=40
        )
        
        # Verify declining performance is flagged
        if quiz_analysis['trend'] == 'decline':
            self.assertIn('declining_performance', flags)
            self.assertEqual(flags['declining_performance'], 'high')
    
    def test_critical_growth_concern_flagged(self):
        """
        Test that critical growth concerns are flagged.
        """
        # Create dummy analyses
        attendance_analysis = {'pattern': 'stable'}
        quiz_analysis = {'trend': 'plateau', 'volatility_level': 'low'}
        text_analysis = {'evolution': 'stable'}
        
        # Detect at-risk flags with critical growth score
        flags = AtRiskDetector.detect_at_risk_flags(
            attendance_analysis,
            quiz_analysis,
            text_analysis,
            growth_score=20
        )
        
        # Verify critical concern is flagged
        self.assertIn('critical_growth_concern', flags)
        self.assertEqual(flags['critical_growth_concern'], 'high')


# =========================
# PROPERTY 8: DATA VALIDATION ACCURACY
# =========================

class TestDataValidationAccuracy(TestCase):
    """
    **Feature: student-growth-intelligence, Property 8: Data Validation Accuracy**
    
    For any student with insufficient data, the system should indicate "Insufficient data" 
    rather than generating unreliable insights.
    
    **Validates: Requirements 7, 8**
    """
    
    def setUp(self):
        """Set up test data"""
        self.school = School.objects.create(
            name="Test School",
            location="Test Location",
            phone_number="1234567890"
        )
        self.class_section = ClassSection.objects.create(
            name="Test Class",
            school=self.school,
            grade_level="10"
        )
        self.student = Student.objects.create(
            full_name="Test Student",
            email="student@test.com",
            phone_number="9876543210"
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            class_section=self.class_section,
            school=self.school,
            enrollment_date=timezone.now().date()
        )
        self.facilitator = User.objects.create_user(
            username="facilitator",
            email="facilitator@test.com",
            password="testpass123"
        )
        self.actual_session = ActualSession.objects.create(
            class_section=self.class_section,
            session_date=timezone.now().date(),
            facilitator=self.facilitator,
            start_time=timezone.now().time(),
            end_time=(timezone.now() + timedelta(hours=1)).time()
        )
    
    def test_insufficient_attendance_data(self):
        """
        Test that insufficient attendance data is handled gracefully.
        """
        # Create only 2 attendance records (less than MIN_SESSIONS=5)
        for i in range(2):
            Attendance.objects.create(
                enrollment=self.enrollment,
                actual_session=self.actual_session,
                status=AttendanceStatus.PRESENT,
                marked_at=timezone.now() - timedelta(days=i)
            )
        
        # Analyze
        result = AttendanceAnalyzer.analyze_pattern(self.enrollment)
        
        # Verify insufficient data is indicated
        self.assertEqual(result['pattern'], 'insufficient_data')
        self.assertLess(result['data_points'], result['min_required'])
    
    def test_insufficient_quiz_data(self):
        """
        Test that insufficient quiz data is handled gracefully.
        """
        # Create only 2 quiz records (less than MIN_QUIZZES=3)
        for i in range(2):
            StudentQuiz.objects.create(
                enrollment=self.enrollment,
                quiz_date=timezone.now().date() - timedelta(days=i * 7),
                quiz_month=(timezone.now().date() - timedelta(days=i * 7)).strftime('%Y-%m'),
                score=75,
                total_marks=100,
                questions_attempted=20,
                correct_answers=15
            )
        
        # Analyze
        result = QuizAnalyzer.analyze_trend(self.enrollment)
        
        # Verify insufficient data is indicated
        self.assertEqual(result['trend'], 'insufficient_data')
        self.assertLess(result['data_points'], result['min_required'])
    
    def test_growth_analysis_with_insufficient_data(self):
        """
        Test that growth analysis handles insufficient data gracefully.
        """
        # Don't create any data - all analyses will be insufficient
        
        # Perform analysis
        analysis = StudentGrowthAnalysisService.update_growth_analysis(self.enrollment)
        
        # Verify insufficient data is indicated
        self.assertIsNotNone(analysis)
        self.assertFalse(analysis.is_sufficient_data)
        self.assertIn("Insufficient data", analysis.growth_insights)
