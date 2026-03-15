import { create } from "zustand";
import { api } from "../lib/axios";

interface Workspace {
  _id: string;
  name: string;
  role?: string;
}

interface Project {
  _id: string;
  name: string;
}

interface WorkspaceState {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  activeProject: Project | null;
  loading: boolean;
  fetchWorkspaces: () => Promise<void>;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  setActiveProject: (project: Project) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => {
  return {
    activeWorkspace: null,
    workspaces: [],
    activeProject: null,
    loading: false,
    fetchWorkspaces: async () => {
      set({ loading: true });
      try {
        const { data } = await api.get("/workspaces");
        set({ workspaces: data });
        
        const savedId = localStorage.getItem("sprintify_workspace");
        if (savedId) {
          const matched = data.find((w: Workspace) => w._id === savedId);
          if (matched) set({ activeWorkspace: matched });
          else if (data.length > 0) {
             set({ activeWorkspace: data[0] });
             localStorage.setItem("sprintify_workspace", data[0]._id);
          }
        } else if (data.length > 0) {
           set({ activeWorkspace: data[0] });
           localStorage.setItem("sprintify_workspace", data[0]._id);
        }
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
      } finally {
        set({ loading: false });
      }
    },
    setWorkspaces: (workspaces) => set({ workspaces }),
    setActiveWorkspace: (workspace) => {
      localStorage.setItem("sprintify_workspace", workspace._id);
      set({ activeWorkspace: workspace });
    },
    setActiveProject: (project) => set({ activeProject: project }),
    reset: () => {
      localStorage.removeItem("sprintify_workspace");
      set({ activeWorkspace: null, workspaces: [], activeProject: null });
    }
  };
});
