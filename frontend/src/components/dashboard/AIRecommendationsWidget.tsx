import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Card, CardContent } from '../ui/card';
import { Sparkles, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIRecommendationsWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ['aiRecommendations'],
        queryFn: async () => {
            const res = await api.post('/ai/insights');
            return res.data;
        },
        staleTime: 10 * 60 * 1000,
    });

    const recommendations = data?.insights?.filter((ins: any) => ins.type === 'warning' || ins.type === 'neutral') || [];

    if (isLoading) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
        >
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> AI Recommendations
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.length > 0 ? recommendations.slice(0, 2).map((rec: any, i: number) => (
                    <Card key={i} className="bg-zinc-900/40 border-zinc-800/50 rounded-[2rem] hover:bg-zinc-900/60 transition-all group overflow-hidden border-white/5">
                        <CardContent className="p-6 flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Lightbulb className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-zinc-100">{rec.title}</h4>
                                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                    {rec.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )) : (
                    <div className="col-span-2 p-8 text-center bg-zinc-900/20 rounded-[2rem] border border-zinc-800/50 border-dashed">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No immediate recommendations</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
