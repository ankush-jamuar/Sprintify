import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2, KanbanSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#f59e0b', '#10b981']; // Indigo, Amber, Emerald

export default function TaskProgressChart() {
    const { activeWorkspace } = useWorkspaceStore();

    const { data, isLoading } = useQuery({
        queryKey: ['taskStats', activeWorkspace?._id],
        queryFn: async () => {
            const res = await api.get('/dashboard/task-stats');
            return [
                { name: 'To Do', value: res.data.todo },
                { name: 'In Progress', value: res.data.inProgress },
                { name: 'Done', value: res.data.done },
            ];
        },
        enabled: !!activeWorkspace,
        staleTime: 60 * 1000,
    });

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-zinc-900/40 border-zinc-800 rounded-2xl h-full hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                        <KanbanSquare className="h-5 w-5 text-indigo-400" />
                        Task Progress
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-[200px] flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {data?.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e4e4e7', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-4 mt-2">
                                {data?.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                        <span className="text-[10px] uppercase font-bold text-zinc-400">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
