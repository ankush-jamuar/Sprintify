import { create } from "zustand";
import api from "../lib/axios";
import { useWorkspaceStore } from "./useWorkspaceStore";

interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuth: (user: User, token: string) => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  const token = localStorage.getItem("sprintify_token");
  
  return {
    user: null,
    token: token || null,
    isAuthenticated: !!token,
    login: async (email, password) => {
      const response = await api.post("/auth/login", { email, password });
      const { user, token } = response.data;
      localStorage.setItem("sprintify_token", token);
      set({ user, token, isAuthenticated: true });
    },
    register: async (name, email, password) => {
      const response = await api.post("/auth/register", { name, email, password });
      const { user, token } = response.data;
      localStorage.setItem("sprintify_token", token);
      set({ user, token, isAuthenticated: true });
    },
    setAuth: (user, token) => {
      localStorage.setItem("sprintify_token", token);
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem("sprintify_token");
      localStorage.removeItem("sprintify_workspace");
      useWorkspaceStore.getState().reset();
      set({ user: null, token: null, isAuthenticated: false });
    },
    fetchCurrentUser: async () => {
      try {
        const token = localStorage.getItem("sprintify_token");
        if (!token) return;
        const response = await api.get("/auth/me");
        set({ user: response.data, isAuthenticated: true });
      } catch {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem("sprintify_token");
        localStorage.removeItem("sprintify_workspace");
        useWorkspaceStore.getState().reset();
      }
    },
  };
});
