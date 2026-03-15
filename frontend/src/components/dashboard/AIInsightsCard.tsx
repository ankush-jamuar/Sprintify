import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/axios';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, BrainCircuit, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIInsightsCard() {
    const { activeWorkspace } = useWorkspaceStore();

    const { data, isLoading } = useQuery({
        queryKey: ['workspaceInsights', activeWorkspace?._id],
        queryFn: async () => {
            const res = await api.post('/ai/insights');
            return res.data;
        },
        enabled: !!activeWorkspace,
        staleTime: 60 * 1000,
    });

    const getIcon = (type: string) => {
        if (type === 'positive') return <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />;
        if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />;
        return <Info className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />;
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="h-auto">
            <Card className="bg-zinc-900/40 border-zinc-800 rounded-2xl h-auto flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3 border-b border-zinc-800/50 mx-4 mt-2 px-2">
                    <CardTitle className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center justify-between">
                        <span className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" /> Workspace AI</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto pt-4 pb-4 max-h-[220px] custom-scrollbar">
                    {isLoading ? (
                        <div className="py-6 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.insights?.slice(0, 3).map((ins: any, idx: number) => (
                                <div key={idx} className="flex gap-3 items-start p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50 hover:border-indigo-500/30 transition-colors">
                                    {getIcon(ins.type)}
                                    <div>
                                        <p className="text-xs font-bold text-zinc-200">{ins.title}</p>
                                        <p className="text-[10px] sm:text-xs text-zinc-500 leading-relaxed mt-1">{ins.description}</p>
                                    </div>
                                </div>
                            ))}
                            {!data?.insights?.length && (
                                <p className="text-xs text-zinc-500 text-center italic py-4">Checking workspace metrics...</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
