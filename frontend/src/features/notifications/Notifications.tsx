import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { BellOff, MessageSquare, Briefcase, User, Info, Check, Trash2, Clock, Globe } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useSocket } from "../../hooks/useSocket";
import { toast } from "sonner";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";

interface Notification {
  _id: string;
  type: string;
  title?: string; // Optional since backend might just send message
  message: string;
  isRead: boolean;
  entityId?: string;
  entityModel?: string;
  createdAt: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socket = useSocket();
  const navigate = useNavigate();
  const { fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/notifications");
        setNotifications(data);
      } catch {
        console.error("Failed to fetch notifications");
      }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };
    socket.on("notification", handler);
    return () => {
      socket.off("notification", handler);
    };
  }, [socket]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch {
      console.error("Failed to mark notification as read");
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch {
      console.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter((n) => n._id !== id));
    } catch {
      console.error("Failed to delete notification");
    }
  };

  const handleAcceptInvite = async (notif: Notification) => {
    try {
      // Extract invitationId or workspaceId if possible, but the backend acceptInvite 
      // uses invitationId. Let's assume the notification entityId is the invitationId.
      if (!notif.entityId) {
        toast.error("Invalid invitation notification");
        return;
      }
      
      await api.post(`/workspaces/invitations/${notif.entityId}/accept`);
      toast.success("Invitation accepted! Welcome to the workspace.");
      markAsRead(notif._id);
      await fetchWorkspaces();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to accept invitation");
    }
  };

  const handleDeclineInvite = async (notif: Notification) => {
    try {
      if (!notif.entityId) {
        toast.error("Invalid invitation notification");
        return;
      }
      
      await api.post(`/workspaces/invitations/${notif.entityId}/decline`);
      toast.success("Invitation declined.");
      deleteNotification(notif._id);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to decline invitation");
    }
  };

  const getTypeIcon = (type: string, message: string) => {
    if (message.includes("invited to join Workspace")) return <Globe className="h-5 w-5 text-amber-400" />;
    
    switch (type) {
      case "COMMENT": return <MessageSquare className="h-5 w-5 text-indigo-400" />;
      case "TASK_ASSIGNED": return <User className="h-5 w-5 text-blue-400" />;
      case "PROJECT_INVITE": return <Briefcase className="h-5 w-5 text-amber-400" />;
      default: return <Info className="h-5 w-5 text-zinc-400" />;
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif._id);
    if (!notif.entityId || !notif.entityModel) return;

    if (notif.entityModel === "Project") {
      navigate(`/projects/${notif.entityId}`);
    } else if (notif.entityModel === "Task") {
      try {
        const { data } = await api.get("/tasks");
        const task = data.find((t: { _id: string, projectId: string }) => t._id === notif.entityId);
        if (task) navigate(`/projects/${task.projectId}`);
        else toast.error("Task no longer exists");
      } catch {
        toast.error("Failed to load task details");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white">Notifications</h2>
          <p className="text-zinc-500 mt-2 font-medium">Keep track of mentions, tasks, and system updates.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="ghost" onClick={markAllRead} className="text-zinc-500 hover:text-white font-black uppercase tracking-widest text-[10px] h-10 border border-zinc-800 px-6 rounded-xl">
              Mark all read
           </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-zinc-900/10 rounded-[2.5rem] border-2 border-dashed border-zinc-800">
          <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6">
             <BellOff className="h-10 w-10 text-zinc-700" />
          </div>
          <h3 className="text-xl font-bold text-zinc-400">All caught up!</h3>
          <p className="text-zinc-600 mt-1 max-w-xs text-center font-medium leading-relaxed">
             You don't have any new notifications at the moment. Take a deep breath!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {notifications.map((n, i) => (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card 
                  onClick={(e) => {
                    // Prevent trigger if clicking the Accept button
                    if ((e.target as HTMLElement).closest('button')) return;
                    handleNotificationClick(n);
                  }}
                  className={`group relative bg-zinc-900/30 border-zinc-800/60 rounded-3xl transition-all duration-300 hover:bg-zinc-900/50 cursor-pointer ${!n.isRead ? 'border-l-4 border-l-indigo-500 shadow-xl shadow-indigo-500/5' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <div className={`w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        {getTypeIcon(n.type, n.message)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className={`text-base font-bold transition-colors ${n.isRead ? 'text-zinc-300' : 'text-white'}`}>{n.title}</h4>
                           <span className="text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-widest">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-zinc-500 leading-relaxed font-medium mb-4">{n.message}</p>
                        
                        <div className="flex items-center gap-4 mb-4">
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-zinc-500">
                              <Clock className="h-3 w-3" />
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                           <div className="h-1 w-1 rounded-full bg-zinc-800" />
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-zinc-500">
                              <Globe className="h-3 w-3" />
                              Workflow Sync
                           </div>
                        </div>

                        {n.message.includes("invited to join Workspace") && (
                           <div className="mt-2 flex gap-3">
                              <Button 
                                onClick={() => handleAcceptInvite(n)}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 px-6 font-bold"
                              >
                                Accept Invitation
                              </Button>
                              <Button 
                                onClick={() => handleDeclineInvite(n)}
                                variant="outline"
                                className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white rounded-xl h-10 px-6 font-bold"
                              >
                                Decline
                              </Button>
                           </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                         {!n.isRead && (
                           <Button 
                             onClick={() => markAsRead(n._id)} 
                             variant="ghost" 
                             size="icon" 
                             className="h-10 w-10 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl shadow-lg border border-indigo-500/20"
                           >
                             <Check className="h-4 w-4" />
                           </Button>
                         )}
                         <Button 
                           onClick={() => deleteNotification(n._id)} 
                           variant="ghost" 
                           size="icon" 
                           className="h-10 w-10 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 rounded-xl"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
