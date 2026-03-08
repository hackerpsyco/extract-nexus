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
    assigned_facilitators: [{ full_name: "Amit Kumar" }, { full_name: "Priya Sharma" }],
  },
  is_assigned: true,
  attendance: null as { status: string; remarks: string } | null,
};

export default function SessionCalendarPage() {
  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleSubmit = () => {
    if (!status) { toast.error("Please select status"); return; }
    toast.success("Attendance marked!");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h2 className="text-lg font-extrabold">Session Calendar</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="elevated-card overflow-hidden">
        <div className="bg-warning text-warning-foreground px-4 py-3 font-bold text-xs flex items-center gap-2 uppercase tracking-wide">
          <Briefcase className="w-4 h-4" /> Office Work / Task Today
        </div>
        <div className="p-5">
          <p className="text-sm mb-4">{mockOfficeWork.calendar_date.office_task_description}</p>

          {/* Details */}
          <div className="bg-muted/50 rounded-2xl p-4 mb-5 space-y-2.5 text-sm">
            {mockOfficeWork.calendar_date.time && (
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{mockOfficeWork.calendar_date.time}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{mockOfficeWork.calendar_date.school.name}</span>
            </div>
            {mockOfficeWork.calendar_date.assigned_facilitators.length > 0 && (
              <div className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {mockOfficeWork.calendar_date.assigned_facilitators.map((f, i) => (
                    <span key={i} className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold">{f.full_name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mark Attendance */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-2">Mark Attendance</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "present", label: "✓ Present", bg: "border-success bg-success/5 text-success", active: "border-success bg-success/15" },
                  { value: "absent", label: "✗ Absent", bg: "border-destructive/30 bg-destructive/5 text-destructive", active: "border-destructive bg-destructive/15" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`p-3.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98] ${
                      status === opt.value ? opt.active : opt.bg
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Remarks (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Add notes..."
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-warning text-warning-foreground rounded-xl font-bold text-sm hover:shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle className="w-4 h-4" />Submit Attendance
            </button>
          </div>
        </div>
      </motion.div>

      <div className="mt-4">
        <Link to="/dashboard" className="px-4 py-2.5 bg-muted text-foreground rounded-xl text-xs font-semibold hover:bg-accent inline-flex items-center gap-1.5 transition-colors active:scale-[0.98]">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
