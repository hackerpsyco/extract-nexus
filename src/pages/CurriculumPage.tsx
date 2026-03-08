import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Printer, RefreshCw } from "lucide-react";

export default function CurriculumPage() {
  const [day, setDay] = useState(1);
  const [language, setLanguage] = useState<"english" | "hindi">("english");

  const sampleContent = `
    <div style="padding: 16px;">
      <h2 style="color: #1f2937; margin-bottom: 16px;">Day ${day} - ${language === "english" ? "English" : "हिंदी"} Curriculum</h2>
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="color: #0369a1; margin-bottom: 8px;">Learning Objectives</h3>
        <ul style="margin-left: 20px; color: #374151;">
          <li>Understand reading comprehension techniques</li>
          <li>Practice active listening skills</li>
          <li>Develop vocabulary through context clues</li>
        </ul>
      </div>
      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="color: #15803d; margin-bottom: 8px;">Activities</h3>
        <ol style="margin-left: 20px; color: #374151;">
          <li>Warm-up: Story circle (10 mins)</li>
          <li>Reading: Shared text reading (15 mins)</li>
          <li>Discussion: Comprehension questions (10 mins)</li>
          <li>Practice: Worksheet activity (10 mins)</li>
          <li>Wrap-up: Share learnings (5 mins)</li>
        </ol>
      </div>
      <div style="background: #fefce8; padding: 16px; border-radius: 8px;">
        <h3 style="color: #a16207; margin-bottom: 8px;">Materials Needed</h3>
        <p style="color: #374151;">Textbook, worksheets, chart paper, colored markers</p>
      </div>
    </div>
  `;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold">Delhi Public School</h2>
          <p className="text-muted-foreground text-sm">5 - A</p>
        </div>
        <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-semibold">Day {day}</span>
      </div>

      {/* Navigation */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium mb-2">Language</label>
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => setLanguage("english")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${language === "english" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("hindi")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${language === "hindi" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                हिंदी
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2">Go to Day (1-150)</label>
            <div className="flex gap-2">
              <button onClick={() => setDay(Math.max(1, day - 1))} className="px-3 py-2 border border-border rounded-lg hover:bg-muted">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={day}
                onChange={(e) => setDay(Math.max(1, Math.min(150, parseInt(e.target.value) || 1)))}
                className="w-20 text-center border border-input rounded-lg text-sm"
                min={1}
                max={150}
              />
              <button onClick={() => setDay(Math.min(150, day + 1))} className="px-3 py-2 border border-border rounded-lg hover:bg-muted">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => {}} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Go</button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-3 py-2 border border-primary/30 text-primary rounded-lg text-sm hover:bg-primary/10">
              <Printer className="w-4 h-4" />
            </button>
            <button className="px-3 py-2 border border-success/30 text-success rounded-lg text-sm hover:bg-success/10">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex justify-between items-center">
          <h6 className="text-sm font-semibold">
            Day {day} - {language === "english" ? "English" : "हिंदी"} Curriculum
          </h6>
          <button onClick={() => window.print()} className="px-3 py-1 border border-primary/30 text-primary rounded-lg text-xs hover:bg-primary/10">
            <Printer className="w-3 h-3 inline mr-1" />Print
          </button>
        </div>
        <div className="min-h-[400px]" dangerouslySetInnerHTML={{ __html: sampleContent }} />
      </div>
    </div>
  );
}
