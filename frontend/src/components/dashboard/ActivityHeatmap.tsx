import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ActivityHeatmap() {
    const { activeWorkspace } = useWorkspaceStore();

    const { data: heatmap, isLoading } = useQuery({
        queryKey: ['activityHeatmap', activeWorkspace?._id],
        queryFn: async () => {
            const res = await api.get('/dashboard/activity-heatmap');
            return res.data;
        },
        enabled: !!activeWorkspace,
        staleTime: 60 * 1000,
    });

    const getIntensityColor = (count: number) => {
        if (count === 0) return 'bg-zinc-800/50';
        if (count < 3) return 'bg-indigo-900/60';
        if (count < 8) return 'bg-indigo-600/80';
        return 'bg-indigo-400';
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-zinc-900/30 border-zinc-800/60 rounded-3xl h-full">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-400" />
                        7-Day Activity Matrix
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-[100px] flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="flex gap-2 justify-between px-2 pt-2">
                            {DAYS.map(day => {
                                const count = heatmap?.[day] || 0;
                                return (
                                    <div key={day} className="flex flex-col items-center gap-2 group relative">
                                        <div className={`w-8 h-8 rounded-md transition-all duration-300 ${getIntensityColor(count)} border border-white/5`}></div>
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{day}</span>
                                        {/* Tooltip */}
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                            {count} events
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
