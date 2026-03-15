import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Plus,
  Filter,
  Users,
  Calendar,
  MessageSquare,
  GripVertical,
  Sparkles,
  Mail,
  Trash2,
  Shield,
  Layers,
  Activity,
  Milestone,
  LayoutGrid,
  Briefcase
} from "lucide-react";
import { useSocket } from "../../hooks/useSocket";
import { useTheme } from "../../components/ThemeProvider";
import { toast } from "sonner";
import CreateActionModal from "../../components/CreateActionModal";
import TaskDetailModal from "../tasks/TaskDetailModal";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";

const COLUMNS = [
  { id: "TODO", title: "To Do", color: "bg-zinc-600" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-600" },
  { id: "IN_REVIEW", title: "In Review", color: "bg-amber-600" },
  { id: "DONE", title: "Done", color: "bg-emerald-600" },
];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-500 border-red-500/20",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/20",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  LOW: "bg-green-500/20 text-green-400 border-green-500/20",
};

interface ProjectKanbanProps {
  isSprintView?: boolean;
  sprintId?: string;
}

export default function ProjectKanban({ isSprintView, sprintId }: ProjectKanbanProps = {}) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<{ _id: string, key: string, title: string, status: string, description?: string, priority: string, dueDate?: string }[]>([]);
  const [project, setProject] = useState<{ _id: string, name: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const socket = useSocket();
  const [selectedTask, setSelectedTask] = useState<{ _id: string, key: string, title: string, status: string, description?: string } | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { activeWorkspace } = useWorkspaceStore();
  const { isAdmin } = useCurrentRole();
  const [members, setMembers] = useState<{ _id: string, userId: { _id: string, name: string, email: string }, role: string }[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");

  // Drag to trash state
  const [isDragging, setIsDragging] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationKey, setDeleteConfirmationKey] = useState("");

  const fetchProjectAndTasks = useCallback(async () => {
    if (!projectId) {
      return;
    }
    try {
      const pRes = await api.get(`/projects/${projectId}`);
      setProject(pRes.data);

      let tRes;
      if (isSprintView && sprintId) {
        // We'll use a filtered endpoint or just filter manually if backend doesn't have it yet
        // For simplicity, we'll assume the task list from active sprint endpoint or filter here
        tRes = await api.get(`/tasks/project/${projectId}`);
        const sprintTasks = (tRes.data as any[]).filter(t => t.sprintId === sprintId);
        setTasks(sprintTasks);
      } else {
        tRes = await api.get(`/tasks/project/${projectId}`);
        setTasks(Array.isArray(tRes.data) ? tRes.data : []);
      }
    } catch (_e) {
      console.error("Dashboard: Error fetching project/tasks", _e);
      setTasks([]);
      toast.error("Failed to load project details");
      if (!isSprintView) navigate("/projects");
    }
  }, [projectId, navigate, isSprintView, sprintId]);

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace._id}/members`);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchProjectAndTasks();
    fetchMembers();
  }, [fetchProjectAndTasks, fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail || !activeWorkspace) return;
    try {
      await api.post(`/workspaces/${activeWorkspace._id}/invite`, { email: inviteEmail, role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setIsInviteOpen(false);
      setInviteEmail("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to invite member");
    }
  };

  useEffect(() => {
    if (socket && projectId) {
      socket.emit("joinProject", projectId);

      socket.on("task-created", (newTask: any) => {
        setTasks((prev) => {
          if (prev.find(t => t._id === newTask._id)) return prev;
          return [...prev, newTask];
        });
      });

      socket.on("task-updated", (updatedTask: any) => {
        setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
      });

      socket.on("task-status-updated", (updatedTask: any) => {
        setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
      });

      socket.on("task-deleted", (payload: { taskId: string }) => {
        setTasks((prev) => prev.filter((t) => t._id !== payload.taskId));
      });

      return () => {
        socket.emit("leaveProject", projectId);
        socket.off("task-created");
        socket.off("task-updated");
        socket.off("task-status-updated");
        socket.off("task-deleted");
      };
    }
  }, [socket, projectId]);

  const handleGenerateAI = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      await api.post("/ai/generate-sprint", { projectId, prompt });
      // We don't manually add data to state here because the backend emits "task-created"
      // via WebSockets, which our useEffect listener handles. 
      // This prevents "Double Tasking".
      setPrompt("");
      toast.success("AI Generation started...");
    } catch {
      toast.error("AI Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    setIsDragging(true);
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, status: string) => {
    const taskId = e.dataTransfer.getData("taskId");
    const oldTasks = [...tasks];
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));

    // Find neighbor tasks in the target column for midpoint ordering
    const columnTasks = tasks.filter((t) => t.status === status && t._id !== taskId);
    const prevTaskId = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1]._id : undefined;

    try {
      await api.put(`/tasks/${taskId}/position`, { status, prevTaskId, nextTaskId: undefined });
    } catch {
      setTasks(oldTasks);
      toast.error("Failed to move task");
    }
  };

  const onDropToTrash = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    setTaskToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete}`);
      setTasks((prev) => prev.filter(t => t._id !== taskToDelete));
      toast.success("Task deleted permanently");
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
      setDeleteConfirmationKey("");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 pt-6 px-8 overflow-hidden">
      {/* Kanban Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-zinc-900 shadow-inner p-1 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 pl-3">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <input
                placeholder="AI Sprint Planner..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-48 bg-transparent border-none text-[10px] uppercase font-bold tracking-widest focus-visible:ring-0 placeholder:text-zinc-600 shadow-none h-auto outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleGenerateAI()}
              />
            </div>
            <Button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-4 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              {isGenerating ? "Generating..." : "Auto Plan"}
            </Button>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white gap-2 font-bold uppercase tracking-widest text-[10px] h-11 px-4">
            <Filter className="h-3.5 w-3.5" /> Filter
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <Avatar key={m._id} className="h-8 w-8 border-2 border-zinc-950 shadow-lg">
                <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${m.userId?.email || m._id}`} />
                <AvatarFallback>{m.userId?.name ? m.userId.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
            ))}
            {members.length > 5 && (
              <div className="h-8 w-8 rounded-full border-2 border-zinc-950 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-400 z-10">
                +{members.length - 5}
              </div>
            )}
          </div>
          <Button onClick={() => setIsNewModalOpen(true)} className="bg-white text-black hover:bg-zinc-200 rounded-xl font-black h-11 px-6 text-xs shadow-lg shadow-white/5">
            <Plus className="h-4 w-4 mr-2" /> New Task
          </Button>
        </div>
      </div>

      {/* Kanban Board - Internal Scroll Logic */}
      <div className="grid grid-cols-4 gap-6 h-full min-h-0 pb-8">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex flex-col bg-zinc-900/10 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-inner min-h-0"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="p-5 flex items-center justify-between bg-zinc-900/20 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.id === 'DONE' ? 'bg-emerald-500' : col.id === 'IN_PROGRESS' ? 'bg-blue-500' : col.id === 'IN_REVIEW' ? 'bg-amber-500' : 'bg-zinc-500'}`} />
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{col.title}</h3>
              </div>
              <span className="text-[9px] font-black bg-zinc-950 text-indigo-400 px-2 py-0.5 rounded-md border border-zinc-800">
                {tasks.filter((t) => t.status === col.id).length}
              </span>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0 custom-scrollbar max-h-[calc(100vh-280px)]">
              <AnimatePresence mode="popLayout">
                {tasks.filter((t) => t.status === col.id).length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-800 italic">Null Data</p>
                  </motion.div>
                ) : (
                  tasks
                    .filter((t) => t.status === col.id)
                    .map((task, idx) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                        key={task._id}
                        draggable
                        onDragStart={(e) => onDragStart(e as any, task._id)}
                        onDragEnd={onDragEnd}
                        onClick={() => setSelectedTask(task)}
                        className={`group p-5 rounded-3xl border transition-all duration-300 cursor-grab active:cursor-grabbing hover:shadow-[0_0_40px_rgba(99,102,241,0.05)] ${isDark ? "bg-zinc-950/80 border-zinc-900 hover:border-indigo-500/40 hover:bg-zinc-900/80" : "bg-white border-zinc-200"
                          }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 pr-2">
                            <span className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest block mb-1">
                              {task.key}
                            </span>
                            <h4 className="text-sm font-bold leading-tight tracking-tight text-white group-hover:text-indigo-400 transition-colors">{task.title}</h4>
                          </div>
                          <GripVertical className="h-4 w-4 text-zinc-800 group-hover:text-zinc-600 transition-colors" />
                        </div>

                        {task.description && (
                          <p className="text-[11px] line-clamp-2 leading-relaxed mb-6 font-medium text-zinc-500">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-zinc-900 group-hover:border-indigo-500/10 transition-colors">
                          <div className="flex flex-col gap-3">
                            <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${PRIORITY_COLORS[task.priority] || "bg-zinc-800 text-zinc-400"}`}>
                              {task.priority}
                            </span>
                            <div className="flex items-center gap-3">
                              <MessageSquare className="h-3 w-3 text-zinc-700" />
                              {task.dueDate && (
                                <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500' : 'text-zinc-700'}`}>
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </div>
                          <Avatar className="h-8 w-8 border-2 border-zinc-900 shadow-lg">
                            <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${task._id}`} />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        </div>
                      </motion.div>
                    ))
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Trash Zone */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div
              onDragOver={onDragOver}
              onDrop={onDropToTrash}
              className="bg-red-500/10 border-2 border-dashed border-red-500/30 rounded-full py-5 px-16 flex items-center gap-4 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.2)]"
            >
              <Trash2 className="h-6 w-6 text-red-500" />
              <span className="font-black text-red-500 uppercase tracking-[0.2em] text-[10px]">Destroy Instance</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isNewModalOpen && (
        <CreateActionModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={() => fetchProjectAndTasks()}
          defaultType="task"
          defaultProjectId={projectId}
        />
      )}

      <TaskDetailModal
        task={selectedTask as any}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onDelete={(taskId) => setTasks(prev => prev.filter(t => t._id !== taskId))}
      />

      {isAdmin && (
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[425px] rounded-[2.5rem] shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white tracking-tight">Expand Team</DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs mt-2 font-medium">
                Project velocity scales with expertise. Initialize an invitation to bring new intelligence into this workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@sprintify.ai"
                  className="bg-zinc-900/50 border-zinc-800 h-14 pl-12 rounded-2xl focus-visible:ring-indigo-500 text-white font-medium"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Access Level</label>
                <select
                  className="w-full bg-zinc-900/50 border border-zinc-800 h-14 rounded-2xl px-5 text-sm font-black text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="ADMIN">Architect</option>
                  <option value="MEMBER">Standard</option>
                  <option value="VIEWER">Observer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="ghost" onClick={() => setIsInviteOpen(false)} className="text-zinc-500 hover:text-white rounded-xl font-bold uppercase tracking-widest text-[10px]">Abandon</Button>
              <Button onClick={handleInvite} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black px-8 h-12 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Execute Invite</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Task Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
        setIsDeleteModalOpen(open);
        if (!open) {
          setDeleteConfirmationKey("");
          setTaskToDelete(null);
        }
      }}>
        <DialogContent className="bg-zinc-950 border-red-900/40 sm:max-w-[425px] rounded-[2.5rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-500 flex items-center gap-3 tracking-tight">
              <Shield className="h-6 w-6" />
              Structural Deletion
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-3 leading-relaxed font-medium">
              This operation is irreversible. All associated data from this instance will be permanently purged from the workspace registry.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-5">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 px-1">
              Verify identity: <span className="text-red-400 select-all font-black">{tasks.find(t => t._id === taskToDelete)?.key || 'CONFIRM'}</span>
            </p>
            <Input
              value={deleteConfirmationKey}
              onChange={(e) => setDeleteConfirmationKey(e.target.value)}
              placeholder={tasks.find(t => t._id === taskToDelete)?.key || 'CONFIRM'}
              className="bg-zinc-900/50 border-red-900/30 h-14 rounded-2xl focus-visible:ring-red-500 text-white placeholder:text-zinc-800 font-black uppercase tracking-widest"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              variant="ghost"
              onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmationKey(""); setTaskToDelete(null); }}
              className="text-zinc-600 hover:text-white rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Abort
            </Button>
            <Button
              onClick={confirmDeleteTask}
              disabled={deleteConfirmationKey !== (tasks.find(t => t._id === taskToDelete)?.key || 'CONFIRM')}
              className="bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black px-8 h-12 border border-red-500/50 shadow-lg shadow-red-600/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
            >
              Confirm Purge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
