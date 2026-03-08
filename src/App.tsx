import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import FacilitatorLayout from "@/layouts/FacilitatorLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import SchoolsListPage from "@/pages/SchoolsListPage";
import SchoolDetailPage from "@/pages/SchoolDetailPage";
import ClassesListPage from "@/pages/ClassesListPage";
import StudentsListPage from "@/pages/StudentsListPage";
import StudentDetailPage from "@/pages/StudentDetailPage";
import StudentCreatePage from "@/pages/StudentCreatePage";
import StudentImportPage from "@/pages/StudentImportPage";
import TodaySessionPage from "@/pages/TodaySessionPage";
import ClassTodaySessionPage from "@/pages/ClassTodaySessionPage";
import SessionCalendarPage from "@/pages/SessionCalendarPage";
import MarkAttendancePage from "@/pages/MarkAttendancePage";
import MyAttendancePage from "@/pages/MyAttendancePage";
import AttendanceFilterPage from "@/pages/AttendanceFilterPage";
import CurriculumPage from "@/pages/CurriculumPage";
import PerformancePage from "@/pages/PerformancePage";
import PerformanceDetailPage from "@/pages/PerformanceDetailPage";
import PerformanceCutoffPage from "@/pages/PerformanceCutoffPage";
import SettingsPage from "@/pages/SettingsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <FacilitatorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/schools" element={<SchoolsListPage />} />
          <Route path="/schools/:schoolId" element={<SchoolDetailPage />} />
          <Route path="/classes" element={<ClassesListPage />} />
          <Route path="/students" element={<StudentsListPage />} />
          <Route path="/students/create" element={<StudentCreatePage />} />
          <Route path="/students/import/:classId" element={<StudentImportPage />} />
          <Route path="/students/:studentId" element={<StudentDetailPage />} />
          <Route path="/students/:studentId/edit" element={<StudentCreatePage />} />
          <Route path="/today-session" element={<TodaySessionPage />} />
          <Route path="/today-session/:classId" element={<ClassTodaySessionPage />} />
          <Route path="/session-calendar" element={<SessionCalendarPage />} />
          <Route path="/attendance" element={<AttendanceFilterPage />} />
          <Route path="/attendance/mark/:sessionId" element={<MarkAttendancePage />} />
          <Route path="/my-attendance" element={<MyAttendancePage />} />
          <Route path="/curriculum/:classId" element={<CurriculumPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/performance/:classId" element={<PerformancePage />} />
          <Route path="/performance/:classId/:studentId" element={<PerformanceDetailPage />} />
          <Route path="/performance/:classId/cutoff" element={<PerformanceCutoffPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
