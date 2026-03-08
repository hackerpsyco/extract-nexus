"""
Management command to test growth analysis for a specific student
"""

from django.core.management.base import BaseCommand
from ...models import Enrollment, Student, StudentGrowthAnalysis, Attendance, StudentQuiz
from ...services.student_growth_service import StudentGrowthAnalysisService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Test growth analysis for a specific student'

    def add_arguments(self, parser):
        parser.add_argument(
            '--student-name',
            type=str,
            default='piyush',
            help='Student name to test (default: piyush)',
        )

    def handle(self, *args, **options):
        student_name = options.get('student_name', 'piyush')
        
        try:
            # Find student
            student = Student.objects.filter(full_name__icontains=student_name).first()
            if not student:
                self.stdout.write(self.style.ERROR(f'Student "{student_name}" not found'))
                return
            
            self.stdout.write(f"\n✓ Found student: {student.full_name}")
            
            # Get enrollment
            enrollment = Enrollment.objects.filter(student=student, is_active=True).first()
            if not enrollment:
                self.stdout.write(self.style.ERROR("✗ No active enrollment found"))
                return
            
            self.stdout.write(f"✓ Found enrollment: {enrollment.id}")
            
            # Check existing data
            attendance_count = Attendance.objects.filter(enrollment=enrollment).count()
            quiz_count = StudentQuiz.objects.filter(enrollment=enrollment).count()
            
            self.stdout.write(f"✓ Attendance records: {attendance_count}")
            self.stdout.write(f"✓ Quiz records: {quiz_count}")
            
            # Try to create growth analysis
            self.stdout.write("\n→ Triggering growth analysis...")
            analysis = StudentGrowthAnalysisService.update_growth_analysis(enrollment)
            
            if analysis:
                self.stdout.write(self.style.SUCCESS("✓ Growth analysis created/updated!"))
                self.stdout.write(f"  - Growth Score: {analysis.growth_score}")
                self.stdout.write(f"  - Risk Level: {analysis.risk_level}")
                self.stdout.write(f"  - Cluster: {analysis.student_cluster}")
                self.stdout.write(f"  - Engagement: {analysis.engagement_level}")
                self.stdout.write(f"  - Data Points: {analysis.data_points_used}")
            else:
                self.stdout.write(self.style.ERROR("✗ Failed to create growth analysis"))
            
            # Verify it's in the database
            db_analysis = StudentGrowthAnalysis.objects.filter(enrollment=enrollment).first()
            if db_analysis:
                self.stdout.write(self.style.SUCCESS("\n✓ Growth analysis found in database!"))
                self.stdout.write(f"  - ID: {db_analysis.id}")
                self.stdout.write(f"  - Analysis Date: {db_analysis.analysis_date}")
            else:
                self.stdout.write(self.style.ERROR("\n✗ Growth analysis NOT found in database"))
                
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            self.stdout.write(self.style.ERROR(f"✗ Error: {e}"))
