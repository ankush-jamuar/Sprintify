import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../hooks/useSocket";
import { useAuthStore } from "../../stores/useAuthStore";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { api } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Zap, Star, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TaskProgressChart from "../../components/dashboard/TaskProgressChart";
import MyTasksWidget from "../../components/dashboard/MyTasksWidget";
import SprintHealthCard from "../../components/dashboard/SprintHealthCard";
import AIInsightsCard from "../../components/dashboard/AIInsightsCard";
import RecentProjectsWidget from "../../components/dashboard/RecentProjectsWidget";
import RecentActivityWidget from "../../components/dashboard/RecentActivityWidget";
import UpcomingDeadlinesWidget from "../../components/dashboard/UpcomingDeadlinesWidget";
import { toast } from "sonner";
import CreateActionModal from "../../components/CreateActionModal";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import AIDailySummaryWidget from "../../components/dashboard/AIDailySummaryWidget";
import AIRecommendationsWidget from "../../components/dashboard/AIRecommendationsWidget";

export default function Dashboard() {
  const { activeWorkspace, setActiveWorkspace, workspaces, loading: storeLoading, fetchWorkspaces } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [workspaceName, setWorkspaceName] = useState("");
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useCurrentRole();
  const queryClient = useQueryClient();

  const socket = useSocket();

  const { data: dashboardData, isLoading: loadingQuery } = useQuery({
    queryKey: ["dashboard", activeWorkspace?._id],
    queryFn: async () => {
      if (!activeWorkspace) return null;
      const [projRes, analyticsRes, overdueRes] = await Promise.all([
        api.get(`/workspaces/${activeWorkspace._id}/projects`),
        api.get("/analytics/dashboard"),
        api.get("/tasks?overdue=true&limit=1")
      ]);

      const counts = analyticsRes.data.statusCounts || [];
      const statMap = {
        todo: counts.find((c: { _id: string, count: number }) => c._id === 'TODO')?.count || 0,
        inProgress: counts.find((c: { _id: string, count: number }) => c._id === 'IN_PROGRESS')?.count || 0,
        done: counts.find((c: { _id: string, count: number }) => c._id === 'DONE')?.count || 0,
      };

      return {
        projects: projRes.data,
        stats: { ...statMap, total: statMap.todo + statMap.inProgress + statMap.done },
        overdueCount: overdueRes.data.pagination.total
      };
    },
    enabled: !!activeWorkspace,
  });

  useEffect(() => {
    if (!socket) return;
    const handleDashboardUpdate = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    socket.on("dashboard-updated", handleDashboardUpdate);
    return () => { socket.off("dashboard-updated", handleDashboardUpdate); };
  }, [socket, queryClient]);

  const projects = dashboardData?.projects || [];
  const stats = dashboardData?.stats || { todo: 0, inProgress: 0, done: 0, total: 0 };
  const loading = loadingQuery || storeLoading;
  const hasWorkspace = workspaces.length > 0;

  const createWorkspace = async () => {
    if (!workspaceName.trim()) return;
    try {
      const { data } = await api.post("/workspaces", { name: workspaceName });
      setActiveWorkspace(data);
      setWorkspaceName("");
      await fetchWorkspaces();
      toast.success("Workspace created successfully!");
    } catch {
      toast.error("Error creating workspace");
    }
  };

  const handleCreateProject = () => setIsNewProjectOpen(true);

  if (!hasWorkspace) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg p-12 rounded-[2.5rem] bg-zinc-900/50 border border-white/5 backdrop-blur-2xl text-center space-y-8 shadow-2xl"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/20">
            <Zap className="h-12 w-12 text-white fill-white/20" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tight">Setup your space</h2>
            <p className="text-zinc-500 text-lg">Every great product starts with a workspace.</p>
          </div>
          <div className="relative group">
            <Input
              placeholder="Organization or Team Name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="bg-zinc-950/80 border-zinc-800 h-14 rounded-2xl text-lg pl-6 focus-visible:ring-indigo-500"
              onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
            />
            <Button
              onClick={createWorkspace}
              className="absolute right-1.5 top-1.5 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 font-bold"
            >
              Launch
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header with Glassmorphism Card */}
      <section className="relative overflow-hidden p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 shadow-2xl shadow-indigo-600/20">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Zap className="h-48 w-48 text-white" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest">
            <Star className="h-3 w-3 fill-white" />
            <span>Sprint Active • 4 Days Left</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            Good morning, {user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-indigo-100/70 text-lg max-w-xl font-medium">
            {stats.total > 0
              ? `Your team has ${stats.inProgress} tasks in progress and ${stats.todo} pending in the current sprint.`
              : "Start your journey by creating a project and adding your first tasks."}
          </p>
          <div className="pt-4 flex gap-3">
            <Button onClick={() => navigate("/projects")} className="bg-white text-indigo-600 hover:bg-zinc-100 rounded-xl px-6 font-bold h-11">
              View Projects
            </Button>
            <Button variant="outline" onClick={() => navigate("/recent-activity")} className="border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-xl px-6 h-11">
              Recent Activity
            </Button>
          </div>
        </div>
      </section>

      {/* Overdue Alert */}
      {dashboardData && dashboardData.overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => navigate('/tasks?overdue=true')}
          className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-between group cursor-pointer hover:bg-red-500/15 transition-all shadow-xl shadow-red-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40 group-hover:scale-110 transition-transform">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">You have {dashboardData.overdueCount} overdue tasks</h3>
              <p className="text-red-400 text-sm font-medium">Click here to view and resolve them immediately.</p>
            </div>
          </div>
          <Button variant="ghost" className="text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl px-6 font-bold">
            Resolve Now ↗
          </Button>
        </motion.div>
      )}

      {/* Overdue Alert omitted for brevity in search, but it stays there */}

      <AIRecommendationsWidget />

      {/* Grid Layout (Static) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Data) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <RecentProjectsWidget projects={projects} isAdmin={isAdmin} loading={loading} handleCreateProject={handleCreateProject} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <TaskProgressChart />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <UpcomingDeadlinesWidget />
            <RecentActivityWidget />
          </motion.div>
        </div>

        {/* Right Column (Insights & Tasks) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
            <AIDailySummaryWidget />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }}>
            <MyTasksWidget />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.5 }}>
            <SprintHealthCard projectId={projects[0]?._id} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.6 }}>
            <AIInsightsCard />
          </motion.div>
        </div>
      </div>

      {isNewProjectOpen && (
        <CreateActionModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
          onSuccess={() => {
            setIsNewProjectOpen(false);
            queryClient.invalidateQueries({ queryKey: ["dashboard", activeWorkspace?._id] });
          }}
          defaultType="project"
        />
      )}
    </div>
  );
}
