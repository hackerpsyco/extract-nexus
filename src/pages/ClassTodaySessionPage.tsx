import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, BookOpen, ClipboardCheck, Play, Users, Upload, MessageSquare, Award, ChevronRight, MapPin, GraduationCap
} from "lucide-react";

const steps = [
  { id: 1, label: "Lesson Plan", icon: BookOpen },
  { id: 2, label: "Prep", icon: ClipboardCheck },
  { id: 3, label: "Conduct", icon: Play },
  { id: 4, label: "Attendance", icon: Users },
  { id: 5, label: "Upload", icon: Upload },
  { id: 6, label: "Feedback", icon: MessageSquare },
  { id: 7, label: "Reward", icon: Award },
];

const mockSession = {
  class_name: "5A",
  school_name: "Delhi Public School",
  day_number: 42,
  title: "Day 42 - Reading Comprehension",
  status: "pending" as const,
  session_steps: [
    { order: 1, title: "Warm-up Activity", duration: 10 },
    { order: 2, title: "Reading Passage", duration: 15, youtube_url: "https://youtube.com" },
    { order: 3, title: "Comprehension Questions", duration: 15 },
    { order: 4, title: "Group Discussion", duration: 10 },
  ],
  progress: { conducted: 38, cancelled: 2, pending: 2 },
};

export default function ClassTodaySessionPage() {
  const { classId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [language, setLanguage] = useState<"english" | "hindi">("english");

  const data = mockSession;

  const markStepComplete = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
    if (step < 7) setCurrentStep(step + 1);
  };

  const statusBadge = {
    pending: { text: "In Progress", className: "bg-info text-info-foreground" },
    conducted: { text: "Completed", className: "bg-success text-success-foreground" },
    cancelled: { text: "Cancelled", className: "bg-destructive text-destructive-foreground" },
    holiday: { text: "Holiday", className: "bg-warning text-warning-foreground" },
  };

  const badge = statusBadge[data.status];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary text-primary-foreground rounded-xl p-4 mb-4 shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-75 font-semibold">Now Conducting</p>
              <h2 className="text-xl font-bold">Class {data.class_name}</h2>
              <div className="flex items-center gap-1 text-sm opacity-90 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{data.school_name}</span>
              </div>
            </div>
          </div>
          <Link to="/today-session" className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 inline mr-1" />Back
          </Link>
        </div>
      </motion.div>

      {/* Language Selector */}
      <div className="bg-card rounded-xl border p-3 mb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Curriculum Language:</span>
        <div className="flex rounded-lg overflow-hidden border">
          <button
            onClick={() => setLanguage("english")}
            className={`px-3 py-1 text-sm font-medium transition-colors ${language === "english" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
          >English</button>
          <button
            onClick={() => setLanguage("hindi")}
            className={`px-3 py-1 text-sm font-medium transition-colors ${language === "hindi" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
          >हिंदी</button>
        </div>
      </div>

      {/* Day & Status */}
      <div className="bg-card rounded-xl border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm font-bold">Day {data.day_number}</span>
          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${badge.className}`}>{badge.text}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {data.progress.conducted} conducted, {data.progress.cancelled} cancelled, {data.progress.pending} pending
        </p>

        {/* Step Flow Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {steps.map((step, i) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all min-w-[56px] ${
                    isCompleted
                      ? "bg-success/20 text-success border border-success/30"
                      : isCurrent
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border border-transparent"
                  }`}
                >
                  {isCompleted ? (
                    <span className="text-success font-bold text-sm">✓</span>
                  ) : (
                    <StepIcon className="w-4 h-4 mb-0.5" />
                  )}
                  <span className="truncate">{step.label}</span>
                </button>
                {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Steps/Activities */}
      <div className="bg-info/10 border border-info/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-semibold text-sm">📋 Session Activities ({data.session_steps.length} steps)</span>
          <span className="bg-info text-info-foreground text-xs px-2 py-0.5 rounded">Required</span>
        </div>
        <div className="space-y-2">
          {data.session_steps.map((s) => (
            <div key={s.order} className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center rounded mt-0.5 shrink-0">{s.order}</span>
              <div className="flex-1">
                <span className="text-sm font-medium">{s.title}</span>
                {s.duration && <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded ml-2">⏱️ {s.duration}min</span>}
                {s.youtube_url && (
                  <a href={s.youtube_url} target="_blank" rel="noopener noreferrer" className="text-destructive text-xs ml-2">
                    ▶ Video
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-card rounded-xl border p-5"
      >
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          {(() => { const S = steps[currentStep - 1]; return <><S.icon className="w-5 h-5 text-primary" /> Step {currentStep}: {S.label}</>; })()}
        </h3>

        {currentStep === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Upload your lesson plan photo for today's session.</p>
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tap to upload lesson plan photo</p>
            </div>
          </div>
        )}
        {currentStep === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Complete the preparation checklist before starting the session.</p>
            {["Materials ready", "Classroom setup", "Previous homework reviewed"].map((item, i) => (
              <label key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span className="text-sm">{item}</span>
              </label>
            ))}
          </div>
        )}
        {currentStep === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Mark the session as conducted when you begin teaching.</p>
            <button className="w-full bg-success text-success-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
              <Play className="w-5 h-5 inline mr-2" />Mark as Conducted
            </button>
          </div>
        )}
        {currentStep === 4 && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Mark attendance for all students in this class.</p>
            <Link to={`/attendance/mark/mock-session`} className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
              <Users className="w-5 h-5 inline mr-2" />Go to Attendance Page
            </Link>
          </div>
        )}
        {currentStep === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Upload photos from today's session activities.</p>
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tap to upload session photos</p>
            </div>
          </div>
        )}
        {currentStep === 6 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share your feedback about today's session.</p>
            <textarea className="w-full border rounded-lg p-3 text-sm min-h-[100px] bg-background" placeholder="How did the session go? Any observations..." />
          </div>
        )}
        {currentStep === 7 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Optional: Give a reward to a deserving student.</p>
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
              <Award className="w-4 h-4 inline mr-1 text-warning" /> This step is optional.
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          {currentStep > 1 && (
            <button onClick={() => setCurrentStep(currentStep - 1)} className="flex-1 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              Previous
            </button>
          )}
          <button
            onClick={() => markStepComplete(currentStep)}
            className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {currentStep === 7 ? "Finish Session" : completedSteps.includes(currentStep) ? "Next →" : "Complete & Next →"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
