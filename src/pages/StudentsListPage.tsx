import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Search, Plus, Download, Upload, Eye, Edit, Filter } from "lucide-react";

const mockStudents = [
  { enrollment: { id: "e1", student: { id: "s1", full_name: "Aarav Sharma", enrollment_number: "EN001", gender: "M" }, class_section: { id: "c1", display_name: "5A", class_level: "5", section: "A", school: { id: "1", name: "Delhi Public School" } }, school: { id: "1", name: "Delhi Public School" }, is_active: true }, total_sessions: 40, present_count: 37, absent_count: 3, attendance_percentage: 92.5 },
  { enrollment: { id: "e2", student: { id: "s2", full_name: "Priya Patel", enrollment_number: "EN002", gender: "F" }, class_section: { id: "c1", display_name: "5A", class_level: "5", section: "A", school: { id: "1", name: "Delhi Public School" } }, school: { id: "1", name: "Delhi Public School" }, is_active: true }, total_sessions: 40, present_count: 35, absent_count: 5, attendance_percentage: 87.5 },
  { enrollment: { id: "e3", student: { id: "s3", full_name: "Rahul Kumar", enrollment_number: "EN003", gender: "M" }, class_section: { id: "c2", display_name: "5B", class_level: "5", section: "B", school: { id: "1", name: "Delhi Public School" } }, school: { id: "1", name: "Delhi Public School" }, is_active: true }, total_sessions: 40, present_count: 28, absent_count: 12, attendance_percentage: 70.0 },
  { enrollment: { id: "e4", student: { id: "s4", full_name: "Ananya Singh", enrollment_number: "EN004", gender: "F" }, class_section: { id: "c3", display_name: "6A", class_level: "6", section: "A", school: { id: "1", name: "Delhi Public School" } }, school: { id: "1", name: "Delhi Public School" }, is_active: true }, total_sessions: 40, present_count: 22, absent_count: 18, attendance_percentage: 55.0 },
  { enrollment: { id: "e5", student: { id: "s5", full_name: "Vikram Verma", enrollment_number: "EN005", gender: "M" }, class_section: { id: "c4", display_name: "4A", class_level: "4", section: "A", school: { id: "2", name: "Kendriya Vidyalaya" } }, school: { id: "2", name: "Kendriya Vidyalaya" }, is_active: true }, total_sessions: 40, present_count: 38, absent_count: 2, attendance_percentage: 95.0 },
];

export default function StudentsListPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [schoolFilter, setSchoolFilter] = useState(searchParams.get("school") || "");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = mockStudents
    .filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        return s.enrollment.student.full_name.toLowerCase().includes(q) || s.enrollment.student.enrollment_number.toLowerCase().includes(q);
      }
      return true;
    })
    .filter((s) => !schoolFilter || s.enrollment.school.id === schoolFilter);

  const getAttendanceBadge = (pct: number) => {
    if (pct >= 85) return { label: "Excellent", bg: "bg-success/10", text: "text-success" };
    if (pct >= 70) return { label: "Good", bg: "bg-warning/10", text: "text-warning" };
    return { label: "At Risk", bg: "bg-destructive/10", text: "text-destructive" };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            Students
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Manage students from your assigned schools</p>
        </div>
        <div className="flex gap-2">
          <Link to="/students/create" className="px-4 py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-1.5 active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4" />Add Student
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="elevated-card p-4 mb-5">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full border border-input rounded-xl py-2.5 pl-9 pr-4 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 rounded-xl border text-sm font-medium transition-colors ${showFilters ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex gap-2 flex-wrap">
            <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className="border border-input rounded-xl px-3 py-2 text-sm bg-background">
              <option value="">All Schools</option>
              <option value="1">Delhi Public School</option>
              <option value="2">Kendriya Vidyalaya</option>
            </select>
            {schoolFilter && (
              <button onClick={() => setSchoolFilter("")} className="px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                Clear filters
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Student Count */}
      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{filtered.length} students found</p>

      {/* Desktop Table */}
      <div className="hidden md:block elevated-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">School / Class</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attendance</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const badge = getAttendanceBadge(item.attendance_percentage);
                return (
                  <tr key={item.enrollment.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                          {item.enrollment.student.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{item.enrollment.student.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">{item.enrollment.student.gender === "M" ? "♂ Male" : "♀ Female"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{item.enrollment.student.enrollment_number}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium">{item.enrollment.school.name}</div>
                      <div className="text-muted-foreground">{item.enrollment.class_section.display_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${badge.bg} ${badge.text}`}>
                        {item.attendance_percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Link to={`/students/${item.enrollment.student.id}`} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link to={`/students/${item.enrollment.student.id}/edit`} className="p-2 rounded-lg bg-muted hover:bg-accent transition-colors text-muted-foreground">
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((item, i) => {
          const badge = getAttendanceBadge(item.attendance_percentage);
          return (
            <motion.div
              key={item.enrollment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="elevated-card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {item.enrollment.student.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{item.enrollment.student.full_name}</div>
                  <div className="text-[10px] text-muted-foreground">{item.enrollment.student.enrollment_number} · {item.enrollment.class_section.display_name}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badge.bg} ${badge.text}`}>
                  {item.attendance_percentage}%
                </span>
              </div>
              <div className="flex gap-2">
                <Link to={`/students/${item.enrollment.student.id}`} className="flex-1 text-center py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold active:scale-[0.98] transition-transform">
                  View Details
                </Link>
                <Link to={`/students/${item.enrollment.student.id}/edit`} className="py-2.5 px-4 border border-input rounded-xl text-xs font-medium text-muted-foreground active:scale-[0.98] transition-transform">
                  Edit
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
