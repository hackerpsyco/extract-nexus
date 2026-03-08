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
        {
          score: mockPerformance[s.id]?.score?.toString() || "",
          remarks: mockPerformance[s.id]?.remarks || "",
        },
      ])
    )
  );

  const getGrade = (score: number) => {
    if (score >= 80) return { grade: "A", color: "bg-success/10 text-success" };
    if (score >= 60) return { grade: "B", color: "bg-info/10 text-info" };
    if (score >= 40) return { grade: "C", color: "bg-warning/10 text-warning" };
    return { grade: "F", color: "bg-destructive/10 text-destructive" };
  };

  const handleSave = (subjectId: string) => {
    const data = scores[subjectId];
    if (!data.score) {
      toast.error("Please enter a score");
      return;
    }
    toast.success("Score saved successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={`/performance/${classId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3">
        <ArrowLeft className="w-4 h-4" />Back
      </Link>
      <h2 className="text-xl font-bold">{mockStudent.full_name}</h2>
      <p className="text-sm text-muted-foreground mb-6">5A - {mockStudent.enrollment_number}</p>

      {/* Score Cards */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 font-semibold text-sm">📝 Add/Edit Scores</div>
        <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockSubjects.map((subject) => {
            const scoreVal = parseInt(scores[subject.id]?.score || "0");
            const gradeInfo = scores[subject.id]?.score ? getGrade(scoreVal) : null;

            return (
              <div key={subject.id} className="border rounded-lg p-4">
                <h6 className="font-semibold text-sm mb-3">{subject.name}</h6>

                <div className="mb-3">
                  <label className="block text-xs text-muted-foreground mb-1">Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={scores[subject.id]?.score || ""}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [subject.id]: { ...prev[subject.id], score: e.target.value },
                      }))
                    }
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    placeholder="Enter score"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-muted-foreground mb-1">Grade</label>
                  {gradeInfo ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeInfo.color}`}>
                      {gradeInfo.grade}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">-</span>
                  )}
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-muted-foreground mb-1">Remarks</label>
                  <textarea
                    value={scores[subject.id]?.remarks || ""}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [subject.id]: { ...prev[subject.id], remarks: e.target.value },
                      }))
                    }
                    rows={2}
                    className="w-full border border-input rounded-md px-3 py-2 text-xs bg-background resize-y"
                    placeholder="Add remarks..."
                  />
                </div>

                <button
                  onClick={() => handleSave(subject.id)}
                  className="w-full py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90"
                >
                  ✓ Save
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
