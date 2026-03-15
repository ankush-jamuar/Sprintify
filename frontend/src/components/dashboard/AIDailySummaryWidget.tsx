import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Sun, Target, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIDailySummaryWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ['dailySummary'],
        queryFn: async () => {
            const res = await api.get('/ai/daily-summary');
            return res.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 bg-zinc-900/40 rounded-[2rem] border border-zinc-800">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
        >
            <Card className="bg-zinc-900/40 border-zinc-800 rounded-[2.5rem] h-full overflow-hidden hover:bg-zinc-900/60 transition-colors border-white/5 shadow-2xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-sm font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sun className="h-4 w-4" /> Daily Briefing
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-6">
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                            <p className="text-xs text-zinc-300 leading-relaxed font-medium italic">
                                "{data?.summary || "Analyzing your schedule for today..."}"
                            </p>
                        </div>

                        {data?.focus && data.focus.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Target className="h-3 w-3" /> Focus Areas
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {data.focus.map((item: string, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-full text-[10px] font-bold text-zinc-400">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!data?.summary && (
                            <div className="flex flex-col items-center justify-center py-4 text-zinc-600 gap-2">
                                <Coffee className="h-8 w-8 opacity-20" />
                                <p className="text-[10px] font-medium uppercase tracking-widest">No plans yet. Take a break.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
