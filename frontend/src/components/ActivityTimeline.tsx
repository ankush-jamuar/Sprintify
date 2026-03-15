import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/axios";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { useSocket } from "../hooks/useSocket";
import { Loader2 } from "lucide-react";

interface Activity {
  _id: string;
  actorId: { name: string };
  action: string;
  entityModel: string;
  createdAt: string;
}

interface Props {
  limit?: number;
  hideHeader?: boolean;
}

export default function ActivityTimeline({ limit, hideHeader }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeWorkspace } = useWorkspaceStore();
  const socket = useSocket();

  const fetchActivity = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/analytics/dashboard`);
      if (data.recentActivity) {
        setActivities(data.recentActivity);
      } else {
        setActivities([]);
      }
    } catch {
      console.error("Failed to fetch activity timeline");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Real-time updates: prepend new activity events
  useEffect(() => {
    if (!socket) return;
    const handleActivity = (newActivity: Activity) => {
      setActivities(prev => [newActivity, ...prev].slice(0, 5));
    };
    socket.on("activity-created", handleActivity);
    return () => { socket.off("activity-created", handleActivity); };
  }, [socket]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;
  }

  if (activities.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-500 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-3xl">
        <p className="text-xs font-semibold">No recent activity found.</p>
      </div>
    );
  }

  const displayActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className={`space-y-4 ${!hideHeader ? "p-6" : ""}`}>
      {!hideHeader && <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>}
      {displayActivities.map((act, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-zinc-900/20 border border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
          <div>
            <h5 className="text-xs font-black text-zinc-200">{act.action.replace(/_/g, " ")}</h5>
            <p className="text-[11px] text-zinc-500 mt-0.5">{act.actorId?.name || "System"} performed this action on {act.entityModel}</p>
            <span className="text-[9px] text-zinc-600 font-mono mt-1 block">
              {new Date(act.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
