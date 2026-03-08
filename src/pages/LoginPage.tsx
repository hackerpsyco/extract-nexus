import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { setApiUrl, getApiUrl } from "@/services/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff, Settings, ChevronDown } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-info/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center shadow-lg shadow-primary/30"
          >
            <span className="text-primary-foreground font-extrabold text-2xl">C</span>
          </motion.div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">CLAS</h1>
          <p className="text-muted-foreground text-sm mt-1">Classroom Learning & Administration System</p>
        </div>

        {/* Login Form */}
        <div className="floating-card p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-0.5">Welcome back 👋</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your facilitator account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-input rounded-xl px-4 py-3 pr-11 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* API Configuration */}
          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Configure API URL
              <ChevronDown className={`w-3 h-3 transition-transform ${showApiConfig ? "rotate-180" : ""}`} />
            </button>
            {showApiConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-3 space-y-2"
              >
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setLocalApiUrl(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="https://your-django-app.onrender.com"
                />
                <button
                  onClick={handleSaveApiUrl}
                  className="w-full bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-semibold hover:bg-accent transition-colors"
                >
                  Save API URL
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
