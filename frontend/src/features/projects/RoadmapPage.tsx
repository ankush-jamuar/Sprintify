import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "../../lib/axios";
import {
    Sparkles,
    Milestone
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";

interface Epic {
    _id: string;
    name: string;
    description: string;
    status: string;
    month?: number;
    progress?: number;
    totalTasks?: number;
    completedTasks?: number;
}

const RoadmapPage: React.FC = () => {
    const { projectId } = useParams();
    const queryClient = useQueryClient();
    const [months] = useState(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);

    const { data: epics = [], isLoading } = useQuery<Epic[]>({
        queryKey: ["epics", projectId],
        queryFn: async () => {
            const res = await api.get(`/planning/projects/${projectId}/epics`);
            // Assign random months for demo if not present
            return res.data.map((e: any, i: number) => ({
                ...e,
                month: e.month || (i % 6) + 1
            }));
        },
        enabled: !!projectId
    });

    const aiRoadmapMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post("/ai/generate-roadmap", { projectIdea: "Mobile App for Tasks", timelineMonths: 6 });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["epics", projectId] });
            toast.success("AI Roadmap Generated");
        },
        onError: () => {
            toast.error("AI Roadmap Generation Failed");
        }
    });

    const generateAIStorey = () => {
        toast.info("AI Generating Roadmap...");
        aiRoadmapMutation.mutate();
    };

    return (
        <div className="h-full overflow-y-auto px-8 py-6 custom-scrollbar">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-900">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg shadow-indigo-500/5">
                        <Milestone className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-white mb-1">Project Roadmap</h2>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Strategic Evolution Timeline</p>
                    </div>
                </div>
                <Button
                    onClick={generateAIStorey}
                    disabled={aiRoadmapMutation.isPending}
                    className="bg-zinc-900 border border-zinc-800 text-indigo-400 hover:bg-zinc-800 gap-2 rounded-xl h-11 px-6 shadow-lg shadow-indigo-500/10"
                >
                    <Sparkles className="h-4 w-4" /> {aiRoadmapMutation.isPending ? "Generating..." : "AI Auto-Gen"}
                </Button>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-900 rounded-[2.5rem] p-10 overflow-hidden shadow-inner">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="min-w-[1200px]">
                        {/* Header Months */}
                        <div className="grid grid-cols-12 gap-0 border-b border-zinc-900 pb-6 mb-10">
                            {months.map((m, i) => (
                                <div key={i} className="text-center">
                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{m}</span>
                                </div>
                            ))}
                        </div>

                        {/* Timeline Bars */}
                        <div className="space-y-8 relative pb-10">
                            {/* Vertical Grid Lines */}
                            <div className="absolute inset-x-0 inset-y-0 grid grid-cols-12 pointer-events-none">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="border-r border-zinc-900/50 h-full last:border-0" />
                                ))}
                            </div>

                            {epics.map((epic, i) => (
                                <div key={epic._id} className="relative h-16 group">
                                    <motion.div
                                        initial={{ scaleX: 0, originX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                                        style={{
                                            left: `${((epic.month || 1) - 1) * (100 / 12)}%`,
                                            width: `25%` // Epics take 3 months width for visual
                                        }}
                                        className="absolute inset-y-0 p-1 group"
                                    >
                                        <div className={`h-full w-full rounded-2xl border flex items-center px-4 transition-all cursor-pointer ${i % 3 === 0 ? 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/50' :
                                            i % 3 === 1 ? 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50' :
                                                'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/50'
                                            })}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full mr-3 shrink-0 ${i % 3 === 0 ? 'bg-indigo-400' : i % 3 === 1 ? 'bg-emerald-400' : 'bg-orange-400'
                                                }`} />
                                            <div className="overflow-hidden flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-bold text-white truncate">{epic.name}</p>
                                                    {(epic.progress != null) && (
                                                        <span className="text-[8px] font-black text-zinc-400 shrink-0">{epic.progress}%</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${epic.progress || 0}%` }}
                                                            transition={{ delay: i * 0.1 + 0.5, duration: 0.6 }}
                                                            className={`h-full rounded-full ${i % 3 === 0 ? 'bg-indigo-400' : i % 3 === 1 ? 'bg-emerald-400' : 'bg-orange-400'}`}
                                                        />
                                                    </div>
                                                    <span className="text-[8px] text-zinc-600 shrink-0">{epic.completedTasks ?? 0}/{epic.totalTasks ?? 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            ))}

                            {epics.length === 0 && !isLoading && (
                                <div className="py-20 text-center">
                                    <p className="text-zinc-600 text-sm italic font-medium">Roadmap is empty. Click AI Auto-Gen to build one instantly.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" className="bg-zinc-900" />
                </ScrollArea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
                <div className="p-6 bg-zinc-900/30 border border-zinc-900 rounded-3xl space-y-3">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Q1 Focus</p>
                    <p className="text-sm text-zinc-400 leading-relaxed font-medium">Scaling core infrastructure and implementing advanced security protocols.</p>
                </div>
                <div className="p-6 bg-zinc-900/30 border border-zinc-900 rounded-3xl space-y-3 font-medium">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Q2 Focus</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">Launch of mobile experience and developer API ecosystem expansion.</p>
                </div>
                <div className="p-6 bg-zinc-900/30 border border-zinc-900 rounded-3xl space-y-3 font-medium">
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Q3 Focus</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">Internationalization and enterprise-grade compliance certifications.</p>
                </div>
            </div>
        </div>
    );
};

export default RoadmapPage;
