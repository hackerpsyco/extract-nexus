import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Edit, Users as UsersIcon, ChevronRight, Plus, Phone } from "lucide-react";
import StudentGrowthCard from "@/components/StudentGrowthCard";

const mockGrowthAnalysis = {
  growth_score: 72,
  risk_level: "low" as const,
  student_cluster: "consistent_improver",
  engagement_level: "high" as const,
  attendance_consistency: 88,
  quiz_improvement_rate: 12.5,
  text_complexity_growth: 65,
  insights: "Aarav shows consistent improvement across all metrics. Attendance is strong at 92.5%, and quiz scores have improved by 12.5% over the last 3 months. Written responses are becoming more detailed and complex.",
  recommendations: "Continue current learning pace. Consider advanced reading materials to challenge text complexity further. Encourage peer mentoring given strong performance.",
  at_risk_flags: {},
  data_points_used: 47,
};

const mockDetail = {
  student: { id: "s1", full_name: "Aarav Sharma", enrollment_number: "EN001", gender: "M" },
  enrollment: {
    id: "e1",
    school: { id: "1", name: "Delhi Public School" },
    class_section: { id: "c1", display_name: "5A", class_level: "5", section: "A", academic_year: "2024-25", school: { id: "1", name: "Delhi Public School" } },
    is_active: true,
    start_date: "2024-04-01",
    student: { id: "s1", full_name: "Aarav Sharma", enrollment_number: "EN001", gender: "M" },
  },
  stats: { total_sessions: 40, present_count: 37, absent_count: 3, attendance_percentage: 92.5 },
  attendance_records: [
    { date: "2024-12-20", status: "present", session_title: "Day 42", day_number: 42 },
    { date: "2024-12-19", status: "present", session_title: "Day 41", day_number: 41 },
    { date: "2024-12-18", status: "absent", session_title: "Day 40", day_number: 40 },
    { date: "2024-12-17", status: "present", session_title: "Day 39", day_number: 39 },
  ],
  guardians: [
    { id: "g1", name: "Raj Sharma", relationship: "Father", phone: "+91 98765 43210" },
  ],
};

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const data = mockDetail;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-2">
        <Link to="/students" className="hover:text-primary">Students</Link>
        <ChevronRight className="w-3 h-3 inline mx-1" />
        <span>{data.student.full_name}</span>
      </nav>

      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {data.student.full_name}
          </h2>
          <p className="text-sm text-muted-foreground">Student Details & Attendance</p>
        </div>
        <Link to={`/students/${data.student.id}/edit`} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Edit className="w-3.5 h-3.5 inline mr-1" />Edit
        </Link>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left: Info + Guardians */}
        <div className="lg:col-span-2 space-y-4">
          {/* Student Info */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-sm font-semibold">Student Information</div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {data.student.full_name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{data.student.full_name}</div>
                  <span className="px-2 py-0.5 bg-info/10 text-info text-xs rounded-full">{data.enrollment.class_section.display_name}</span>
                </div>
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-3 text-center gap-0 mb-3 pb-3 border-b border-border">
                <div>
                  <div className="font-bold text-success">{data.stats.present_count}</div>
                  <div className="text-[10px] text-muted-foreground">Present</div>
                </div>
                <div className="border-x border-border">
                  <div className="font-bold text-destructive">{data.stats.absent_count}</div>
                  <div className="text-[10px] text-muted-foreground">Absent</div>
                </div>
                <div>
                  <div className="font-bold text-primary">{data.stats.attendance_percentage}%</div>
                  <div className="text-[10px] text-muted-foreground">Rate</div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm">
                {[
                  ["Enrollment No.", data.student.enrollment_number],
                  ["Gender", data.student.gender === "M" ? "♂ Male" : "♀ Female"],
                  ["School", data.enrollment.school.name],
                  ["Academic Year", data.enrollment.class_section.academic_year],
                  ["Status", data.enrollment.is_active ? "Active" : "Inactive"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="text-xs font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guardians */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex justify-between items-center">
              <span className="text-sm font-semibold"><UsersIcon className="w-4 h-4 inline mr-1 text-primary" />Guardians</span>
              <button className="px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs"><Plus className="w-3 h-3 inline" /> Add</button>
            </div>
            <div className="p-4">
              {data.guardians.map((g) => (
                <div key={g.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{g.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{g.relationship}</div>
                  </div>
                  <a href={`tel:${g.phone}`} className="text-primary text-xs"><Phone className="w-3.5 h-3.5" /></a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Attendance */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-sm font-semibold">Attendance Statistics</div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Total Sessions", value: data.stats.total_sessions, color: "text-primary" },
                  { label: "Present", value: data.stats.present_count, color: "text-success" },
                  { label: "Absent", value: data.stats.absent_count, color: "text-destructive" },
                  { label: "Rate", value: `${data.stats.attendance_percentage}%`, color: "text-info" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2 bg-muted/50 rounded-lg">
                    <div className={`font-bold text-lg ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Records */}
              <h6 className="font-semibold text-sm mb-2">Recent Attendance</h6>
              <div className="space-y-2">
                {data.attendance_records.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                      r.status === "present" ? "border-l-success bg-success/5" : "border-l-destructive bg-destructive/5"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{r.session_title}</div>
                      <div className="text-xs text-muted-foreground">{r.date}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === "present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {r.status === "present" ? "✓ Present" : "✗ Absent"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
