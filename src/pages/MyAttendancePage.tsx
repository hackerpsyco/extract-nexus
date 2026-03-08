import { useState } from "react";
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
      <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
        <UserCheck className="w-6 h-6" />
        My Attendance
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
          { label: "Present", value: stats.present, color: "text-success", bg: "bg-success/10" },
          { label: "Absent", value: stats.absent, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Leave", value: stats.leave, color: "text-warning", bg: "bg-warning/10" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        {mockMyAttendance.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-card rounded-lg shadow-sm border-l-4 p-4 ${
              session.facilitator_status === "present" ? "border-l-success" :
              session.facilitator_status === "absent" ? "border-l-destructive" :
              session.facilitator_status === "leave" ? "border-l-warning" :
              "border-l-border"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h5 className="font-semibold text-sm">{session.planned_session.title}</h5>
                <p className="text-xs text-muted-foreground">{session.class_section.school.name} - {session.class_section.display_name}</p>
                <p className="text-xs text-muted-foreground">{session.date}</p>
              </div>
              <div>
                {session.facilitator_status === "present" ? (
                  <span className="px-3 py-1 bg-success/10 text-success rounded-md text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" />Present</span>
                ) : session.facilitator_status === "absent" ? (
                  <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-md text-sm font-medium flex items-center gap-1"><X className="w-4 h-4" />Absent</span>
                ) : session.facilitator_status === "leave" ? (
                  <span className="px-3 py-1 bg-warning/10 text-warning rounded-md text-sm font-medium flex items-center gap-1"><Clock className="w-4 h-4" />Leave</span>
                ) : (
                  <div className="flex gap-1">
                    <button className="px-3 py-1 bg-success/10 text-success border border-success/30 rounded-md text-xs hover:bg-success/20">Present</button>
                    <button className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/30 rounded-md text-xs hover:bg-destructive/20">Absent</button>
                    <button className="px-3 py-1 bg-warning/10 text-warning border border-warning/30 rounded-md text-xs hover:bg-warning/20">Leave</button>
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
