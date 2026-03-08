import { motion } from "framer-motion";
import { School, Users, BookOpen, CalendarCheck, UserPlus, Building2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Mock data for demo
const mockStats = { total_schools: 3, total_classes: 8, total_students: 156, conducted_sessions: 42 };
const mockAttendance = [
  { class_section: { school: { name: "Delhi Public School" }, display_name: "5A" }, total_students: 32, attendance_rate: 92 },
  { class_section: { school: { name: "Delhi Public School" }, display_name: "5B" }, total_students: 28, attendance_rate: 78 },
  { class_section: { school: { name: "Kendriya Vidyalaya" }, display_name: "4A" }, total_students: 35, attendance_rate: 65 },
  { class_section: { school: { name: "Kendriya Vidyalaya" }, display_name: "6A" }, total_students: 30, attendance_rate: 88 },
];

const statCards = [
  { key: "total_schools", label: "Schools", icon: School, gradient: "from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)]" },
  { key: "total_classes", label: "Classes", icon: BookOpen, gradient: "from-[#f093fb] to-[#f5576c]" },
  { key: "total_students", label: "Students", icon: Users, gradient: "from-[#4facfe] to-[#00f2fe]" },
  { key: "conducted_sessions", label: "Sessions Conducted", icon: CalendarCheck, gradient: "from-[#43e97b] to-[#38f9d7]" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = mockStats;
  const attendanceStats = mockAttendance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary to-[hsl(271,47%,48%)] text-primary-foreground rounded-xl p-5"
      >
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">Welcome back, {user?.full_name || "Facilitator"}!</h1>
            <p className="opacity-75 text-sm">Here's what's happening with your classes today</p>
          </div>
          <small className="opacity-75">Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-gradient-to-br ${card.gradient} text-white rounded-xl p-5 text-center h-[120px] flex flex-col justify-center hover:-translate-y-1 transition-transform cursor-default`}
          >
            <div className="text-3xl font-bold">{stats[card.key as keyof typeof stats]}</div>
            <div className="text-sm opacity-90 mt-1 flex items-center justify-center gap-1">
              <card.icon className="w-4 h-4" />
              {card.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attendance Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card rounded-xl shadow-sm border border-border p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-info" />
            Class-wise Attendance Performance
          </h3>
          {attendanceStats.length > 0 ? (
            <div className="space-y-4">
              {attendanceStats.map((stat, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                    <span className="text-sm font-medium">
                      {stat.class_section.school.name} - {stat.class_section.display_name}
                      <span className="text-muted-foreground ml-1 text-xs">({stat.total_students} students)</span>
                    </span>
                    <strong className={`text-sm ${stat.attendance_rate >= 85 ? "text-success" : stat.attendance_rate >= 70 ? "text-warning" : "text-destructive"}`}>
                      {stat.attendance_rate}%
                    </strong>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.attendance_rate}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                      className={`h-full rounded-full ${
                        stat.attendance_rate >= 85 ? "bg-gradient-to-r from-success to-emerald-400" :
                        stat.attendance_rate >= 70 ? "bg-gradient-to-r from-warning to-orange-400" :
                        "bg-gradient-to-r from-destructive to-pink-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No attendance data available yet</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl shadow-sm border border-border p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-primary" />
            Quick Actions
          </h3>
          <div className="grid gap-2">
            {[
              { label: "Add Student", icon: UserPlus, path: "/students/create", variant: "success" },
              { label: "View Students", icon: Users, path: "/students", variant: "primary" },
              { label: "My Schools", icon: Building2, path: "/schools", variant: "info" },
              { label: "My Classes", icon: BookOpen, path: "/today-session", variant: "warning" },
            ].map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-accent ${
                  action.variant === "success" ? "border-success/30 text-success hover:bg-success/10" :
                  action.variant === "primary" ? "border-primary/30 text-primary hover:bg-primary/10" :
                  action.variant === "info" ? "border-info/30 text-info hover:bg-info/10" :
                  "border-warning/30 text-warning hover:bg-warning/10"
                }`}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
