import { motion } from "framer-motion";
import { School, Users, BookOpen, CalendarCheck, UserPlus, Building2, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const mockStats = { total_schools: 3, total_classes: 8, total_students: 156, conducted_sessions: 42 };
const mockAttendance = [
  { class_section: { school: { name: "Delhi Public School" }, display_name: "5A" }, total_students: 32, attendance_rate: 92 },
  { class_section: { school: { name: "Delhi Public School" }, display_name: "5B" }, total_students: 28, attendance_rate: 78 },
  { class_section: { school: { name: "Kendriya Vidyalaya" }, display_name: "4A" }, total_students: 35, attendance_rate: 65 },
  { class_section: { school: { name: "Kendriya Vidyalaya" }, display_name: "6A" }, total_students: 30, attendance_rate: 88 },
];

const statCards = [
  { key: "total_schools", label: "Schools", icon: School, color: "text-primary", bg: "bg-primary/10" },
  { key: "total_classes", label: "Classes", icon: BookOpen, color: "text-info", bg: "bg-info/10" },
  { key: "total_students", label: "Students", icon: Users, color: "text-success", bg: "bg-success/10" },
  { key: "conducted_sessions", label: "Sessions", icon: CalendarCheck, color: "text-warning", bg: "bg-warning/10" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = mockStats;

  return (
    <div className="space-y-5">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-primary text-primary-foreground rounded-2xl p-5 sm:p-6 shadow-lg shadow-primary/20"
      >
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 opacity-80" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-75">Welcome back</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold">{user?.full_name || "Facilitator"}</h1>
            <p className="opacity-75 text-sm mt-1">Here's what's happening with your classes today</p>
          </div>
          <div className="text-xs opacity-60 bg-white/10 px-3 py-1.5 rounded-lg">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="elevated-card p-4 hover:shadow-lg transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{stats[card.key as keyof typeof stats]}</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Attendance Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 elevated-card p-5"
        >
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-info" />
            </div>
            Class-wise Attendance
          </h3>
          {mockAttendance.length > 0 ? (
            <div className="space-y-4">
              {mockAttendance.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{stat.class_section.display_name}</span>
                      <span className="text-xs text-muted-foreground">{stat.class_section.school.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${stat.attendance_rate >= 85 ? "text-success" : stat.attendance_rate >= 70 ? "text-warning" : "text-destructive"}`}>
                      {stat.attendance_rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.attendance_rate}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        stat.attendance_rate >= 85 ? "bg-success" :
                        stat.attendance_rate >= 70 ? "bg-warning" :
                        "bg-destructive"
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No attendance data yet</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="elevated-card p-5"
        >
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-primary" />
            </div>
            Quick Actions
          </h3>
          <div className="grid gap-2">
            {[
              { label: "Add Student", icon: UserPlus, path: "/students/create", color: "text-success", bg: "bg-success/10 hover:bg-success/15", border: "border-success/20" },
              { label: "View Students", icon: Users, path: "/students", color: "text-primary", bg: "bg-primary/10 hover:bg-primary/15", border: "border-primary/20" },
              { label: "My Schools", icon: Building2, path: "/schools", color: "text-info", bg: "bg-info/10 hover:bg-info/15", border: "border-info/20" },
              { label: "Today's Session", icon: CalendarCheck, path: "/today-session", color: "text-warning", bg: "bg-warning/10 hover:bg-warning/15", border: "border-warning/20" },
            ].map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${action.border} ${action.bg} text-sm font-semibold transition-all active:scale-[0.98]`}
              >
                <action.icon className={`w-4 h-4 ${action.color}`} />
                <span className={action.color}>{action.label}</span>
                <ChevronRight className={`w-4 h-4 ml-auto ${action.color} opacity-50`} />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
