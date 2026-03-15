import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, CalendarClock, AlertCircle, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function UpcomingDeadlinesWidget() {
    const { activeWorkspace } = useWorkspaceStore();
    const navigate = useNavigate();

    const { data: result, isLoading } = useQuery({
        queryKey: ['deadlines', activeWorkspace?._id],
        queryFn: async () => {
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            const res = await api.get(`/tasks?dueDate_lte=${threeDaysFromNow.toISOString()}&notStatus=DONE&limit=5`);
            return res.data;
        },
        enabled: !!activeWorkspace,
    });

    const tasks = result?.tasks || [];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-zinc-900/40 border-zinc-800 rounded-2xl h-full flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <CardHeader className="pb-4 border-b border-zinc-800/50 mb-2 mt-1 mx-4 px-2">
                    <CardTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-orange-400" />
                            Upcoming Deadlines
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Next 72h
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="py-8 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="py-8 text-center text-zinc-500 flex flex-col items-center">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No immediate deadlines.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task: any) => {
                                const isOverdue = new Date(task.dueDate) < new Date();
                                return (
                                    <div
                                        key={task._id}
                                        onClick={() => navigate(`/tasks?search=${task.key}`)}
                                        className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 hover:border-orange-500/40 transition-colors flex flex-col gap-2 group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-zinc-200 group-hover:text-orange-300 transition-colors truncate">
                                                {task.title}
                                            </p>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isOverdue ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/10 text-orange-400'}`}>
                                                {isOverdue ? 'Overdue' : 'Soon'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="h-3 w-3" />
                                                {task.projectId?.name || "No Project"}
                                            </span>
                                            <span className={isOverdue ? 'text-red-500 animate-pulse' : ''}>
                                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
