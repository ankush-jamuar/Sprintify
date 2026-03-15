import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Settings,
  ChevronRight,
  Search,
  Plus,
  Moon,
  Sun,
  User,
  LogOut,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ListTodo,
  Layers,
  Zap,
  ChevronDown,
  FolderKanban,
  ListChecks,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../components/ThemeProvider";
import { useAuthStore } from "../stores/useAuthStore";
import CreateActionModal from "../components/CreateActionModal";
import WorkspaceSelector from "../components/WorkspaceSelector";
import Logo from "../components/ui/Logo";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

import CreateEpicModal from "../features/projects/modals/CreateEpicModal";
import CreateSprintModal from "../features/projects/modals/CreateSprintModal";
import { useParams } from "react-router-dom";

import { api } from "../lib/axios";
import SearchOverlay from "../components/SearchOverlay";
import AIPanel from "../features/ai/AIPanel";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSocket } from "../hooks/useSocket";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: ListChecks, label: "Tasks", path: "/tasks" },
  { icon: Briefcase, label: "Projects", path: "/projects" },
  { icon: Clock, label: "History", path: "/recent-activity" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { projectId } = useParams();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [createType, setCreateType] = useState<"task" | "project">("task");
  const [isEpicModalOpen, setIsEpicModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isDark = theme === "dark";
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sprintify_sidebar_collapsed") === "true";
  });
  const socket = useSocket();

  useKeyboardShortcuts(() => setSearchOpen(true));

  useEffect(() => {
    localStorage.setItem("sprintify_sidebar_collapsed", isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/notifications");
        setUnreadCount(data.filter((n: { isRead: boolean }) => !n.isRead).length);
      } catch {
        console.error("Failed to fetch unread notifications");
      }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: { message?: string; type?: string }) => {
      setUnreadCount(prev => prev + 1);
      const msg = data?.message || "You have a new notification";
      toast.info(msg, {
        description: "Sprintify",
        duration: 4000,
        icon: "🔔",
      });
    };

    socket.on("notification", handleNewNotification);
    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, [socket]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-zinc-950" : "bg-zinc-50"}`}>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 border-r transition-all duration-300 ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
          } ${isSidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex flex-col h-full">
          <div className={`h-20 flex items-center mb-2 transition-all ${isSidebarCollapsed ? "px-0 justify-center" : "px-6"}`}>
            {isSidebarCollapsed ? (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-black text-sm">S</span>
              </div>
            ) : (
              <Logo />
            )}
          </div>

          {!isSidebarCollapsed && <WorkspaceSelector />}

          <nav className={`flex-1 space-y-1 ${isSidebarCollapsed ? "px-2 mt-4" : "px-3"}`}>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center rounded-xl transition-all group ${isSidebarCollapsed ? "justify-center h-12 w-full" : "gap-3 px-3 py-2.5"
                    } ${isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : isDark ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                  {!isSidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  {!isSidebarCollapsed && isActive && (
                    <motion.div layoutId="active-pill" className="ml-auto">
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </motion.div>
                  )}
                </Link>
              );
            })}
          </nav>

          {isSidebarCollapsed ? (
            <div className="mt-auto p-2 border-t border-zinc-800 flex flex-col items-center gap-2 pb-4">
              <Avatar className="h-10 w-10 border-2 border-indigo-500/20 cursor-pointer" onClick={() => navigate("/profile")}>
                <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name || 'User'}`} />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <Button onClick={() => logout()} variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl" title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className={`p-4 border-t mr-2 ml-2 mb-2 rounded-2xl ${isDark ? "border-zinc-900 bg-zinc-900/50" : "border-zinc-100 bg-zinc-100/50"}`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 px-2">
                  <Avatar className="h-10 w-10 border-2 border-indigo-500/20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name || 'User'}`} />
                    <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>{user?.name || 'User'}</span>
                    <span className="text-[10px] uppercase font-bold text-indigo-500">Pro Plan</span>
                  </div>
                </div>
                <Link to="/profile">
                  <Button variant="outline" size="sm" className={`w-full justify-start gap-2 ${isDark ? "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900"}`}>
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                </Link>
                <Button onClick={() => logout()} variant="outline" size="sm" className={`w-full justify-start gap-2 ${isDark ? "bg-zinc-950 border-zinc-800 text-red-500 hover:text-red-400 hover:bg-zinc-900" : "bg-white border-zinc-200 text-red-500 hover:text-red-600 hover:bg-zinc-50"}`}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Header */}
      <header
        className={`fixed top-0 right-0 z-30 h-20 flex items-center justify-between px-8 border-b backdrop-blur-xl transition-all duration-300 ${isDark ? "border-zinc-800/50 bg-zinc-950/80" : "border-zinc-200/50 bg-white/80"
          } ${isSidebarCollapsed ? "left-20" : "left-64"}`}
      >
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`rounded-xl shrink-0 ${isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-900/50" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"}`}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full text-left bg-zinc-900/50 text-zinc-500 text-sm border border-zinc-800 pl-10 pr-4 h-11 rounded-xl hover:border-zinc-700 transition-colors flex items-center justify-between"
            >
              <span>Search projects, tasks, or members...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-zinc-800/50 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-8">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={`rounded-xl ${isDark ? "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white" : "border-zinc-200 bg-zinc-100/50 text-zinc-600 hover:text-zinc-900"}`}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Link to="/notifications">
            <Button
              variant="outline"
              size="icon"
              className={`rounded-xl relative ${isDark ? "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white" : "border-zinc-200 bg-zinc-100/50 text-zinc-600 hover:text-zinc-900"}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white border-2 ${isDark ? "border-zinc-950" : "border-white"}`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </Link>
          <Button
            onClick={() => setIsAIOpen(true)}
            className="rounded-xl gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold border-none shadow-[0_0_15px_rgba(79,70,229,0.3)] animate-[pulse_3s_ease-in-out_infinite]"
          >
            <Sparkles className="h-4 w-4 text-indigo-200" />
            AI Copilot
          </Button>
          <div className="relative">
            <Button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 font-bold px-5 h-11"
            >
              <Plus className="h-5 w-5" />
              New
              <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </Button>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsDropdownOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setCreateType("task"); setIsNewModalOpen(true); setIsDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"
                      >
                        <ListTodo className="h-4 w-4 text-indigo-400" />
                        Create Task
                      </button>
                      <button
                        onClick={() => { setIsEpicModalOpen(true); setIsDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"
                      >
                        <Layers className="h-4 w-4 text-purple-400" />
                        Create Epic
                      </button>
                      <button
                        onClick={() => { setIsSprintModalOpen(true); setIsDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"
                      >
                        <Zap className="h-4 w-4 text-amber-400" />
                        Create Sprint
                      </button>
                      <div className="h-px bg-zinc-800 my-1 mx-2" />
                      <button
                        onClick={() => { setCreateType("project"); setIsNewModalOpen(true); setIsDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"
                      >
                        <FolderKanban className="h-4 w-4 text-emerald-400" />
                        New Project
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {isNewModalOpen && (
            <CreateActionModal
              isOpen={isNewModalOpen}
              onClose={() => setIsNewModalOpen(false)}
              onSuccess={() => { }}
              defaultType={createType}
              defaultProjectId={projectId}
            />
          )}

          {isEpicModalOpen && (
            <CreateEpicModal
              isOpen={isEpicModalOpen}
              onClose={() => setIsEpicModalOpen(false)}
            />
          )}

          {isSprintModalOpen && (
            <CreateSprintModal
              isOpen={isSprintModalOpen}
              onClose={() => setIsSprintModalOpen(false)}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`pt-24 min-h-screen transition-all duration-300 ${isSidebarCollapsed ? "pl-20" : "pl-64"}`}
      >
        <div className="mx-auto max-w-[1600px] p-8 h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Search Overlay */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AIPanel isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
