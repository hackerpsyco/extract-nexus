import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, AlertTriangle, Briefcase, Calendar, Play } from "lucide-react";

interface ClassItem {
  class_section: { id: string; display_name: string; class_level: string; section: string; school: { id: string; name: string } };
  class_sections: { id: string; display_name: string }[];
  today_status: "session" | "holiday" | "office_work";
}

const mockClasses: ClassItem[] = [
  { class_section: { id: "c1", display_name: "5A", class_level: "5", section: "A", school: { id: "1", name: "Delhi Public School" } }, class_sections: [{ id: "c1", display_name: "5A" }], today_status: "session" },
  { class_section: { id: "c2", display_name: "5B", class_level: "5", section: "B", school: { id: "1", name: "Delhi Public School" } }, class_sections: [{ id: "c2", display_name: "5B" }], today_status: "session" },
  { class_section: { id: "c3", display_name: "4A", class_level: "4", section: "A", school: { id: "2", name: "Kendriya Vidyalaya" } }, class_sections: [{ id: "c3", display_name: "4A" }, { id: "c5", display_name: "4B" }], today_status: "session" },
  { class_section: { id: "c4", display_name: "3A", class_level: "3", section: "A", school: { id: "2", name: "Kendriya Vidyalaya" } }, class_sections: [{ id: "c4", display_name: "3A" }], today_status: "holiday" },
];

const statusConfig = {
  session: { icon: Calendar, label: "Session Today", bg: "bg-success/10", text: "text-success" },
  holiday: { icon: AlertTriangle, label: "Holiday Today", bg: "bg-warning/10", text: "text-warning" },
  office_work: { icon: Briefcase, label: "Office Work", bg: "bg-info/10", text: "text-info" },
};

export default function ClassesListPage() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          My Classes
        </h2>
        <p className="text-muted-foreground text-sm mt-1">{mockClasses.length} classes assigned</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClasses.map((item, i) => {
          const config = statusConfig[item.today_status];
          return (
            <motion.div
              key={item.class_section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="elevated-card overflow-hidden"
            >
              <div className="p-4">
                {/* School name & class badge */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.class_section.school.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl font-extrabold text-foreground">{item.class_section.display_name}</span>
                      {item.class_sections.length > 1 && (
                        <span className="px-2 py-0.5 bg-info/10 text-info text-[10px] rounded-full font-bold">
                          +{item.class_sections.length - 1} grouped
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`${config.bg} ${config.text} p-2 rounded-xl`}>
                    <config.icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Status */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${config.bg} ${config.text} text-[10px] rounded-lg font-bold uppercase tracking-wide mb-3`}>
                  {config.label}
                </span>

                {/* Grouped classes */}
                {item.class_sections.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.class_sections.map((cls) => (
                      <span key={cls.id} className="px-2 py-0.5 bg-muted text-foreground text-xs rounded-lg font-medium">
                        {cls.display_name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  {item.today_status === "session" ? (
                    <Link
                      to={`/today-session/${item.class_sections[0].id}`}
                      className="flex-1 text-center py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
                    >
                      <Play className="w-3.5 h-3.5 inline mr-1" />
                      {item.class_sections.length > 1 ? "Start Group Session" : "Start Session"}
                    </Link>
                  ) : (
                    <Link to="/session-calendar" className="flex-1 text-center py-2.5 border border-input rounded-xl text-xs font-medium text-muted-foreground active:scale-[0.98] transition-transform">
                      View Calendar
                    </Link>
                  )}
                  <Link to={`/curriculum/${item.class_section.id}`} className="py-2.5 px-4 border border-success/20 text-success rounded-xl text-xs font-bold hover:bg-success/5 active:scale-[0.98] transition-all">
                    <BookOpen className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {mockClasses.length === 0 && (
        <div className="elevated-card p-10 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No classes assigned yet.</p>
        </div>
      )}
    </div>
  );
}
