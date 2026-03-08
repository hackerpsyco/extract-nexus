import { motion } from "framer-motion";
import { Brain, Lightbulb, AlertTriangle, Info, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface GrowthAnalysis {
  growth_score: number;
  risk_level: "low" | "medium" | "high";
  student_cluster: string;
  engagement_level: "low" | "medium" | "high";
  attendance_consistency: number;
  quiz_improvement_rate: number;
  text_complexity_growth: number;
  insights: string;
  recommendations: string;
  at_risk_flags: Record<string, string>;
  data_points_used: number;
}

const riskColors: Record<string, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

const engagementColors: Record<string, string> = {
  high: "bg-success/10 text-success",
  medium: "bg-info/10 text-info",
  low: "bg-muted text-muted-foreground",
};

const summaryBg: Record<string, string> = {
  low: "bg-success/10 border-success/30 text-success",
  medium: "bg-warning/10 border-warning/30 text-warning",
  high: "bg-destructive/10 border-destructive/30 text-destructive",
};

function clusterLabel(c: string) {
  return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function StudentGrowthCard({ analysis }: { analysis: GrowthAnalysis | null }) {
  if (analysis === null) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-sm font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" /> Student Growth Intelligence
        </div>
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Growth analysis is being generated...</p>
          <p className="text-xs text-muted-foreground">This may take a few moments.</p>
        </div>
      </div>
    );
  }

  const a = analysis;
  const flags = Object.entries(a.at_risk_flags || {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 text-sm font-semibold flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" /> Student Growth Intelligence
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Alert */}
        <div className={`p-3 rounded-lg border text-sm ${summaryBg[a.risk_level]}`}>
          <strong>📊 Growth Summary:</strong>
          <p className="mt-1 mb-0 text-foreground text-xs">{a.insights}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{Math.round(a.growth_score)}</div>
            <div className="text-[10px] text-muted-foreground">Growth Score</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${riskColors[a.risk_level]}`}>
              {a.risk_level.toUpperCase()}
            </span>
            <div className="text-[10px] text-muted-foreground mt-1">Risk Level</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
              {clusterLabel(a.student_cluster)}
            </span>
            <div className="text-[10px] text-muted-foreground mt-1">Pattern</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${engagementColors[a.engagement_level]}`}>
              {a.engagement_level.toUpperCase()}
            </span>
            <div className="text-[10px] text-muted-foreground mt-1">Engagement</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h6 className="text-sm font-semibold mb-3">📈 Performance Metrics</h6>

          {/* Attendance Consistency */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Attendance Consistency</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-info/10 text-info">{Math.round(a.attendance_consistency)}%</span>
            </div>
            <Progress value={a.attendance_consistency} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-0.5">How regularly student attends sessions</p>
          </div>

          {/* Quiz Performance Trend */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Quiz Performance Trend</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.quiz_improvement_rate > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {a.quiz_improvement_rate > 0 ? "↑" : "↓"} {a.quiz_improvement_rate.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(100, Math.max(0, a.quiz_improvement_rate + 50))} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Quiz score improvement rate over time</p>
          </div>

          {/* Text Complexity Growth */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Text Complexity Growth</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/10 text-warning">{Math.round(a.text_complexity_growth)}%</span>
            </div>
            <Progress value={a.text_complexity_growth} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Growth in written response complexity</p>
          </div>
        </div>

        {/* At-Risk Flags */}
        {flags.length > 0 && (
          <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
            <div className="flex items-center gap-1 text-sm font-semibold text-warning mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Areas of Concern
            </div>
            <ul className="list-disc list-inside text-xs space-y-1 text-foreground">
              {flags.map(([flag, severity]) => (
                <li key={flag}>
                  {clusterLabel(flag)}{" "}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${riskColors[severity] || "bg-muted text-muted-foreground"}`}>
                    {severity.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        <div className="pt-3 border-t border-border">
          <h6 className="text-sm font-semibold flex items-center gap-1 mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-warning" /> Recommendations
          </h6>
          <p className="text-xs text-muted-foreground">{a.recommendations}</p>
        </div>

        {/* Data Info */}
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            Analysis based on {a.data_points_used} data points (attendance records, quiz scores, and feedback notes)
          </p>
        </div>
      </div>
    </motion.div>
  );
}
