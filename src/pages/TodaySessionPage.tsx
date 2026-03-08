import { motion } from "framer-motion";
import { CalendarCheck, Play, BookOpen, Users, AlertTriangle, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

interface ClassInfo {
  status: "session" | "holiday" | "office_work";
  class_section: {
    id: string; class_level: string; section: string; display_name: string;
    school: { id: string; name: string };
  };
  planned_session?: { id: string; day_number: number; title: string } | null;
  actual_session?: { id: string; status: string } | null;
  attendance_summary?: { present: number; absent: number } | null;
}

const mockTodayData = {
  today: new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
  holiday_today: null as { holiday_name: string } | null,
  classes_today: [
    {
      status: "session" as const,
      class_section: { id: "c1", class_level: "5", section: "A", display_name: "5A", school: { id: "1", name: "Delhi Public School" } },
      planned_session: { id: "ps1", day_number: 42, title: "Day 42 - Reading Comprehension" },
      actual_session: null, attendance_summary: null,
    },
    {
      status: "session" as const,
      class_section: { id: "c2", class_level: "5", section: "B", display_name: "5B", school: { id: "1", name: "Delhi Public School" } },
      planned_session: { id: "ps2", day_number: 42, title: "Day 42 - Reading Comprehension" },
      actual_session: { id: "as2", status: "conducted" },
      attendance_summary: { present: 25, absent: 3 },
    },
    {
      status: "holiday" as const,
      class_section: { id: "c4", class_level: "4", section: "A", display_name: "4A", school: { id: "2", name: "Kendriya Vidyalaya" } },
      planned_session: null, actual_session: null, attendance_summary: null,
    },
  ] as ClassInfo[],
};

const statusConfig = {
  session: { label: "Session Today", icon: BookOpen, bg: "bg-success/10", border: "border-success/30", text: "text-success", headerBg: "gradient-primary" },
  holiday: { label: "Holiday", icon: AlertTriangle, bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", headerBg: "bg-warning" },
  office_work: { label: "Office Work", icon: Briefcase, bg: "bg-info/10", border: "border-info/30", text: "text-info", headerBg: "bg-info" },
};

export default function TodaySessionPage() {
  const data = mockTodayData;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-extrabold">Today's Session</h2>
        <p className="text-muted-foreground text-sm">{data.today}</p>
      </div>

      {data.holiday_today && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="elevated-card p-4 mb-5 flex gap-3 border-l-4 border-l-destructive">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-sm">Holiday / No Session Today</h5>
            <p className="text-xs text-muted-foreground">{data.holiday_today.holiday_name}</p>
          </div>
        </motion.div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.classes_today.map((item, i) => {
          const config = statusConfig[item.status];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="elevated-card overflow-hidden"
            >
              {/* Status Header */}
              <div className={`${item.status === "session" ? "gradient-primary text-primary-foreground" : `${config.headerBg} text-white`} px-4 py-2.5 text-xs font-bold flex items-center gap-2 uppercase tracking-wide`}>
                <config.icon className="w-3.5 h-3.5" /> {config.label}
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                    <span className={`font-extrabold text-sm ${config.text}`}>{item.class_section.display_name}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{item.class_section.school.name}</p>
                    <p className="text-[10px] text-muted-foreground">Class {item.class_section.display_name}</p>
                  </div>
                </div>

                {item.planned_session && (
                  <div className="bg-muted/50 rounded-xl p-3 mb-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Day</span>
                      <span className="font-semibold">{item.planned_session.day_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Topic</span>
                      <span className="font-semibold text-right max-w-[60%] truncate">{item.planned_session.title.replace(/Day \d+ - /, "")}</span>
                    </div>
                  </div>
                )}

                {item.attendance_summary && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-success/10 rounded-xl p-2 text-center">
                      <span className="text-lg font-extrabold text-success">{item.attendance_summary.present}</span>
                      <p className="text-[10px] text-muted-foreground">Present</p>
                    </div>
                    <div className="bg-destructive/10 rounded-xl p-2 text-center">
                      <span className="text-lg font-extrabold text-destructive">{item.attendance_summary.absent}</span>
                      <p className="text-[10px] text-muted-foreground">Absent</p>
                    </div>
                  </div>
                )}

                {item.status === "session" && (
                  <div className="flex gap-2">
                    {item.actual_session?.status === "conducted" ? (
                      <Link to={`/attendance/mark/${item.actual_session.id}`} className="flex-1 text-center py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold hover:shadow-md transition-all active:scale-[0.98]">
                        <Users className="w-3.5 h-3.5 inline mr-1" />Attendance
                      </Link>
                    ) : (
                      <Link to={`/today-session/${item.class_section.id}`} className="flex-1 text-center py-2.5 bg-success text-success-foreground rounded-xl text-xs font-bold hover:shadow-md transition-all active:scale-[0.98]">
                        <Play className="w-3.5 h-3.5 inline mr-1" />Start Session
                      </Link>
                    )}
                    <Link to={`/curriculum/${item.class_section.id}`} className="flex-1 text-center py-2.5 border border-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/5 transition-all active:scale-[0.98]">
                      <BookOpen className="w-3.5 h-3.5 inline mr-1" />Curriculum
                    </Link>
                  </div>
                )}

                {item.status === "holiday" && (
                  <p className="text-xs text-muted-foreground text-center py-2">No session scheduled</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
