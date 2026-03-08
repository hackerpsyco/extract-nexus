import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { setApiUrl, getApiUrl } from "@/services/api";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiUrl, setLocalApiUrl] = useState(getApiUrl());
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = () => {
    if (apiUrl) {
      setApiUrl(apiUrl.replace(/\/$/, ""));
      toast.success("API URL updated");
      setShowApiConfig(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-info/10 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">CLAS</h1>
          <p className="text-muted-foreground text-sm mt-1">Classroom Learning & Administration System</p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-xl shadow-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-1">Facilitator Login</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to access your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* API Configuration */}
          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ⚙️ Configure API URL
            </button>
            {showApiConfig && (
              <div className="mt-3 space-y-2">
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setLocalApiUrl(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://your-django-app.onrender.com"
                />
                <button
                  onClick={handleSaveApiUrl}
                  className="w-full bg-secondary text-secondary-foreground rounded-lg py-2 text-xs font-medium hover:opacity-80"
                >
                  Save API URL
                </button>
                <p className="text-[10px] text-muted-foreground">
                  Set your Django backend URL. This is stored locally in your browser.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
