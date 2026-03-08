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
      {/* Breadcrumb & Header */}
      <nav className="text-sm text-muted-foreground mb-2">
        <Link to="/schools" className="hover:text-primary">My Schools</Link>
        <span className="mx-2">/</span>
        <span>{data.school.name}</span>
      </nav>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            {data.school.name}
          </h2>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {data.school.block}, {data.school.district} | UDISE: {data.school.udise}
          </p>
        </div>
        <Link to={`/students?school=${data.school.id}`} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          <Users className="w-4 h-4 inline mr-1" />View All Students
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Grade Level</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="border border-input rounded-lg px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">All Grades</option>
              {data.grade_levels.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
          {selectedGrade && (
            <button onClick={() => setSelectedGrade("")} className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((item, i) => (
          <motion.div
            key={item.class_section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-success" />
                  Class {item.class_section.display_name}
                </h5>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{item.class_section.academic_year}</span>
              </div>
              <p className="text-muted-foreground text-sm mb-1">Grade Level: {item.class_section.class_level}</p>
              {item.class_section.section && <p className="text-muted-foreground text-sm mb-3">Section: {item.class_section.section}</p>}
              <div className="text-center py-2">
                <div className="text-2xl font-bold text-primary">{item.enrollment_count}</div>
                <div className="text-xs text-muted-foreground">Enrolled Students</div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border bg-muted/30 space-y-2">
              <Link to={`/students?class=${item.class_section.id}`} className="block text-center px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                <Users className="w-3.5 h-3.5 inline mr-1" />View Students ({item.enrollment_count})
              </Link>
              <div className="flex gap-2">
                <Link to="/students/create" className="flex-1 text-center px-2 py-1.5 border border-success/30 text-success rounded-lg text-xs font-medium hover:bg-success/10">
                  <Plus className="w-3 h-3 inline mr-0.5" />Add Student
                </Link>
                <Link to="/today-session" className="flex-1 text-center px-2 py-1.5 border border-info/30 text-info rounded-lg text-xs font-medium hover:bg-info/10">
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

import { useState } from "react";
