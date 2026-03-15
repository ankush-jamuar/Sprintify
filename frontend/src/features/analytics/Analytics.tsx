import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { motion } from "framer-motion";
import { 
  Users, 
  Target,
  Zap,
  CheckSquare,
  ArrowUpRight,
  BarChart3,
  Activity,
  TrendingUp,
  Clock
} from "lucide-react";
import { useTheme } from "../../components/ThemeProvider";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarImage } from "../../components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface StatusCount { _id: string; count: number }
interface WorkloadItem { _id: string; activeTasks: number }
interface ActivityItem { _id: string; action: string; createdAt: string; actorId: { name: string } }

export default function Analytics() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await api.get("/analytics/dashboard");
        setStatusCounts(Array.isArray(data.statusCounts) ? data.statusCounts : []);
        setWorkload(Array.isArray(data.workload) ? data.workload : []);
        setRecentActivity(Array.isArray(data.recentActivity) ? data.recentActivity : []);
      } catch (err) {
        console.error("Analytics: Failed to fetch data", err);
        setStatusCounts([]);
        setWorkload([]);
        setRecentActivity([]);
      }
    };
    fetchAnalytics();
  }, []);

  const totalTasks = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const doneTasks = statusCounts.find((s) => s._id === "DONE")?.count || 0;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;



  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">Insights</h2>
        <p className="text-zinc-500 mt-2 font-medium">Deep dive into your workspace efficiency and velocity.</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Throughput", value: totalTasks, icon: Target, color: "text-indigo-400", change: "+12%" },
          { label: "Velocity", value: `${completionRate}%`, icon: Zap, color: "text-amber-400", change: "+5%" },
          { label: "Active Members", value: workload.length, icon: Users, color: "text-blue-400", change: "Stable" },
          { label: "Closed Tasks", value: doneTasks, icon: CheckSquare, color: "text-emerald-400", change: "+24%" },
        ].map((kpi, i) => (
          <motion.div 
            key={kpi.label} 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-4 group overflow-hidden relative shadow-sm dark:shadow-none">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                 <kpi.icon className="w-32 h-32" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className={`p-2 rounded-xl border ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"} ${kpi.color}`}>
                   <kpi.icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                   <ArrowUpRight className="h-3 w-3" /> {kpi.change}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-black mt-4 ${isDark ? "text-white" : "text-zinc-900"}`}>{kpi.value}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Task Distribution */}
          <Card className="lg:col-span-2 bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 rounded-[2.5rem] p-6 shadow-sm dark:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                  <CardTitle className={`text-xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Delivery Pipeline</CardTitle>
                  <p className="text-xs text-zinc-500 mt-1">Task distribution across across all stages.</p>
               </div>
               <BarChart3 className="h-5 w-5 text-indigo-400" />
            </CardHeader>
            <CardContent className="pt-10">
               {totalTasks === 0 ? (
                 <div className="h-56 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                    <BarChart3 className="h-10 w-10 text-zinc-200 dark:text-zinc-800 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">No project data available</p>
                 </div>
               ) : (
                 <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map(status => {
                        const s = statusCounts.find(item => item._id === status) || { count: 0 };
                        return { name: status.replace("_", " "), count: s.count, rawStatus: status };
                      })} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? "#71717a" : "#a1a1aa" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: isDark ? "#71717a" : "#a1a1aa" }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: isDark ? '#27272a' : '#f4f4f5' }}
                          contentStyle={{ backgroundColor: isDark ? '#09090b' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="count" radius={[10, 10, 0, 0]} maxBarSize={60}>
                          {
                            ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((entry, index) => {
                              const colors: Record<string, string> = {
                                TODO: isDark ? "#3f3f46" : "#52525b",
                                IN_PROGRESS: "#6366f1",
                                IN_REVIEW: "#8b5cf6",
                                DONE: "#10b981"
                              };
                              return <Cell key={`cell-${index}`} fill={colors[entry]} />;
                            })
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
               )}
            </CardContent>
         </Card>

         {/* Health Index */}
         <Card className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
            <div className="absolute top-0 right-0 p-10 opacity-10">
               <Activity className="w-48 h-48" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
               <div className="flex-1">
                  <h4 className="text-2xl font-black tracking-tight mb-2">Sprint Health</h4>
                  <p className="text-indigo-100/70 text-sm font-medium mb-12">Overall workspace performance based on velocity and throughput.</p>
                  
                  <div className="text-7xl font-black tracking-tighter mb-4">
                     {completionRate}%
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/20 text-[10px] font-black uppercase tracking-widest">
                     <TrendingUp className="h-3 w-3" />
                     Extreme High
                  </div>
               </div>
               
               <div className="pt-8 border-t border-white/10 mt-auto">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Recommendation</p>
                  <p className="text-xs font-medium mt-2 leading-relaxed">Consider adding 2 more engineers to the IN_PROGRESS stage to clear the bottleneck.</p>
               </div>
            </div>
         </Card>
      </div>

      {/* Activity Log */}
      <Card className="bg-zinc-900/20 border-zinc-800/50 rounded-[2.5rem] p-6 lg:p-10">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                  <Activity className="h-6 w-6 text-indigo-400" />
               </div>
               <div>
                  <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Event Stream</h3>
                  <p className="text-xs text-zinc-500">Live feed of all workspace actions.</p>
               </div>
            </div>
            <Button variant="outline" className={`rounded-xl h-10 ${isDark ? "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-white" : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 shadow-sm"}`}>
               Export CSV
            </Button>
         </div>

         <div className="space-y-4">
            {recentActivity.length === 0 ? (
               <div className="text-center py-20 bg-zinc-950/20 rounded-3xl border border-dashed border-zinc-800">
                  <Clock className="h-10 w-10 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 font-medium italic">No events recorded in the last 24 hours.</p>
               </div>
            ) : (
               <>
                 {recentActivity.slice(0, 3).map((a, i) => (
                  <motion.div 
                     key={a._id} 
                     initial={{ opacity: 0, x: -10 }} 
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className="flex items-center gap-6 p-4 rounded-2xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 transition-colors group"
                  >
                     <div className="flex items-center gap-4 min-w-[200px]">
                        <Avatar className={`h-10 w-10 border-2 ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                           <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${a.actorId?.name}`} />
                        </Avatar>
                        <div>
                           <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{a.actorId?.name}</p>
                           <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Admin</p>
                        </div>
                     </div>
                     <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-400">
                           Performed <span className="text-zinc-200 font-bold">{a.action.replace(/_/g, " ").toLowerCase()}</span> on core assets.
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[9px] font-mono text-zinc-700 font-bold uppercase tracking-tighter mt-1">Today</p>
                     </div>
                  </motion.div>
                 ))}
                 <div className="pt-4 flex justify-center">
                   <Button variant="outline" className={`rounded-xl h-10 w-full ${isDark ? "border-zinc-800 bg-zinc-900/50 text-indigo-400 hover:text-indigo-300" : "border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:text-indigo-700"}`} onClick={() => window.location.href = '/recent-activity'}>
                     View All Activity
                   </Button>
                 </div>
               </>
            )}
         </div>
      </Card>
    </div>
  );
}
