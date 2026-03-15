import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { api } from "../lib/axios";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { toast } from "sonner";
import { FolderKanban, ListTodo, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface CreateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: "project" | "task";
  defaultProjectId?: string;
}

export default function CreateActionModal({ isOpen, onClose, onSuccess, defaultType = "project", defaultProjectId }: CreateActionModalProps) {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspaceStore();
  const [type, setType] = useState<"project" | "task">(defaultType);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [assigneeId, setAssigneeId] = useState("");
  const [epicId, setEpicId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [projects, setProjects] = useState<{ _id: string, name: string }[]>([]);
  const [members, setMembers] = useState<{ userId?: { _id: string, name: string } }[]>([]);
  const [epics, setEpics] = useState<{ _id: string, name: string }[]>([]);
  const [sprints, setSprints] = useState<{ _id: string, name: string }[]>([]);

  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace?._id}/members`);
      setMembers(data);
    } catch {
      console.error("Failed to fetch members");
    }
  }, [activeWorkspace?._id]);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace?._id}/projects`);
      setProjects(data);
      if (data.length > 0 && !defaultProjectId && !projectId) {
        setProjectId(data[0]._id);
      }
    } catch {
      console.error("Failed to fetch projects");
    }
  }, [activeWorkspace?._id, defaultProjectId, projectId]);

  const fetchPlanningData = useCallback(async (pid: string) => {
    if (!pid) return;
    try {
      const [epicsRes, sprintsRes] = await Promise.all([
        api.get(`/planning/projects/${pid}/epics`),
        api.get(`/planning/projects/${pid}/sprints`)
      ]);
      setEpics(epicsRes.data);
      setSprints(sprintsRes.data);
    } catch {
      console.error("Failed to fetch planning data");
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchPlanningData(projectId);
    }
  }, [projectId, fetchPlanningData]);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      if (defaultProjectId) {
        setProjectId(defaultProjectId);
      }
      setPriority("MEDIUM");
      setDueDate("");
      if (activeWorkspace) {
        fetchProjects();
        fetchMembers();
      }
    }
  }, [isOpen, activeWorkspace, defaultType, defaultProjectId, fetchProjects, fetchMembers]);

  const handleCreate = async () => {
    if (!name || (type === "task" && !projectId)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      if (type === "project") {
        await api.post("/projects", {
          workspaceId: activeWorkspace?._id,
          name,
          description
        });
        toast.success("Project created successfully!");
      } else {
        await api.post("/tasks", {
          projectId,
          title: name,
          description,
          assigneeId: assigneeId || undefined,
          priority,
          dueDate: dueDate || undefined,
          epicId: epicId || undefined,
          sprintId: sprintId || undefined
        });
        toast.success("Task created successfully!");
        queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        queryClient.invalidateQueries({ queryKey: ["activeSprint", projectId] });
      }
      if (type === "project") {
        queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspace?._id] });
      }
      onSuccess?.();
      onClose();
      setName("");
      setDescription("");
      setAssigneeId("");
      setEpicId("");
      setSprintId("");
      setPriority("MEDIUM");
      setDueDate("");
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || `Failed to create ${type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[500px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            Create New
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <button
            onClick={() => setType("project")}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${type === "project" ? "bg-indigo-600/10 border-indigo-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
          >
            <FolderKanban className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-widest">Project</span>
          </button>
          <button
            onClick={() => setType("task")}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${type === "task" ? "bg-indigo-600/10 border-indigo-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
          >
            <ListTodo className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-widest">Task</span>
          </button>
        </div>

        <div className="space-y-6 py-4">
          {type === "task" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Target Project</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 h-12 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                  >
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Assignee</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 h-12 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId?._id} value={m.userId?._id}>{m.userId?.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 h-12 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus-visible:ring-indigo-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Epic (Optional)</label>
                  <select
                    value={epicId}
                    onChange={(e) => setEpicId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 h-12 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">No Epic</option>
                    {epics.map(e => (
                      <option key={e._id} value={e._id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Sprint (Optional)</label>
                  <select
                    value={sprintId}
                    onChange={(e) => setSprintId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 h-12 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="">No Sprint</option>
                    {sprints.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">{type === "project" ? "Project Name" : "Task Title"}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder={type === "project" ? "My Awesome App" : "Design landing page"}
              className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus-visible:ring-indigo-500 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder={`Describe your ${type}...`}
              className="bg-zinc-900 border-zinc-800 rounded-xl focus-visible:ring-indigo-500 min-h-[100px] resize-none text-white"
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-zinc-900/50">
          <Button variant="ghost" onClick={onClose} className="rounded-xl text-zinc-500 hover:text-white font-bold h-12 px-6">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-bold gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Effortlessly"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
