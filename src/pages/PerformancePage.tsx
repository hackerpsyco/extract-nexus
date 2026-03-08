import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Settings, Eye } from "lucide-react";

const mockPerformanceData = [
  { student: { id: "s1", full_name: "Aarav Sharma", enrollment_number: "EN001" }, summary: { rank: 1, average_score: 92.5, passed_subjects: 5, failed_subjects: 0, is_passed: true } },
  { student: { id: "s2", full_name: "Priya Patel", enrollment_number: "EN002" }, summary: { rank: 2, average_score: 88.0, passed_subjects: 5, failed_subjects: 0, is_passed: true } },
  { student: { id: "s3", full_name: "Vikram Verma", enrollment_number: "EN005" }, summary: { rank: 3, average_score: 75.0, passed_subjects: 4, failed_subjects: 1, is_passed: true } },
  { student: { id: "s4", full_name: "Ananya Singh", enrollment_number: "EN004" }, summary: { rank: 4, average_score: 45.0, passed_subjects: 2, failed_subjects: 3, is_passed: false } },
  { student: { id: "s5", full_name: "Rahul Kumar", enrollment_number: "EN003" }, summary: null },
];

const classes = [
  { id: "c1", display_name: "5A", school: { name: "Delhi Public School" } },
  { id: "c2", display_name: "5B", school: { name: "Delhi Public School" } },
  { id: "c3", display_name: "4A", school: { name: "Kendriya Vidyalaya" } },
];

export default function PerformancePage() {
  const [selectedClass, setSelectedClass] = useState("c1");
  const cutoff = { passing_score: 40, good_score: 70, excellent_score: 90 };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "gradient-primary text-primary-foreground";
    if (rank === 2) return "bg-info/10 text-info";
    if (rank === 3) return "bg-warning/10 text-warning";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            Performance
          </h2>
          <p className="text-muted-foreground text-sm mt-1">View and manage student performance</p>
        </div>
      </div>

      {/* Class Selection */}
      <div className="elevated-card p-4 mb-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.school.name} — {c.display_name}</option>
              ))}
            </select>
          </div>
          <button className="px-4 py-2.5 border border-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/5 active:scale-[0.98] transition-all flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />Cutoff Settings
          </button>
        </div>
      </div>

      {/* Cutoff Info */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { label: "Passing", score: cutoff.passing_score, bg: "bg-warning/10", text: "text-warning" },
          { label: "Good", score: cutoff.good_score, bg: "bg-info/10", text: "text-info" },
          { label: "Excellent", score: cutoff.excellent_score, bg: "bg-success/10", text: "text-success" },
        ].map((c) => (
          <span key={c.label} className={`${c.bg} ${c.text} px-3 py-1.5 rounded-xl text-xs font-bold`}>
            {c.label}: {c.score}+
          </span>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block elevated-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rank</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Score</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pass / Fail</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockPerformanceData.map((item) => (
                <tr key={item.student.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    {item.summary ? (
                      <span className={`w-7 h-7 inline-flex items-center justify-center rounded-lg text-xs font-extrabold ${getRankStyle(item.summary.rank)}`}>
                        {item.summary.rank}
                      </span>
                    ) : (
                      <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-muted text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm">{item.student.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{item.student.enrollment_number}</div>
                  </td>
                  <td className="px-4 py-3 font-extrabold text-sm">
                    {item.summary ? `${item.summary.average_score.toFixed(1)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.summary ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="bg-success/10 text-success px-2 py-0.5 rounded-lg text-xs font-bold">{item.summary.passed_subjects}</span>
                        <span className="text-muted-foreground text-xs">/</span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${item.summary.failed_subjects > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{item.summary.failed_subjects}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.summary ? (
                      item.summary.is_passed ? (
                        <span className="px-2.5 py-1 bg-success/10 text-success rounded-lg text-xs font-bold">✓ Passed</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-destructive/10 text-destructive rounded-lg text-xs font-bold">✗ Failed</span>
                      )
                    ) : (
                      <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-medium">No Data</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-2">
        {mockPerformanceData.map((item) => (
          <div key={item.student.id} className="elevated-card p-4">
            <div className="flex items-center gap-3 mb-2">
              {item.summary ? (
                <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-extrabold shrink-0 ${getRankStyle(item.summary.rank)}`}>
                  #{item.summary.rank}
                </span>
              ) : (
                <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted text-muted-foreground text-xs shrink-0">—</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{item.student.full_name}</p>
                <p className="text-[10px] text-muted-foreground">{item.student.enrollment_number}</p>
              </div>
              {item.summary && (
                <span className="text-lg font-extrabold text-primary">{item.summary.average_score.toFixed(0)}</span>
              )}
            </div>
            {item.summary && (
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="bg-success/10 text-success px-2 py-0.5 rounded-lg text-[10px] font-bold">{item.summary.passed_subjects} passed</span>
                  {item.summary.failed_subjects > 0 && (
                    <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-lg text-[10px] font-bold">{item.summary.failed_subjects} failed</span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${item.summary.is_passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {item.summary.is_passed ? "✓ Passed" : "✗ Failed"}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
