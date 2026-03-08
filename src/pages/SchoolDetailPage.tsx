import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, MapPin, Users, BookOpen, Plus, Calendar } from "lucide-react";

const mockSchoolDetail = {
  school: { id: "1", name: "Delhi Public School", block: "Rohini", district: "North Delhi", udise: "0912345" },
  classes_with_counts: [
    { class_section: { id: "c1", class_level: "5", section: "A", display_name: "5A", academic_year: "2024-25", school: { id: "1", name: "Delhi Public School" } }, enrollment_count: 32 },
    { class_section: { id: "c2", class_level: "5", section: "B", display_name: "5B", academic_year: "2024-25", school: { id: "1", name: "Delhi Public School" } }, enrollment_count: 28 },
    { class_section: { id: "c3", class_level: "6", section: "A", display_name: "6A", academic_year: "2024-25", school: { id: "1", name: "Delhi Public School" } }, enrollment_count: 30 },
  ],
  grade_levels: ["5", "6"],
};

export default function SchoolDetailPage() {
  const { schoolId } = useParams();
  const data = mockSchoolDetail;
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  const filteredClasses = selectedGrade
    ? data.classes_with_counts.filter((c) => c.class_section.class_level === selectedGrade)
    : data.classes_with_counts;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-3 flex items-center gap-1 font-medium">
        <Link to="/schools" className="hover:text-primary transition-colors">My Schools</Link>
        <span className="mx-1">/</span>
        <span className="text-foreground font-semibold">{data.school.name}</span>
      </nav>

      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            {data.school.name}
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {data.school.block}, {data.school.district} · UDISE: {data.school.udise}
          </p>
        </div>
        <Link to={`/students?school=${data.school.id}`} className="px-4 py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">
          <Users className="w-3.5 h-3.5 inline mr-1" />All Students
        </Link>
      </div>

      {/* Filter */}
      <div className="elevated-card p-4 mb-5">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Filter by Grade</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="border border-input rounded-xl px-3 py-2.5 text-sm bg-background min-w-[150px] focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">All Grades</option>
              {data.grade_levels.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          {selectedGrade && (
            <button onClick={() => setSelectedGrade("")} className="px-3 py-2.5 text-xs text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-medium">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((item, i) => (
          <motion.div
            key={item.class_section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="elevated-card overflow-hidden hover:shadow-lg transition-all"
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-lg">{item.class_section.display_name}</h5>
                    <p className="text-[10px] text-muted-foreground">Grade {item.class_section.class_level}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-lg font-bold">{item.class_section.academic_year}</span>
              </div>

              <div className="bg-primary/5 rounded-xl p-3 text-center mb-3">
                <div className="text-2xl font-extrabold text-primary">{item.enrollment_count}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Students Enrolled</div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border bg-muted/30 space-y-2">
              <Link to={`/students?class=${item.class_section.id}`} className="block text-center py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-all">
                <Users className="w-3.5 h-3.5 inline mr-1" />View Students
              </Link>
              <div className="flex gap-2">
                <Link to="/students/create" className="flex-1 text-center py-2 border border-success/20 text-success rounded-xl text-xs font-bold hover:bg-success/5 transition-colors active:scale-[0.98]">
                  <Plus className="w-3 h-3 inline mr-0.5" />Add
                </Link>
                <Link to="/today-session" className="flex-1 text-center py-2 border border-info/20 text-info rounded-xl text-xs font-bold hover:bg-info/5 transition-colors active:scale-[0.98]">
                  <Calendar className="w-3 h-3 inline mr-0.5" />Sessions
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
