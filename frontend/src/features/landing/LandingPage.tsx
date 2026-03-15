import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Zap, 
  Bot, 
  Kanban, 
  ArrowRight, 
  Shield, 
  Globe, 
  Lock,
  Cpu,
  MousePointer2
} from "lucide-react";
import Logo from "../../components/ui/Logo";
import { Button } from "../../components/ui/button";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-zinc-200 dark:border-white/5 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Workflows</a>
            <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Log in</Link>
            <Link to="/register">
              <Button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg px-5 h-9 font-bold text-xs uppercase tracking-widest">
                Join Sprintfy
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
           <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
           <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10"
          >
            <Zap className="h-3 w-3 fill-indigo-600 dark:fill-indigo-400" />
            <span>Gen-AI Powered Project Management</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] text-zinc-900 dark:text-white"
          >
            Build at the <br /> 
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent italic">
              Speed of Thought.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Sprintify centralizes your engineering workflows, automates task management, and leverages AI to predict bottlenecks before they exist.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-14 px-10 text-lg font-bold shadow-xl shadow-indigo-600/20 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl h-14 px-10 text-lg font-bold">
              View Demo
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="pb-32 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-1.5 rounded-[2.5rem] bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-white/5 shadow-2xl overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none group-hover:opacity-60 transition-opacity" />
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
              alt="Dashboard Preview" 
              className="rounded-[2.2rem] border border-zinc-200 dark:border-white/5 w-full object-cover aspect-[21/9]"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm pointer-events-none">
               <div className="bg-white/90 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                     <MousePointer2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Explore Dashboard</span>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-white dark:bg-zinc-950 relative border-y border-zinc-200 dark:border-white/5">
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-zinc-900 dark:text-white">Engineered for <br /> Peak Efficiency.</h2>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">Move from legacy tools to a platform that understands how engineers actually work.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
          >
            {[
              { icon: Kanban, title: "Velocity Oriented Kanban", desc: "A board optimized for throughput, not just status tracking." },
              { icon: Bot, title: "Agentic Copilot", desc: "AI that plans your sprints and identifies technical debt." },
              { icon: Cpu, title: "Resource Orchestration", desc: "Automatically balance workload across your entire team." },
              { icon: Lock, title: "Enterprise Security", desc: "Military-grade encryption for your most sensitive IPs." },
              { icon: Globe, title: "Global Sync", desc: "Zero-latency collaboration for remote-first organizations." },
              { icon: Shield, title: "Role-base Controls", desc: "Granular permissions system integrated with your SSO." },
            ].map((f, i) => (
              <motion.div key={i} variants={itemVariants} className="group p-2">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-8 border border-zinc-200 dark:border-zinc-800 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5 transition-all">
                  <f.icon className="h-7 w-7 text-zinc-400 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 px-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-indigo-600 dark:bg-indigo-950 pointer-events-none" />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
         <div className="container mx-auto max-w-4xl text-center relative z-10 text-white">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8">Ready to ship <br /> your next big idea?</h2>
            <p className="text-indigo-100 text-lg mb-12 max-w-xl mx-auto font-medium">Join 50,000+ engineers building the future on Sprintfy.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Button size="lg" className="bg-white text-indigo-600 hover:bg-zinc-100 rounded-xl h-14 px-10 text-lg font-bold w-full sm:w-auto">
                  Get Started Free
               </Button>
               <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 rounded-xl h-14 px-10 text-lg font-bold w-full sm:w-auto border border-white/20">
                  Talk to Sales
               </Button>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
            <div className="col-span-2 lg:col-span-2">
               <Logo className="mb-6" />
               <p className="text-zinc-500 dark:text-zinc-600 text-sm max-w-xs leading-relaxed font-medium">
                  The only project management tool that speaks engineer. Built for high-velocity teams.
               </p>
            </div>
            <div>
               <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">Product</h4>
               <ul className="space-y-4 text-sm text-zinc-500 dark:text-zinc-600 font-medium">
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Integrations</a></li>
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Changelog</a></li>
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Methodology</a></li>
               </ul>
            </div>
            <div>
               <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">Company</h4>
               <ul className="space-y-4 text-sm text-zinc-500 dark:text-zinc-600 font-medium">
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Terms of Use</a></li>
               </ul>
            </div>
            <div>
               <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6">Resources</h4>
               <ul className="space-y-4 text-sm text-zinc-500 dark:text-zinc-600 font-medium">
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Community</a></li>
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-indigo-500 transition-colors">Support</a></li>
               </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-zinc-400 font-mono tracking-tighter">
              &copy; 2026 SPRINTFY INC. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-4">
               {[Globe, Shield, Zap].map((Icon, i) => (
                 <div key={i} className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer group">
                    <Icon className="h-4 w-4 text-zinc-400 group-hover:text-indigo-500" />
                 </div>
               ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
