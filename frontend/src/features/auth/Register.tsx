import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Github, Loader2, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuthStore } from "../../stores/useAuthStore";
import { useTheme } from "../../components/ThemeProvider";
import Logo from "../../components/ui/Logo";
import { toast } from "sonner";

export default function Register() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Registration successful! Please login.");
      navigate("/login");
    } catch {
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.1),transparent)] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <Logo className="justify-center scale-125 mb-8" />
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Get started</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Join 10k+ teams shipping faster with Sprintify.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-white/5 p-8 rounded-3xl shadow-xl dark:shadow-none">
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 h-12 pl-10 rounded-xl focus-visible:ring-indigo-500"
                  required
                />
              </div>
            </div>

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
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Password</label>
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

            <div className="space-y-3 pt-2">
               {[
                 "Real-time Kanban collaboration",
                 "AI-powered sprint planning",
                 "Unlimited project analytics"
               ].map((item, idx) => (
                 <div key={idx} className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                   <Check className="h-3 w-3 text-indigo-500" />
                   {item}
                 </div>
               ))}
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-2 text-base shadow-lg shadow-indigo-600/20 mt-4">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create Account <ArrowRight className="h-5 w-5" /></>}
            </Button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}></div></div>
            <span className={`relative px-4 text-xs font-bold uppercase tracking-widest ${isDark ? "bg-zinc-900 text-zinc-600" : "bg-white text-zinc-400"}`}>or sign up with</span>
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
          Already have an account? <Link to="/login" className="text-indigo-400 font-bold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
