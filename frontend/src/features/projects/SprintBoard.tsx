import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import {
    Activity,
    CheckCircle,
    Zap,
    TrendingUp,
    LineChart as BurndownIcon
} from "lucide-react";
import ProjectKanban from "./ProjectKanban";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import {
    AreaChart,
    Area,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const SprintBoard: React.FC = () => {
    const { projectId } = useParams();
    const queryClient = useQueryClient();
    const [showInsights, setShowInsights] = useState(false);
    const [insights, setInsights] = useState<any>(null);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

    const { data: activeSprintData, isLoading: isLoadingSprint } = useQuery({
        queryKey: ["activeSprint", projectId],
        queryFn: async () => {
            const res = await api.get(`/planning/projects/${projectId}/sprints/active`);
            return res.data;
        },
        enabled: !!projectId
    });

    const activeSprint = activeSprintData?.sprint;

    const { data: burndownData = [], isLoading: isLoadingBurndown } = useQuery({
        queryKey: ["burndown", activeSprint?._id],
        queryFn: async () => {
            const res = await api.get(`/planning/sprints/${activeSprint._id}/burndown`);
            return res.data;
        },
        enabled: !!activeSprint?._id
    });

    const insightsMutation = useMutation({
        mutationFn: async () => {
            if (!activeSprint) return;
            const res = await api.post("/ai/sprint-health", { sprintId: activeSprint._id });
            return res.data;
        },
        onSuccess: (data) => {
            setInsights(data);
            setShowInsights(true);
        },
        onError: () => {
            toast.error("Failed to get AI insights");
        }
    });

    const completeSprintMutation = useMutation({
        mutationFn: async () => {
            if (!activeSprint) return;
            const res = await api.patch(`/planning/sprints/${activeSprint._id}/end`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activeSprint", projectId] });
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
            toast.success("Sprint completed! Incomplete tasks moved to backlog.");
            setShowCompleteConfirm(false);
        },
        onError: () => {
            toast.error("Failed to complete sprint");
        }
    });

    const fetchInsights = () => {
        insightsMutation.mutate();
    };

    if (isLoadingSprint) return <div className="p-8"><div className="h-64 bg-zinc-900 rounded-3xl animate-pulse" /></div>;

    if (!activeSprint) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                <div className="p-6 bg-zinc-900 rounded-[2.5rem] border border-zinc-800 text-center max-w-md w-full">
                    <div className="h-16 w-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Zap className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">No Active Sprint</h2>
                    <p className="text-zinc-500 mb-8 leading-relaxed">
                        There is no active sprint for this project. Head to the planning board to start one.
                    </p>
                    <Button className="bg-white text-black hover:bg-zinc-200 w-full h-12 rounded-xl font-bold">
                        Start a Sprint
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto px-8 py-6 custom-scrollbar">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-900">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <Activity className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                            {activeSprint.name}
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">Active</span>
                        </h2>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1 italic opacity-60">{activeSprint.goal}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchInsights}
                        disabled={insightsMutation.isPending}
                        className="bg-zinc-900/50 border-zinc-800/80 hover:bg-indigo-500/5 text-zinc-400 hover:text-indigo-400 rounded-xl gap-2"
                    >
                        {insightsMutation.isPending ? "Analyzing..." : <><Zap className="h-4 w-4" /> Sprint Insights</>}
                    </Button>
                    <Button
                        onClick={() => setShowCompleteConfirm(true)}
                        disabled={completeSprintMutation.isPending}
                        className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold px-6"
                    >
                        {completeSprintMutation.isPending ? "Completing..." : "Complete Sprint"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <div className="grid grid-cols-12 gap-8 h-full">
                    <div className="col-span-12 lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-zinc-950/50 border border-zinc-800 rounded-[2rem] p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <BurndownIcon className="h-4 w-4 text-emerald-400" /> Burndown
                                </h3>
                            </div>

                            <div className="h-40 w-full relative">
                                {isLoadingBurndown ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-full w-full bg-zinc-900/50 animate-pulse rounded-xl" />
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={burndownData}>
                                            <defs>
                                                <linearGradient id="colorIdeal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Area type="monotone" dataKey="ideal" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorIdeal)" strokeDasharray="5 5" />
                                            <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} fill="transparent" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="bg-zinc-950/50 border border-zinc-800 rounded-[2rem] p-6 space-y-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-indigo-400" /> Stats
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800/50">
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase mb-1">Days Left</p>
                                    <p className="text-xl font-bold text-white">4</p>
                                </div>
                                <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800/50">
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase mb-1">Done</p>
                                    <p className="text-xl font-bold text-emerald-400">85%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-9 h-full flex flex-col">
                        <div className="flex-1 bg-zinc-950/20 rounded-[2.5rem] border border-zinc-900 overflow-hidden relative">
                            <ProjectKanban isSprintView={true} sprintId={activeSprint._id} />
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insights Dialog */}
            <Dialog open={showInsights} onOpenChange={setShowInsights}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-[2rem] max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                            <Zap className="h-5 w-5 text-indigo-400 fill-indigo-400" />
                            AI Sprint Health Analysis
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                            <span className="text-xs font-bold text-zinc-500 uppercase">Overall Status</span>
                            <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${insights?.status === 'Great' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                insights?.status === 'Good' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                    'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                }`}>
                                {insights?.status || 'Analyzing...'}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Key Insights</h4>
                            <div className="space-y-2">
                                {insights?.insights.map((insight: string, i: number) => (
                                    <div key={i} className="flex gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                        <CheckCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-zinc-300 leading-relaxed font-medium">{insight}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => setShowInsights(false)} className="w-full bg-white text-black hover:bg-zinc-200 rounded-xl h-12 font-bold">
                        Got it
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Complete Sprint Confirmation Dialog */}
            <Dialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-[2rem] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                            Complete Sprint
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 text-xs mt-3 leading-relaxed font-medium">
                            Completing <span className="text-white font-bold">{activeSprint.name}</span> will mark it as finished. All incomplete tasks will be moved back to the backlog.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-4 pt-4">
                        <Button variant="ghost" onClick={() => setShowCompleteConfirm(false)} className="text-zinc-500 hover:text-white rounded-xl font-bold uppercase tracking-widest text-[10px]">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => completeSprintMutation.mutate()}
                            disabled={completeSprintMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black px-8 h-12 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                            {completeSprintMutation.isPending ? "Completing..." : "Confirm Complete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SprintBoard;

