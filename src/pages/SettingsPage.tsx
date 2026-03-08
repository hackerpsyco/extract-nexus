import { useAuth } from "@/contexts/AuthContext";
import { Settings, Lock, Bell, User, Calendar } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Settings</h2>
      <p className="text-muted-foreground text-sm mb-6">Manage your facilitator account and preferences</p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 font-semibold text-sm">Account Settings</div>
            <div className="p-5 space-y-6">
              {/* Profile */}
              <div>
                <h6 className="font-semibold text-sm mb-3">Profile Information</h6>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Full Name</label>
                    <input type="text" value={user?.full_name || ""} disabled className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-muted/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Email Address</label>
                    <input type="email" value={user?.email || ""} disabled className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-muted/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Role</label>
                    <input type="text" value={user?.role?.name || "Facilitator"} disabled className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-muted/50" />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="border-t border-border pt-4">
                <h6 className="font-semibold text-sm mb-3">Preferences</h6>
                <div className="space-y-2">
                  {["Email notifications for session updates", "Email notifications for attendance records", "Weekly performance summary"].map((label, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked={i < 2} className="rounded border-border" />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Security */}
              <div className="border-t border-border pt-4">
                <h6 className="font-semibold text-sm mb-3">Security</h6>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1">
                  <Lock className="w-4 h-4" />Change Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30 font-semibold text-sm">Account Info</div>
            <div className="p-5 space-y-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Account Type</p>
                <p className="font-bold text-primary">Facilitator</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-bold text-success">Active</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="font-bold text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Last Login</p>
                <p className="font-bold text-sm">{user?.last_login ? new Date(user.last_login).toLocaleDateString() : "Now"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
