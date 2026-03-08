import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Building2, UserCheck, CalendarCheck, ClipboardCheck,
  Users, TrendingUp, Settings, LogOut, Menu, X, Search, BookOpen, Calendar
} from "lucide-react";

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

export default function FacilitatorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="flex min-h-screen">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* User Info */}
        <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() || "F"}
          </div>
          <div className="min-w-0">
            <h6 className="text-sm font-semibold text-sidebar-foreground truncate">Facilitator</h6>
            <small className="text-xs text-muted-foreground truncate block">{user?.email}</small>
          </div>
          <button className="lg:hidden ml-auto p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item, i) =>
            item.type === "section" ? (
              <div key={i} className="px-4 py-2 mt-2 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path!}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 mx-1.5 my-0.5 rounded-md text-sm transition-colors ${
                  isActive(item.path!)
                    ? "bg-sidebar-active font-semibold border-l-[3px] border-sidebar-foreground"
                    : "hover:bg-sidebar-active"
                }`}
              >
                {item.icon && <item.icon className="w-[18px] h-[18px] shrink-0" />}
                <span>{item.label}</span>
              </Link>
            )
          )}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border py-2">
          <div className="px-4 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">ACCOUNT</div>
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 mx-1.5 my-0.5 rounded-md text-sm transition-colors ${
              isActive("/settings") ? "bg-sidebar-active font-semibold border-l-[3px] border-sidebar-foreground" : "hover:bg-sidebar-active"
            }`}
          >
            <Settings className="w-[18px] h-[18px]" />
            <span>Settings</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 mx-1.5 my-0.5 rounded-md text-sm w-[calc(100%-0.75rem)] text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden p-1" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex relative flex-1 max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search schools, students, sessions..."
                className="w-full border border-input rounded-md py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
            {user?.full_name?.charAt(0)?.toUpperCase() || "F"}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
