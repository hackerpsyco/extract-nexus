import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const mockSubjects = [
  { id: "sub1", name: "English" },
  { id: "sub2", name: "Mathematics" },
  { id: "sub3", name: "Science" },
  { id: "sub4", name: "Social Studies" },
  { id: "sub5", name: "Hindi" },
];

const mockPerformance: Record<string, { score: number; grade: string; remarks: string }> = {
  sub1: { score: 85, grade: "A", remarks: "Good reading skills" },
  sub2: { score: 72, grade: "B", remarks: "" },
};

const mockStudent = { full_name: "Aarav Sharma", enrollment_number: "EN001" };

export default function PerformanceDetailPage() {
  const { classId, studentId } = useParams();
  const [scores, setScores] = useState<Record<string, { score: string; remarks: string }>>(
    Object.fromEntries(
      mockSubjects.map((s) => [
        s.id,
        { score: mockPerformance[s.id]?.score?.toString() || "", remarks: mockPerformance[s.id]?.remarks || "" },
      ])
    )
  );

  const getGrade = (score: number) => {
    if (score >= 80) return { grade: "A", bg: "bg-success/10", text: "text-success" };
    if (score >= 60) return { grade: "B", bg: "bg-info/10", text: "text-info" };
    if (score >= 40) return { grade: "C", bg: "bg-warning/10", text: "text-warning" };
    return { grade: "F", bg: "bg-destructive/10", text: "text-destructive" };
  };

  const handleSave = (subjectId: string) => {
    if (!scores[subjectId]?.score) {
      toast.error("Please enter a score");
      return;
    }
    toast.success("Score saved!");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={`/performance/${classId}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mb-4 font-medium transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />Back to Performance
      </Link>

      <div className="mb-5">
        <h2 className="text-lg font-extrabold">{mockStudent.full_name}</h2>
        <p className="text-xs text-muted-foreground">5A · {mockStudent.enrollment_number}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mockSubjects.map((subject) => {
          const scoreVal = parseInt(scores[subject.id]?.score || "0");
          const gradeInfo = scores[subject.id]?.score ? getGrade(scoreVal) : null;

          return (
            <div key={subject.id} className="elevated-card p-4">
              <h6 className="font-bold text-sm mb-3">{subject.name}</h6>

              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Score (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={scores[subject.id]?.score || ""}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [subject.id]: { ...prev[subject.id], score: e.target.value } }))
                  }
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Enter score"
                />
              </div>

              <div className="mb-3 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Grade:</span>
                {gradeInfo ? (
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${gradeInfo.bg} ${gradeInfo.text}`}>
                    {gradeInfo.grade}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-muted text-muted-foreground rounded-lg text-xs">—</span>
                )}
              </div>

              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Remarks</label>
                <textarea
                  value={scores[subject.id]?.remarks || ""}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [subject.id]: { ...prev[subject.id], remarks: e.target.value } }))
                  }
                  rows={2}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs bg-background resize-y focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Add remarks..."
                />
              </div>

              <button
                onClick={() => handleSave(subject.id)}
                className="w-full py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold active:scale-[0.98] transition-transform"
              >
                ✓ Save Score
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
