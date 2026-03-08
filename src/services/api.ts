// Django API Service Layer
// Update DJANGO_API_URL when your Django backend is deployed

const DJANGO_API_URL = localStorage.getItem("django_api_url") || "https://your-django-app.onrender.com";

export function setApiUrl(url: string) {
  localStorage.setItem("django_api_url", url);
}

export function getApiUrl() {
  return localStorage.getItem("django_api_url") || DJANGO_API_URL;
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem("auth_token");
  const csrfToken = localStorage.getItem("csrf_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Token ${token}`;
  if (csrfToken) headers["X-CSRFToken"] = csrfToken;
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
    credentials: "include",
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || error.error || "Request failed");
  }
  return res.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request("/logout/", { method: "POST" }),
  sessionCheck: () => request<{ authenticated: boolean; user: User }>("/api/session/check/"),
};

// Dashboard
export const dashboardApi = {
  getStats: () => request<DashboardStats>("/api/facilitator/dashboard/stats/"),
  getAttendancePerformance: () => request<ClassAttendanceStat[]>("/api/facilitator/dashboard/attendance-performance/"),
};

// Schools
export const schoolsApi = {
  list: () => request<SchoolWithCounts[]>("/api/facilitator/schools/"),
  detail: (id: string) => request<SchoolDetail>(`/api/facilitator/schools/${id}/`),
};

// Classes
export const classesApi = {
  list: () => request<ClassItem[]>("/api/facilitator/classes/"),
  getBySchool: (schoolId: string) =>
    request<{ classes: ClassSection[] }>(`/facilitator/ajax/school-classes/?school_id=${schoolId}`),
};

