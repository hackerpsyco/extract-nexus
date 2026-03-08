import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, AlertTriangle, Briefcase, Calendar } from "lucide-react";

interface ClassItem {
  class_section: { id: string; display_name: string; class_level: string; section: string; school: { id: string; name: string } };
  class_sections: { id: string; display_name: string }[];
  today_status: "session" | "holiday" | "office_work";
}

const mockClasses: ClassItem[] = [
  {
    class_section: { id: "c1", display_name: "5A", class_level: "5", section: "A", school: { id: "1", name: "Delhi Public School" } },
    class_sections: [{ id: "c1", display_name: "5A" }],
    today_status: "session" as const,
  },
  {
    class_section: { id: "c2", display_name: "5B", class_level: "5", section: "B", school: { id: "1", name: "Delhi Public School" } },
    class_sections: [{ id: "c2", display_name: "5B" }],
    today_status: "session" as const,
  },
  {
    class_section: { id: "c3", display_name: "4A", class_level: "4", section: "A", school: { id: "2", name: "Kendriya Vidyalaya" } },
    class_sections: [{ id: "c3", display_name: "4A" }, { id: "c5", display_name: "4B" }],
    today_status: "session" as const,
  },
  {
    class_section: { id: "c4", display_name: "3A", class_level: "3", section: "A", school: { id: "2", name: "Kendriya Vidyalaya" } },
    class_sections: [{ id: "c4", display_name: "3A" }],
    today_status: "holiday" as const,
  },
];

export default function ClassesListPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">My Classes</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClasses.map((item, i) => (
          <motion.div
            key={item.class_section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-xl border shadow-sm overflow-hidden"
          >
            <div className="p-4">
              <h6 className="font-bold text-sm mb-1">{item.class_section.school.name}</h6>

              {item.class_sections.length > 1 ? (
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground mb-1">Grouped Classes ({item.class_sections.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {item.class_sections.map((cls) => (
                      <span key={cls.id} className="px-2 py-0.5 bg-info/10 text-info text-xs rounded-full font-medium">
                        {cls.display_name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm mb-2 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  {item.class_section.display_name}
                </p>
              )}

              {/* Status Badge */}
              {item.today_status === "holiday" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning text-xs rounded-full font-medium mb-3">
                  <AlertTriangle className="w-3 h-3" /> Holiday Today
                </span>
              ) : item.today_status === "office_work" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-info/10 text-info text-xs rounded-full font-medium mb-3">
                  <Briefcase className="w-3 h-3" /> Office Work Today
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-xs rounded-full font-medium mb-3">
                  <Calendar className="w-3 h-3" /> Session Today
                </span>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-2">
                {item.today_status === "holiday" ? (
                  <Link to="/session-calendar" className="flex-1 text-center px-3 py-2 bg-warning text-warning-foreground rounded-lg text-sm font-medium hover:opacity-90">
                    Holiday Info
                  </Link>
                ) : item.today_status === "office_work" ? (
                  <Link to="/session-calendar" className="flex-1 text-center px-3 py-2 bg-info text-info-foreground rounded-lg text-sm font-medium hover:opacity-90">
                    Office Work
                  </Link>
                ) : (
                  <Link
                    to={`/today-session/${item.class_sections[0].id}`}
                    className="flex-1 text-center px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                  >
                    {item.class_sections.length > 1 ? "Today's Session (Group)" : "Today's Session"}
                  </Link>
                )}

                <Link
                  to={`/curriculum/${item.class_section.id}`}
                  className="flex-1 text-center px-3 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90"
                >
                  <BookOpen className="w-4 h-4 inline mr-1" />Curriculum
                </Link>
              </div>
            </div>
          </motion.div>
        ))}

        {mockClasses.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">No classes assigned yet.</p>
        )}
      </div>
    </div>
  );
}
