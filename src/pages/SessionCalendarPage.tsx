import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, MapPin, Clock, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const mockOfficeWork = {
  calendar_date: {
    id: "cd1",
    office_task_description: "Complete student progress reports and submit to supervisor. Prepare materials for next week's sessions.",
    time: "10:00",
    school: { name: "Delhi Public School" },
    assigned_facilitators: [
      { full_name: "Amit Kumar" },
      { full_name: "Priya Sharma" },
    ],
  },
  is_assigned: true,
  attendance: null as { status: string; remarks: string } | null,
};

export default function SessionCalendarPage() {
  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const data = mockOfficeWork;

  const handleSubmit = () => {
    if (!status) {
      toast.error("Please select attendance status");
      return;
    }
    toast.success("Office work attendance marked successfully!");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Today's Session</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Office Work Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border-2 border-warning shadow-sm overflow-hidden"
      >
        <div className="bg-warning text-warning-foreground px-4 py-3 font-semibold flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Office Work / Task Today
        </div>
        <div className="p-5">
          <p className="text-sm mb-4">{data.calendar_date.office_task_description}</p>

          {/* Details */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
            {data.calendar_date.time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <strong>Time:</strong> {data.calendar_date.time}
              </div>
            )}
            {data.calendar_date.school && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <strong>School:</strong> {data.calendar_date.school.name}
              </div>
            )}
            {data.calendar_date.assigned_facilitators.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <strong>Assigned Facilitators:</strong>
                </div>
                <ul className="list-disc list-inside pl-6 text-muted-foreground">
                  {data.calendar_date.assigned_facilitators.map((f, i) => (
                    <li key={i}>{f.full_name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Existing Attendance */}
          {data.attendance && (
            <div className="bg-info/10 border border-info/30 rounded-lg p-3 mb-4 text-sm">
              <strong>Attendance Status:</strong>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                data.attendance.status === "present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {data.attendance.status === "present" ? "✓ Present" : "✗ Absent"}
              </span>
              {data.attendance.remarks && (
                <p className="text-muted-foreground mt-1">Remarks: {data.attendance.remarks}</p>
              )}
            </div>
          )}

          {/* Mark Attendance Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Mark Attendance</label>
              <div className="space-y-2">
                {[
                  { value: "present", label: "Present", icon: "✓" },
                  { value: "absent", label: "Absent", icon: "✗" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      status === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={status === opt.value}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">{opt.icon} {opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Remarks (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
                placeholder="Add any notes..."
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-2.5 bg-warning text-warning-foreground rounded-lg font-semibold hover:opacity-90 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />Mark Attendance
            </button>
          </div>
        </div>
      </motion.div>

      <div className="mt-4">
        <Link to="/dashboard" className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-accent inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