// Students
export const studentsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<StudentListResponse>(`/api/facilitator/students/${query}`);
  },
  detail: (id: string) => request<StudentDetail>(`/api/facilitator/students/${id}/detail/`),
  create: (data: CreateStudentData) =>
    request<{ success: boolean }>("/api/facilitator/students/create/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<CreateStudentData>) =>
    request<{ success: boolean }>(`/api/facilitator/students/${id}/edit/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Sessions
export const sessionsApi = {
  getToday: () => request<TodaySessionData>("/api/facilitator/today-session/"),
  startSession: (plannedSessionId: string) =>
    request<{ actual_session_id: string }>(`/facilitator/session/start/${plannedSessionId}/`, { method: "POST" }),
};

// Attendance
export const attendanceApi = {
  getForSession: (sessionId: string) => request<AttendanceData>(`/facilitator/session/${sessionId}/attendance/`),
  markAttendance: (sessionId: string, data: AttendanceSubmission) =>
    request(`/facilitator/session/${sessionId}/attendance/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getMyAttendance: () => request<MyAttendanceData>("/api/facilitator/my-attendance/"),
  markFacilitatorAttendance: (sessionId: string, status: string) =>
    request(`/facilitator/session/${sessionId}/facilitator-attendance/`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  filter: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<AttendanceFilterData>(`/api/facilitator/attendance/?${query}`);
  },
};

// Curriculum
export const curriculumApi = {
  getSession: (classId: string) => request<CurriculumData>(`/api/facilitator/curriculum/${classId}/`),
  getContent: (day: number, language: string) =>
    request<{ content: string }>(`/api/curriculum/content/?day=${day}&language=${language}`),
};

// Performance
export const performanceApi = {
  getClassSelect: () => request<ClassSection[]>("/api/facilitator/performance/classes/"),
  getList: (classId: string) => request<PerformanceData>(`/api/facilitator/performance/${classId}/`),
  getDetail: (classId: string, studentId: string) =>
    request<PerformanceDetail>(`/api/facilitator/performance/${classId}/${studentId}/`),
  save: (classId: string, studentId: string, data: PerformanceSaveData) =>
    request(`/api/facilitator/performance/${classId}/${studentId}/save/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: { name: string };
  created_at?: string;
  last_login?: string;
}

export interface DashboardStats {
  total_schools: number;
  total_classes: number;
  total_students: number;
  conducted_sessions: number;
}

export interface ClassAttendanceStat {
  class_section: { school: { name: string }; display_name: string };
  total_students: number;
  attendance_rate: number;
}

export interface SchoolWithCounts {
  school: {
    id: string;
    name: string;
    block: string;
    district: string;
    udise: string;
    latitude?: number;
    longitude?: number;
  };
  enrollment_count: number;
  class_count: number;
}

export interface SchoolDetail {
  school: SchoolWithCounts["school"];
  classes_with_counts: {
    class_section: ClassSection;
    enrollment_count: number;
  }[];
  grade_levels: string[];
}

export interface ClassSection {
  id: string;
  class_level: string;
  section: string;
  display_name: string;
  academic_year?: string;
  school: { id: string; name: string };
}

export interface ClassItem {
  class_section: ClassSection;
  class_sections?: ClassSection[];
  today_status: "session" | "holiday" | "office_work";
}

export interface StudentListResponse {
  enrollments: StudentEnrollment[];
  enrollment_stats: EnrollmentStat[];
  schools: { id: string; name: string }[];
  classes: ClassSection[];
  grade_levels: string[];
  filters: Record<string, string>;
  page: number;
  total_pages: number;
}

export interface StudentEnrollment {
  id: string;
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    gender: string;
  };
  class_section: ClassSection;
  school: { id: string; name: string };
  is_active: boolean;
}

export interface EnrollmentStat {
  enrollment: StudentEnrollment;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface StudentDetail {
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    gender: string;
  };
  enrollment: StudentEnrollment;
  stats: {
    total_sessions: number;
    present_count: number;
    absent_count: number;
    attendance_percentage: number;
  };
  attendance_records: AttendanceRecord[];
  guardians: Guardian[];
}

export interface AttendanceRecord {
  date: string;
  status: string;
  session_title: string;
  day_number: number;
}

export interface Guardian {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface CreateStudentData {
  full_name: string;
  enrollment_number: string;
  gender: string;
  school: string;
  class_section: string;
}

export interface TodaySessionData {
  today: string;
  holiday_today?: { holiday_name: string };
  classes_today: TodayClassInfo[];
}

export interface TodayClassInfo {
  status: "session" | "holiday" | "office_work";
  class_section: ClassSection;
  class_sections?: ClassSection[];
  planned_session?: {
    id: string;
    day_number: number;
    title: string;
  };
  actual_session?: {
    id: string;
    status: string;
  };
  attendance_summary?: {
    present: number;
    absent: number;
  };
  calendar_date?: {
    time?: string;
  };
}

export interface AttendanceData {
  session: {
    id: string;
    date: string;
    planned_session: {
      title: string;
      day_number: number;
      class_section: ClassSection & { school: { name: string } };
    };
  };
  enrollments: {
    id: string;
    student: { id: string; full_name: string; enrollment_number: string };
    current_status?: string;
    visible_change?: string;
    invisible_change?: string;
  }[];
}

export interface AttendanceSubmission {
  attendance: {
    enrollment_id: string;
    status: string;
    visible_change?: string;
    invisible_change?: string;
  }[];
}

export interface MyAttendanceData {
  sessions: {
    id: string;
    date: string;
    planned_session: { title: string; day_number: number };
    facilitator_status: string;
    class_section: ClassSection;
  }[];
  stats: {
    total: number;
    present: number;
    absent: number;
    leave: number;
  };
}

export interface AttendanceFilterData {
  records: AttendanceRecord[];
  schools: { id: string; name: string }[];
  class_sections: ClassSection[];
}

export interface CurriculumData {
  class_section: ClassSection & { school: { name: string } };
  current_day: number;
}

export interface PerformanceData {
  class_section: ClassSection;
  performance_data: {
    student: { id: string; full_name: string; enrollment_number: string };
    summary?: {
      rank: number;
      average_score: number;
      passed_subjects: number;
      failed_subjects: number;
      is_passed: boolean;
    };
  }[];
  cutoff?: {
    passing_score: number;
    good_score: number;
    excellent_score: number;
  };
}

export interface PerformanceDetail {
  student: { id: string; full_name: string };
  performances: {
    subject: string;
    score: number;
  }[];
}

export interface PerformanceSaveData {
  performances: { subject: string; score: number }[];
}
