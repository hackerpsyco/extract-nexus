import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Search, Plus, Download, Upload, Eye, Edit, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [sortBy, setSortBy] = useState("");

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
    if (pct >= 85) return { label: "Excellent", className: "bg-success/10 text-success" };
    if (pct >= 70) return { label: "Good", className: "bg-warning/10 text-warning" };
    return { label: "Poor", className: "bg-destructive/10 text-destructive" };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Student Management
          </h2>
          <p className="text-muted-foreground text-sm">Manage students from your assigned schools</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/students/create" className="px-4 py-2 bg-gradient-to-r from-primary to-[hsl(271,47%,48%)] text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 shadow-md flex items-center gap-1">
            <Plus className="w-4 h-4" />Add Student
          </Link>
          <button className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent flex items-center gap-1">
            <Download className="w-4 h-4" />Sample
          </button>
          <button className="px-3 py-2 border border-success/30 text-success rounded-lg text-sm hover:bg-success/10 flex items-center gap-1">
            <Upload className="w-4 h-4" />Import
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-r from-primary/5 to-info/5 border-2 border-primary/20 rounded-xl p-5 mb-6">
        <h6 className="font-semibold mb-4 text-sm">🔍 Filter & Sort Students</h6>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">School</label>
            <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className="w-full border-2 border-border rounded-lg px-3 py-2.5 text-sm">
              <option value="">All Schools</option>
              <option value="1">Delhi Public School</option>
              <option value="2">Kendriya Vidyalaya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Search</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or enrollment..." className="w-full border-2 border-border rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full border-2 border-border rounded-lg px-3 py-2.5 text-sm">
              <option value="">Default</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2.5 bg-gradient-to-r from-primary to-[hsl(271,47%,48%)] text-primary-foreground rounded-lg text-sm font-semibold shadow-md">
              <Search className="w-4 h-4 inline mr-1" />Apply
            </button>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setSearch(""); setSchoolFilter(""); setSortBy(""); }} className="w-full px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-accent">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-[hsl(271,47%,48%)] text-primary-foreground p-4">
          <h5 className="font-semibold">Student List ({filtered.length})</h5>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Enrollment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">School / Class</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Attendance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const badge = getAttendanceBadge(item.attendance_percentage);
                return (
                  <tr key={item.enrollment.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[hsl(271,47%,48%)] flex items-center justify-center text-primary-foreground font-bold text-sm">
                          {item.enrollment.student.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{item.enrollment.student.full_name}</div>
                          <div className="text-xs text-muted-foreground">{item.enrollment.student.gender === "M" ? "♂ Male" : "♀ Female"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-xs">{item.enrollment.student.enrollment_number}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{item.enrollment.school.name}</div>
                      <div className="text-xs text-muted-foreground">{item.enrollment.class_section.display_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {item.attendance_percentage}% ({badge.label})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link to={`/students/${item.enrollment.student.id}`} className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20">
                          <Eye className="w-3 h-3 inline mr-0.5" />View
                        </Link>
                        <Link to={`/students/${item.enrollment.student.id}/edit`} className="px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium hover:bg-accent">
                          <Edit className="w-3 h-3 inline mr-0.5" />Edit
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
        {filtered.map((item) => {
          const badge = getAttendanceBadge(item.attendance_percentage);
          return (
            <div key={item.enrollment.id} className="bg-card rounded-xl shadow-sm border-l-4 border-l-primary border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[hsl(271,47%,48%)] flex items-center justify-center text-primary-foreground font-bold">
                  {item.enrollment.student.full_name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{item.enrollment.student.full_name}</div>
                  <div className="text-xs text-muted-foreground">{item.enrollment.student.enrollment_number} | {item.enrollment.class_section.display_name}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                  {item.attendance_percentage}% Attendance
                </span>
                <div className="flex gap-1">
                  <Link to={`/students/${item.enrollment.student.id}`} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs">View</Link>
                  <Link to={`/students/${item.enrollment.student.id}/edit`} className="px-3 py-1.5 border border-border rounded-lg text-xs">Edit</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
