import { useState, useEffect } from "react";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, 
  Plus, 
  Check, 
  LayoutGrid
} from "lucide-react";
import { Button } from "./ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "./ui/dialog";
import { Input } from "./ui/input";
import { api } from "../lib/axios";
import { toast } from "sonner";

export default function WorkspaceSelector() {
  const { workspaces, activeWorkspace, setActiveWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/workspaces", { name: newWorkspaceName });
      await fetchWorkspaces();
      setActiveWorkspace(data);
      setIsCreateOpen(false);
      setNewWorkspaceName("");
      toast.success("Workspace created!");
    } catch {
      toast.error("Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative px-3 mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <LayoutGrid className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-100 truncate">
            {activeWorkspace?.name || "Select Workspace"}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-3 right-3 mt-2 py-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {workspaces.map((ws) => (
              <button
                key={ws._id}
                onClick={async () => {
                  setActiveWorkspace(ws);
                  setIsOpen(false);
                  queryClient.invalidateQueries();
                  await fetchWorkspaces();
                  navigate("/dashboard");
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
              >
                <span className={`text-sm font-medium ${activeWorkspace?._id === ws._id ? "text-indigo-400" : "text-zinc-300"}`}>
                  {ws.name}
                </span>
                {activeWorkspace?._id === ws._id && <Check className="h-4 w-4 text-indigo-400" />}
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-800 mt-2 pt-2 px-2">
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsCreateOpen(true);
                setIsOpen(false);
              }}
              className="w-full justify-start gap-2 h-10 text-xs font-bold text-zinc-400 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Create New Workspace
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">New Workspace</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Workspace Name</label>
              <Input 
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Engineering Lab"
                className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus:ring-indigo-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl text-zinc-500">Cancel</Button>
            <Button onClick={handleCreateWorkspace} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold px-6 h-11">
              {loading ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
