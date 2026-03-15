import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, UserCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';

export default function MyTasksWidget() {
    const { activeWorkspace } = useWorkspaceStore();
    const navigate = useNavigate();

    const queryClient = useQueryClient();
    const socket = useSocket();

    const { data: result, isLoading } = useQuery({
        queryKey: ['myTasks', activeWorkspace?._id],
        queryFn: async () => {
            const res = await api.get('/tasks?assigneeId=me&limit=5');
            return res.data;
        },
        enabled: !!activeWorkspace,
        staleTime: 60 * 1000,
    });

    const tasks = result?.tasks || [];

    useEffect(() => {
        if (!socket) return;
        const handleAssigned = () => queryClient.invalidateQueries({ queryKey: ['myTasks'] });

        socket.on("task-assigned", handleAssigned);
        return () => { socket.off("task-assigned", handleAssigned); };
    }, [socket, queryClient]);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-zinc-900/40 border-zinc-800 rounded-2xl h-full flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <CardHeader className="pb-4 border-b border-zinc-800/50 mb-2 mt-1 mx-4 px-2">
                    <CardTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
                        <span className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-indigo-400" /> My Tasks</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{tasks.length}</span>
                            <button
                                onClick={() => navigate('/tasks?assigneeId=me')}
                                className="text-[10px] font-black text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-widest bg-transparent border-none cursor-pointer"
                            >
                                View All →
                            </button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                    {isLoading ? (
                        <div className="py-8 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    ) : tasks?.length === 0 ? (
                        <div className="py-8 text-center text-zinc-500 flex flex-col items-center">
                            <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">You have no pending assignments.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks?.map((task: any) => (
                                <div key={task._id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 hover:border-indigo-500/40 transition-colors flex items-start gap-3 group">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">{task.title}</p>
                                            <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${task.status === "DONE" ? "bg-emerald-500" : task.status === "IN_PROGRESS" ? "bg-amber-500" : "bg-indigo-500"}`} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-wider">
                                            <span className="text-zinc-500">{task.projectId?.name || "No Project"}</span>
                                            <span className={task.priority === 'CRITICAL' ? 'text-red-500' : task.priority === 'HIGH' ? 'text-orange-500' : task.priority === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'}>
                                                {task.priority}
                                            </span>
                                            {task.dueDate && (
                                                <span className={`${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`}>
                                                    Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
