import { useAuth } from "@/contexts/AuthContext";
import { Settings, Lock, User, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary" />
          </div>
          Settings
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile */}
          <div className="elevated-card p-5">
            <h6 className="font-bold text-sm flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary" /> Profile Information
            </h6>
            <div className="space-y-3">
              {[
                { label: "Full Name", value: user?.full_name || "" },
                { label: "Email Address", value: user?.email || "", type: "email" },
                { label: "Role", value: user?.role?.name || "Facilitator" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">{field.label}</label>
                  <input
                    type={field.type || "text"}
                    value={field.value}
                    disabled
                    className="w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-muted/50 text-muted-foreground"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="elevated-card p-5">
            <h6 className="font-bold text-sm flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-primary" /> Notifications
            </h6>
            <div className="space-y-3">
              {["Session updates", "Attendance records", "Weekly performance summary"].map((label, i) => (
                <label key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
                  <span className="text-sm font-medium">{label}</span>
                  <div className={`w-10 h-6 rounded-full relative transition-colors ${i < 2 ? "bg-primary" : "bg-muted"}`}>
                    <div className={`w-4 h-4 bg-card rounded-full absolute top-1 transition-all shadow-sm ${i < 2 ? "right-1" : "left-1"}`} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="elevated-card p-5">
            <h6 className="font-bold text-sm flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" /> Security
            </h6>
            <button className="px-4 py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-1.5 active:scale-[0.98] transition-transform">
              <Lock className="w-3.5 h-3.5" />Change Password
            </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="elevated-card p-5 space-y-3">
            <h6 className="font-bold text-sm mb-1">Account Info</h6>
            {[
              { label: "Account Type", value: "Facilitator", bg: "bg-primary/10", text: "text-primary" },
              { label: "Status", value: "Active", bg: "bg-success/10", text: "text-success" },
              { label: "Member Since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A", bg: "bg-muted/50", text: "text-foreground" },
              { label: "Last Login", value: user?.last_login ? new Date(user.last_login).toLocaleDateString() : "Now", bg: "bg-muted/50", text: "text-foreground" },
            ].map((item) => (
              <div key={item.label} className={`p-3 ${item.bg} rounded-xl`}>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                <p className={`font-bold text-sm ${item.text}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
