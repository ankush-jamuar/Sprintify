import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/ThemeProvider";
import { useAuthStore } from "./stores/useAuthStore";
import { useWorkspaceStore } from "./stores/useWorkspaceStore";
import { useEffect, useState } from "react";
import DashboardLayout from "./layouts/DashboardLayout";

// Public Pages
import LandingPage from "./features/landing/LandingPage";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";

// Dashboard Pages
import Dashboard from "./features/workspaces/Dashboard";
import ProjectsList from "./features/projects/ProjectsList";
import ProjectPage from "./features/projects/ProjectPage";
import Analytics from "./features/analytics/Analytics";
import RecentActivityPage from "./features/analytics/RecentActivityPage";
import Notifications from "./features/notifications/Notifications";
import Settings from "./features/settings/Settings";
import Profile from "./features/profile/Profile";
import TasksPage from "./features/tasks/TasksPage";
import { Toaster } from "sonner";

import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

import { ProtectedRoute } from "./components/auth/ProtectedRoute";

function App() {
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const { user } = useAuthStore();
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      await fetchCurrentUser();
      const token = localStorage.getItem("sprintify_token");
      if (token) {
        await fetchWorkspaces();
      }
      setIsAppReady(true);
    };
    initApp();
  }, [fetchCurrentUser, fetchWorkspaces]);

  if (!isAppReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
        <p className="font-bold tracking-widest uppercase text-xs text-zinc-500">Initializing Sprintify Server</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Toaster position="top-right" richColors />
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
              <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
              <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><DashboardLayout><ProjectsList /></DashboardLayout></ProtectedRoute>} />
              <Route path="/projects/:projectId" element={<ProtectedRoute><DashboardLayout><ProjectPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/project/:projectId" element={<Navigate to="/projects/:projectId" />} />
              <Route path="/kanban/:projectId" element={<ProtectedRoute><DashboardLayout><ProjectPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/kanban" element={<Navigate to="/projects" />} />
              <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><Analytics /></DashboardLayout></ProtectedRoute>} />
              <Route path="/recent-activity" element={<ProtectedRoute><DashboardLayout><RecentActivityPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><DashboardLayout><Notifications /></DashboardLayout></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><DashboardLayout><TasksPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
