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
  insights: "Aarav shows consistent improvement across all metrics. Attendance is strong at 92.5%, and quiz scores have improved by 12.5% over the last 3 months.",
  recommendations: "Continue current learning pace. Consider advanced reading materials to challenge text complexity further.",
  at_risk_flags: {},
  data_points_used: 47,
};

const mockDetail = {
  student: { id: "s1", full_name: "Aarav Sharma", enrollment_number: "EN001", gender: "M" },
  enrollment: {
    id: "e1",
    school: { id: "1", name: "Delhi Public School" },
    class_section: { id: "c1", display_name: "5A", class_level: "5", section: "A", academic_year: "2024-25", school: { id: "1", name: "Delhi Public School" } },
    is_active: true, start_date: "2024-04-01",
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
      <nav className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
        <Link to="/students" className="hover:text-primary transition-colors font-medium">Students</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-semibold">{data.student.full_name}</span>
      </nav>

      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-md shadow-primary/20">
            {data.student.full_name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-extrabold">{data.student.full_name}</h2>
            <p className="text-xs text-muted-foreground">{data.enrollment.class_section.display_name} · {data.enrollment.school.name}</p>
          </div>
        </div>
        <Link to={`/students/${data.student.id}/edit`} className="px-4 py-2 gradient-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">
          <Edit className="w-3.5 h-3.5 inline mr-1" />Edit
        </Link>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Student Info */}
          <div className="elevated-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Student Info
            </div>
            <div className="p-4">
              {/* Mini Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-success/10 rounded-xl p-2.5 text-center">
                  <div className="font-extrabold text-success text-lg">{data.stats.present_count}</div>
                  <div className="text-[9px] text-muted-foreground font-medium">Present</div>
                </div>
                <div className="bg-destructive/10 rounded-xl p-2.5 text-center">
                  <div className="font-extrabold text-destructive text-lg">{data.stats.absent_count}</div>
                  <div className="text-[9px] text-muted-foreground font-medium">Absent</div>
                </div>
                <div className="bg-primary/10 rounded-xl p-2.5 text-center">
                  <div className="font-extrabold text-primary text-lg">{data.stats.attendance_percentage}%</div>
                  <div className="text-[9px] text-muted-foreground font-medium">Rate</div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                {[
                  ["Enrollment", data.student.enrollment_number],
                  ["Gender", data.student.gender === "M" ? "♂ Male" : "♀ Female"],
                  ["School", data.enrollment.school.name],
                  ["Year", data.enrollment.class_section.academic_year],
                  ["Status", data.enrollment.is_active ? "Active" : "Inactive"],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guardians */}
          <div className="elevated-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5 text-primary" /> Guardians
              </span>
              <button className="px-2.5 py-1 gradient-primary text-primary-foreground rounded-lg text-[10px] font-bold"><Plus className="w-3 h-3 inline" /> Add</button>
            </div>
            <div className="p-4">
              {data.guardians.map((g) => (
                <div key={g.id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-xs font-bold">{g.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-[10px] text-muted-foreground">{g.relationship}</div>
                  </div>
                  <a href={`tel:${g.phone}`} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Attendance */}
          <div className="elevated-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Recent Attendance
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Total", value: data.stats.total_sessions, color: "text-primary", bg: "bg-primary/10" },
                  { label: "Present", value: data.stats.present_count, color: "text-success", bg: "bg-success/10" },
                  { label: "Absent", value: data.stats.absent_count, color: "text-destructive", bg: "bg-destructive/10" },
                  { label: "Rate", value: `${data.stats.attendance_percentage}%`, color: "text-info", bg: "bg-info/10" },
                ].map((s) => (
                  <div key={s.label} className={`text-center p-2.5 ${s.bg} rounded-xl`}>
                    <div className={`font-extrabold text-lg ${s.color}`}>{s.value}</div>
                    <div className="text-[9px] text-muted-foreground font-medium">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {data.attendance_records.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-xl border-l-4 ${
                      r.status === "present" ? "border-l-success bg-success/5" : "border-l-destructive bg-destructive/5"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{r.session_title}</div>
                      <div className="text-[10px] text-muted-foreground">{r.date}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      r.status === "present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {r.status === "present" ? "✓ Present" : "✗ Absent"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Growth Intelligence */}
          <StudentGrowthCard analysis={mockGrowthAnalysis} />
        </div>
      </div>
    </div>
  );
}
