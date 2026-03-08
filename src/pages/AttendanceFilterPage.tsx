import { useState } from "react";
import { ClipboardCheck, Filter, Search } from "lucide-react";

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
      <div className="mb-5">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-primary" />
          </div>
          Student Attendance
        </h2>
      </div>

      {/* Filter Card */}
      <div className="elevated-card overflow-hidden mb-5">
        <div className="gradient-primary text-primary-foreground px-4 py-2.5 text-xs font-bold flex items-center gap-2 uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5" /> Filters
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">School</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)} className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                <option value="">All Schools</option>
                <option value="1">Delhi Public School</option>
                <option value="2">Kendriya Vidyalaya</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Class</label>
              <select value={classSection} onChange={(e) => setClassSection(e.target.value)} className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                <option value="">All Classes</option>
                <option value="5A">5A</option>
                <option value="5B">5B</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="w-full py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">
                <Search className="w-3.5 h-3.5 inline mr-1" />Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {/* Desktop */}
      <div className="hidden sm:block elevated-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">School / Class</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockRecords.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3 font-semibold text-sm">{r.student}</td>
                  <td className="px-4 py-3 text-xs">{r.school} · {r.class}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
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

      {/* Mobile */}
      <div className="sm:hidden space-y-2">
        {mockRecords.map((r, i) => (
          <div key={i} className={`elevated-card p-3 border-l-4 ${r.status === "present" ? "border-l-success" : "border-l-destructive"}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">{r.student}</p>
                <p className="text-[10px] text-muted-foreground">{r.school} · {r.class} · {r.date}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                r.status === "present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {r.status === "present" ? "✓" : "✗"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
