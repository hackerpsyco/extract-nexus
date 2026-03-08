import { useState } from "react";
import { toast } from "sonner";
import { Users, Save } from "lucide-react";

const mockAttendanceData = {
  session: {
    id: "as1",
    date: "2024-12-20",
    planned_session: {
      title: "Day 42 - Reading Comprehension",
      day_number: 42,
      class_section: { display_name: "5A", class_level: "5", section: "A", school: { name: "Delhi Public School" }, id: "c1" },
    },
  },
  enrollments: [
    { id: "e1", student: { id: "s1", full_name: "Aarav Sharma", enrollment_number: "EN001" }, current_status: "", visible_change: "", invisible_change: "" },
    { id: "e2", student: { id: "s2", full_name: "Priya Patel", enrollment_number: "EN002" }, current_status: "", visible_change: "", invisible_change: "" },
    { id: "e3", student: { id: "s3", full_name: "Rahul Kumar", enrollment_number: "EN003" }, current_status: "", visible_change: "", invisible_change: "" },
    { id: "e4", student: { id: "s4", full_name: "Ananya Singh", enrollment_number: "EN004" }, current_status: "", visible_change: "", invisible_change: "" },
    { id: "e5", student: { id: "s5", full_name: "Vikram Verma", enrollment_number: "EN005" }, current_status: "", visible_change: "", invisible_change: "" },
  ],
};

export default function MarkAttendancePage() {
  const data = mockAttendanceData;
  const [attendance, setAttendance] = useState<Record<string, { status: string; visible_change: string; invisible_change: string }>>(
    Object.fromEntries(data.enrollments.map((e) => [e.id, { status: e.current_status || "", visible_change: e.visible_change || "", invisible_change: e.invisible_change || "" }]))
  );

  const updateAttendance = (id: string, field: string, value: string) => {
    setAttendance((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSubmit = () => {
    const unmarked = data.enrollments.filter((e) => !attendance[e.id]?.status);
    if (unmarked.length > 0) {
      toast.error(`Please mark attendance for all students (${unmarked.length} remaining)`);
      return;
    }
    toast.success("Attendance saved successfully!");
  };

  const markAll = (status: string) => {
    const updated = { ...attendance };
    data.enrollments.forEach((e) => { updated[e.id] = { ...updated[e.id], status }; });
    setAttendance(updated);
  };

  return (
    <div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h5 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />Mark Attendance
          </h5>
          <p className="text-xs text-muted-foreground mt-1">
            {data.session.planned_session.class_section.school.name} — {data.session.planned_session.class_section.display_name} — Day {data.session.planned_session.day_number} — {data.session.date}
          </p>
        </div>

        <div className="p-5">
          <div className="bg-info/10 border border-info/30 rounded-lg p-3 mb-4 text-sm">
            <strong>Session:</strong> {data.session.planned_session.title}<br />
            <strong>Date:</strong> {data.session.date}<br />
            <strong>Total Students:</strong> {data.enrollments.length}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => markAll("present")} className="px-3 py-1.5 bg-success/10 text-success border border-success/30 rounded-lg text-xs font-medium hover:bg-success/20">
              ✓ Mark All Present
            </button>
            <button onClick={() => markAll("absent")} className="px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-xs font-medium hover:bg-destructive/20">
              ✗ Mark All Absent
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 text-xs font-semibold">#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold">Student Name</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold hidden md:table-cell">Enrollment</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold">Attendance</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold">Visible Change</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold">Invisible Change</th>
                </tr>
              </thead>
              <tbody>
                {data.enrollments.map((e, i) => {
                  const status = attendance[e.id]?.status;
                  return (
                    <tr
                      key={e.id}
                      className={`border-t border-border ${status === "present" ? "bg-success/5" : status === "absent" ? "bg-destructive/5" : ""}`}
                    >
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {e.student.full_name}
                        <span className="md:hidden block text-xs text-muted-foreground">{e.student.enrollment_number}</span>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-xs text-muted-foreground">{e.student.enrollment_number}</td>
                      <td className="px-3 py-2">
                        <select
                          value={status}
                          onChange={(ev) => updateAttendance(e.id, "status", ev.target.value)}
                          className="border border-input rounded-md px-2 py-1.5 text-sm w-full min-w-[100px]"
                        >
                          <option value="">Select</option>
                          <option value="present">✓ Present</option>
                          <option value="absent">✗ Absent</option>
                          <option value="leave">📋 Leave</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={attendance[e.id]?.visible_change || ""}
                          onChange={(ev) => updateAttendance(e.id, "visible_change", ev.target.value)}
                          className="border border-input rounded-md px-2 py-1.5 text-xs w-full min-w-[120px] resize-y min-h-[40px]"
                          placeholder="Visible change..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={attendance[e.id]?.invisible_change || ""}
                          onChange={(ev) => updateAttendance(e.id, "invisible_change", ev.target.value)}
                          className="border border-input rounded-md px-2 py-1.5 text-xs w-full min-w-[120px] resize-y min-h-[40px]"
                          placeholder="Invisible change..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={handleSubmit} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2">
              <Save className="w-4 h-4" />Save Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
