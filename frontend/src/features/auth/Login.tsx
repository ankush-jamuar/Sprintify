import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Github, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuthStore } from "../../stores/useAuthStore";
import Logo from "../../components/ui/Logo";
import { useTheme } from "../../components/ThemeProvider";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.1),transparent)] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <Logo className="justify-center scale-125 mb-8" />
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Welcome back</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Enter your credentials to access your workspace.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-white/5 p-8 rounded-3xl shadow-xl dark:shadow-none">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 h-12 pl-10 rounded-xl focus-visible:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Password</label>
                <Link to="#" className="text-xs text-indigo-400 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 h-12 pl-10 pr-10 rounded-xl focus-visible:ring-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-2 text-base shadow-lg shadow-indigo-600/20">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Sign In <ArrowRight className="h-5 w-5" /></>}
            </Button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}></div></div>
            <span className={`relative px-4 text-xs font-bold uppercase tracking-widest ${isDark ? "bg-zinc-900 text-zinc-600" : "bg-white text-zinc-400"}`}>or continue with</span>
          </div>

          <Button 
             variant="outline" 
             disabled
             className={`w-full h-12 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 rounded-xl gap-3 cursor-not-allowed relative group`}
          >
             <Github className="h-5 w-5" />
             Continue with GitHub
             <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] py-1 px-3 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                OAuth not configured
             </span>
          </Button>
        </div>

        <p className="text-center mt-8 text-sm text-zinc-500">
          Don't have an account? <Link to="/register" className="text-indigo-400 font-bold hover:underline">Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
}
