import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Target, AlertTriangle, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SprintHealthCard({ projectId }: { projectId?: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['sprintHealth', projectId],
        queryFn: async () => {
            const res = await api.post('/ai/predict-sprint', { projectId });
            return res.data;
        },
        enabled: !!projectId,
        staleTime: 60 * 1000,
    });

    if (!projectId) {
        return (
            <Card className="bg-zinc-900/40 border-zinc-800 rounded-2xl h-auto flex flex-col justify-center items-center p-5 text-center">
                <Target className="h-8 w-8 text-zinc-700 mb-2" />
                <p className="text-sm font-medium text-zinc-500">Create a project to unlock Sprint Health.</p>
            </Card>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="h-auto">
            <Card className="bg-zinc-900/40 border-zinc-800 rounded-2xl h-auto flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-2"><Target className="h-5 w-5 text-indigo-400" /> Sprint Health</div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex flex-col">
                    {isLoading ? (
                        <div className="py-4 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <div className="shrink-0 relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-zinc-800 border-t-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.15)]">
                                    <span className={`text-xl font-black ${data?.probability > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {data?.probability || 0}%
                                    </span>
                                </div>
                                <div className="text-xs text-zinc-400 leading-relaxed italic">
                                    "{data?.analysis || 'Analyzing sprint velocity...'}"
                                </div>
                            </div>

                            {data?.risks?.length > 0 && (
                                <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2">
                                    <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> Risks Detected
                                    </h4>
                                    {data.risks.map((r: string, i: number) => (
                                        <p key={i} className="text-xs text-zinc-400 leading-relaxed">{r}</p>
                                    ))}
                                </div>
                            )}

                            {data?.recommendations?.length > 0 && (
                                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2">
                                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1">
                                        <Lightbulb className="h-3 w-3" /> Actions
                                    </h4>
                                    {data.recommendations.map((r: string, i: number) => (
                                        <p key={i} className="text-xs text-zinc-400 leading-relaxed">{r}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
