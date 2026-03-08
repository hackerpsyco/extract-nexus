import { useState } from "react";
import { ClipboardCheck, Filter } from "lucide-react";

export default function AttendanceFilterPage() {
  const [school, setSchool] = useState("");
  const [classSection, setClassSection] = useState("");
  const [period, setPeriod] = useState("last_7_days");

  const mockRecords = [
    { date: "2024-12-20", student: "Aarav Sharma", status: "present", class: "5A", school: "Delhi Public School" },
    { date: "2024-12-20", student: "Priya Patel", status: "absent", class: "5A", school: "Delhi Public School" },
    { date: "2024-12-19", student: "Rahul Kumar", status: "present", class: "5B", school: "Delhi Public School" },
    { date: "2024-12-19", student: "Ananya Singh", status: "present", class: "6A", school: "Delhi Public School" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
        <ClipboardCheck className="w-6 h-6" />
        Attendance Management
      </h2>

      {/* Filter Card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
        <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <Filter className="w-4 h-4" />Filter Options
        </div>
        <div className="p-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">School</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm">
                <option value="">Choose a school...</option>
                <option value="1">Delhi Public School</option>
                <option value="2">Kendriya Vidyalaya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Class</label>
              <select value={classSection} onChange={(e) => setClassSection(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm">
                <option value="">All Classes</option>
                <option value="5A">5A</option>
                <option value="5B">5B</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm">
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">School / Class</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockRecords.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3 font-medium">{r.student}</td>
                  <td className="px-4 py-3">{r.school} - {r.class}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === "present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {r.status === "present" ? "✓ Present" : "✗ Absent"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
