import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Building2, UserCheck, CalendarCheck, ClipboardCheck,
  Users, TrendingUp, Settings, LogOut, Menu, X, Search, BookOpen, Calendar,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "MAIN", type: "section" as const },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "My Schools", icon: Building2, path: "/schools" },
  { label: "My Classes", icon: BookOpen, path: "/classes" },
  { label: "My Attendance", icon: UserCheck, path: "/my-attendance" },
  { label: "SESSIONS", type: "section" as const },
  { label: "Today's Session", icon: CalendarCheck, path: "/today-session" },
  { label: "Session Calendar", icon: Calendar, path: "/session-calendar" },
  { label: "Student Attendance", icon: ClipboardCheck, path: "/attendance" },
  { label: "MANAGEMENT", type: "section" as const },
  { label: "Students", icon: Users, path: "/students" },
  { label: "Performance", icon: TrendingUp, path: "/performance" },
];

// Bottom nav items for mobile
const bottomNavItems = [
  { label: "Home", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Classes", icon: BookOpen, path: "/classes" },
  { label: "Session", icon: CalendarCheck, path: "/today-session" },
  { label: "Students", icon: Users, path: "/students" },
  { label: "More", icon: Menu, path: "__menu__" },
];

export default function FacilitatorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[272px] bg-sidebar flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 border-r border-sidebar-border ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm shrink-0 shadow-md">
            C
          </div>
          <div className="min-w-0 flex-1">
            <h6 className="text-sm font-bold text-sidebar-foreground tracking-tight">CLAS</h6>
            <small className="text-[10px] text-muted-foreground leading-none">Facilitator Panel</small>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* User Card */}
        <div className="mx-3 mb-2 p-3 rounded-xl bg-accent/60 border border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
              {user?.full_name?.charAt(0)?.toUpperCase() || "F"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.full_name || "Facilitator"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {navItems.map((item, i) =>
            item.type === "section" ? (
              <div key={i} className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                {item.label}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path!}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 my-0.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  isActive(item.path!)
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {item.icon && <item.icon className="w-[18px] h-[18px] shrink-0" />}
                <span>{item.label}</span>
              </Link>
            )
          )}
        </nav>

        {/* Bottom */}
        <div className="p-3 space-y-1">
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
              isActive("/settings")
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Settings className="w-[18px] h-[18px]" />
            <span>Settings</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-[72px] lg:pb-0">
        {/* Topbar - Desktop */}
        <header className="hidden lg:flex bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 py-3 items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search schools, students, sessions..."
              className="w-full border border-input rounded-xl py-2 pl-9 pr-4 text-sm bg-background/50 focus:bg-background focus:ring-2 focus:ring-ring/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-md">
              {user?.full_name?.charAt(0)?.toUpperCase() || "F"}
            </div>
          </div>
        </header>

        {/* Mobile Topbar */}
        <header className="lg:hidden bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              C
            </div>
            <span className="font-bold text-sm">CLAS</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl hover:bg-accent transition-colors">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 safe-bottom">
        <div className="flex items-center justify-around px-1 py-1.5">
          {bottomNavItems.map((item) => {
            const active = item.path === "__menu__" ? false : isActive(item.path);
            if (item.path === "__menu__") {
              return (
                <button
                  key={item.path}
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-muted-foreground"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
