import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import { Card } from "../../components/ui/card";
import { motion } from "framer-motion";
import { Activity, Clock } from "lucide-react";
import { useTheme } from "../../components/ThemeProvider";
import { Avatar, AvatarImage } from "../../components/ui/avatar";

interface ActivityItem { _id: string; action: string; createdAt: string; actorId: { name: string }, entityModel: string }

export default function RecentActivityPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        // We'll hit the analytics endpoint which currently limits to 10.
        // In a real app we'd have a dedicated /activity with pagination.
        const { data } = await api.get("/analytics/dashboard");
        setRecentActivity(Array.isArray(data.recentActivity) ? data.recentActivity : []);
      } catch (err) {
        console.error("Failed to fetch recent activity", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  return (
    <div className="space-y-10 pb-12">
      <div>
        <h2 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white flex items-center gap-4">
           <Activity className="h-10 w-10 text-indigo-500" />
           Recent Activity
        </h2>
        <p className="text-zinc-500 mt-2 font-medium ml-14">A chronological stream of all workspace actions.</p>
      </div>

      <Card className="bg-zinc-900/20 border-zinc-800/50 rounded-[2.5rem] p-6 lg:p-10 shadow-none">
         <div className="space-y-4">
            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div></div>
            ) : recentActivity.length === 0 ? (
               <div className="text-center py-20 bg-zinc-950/20 rounded-3xl border border-dashed border-zinc-800">
                  <Clock className="h-10 w-10 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 font-medium italic">No events recorded yet.</p>
               </div>
            ) : (
               recentActivity.map((a, i) => (
                  <motion.div 
                     key={a._id} 
                     initial={{ opacity: 0, x: -10 }} 
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className="flex items-center gap-6 p-4 rounded-2xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 transition-colors group"
                  >
                     <div className="flex items-center gap-4 min-w-[200px]">
                        <Avatar className={`h-10 w-10 border-2 ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                           <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${a.actorId?.name || 'User'}`} />
                        </Avatar>
                        <div>
                           <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{a.actorId?.name || 'System'}</p>
                           <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Workspace Member</p>
                        </div>
                     </div>
                     <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-400">
                           Performed action: <span className="text-zinc-200 font-bold">{a.action.replace(/_/g, " ").toLowerCase()}</span> on <span className="text-indigo-300 font-bold">{a.entityModel}</span>.
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[9px] font-mono text-zinc-700 font-bold uppercase tracking-tighter mt-1">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </p>
                     </div>
                  </motion.div>
               ))
            )}
         </div>
      </Card>
    </div>
  );
}
