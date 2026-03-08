import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Settings, Edit } from "lucide-react";

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Student Performance
          </h2>
          <p className="text-muted-foreground text-sm">View and manage student performance across your classes</p>
        </div>
      </div>

      {/* Class Selection */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <label className="block text-sm font-medium mb-2">Select Class</label>
        <div className="flex gap-3 flex-wrap items-end">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border border-input rounded-lg px-3 py-2 text-sm min-w-[200px]"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.school.name} - {c.display_name}</option>
            ))}
          </select>
          <button className="px-3 py-2 border border-primary/30 text-primary rounded-lg text-sm hover:bg-primary/10 flex items-center gap-1">
            <Settings className="w-4 h-4" />Cutoff Settings
          </button>
        </div>
      </div>

      {/* Cutoff Info */}
      <div className="bg-info/10 border border-info/30 rounded-lg p-3 mb-4 text-sm">
        <strong>Performance Cutoff:</strong> Passing: {cutoff.passing_score} | Good: {cutoff.good_score} | Excellent: {cutoff.excellent_score}
      </div>

      {/* Performance Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 font-semibold text-sm">📊 Student Rankings</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold">Rank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Student Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Avg Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Passed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Failed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockPerformanceData.map((item) => (
                <tr key={item.student.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {item.summary ? (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{item.summary.rank}</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.student.full_name}</div>
                    <div className="text-xs text-muted-foreground">{item.student.enrollment_number}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {item.summary ? `${item.summary.average_score.toFixed(1)}/100` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-xs">{item.summary?.passed_subjects ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${item.summary && item.summary.failed_subjects > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                      {item.summary?.failed_subjects ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.summary ? (
                      item.summary.is_passed ? (
                        <span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-xs font-medium">✓ Passed</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded-full text-xs font-medium">✗ Failed</span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">No Data</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20">
                      <Edit className="w-3 h-3 inline mr-0.5" />Edit
                    </button>
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
