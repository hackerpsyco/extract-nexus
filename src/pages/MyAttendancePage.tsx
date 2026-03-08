import { motion } from "framer-motion";
import { UserCheck, Check, X, Clock } from "lucide-react";

const mockMyAttendance = [
  { id: "1", date: "2024-12-20", planned_session: { title: "Day 42", day_number: 42 }, facilitator_status: "present", class_section: { display_name: "5A", school: { name: "Delhi Public School" } } },
  { id: "2", date: "2024-12-19", planned_session: { title: "Day 41", day_number: 41 }, facilitator_status: "present", class_section: { display_name: "5A", school: { name: "Delhi Public School" } } },
  { id: "3", date: "2024-12-18", planned_session: { title: "Day 40", day_number: 40 }, facilitator_status: "absent", class_section: { display_name: "5B", school: { name: "Delhi Public School" } } },
  { id: "4", date: "2024-12-17", planned_session: { title: "Day 39", day_number: 39 }, facilitator_status: "leave", class_section: { display_name: "4A", school: { name: "Kendriya Vidyalaya" } } },
  { id: "5", date: "2024-12-16", planned_session: { title: "Day 38", day_number: 38 }, facilitator_status: "", class_section: { display_name: "5A", school: { name: "Delhi Public School" } } },
];

const stats = { total: 5, present: 2, absent: 1, leave: 1 };

export default function MyAttendancePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-primary" />
          </div>
          My Attendance
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5">
        {[
          { label: "Total", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
          { label: "Present", value: stats.present, color: "text-success", bg: "bg-success/10" },
          { label: "Absent", value: stats.absent, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Leave", value: stats.leave, color: "text-warning", bg: "bg-warning/10" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-3 sm:p-4 text-center`}>
            <div className={`text-xl sm:text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sessions */}
      <div className="space-y-2">
        {mockMyAttendance.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`elevated-card p-4 border-l-4 ${
              session.facilitator_status === "present" ? "border-l-success" :
              session.facilitator_status === "absent" ? "border-l-destructive" :
              session.facilitator_status === "leave" ? "border-l-warning" :
              "border-l-border"
            }`}
          >
            <div className="flex justify-between items-center gap-3">
              <div className="min-w-0">
                <h5 className="font-bold text-sm">{session.planned_session.title}</h5>
                <p className="text-[10px] text-muted-foreground mt-0.5">{session.class_section.school.name} · {session.class_section.display_name}</p>
                <p className="text-[10px] text-muted-foreground">{session.date}</p>
              </div>
              <div className="shrink-0">
                {session.facilitator_status === "present" ? (
                  <span className="px-3 py-1.5 bg-success/10 text-success rounded-xl text-xs font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" />Present</span>
                ) : session.facilitator_status === "absent" ? (
                  <span className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-xl text-xs font-bold flex items-center gap-1"><X className="w-3.5 h-3.5" />Absent</span>
                ) : session.facilitator_status === "leave" ? (
                  <span className="px-3 py-1.5 bg-warning/10 text-warning rounded-xl text-xs font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Leave</span>
                ) : (
                  <div className="flex gap-1">
                    <button className="px-3 py-1.5 bg-success/10 text-success rounded-xl text-xs font-bold hover:bg-success/20 active:scale-[0.95] transition-all">Present</button>
                    <button className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-xl text-xs font-bold hover:bg-destructive/20 active:scale-[0.95] transition-all">Absent</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
