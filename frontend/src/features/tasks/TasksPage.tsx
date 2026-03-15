import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/axios";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useSocket } from "../../hooks/useSocket";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import TaskDetailModal from "./TaskDetailModal";

const STATUS_COLORS: Record<string, string> = {
    TODO: "bg-zinc-700 text-zinc-300",
    IN_PROGRESS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    IN_REVIEW: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    DONE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-500 border-red-500/20",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/20",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
    LOW: "bg-green-500/20 text-green-400 border-green-500/20",
};

export default function TasksPage() {
    const { activeWorkspace } = useWorkspaceStore();
    const socket = useSocket();
    const [searchParams, setSearchParams] = useSearchParams();

    // Filters State from URL
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [status, setStatus] = useState<string>(searchParams.get("status") || "ALL");
    const [projectId, setProjectId] = useState<string>(searchParams.get("projectId") || "ALL");
    const [assigneeId, setAssigneeId] = useState<string>(searchParams.get("assigneeId") || "ALL");
    const [priority, setPriority] = useState<string>(searchParams.get("priority") || "ALL");
    const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
    const [selectedTask, setSelectedTask] = useState<any>(null);

    // Sync filters to URL
    useEffect(() => {
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (status !== "ALL") params.status = status;
        if (projectId !== "ALL") params.projectId = projectId;
        if (assigneeId !== "ALL") params.assigneeId = assigneeId;
        if (priority !== "ALL") params.priority = priority;
        if (page > 1) params.page = page.toString();

        setSearchParams(params, { replace: true });
    }, [search, status, projectId, assigneeId, priority, page, setSearchParams]);

    // Fetch Projects for Filter
    const { data: projects = [] } = useQuery({
        queryKey: ["projects", activeWorkspace?._id],
        queryFn: async () => {
            const { data } = await api.get("/projects");
            return data;
        },
        enabled: !!activeWorkspace
    });

    // Fetch Members for Filter
    const { data: members = [] } = useQuery({
        queryKey: ["members", activeWorkspace?._id],
        queryFn: async () => {
            const { data } = await api.get(`/workspaces/${activeWorkspace?._id}/members`);
            return data;
        },
        enabled: !!activeWorkspace
    });

    // Main Tasks Query
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["tasks", activeWorkspace?._id, status, projectId, assigneeId, priority, search, page],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status !== "ALL") params.append("status", status);
            if (projectId !== "ALL") params.append("projectId", projectId);
            if (assigneeId !== "ALL") params.append("assigneeId", assigneeId);
            if (priority !== "ALL") params.append("priority", priority);
            if (search) params.append("search", search);
            params.append("page", page.toString());
            params.append("limit", "20");

            const { data } = await api.get(`/tasks?${params.toString()}`);
            return data;
        },
        enabled: !!activeWorkspace
    });

    // Real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            refetch();
        };

        socket.on("task-created", handleUpdate);
        socket.on("task-updated", handleUpdate);
        socket.on("task-status-updated", handleUpdate);
        socket.on("task-deleted", handleUpdate);
        socket.on("task-assigned", handleUpdate);

        return () => {
            socket.off("task-created", handleUpdate);
            socket.off("task-updated", handleUpdate);
            socket.off("task-status-updated", handleUpdate);
            socket.off("task-deleted", handleUpdate);
            socket.off("task-assigned", handleUpdate);
        };
    }, [socket, refetch]);

    const tasks = data?.tasks || [];
    const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-white">Task Center</h2>
                    <p className="text-zinc-500 mt-2 font-medium">Manage all workspace tasks in one place.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant={assigneeId === "me" ? "default" : "outline"}
                        onClick={() => { setAssigneeId(assigneeId === "me" ? "ALL" : "me"); setPage(1); }}
                        className={`rounded-xl h-11 px-6 ${assigneeId === "me" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20" : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white"}`}
                    >
                        Assigned to Me
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row gap-4 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                    <Input
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="pl-10 bg-zinc-950/50 border-zinc-800 rounded-xl h-11 focus-visible:ring-indigo-500"
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <select
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="bg-zinc-950/50 border border-zinc-800 rounded-xl h-11 w-full md:w-[140px] px-3 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                    </select>

                    <select
                        value={projectId}
                        onChange={(e) => { setProjectId(e.target.value); setPage(1); }}
                        className="bg-zinc-950/50 border border-zinc-800 rounded-xl h-11 w-full md:w-[180px] px-3 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="ALL">All Projects</option>
                        {projects.map((p: any) => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                    </select>

                    <select
                        value={priority}
                        onChange={(e) => { setPriority(e.target.value); setPage(1); }}
                        className="bg-zinc-950/50 border border-zinc-800 rounded-xl h-11 w-full md:w-[130px] px-3 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="ALL">All Priorities</option>
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                        <option value="NONE">None</option>
                    </select>

                    <select
                        value={assigneeId}
                        onChange={(e) => { setAssigneeId(e.target.value); setPage(1); }}
                        className="bg-zinc-950/50 border border-zinc-800 rounded-xl h-11 w-full md:w-[160px] px-3 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="ALL">Anyone</option>
                        <option value="me">Assigned to Me</option>
                        {members.map((m: any) => (
                            <option key={m.userId?._id} value={m.userId?._id}>{m.userId?.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tasks Table */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Task</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Project</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Priority</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Assignee</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-zinc-800/50 animate-pulse">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-6 bg-zinc-800/50 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : tasks.length > 0 ? (
                                tasks.map((task: any) => (
                                    <tr
                                        key={task._id}
                                        onClick={() => setSelectedTask(task)}
                                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-mono font-bold text-indigo-400 mb-1">{task.key}</span>
                                                <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors line-clamp-1">{task.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <Briefcase className="h-3 w-3" />
                                                <span className="text-xs">{task.projectId?.name || "Unknown"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors ${STATUS_COLORS[task.status] || "bg-zinc-800 text-zinc-400"}`}>
                                                {task.status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <AlertCircle className={`h-3 w-3 ${task.priority === 'CRITICAL' ? 'text-red-500' : ''}`} />
                                                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[task.priority] || "bg-zinc-800 text-zinc-400"}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                {task.dueDate && (
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[9px] font-bold ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
                                                            Due: {new Date(task.dueDate).toLocaleDateString()}
                                                            {new Date(task.dueDate) < new Date() && task.status !== 'DONE' && " (OVERDUE)"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.assigneeId && typeof task.assigneeId === 'object' ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                                        <span className="text-[10px] font-bold text-indigo-400 uppercase">
                                                            {task.assigneeId.name?.charAt(0) || "U"}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-zinc-300">{task.assigneeId.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-zinc-600 italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-zinc-500">{new Date(task.createdAt).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-zinc-700">{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <CheckCircle2 className="h-10 w-10 text-zinc-800" />
                                            <p className="text-zinc-500 font-medium">No tasks found matching your filters.</p>
                                            <Button variant="link" onClick={() => {
                                                setSearch(""); setStatus("ALL"); setProjectId("ALL"); setAssigneeId("ALL"); setPriority("ALL"); setPage(1);
                                            }} className="text-indigo-400 hover:text-indigo-300">
                                                Reset all filters
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination controls */}
                {pagination.pages > 1 && (
                    <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                        <p className="text-xs text-zinc-500 font-medium">
                            Showing page <span className="text-zinc-300">{pagination.page}</span> of <span className="text-zinc-300">{pagination.pages}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="h-8 w-8 p-0 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white rounded-lg disabled:opacity-30"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: pagination.pages }).map((_, i) => {
                                    const p = i + 1;
                                    // Show max 5 pages, with current in middle roughly
                                    if (pagination.pages > 5) {
                                        if (p !== 1 && p !== pagination.pages && (p < page - 1 || p > page + 1)) {
                                            if (p === page - 2 || p === page + 2) return <span key={p} className="text-zinc-700 text-[10px]">...</span>;
                                            return null;
                                        }
                                    }
                                    return (
                                        <Button
                                            key={p}
                                            variant={page === p ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(p)}
                                            className={`h-8 w-8 p-0 rounded-lg text-xs ${page === p ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent" : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white"}`}
                                        >
                                            {p}
                                        </Button>
                                    );
                                })}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === pagination.pages}
                                onClick={() => setPage(page + 1)}
                                className="h-8 w-8 p-0 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white rounded-lg disabled:opacity-30"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <TaskDetailModal
                task={selectedTask as any}
                open={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                onDelete={() => {
                    setSelectedTask(null);
                    refetch();
                }}
            />
        </div>
    );
}
