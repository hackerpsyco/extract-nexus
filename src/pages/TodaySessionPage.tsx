import { motion } from "framer-motion";
import { CalendarCheck, Play, BookOpen, Users, AlertTriangle, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

interface ClassInfo {
  status: "session" | "holiday" | "office_work";
  class_section: {
    id: string;
    class_level: string;
    section: string;
    display_name: string;
    school: { id: string; name: string };
  };
  class_sections?: { id: string; display_name: string }[];
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
      actual_session: null,
      attendance_summary: null,
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
      planned_session: null,
      actual_session: null,
      attendance_summary: null,
    },
  ] as ClassInfo[],
};

export default function TodaySessionPage() {
  const data = mockTodayData;

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Today's Session</h2>
      <p className="text-muted-foreground text-sm mb-6">{data.today}</p>

      {data.holiday_today && (
        <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
          <div>
            <h5 className="font-bold">Holiday / No Session Today</h5>
            <p className="text-sm text-muted-foreground">{data.holiday_today.holiday_name}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.classes_today.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            {item.status === "session" ? (
              <div className="bg-card rounded-xl border-2 border-success shadow-sm overflow-hidden h-full">
                <div className="bg-success text-success-foreground px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Session Today
                </div>
                <div className="p-4">
                  <p className="font-semibold mb-1">{item.class_section.display_name}</p>
                  <p className="text-xs text-muted-foreground mb-3">{item.class_section.school.name}</p>

                  {item.planned_session && (
                    <>
                      <p className="text-sm mb-1"><strong>Day:</strong> {item.planned_session.day_number}</p>
                      <p className="text-sm mb-3"><strong>Title:</strong> {item.planned_session.title}</p>
                    </>
                  )}

                  {item.attendance_summary && (
                    <div className="bg-info/10 rounded-lg p-2 mb-3">
                      <p className="text-xs font-medium mb-1">Attendance:</p>
                      <div className="grid grid-cols-2 text-center">
                        <span className="text-success text-sm">✓ {item.attendance_summary.present}</span>
                        <span className="text-destructive text-sm">✗ {item.attendance_summary.absent}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {item.actual_session?.status === "conducted" ? (
                      <Link to={`/attendance/mark/${item.actual_session.id}`} className="flex-1 text-center px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                        <Users className="w-4 h-4 inline mr-1" />Attendance
                      </Link>
                    ) : (
                      <button className="flex-1 px-3 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:opacity-90">
                        <Play className="w-4 h-4 inline mr-1" />Start
                      </button>
                    )}
                    <Link to={`/curriculum/${item.class_section.id}`} className="flex-1 text-center px-3 py-2 bg-info text-info-foreground rounded-lg text-sm font-medium hover:opacity-90">
                      <BookOpen className="w-4 h-4 inline mr-1" />Curriculum
                    </Link>
                  </div>
                </div>
              </div>
            ) : item.status === "holiday" ? (
              <div className="bg-card rounded-xl border-2 border-warning shadow-sm overflow-hidden h-full">
                <div className="bg-warning text-warning-foreground px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Holiday
                </div>
                <div className="p-4">
                  <p className="font-semibold mb-1">{item.class_section.display_name}</p>
                  <p className="text-xs text-muted-foreground mb-3">{item.class_section.school.name}</p>
                  <p className="text-sm text-muted-foreground">No session scheduled for today</p>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl border-2 border-info shadow-sm overflow-hidden h-full">
                <div className="bg-info text-info-foreground px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Office Work
                </div>
                <div className="p-4">
                  <p className="font-semibold mb-1">{item.class_section.display_name}</p>
                  <p className="text-xs text-muted-foreground">{item.class_section.school.name}</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
