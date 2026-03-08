import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";

export default function PerformanceCutoffPage() {
  const { classId } = useParams();
  const [passing, setPassing] = useState(40);
  const [good, setGood] = useState(60);
  const [excellent, setExcellent] = useState(80);

  const handleSave = () => {
    if (passing >= good || good >= excellent) {
      toast.error("Scores must be in ascending order: Passing < Good < Excellent");
      return;
    }
    toast.success("Cutoff settings saved! Grades will be recalculated.");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/performance/${classId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3">
        <ArrowLeft className="w-4 h-4" />Back
      </Link>
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Settings className="w-5 h-5" />Performance Cutoff Settings
      </h2>
      <p className="text-sm text-muted-foreground mb-6">Class 5A</p>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 font-semibold text-sm">⚙️ Configure Grade Cutoffs</div>
        <div className="p-5 space-y-5">
          {[
            { label: "Passing Score", hint: "Minimum score to pass (Grade C)", badge: "Grade C", value: passing, setter: setPassing },
            { label: "Good Score", hint: "Score for good performance (Grade B)", badge: "Grade B", value: good, setter: setGood },
            { label: "Excellent Score", hint: "Score for excellent performance (Grade A)", badge: "Grade A", value: excellent, setter: setExcellent },
          ].map((item) => (
            <div key={item.label}>
              <label className="block text-sm font-medium mb-1">{item.label} (0-100)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={item.value}
                  onChange={(e) => item.setter(parseInt(e.target.value) || 0)}
                  className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background"
                />
                <span className="px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">{item.badge}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.hint}</p>
            </div>
          ))}

          {/* Grade Scale Info */}
          <div className="bg-info/10 border border-info/30 rounded-lg p-4">
            <strong className="text-sm">Grade Scale:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li><span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-xs font-medium">A</span> Excellent: {excellent}-100</li>
              <li><span className="px-2 py-0.5 bg-info/10 text-info rounded-full text-xs font-medium">B</span> Good: {good}-{excellent - 1}</li>
              <li><span className="px-2 py-0.5 bg-warning/10 text-warning rounded-full text-xs font-medium">C</span> Average: {passing}-{good - 1}</li>
              <li><span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded-full text-xs font-medium">F</span> Failed: 0-{passing - 1}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              ✓ Save Settings
            </button>
            <Link to={`/performance/${classId}`} className="px-6 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-accent">
              Cancel
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-4 text-sm">
        <strong>⚠️ Note:</strong> Changing these settings will recalculate grades for all students in this class.
      </div>
    </div>
  );
}
