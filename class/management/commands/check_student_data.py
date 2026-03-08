"""
Check actual student data for growth analysis
"""

from django.core.management.base import BaseCommand
from ...models import Enrollment, Student, Attendance, StudentQuiz, StudentGrowthAnalysis


class Command(BaseCommand):
    help = 'Check actual student data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--student-name',
            type=str,
            default='tamoli',
            help='Student name to check',
        )

    def handle(self, *args, **options):
        student_name = options.get('student_name', 'tamoli')
        
        try:
            student = Student.objects.filter(full_name__icontains=student_name).first()
            if not student:
                self.stdout.write(self.style.ERROR(f'Student "{student_name}" not found'))
                return
            
            enrollment = Enrollment.objects.filter(student=student, is_active=True).first()
            if not enrollment:
                self.stdout.write(self.style.ERROR("No active enrollment"))
                return
            
            self.stdout.write(f"\n{'='*80}")
            self.stdout.write(f"Student: {student.full_name}")
            self.stdout.write(f"{'='*80}\n")
            
            # Check attendance data
            self.stdout.write(self.style.SUCCESS("ATTENDANCE DATA:"))
            attendances = Attendance.objects.filter(enrollment=enrollment).order_by('marked_at')
            for i, att in enumerate(attendances, 1):
                self.stdout.write(f"\n{i}. Date: {att.marked_at.date()}")
                self.stdout.write(f"   Status: {att.status}")
                self.stdout.write(f"   Visible Notes: {att.visible_change_notes}")
                self.stdout.write(f"   Invisible Notes: {att.invisible_change_notes}")
            
            # Check quiz data
            self.stdout.write(f"\n{self.style.SUCCESS('QUIZ DATA:')}")
            quizzes = StudentQuiz.objects.filter(enrollment=enrollment).order_by('quiz_date')
            for i, quiz in enumerate(quizzes, 1):
                self.stdout.write(f"\n{i}. Date: {quiz.quiz_date}")
                self.stdout.write(f"   Score: {quiz.score}/{quiz.total_marks}")
                self.stdout.write(f"   Correct: {quiz.correct_answers}/{quiz.questions_attempted}")
            
            # Check growth analysis
            self.stdout.write(f"\n{self.style.SUCCESS('GROWTH ANALYSIS:')}")
            analysis = StudentGrowthAnalysis.objects.filter(enrollment=enrollment).first()
            if analysis:
                self.stdout.write(f"Growth Score: {analysis.growth_score}")
                self.stdout.write(f"Risk Level: {analysis.risk_level}")
                self.stdout.write(f"Cluster: {analysis.student_cluster}")
                self.stdout.write(f"Engagement: {analysis.engagement_level}")
                self.stdout.write(f"\nInsights:\n{analysis.growth_insights}")
                self.stdout.write(f"\nRecommendations:\n{analysis.recommendations}")
            else:
                self.stdout.write("No analysis found")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
