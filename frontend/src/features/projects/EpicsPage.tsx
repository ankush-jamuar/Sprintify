import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
    Plus,
    Layers,
    CheckCircle2,
    Clock,
    AlertCircle
} from "lucide-react";
import { Progress } from "../../components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "../../components/ui/dialog";
import { toast } from "sonner";

interface Epic {
    _id: string;
    name: string;
    description: string;
    status: "PLANNED" | "IN_PROGRESS" | "DONE";
    totalTasks: number;
    completedTasks: number;
    progress: number;
}

const EpicsPage: React.FC = () => {
    const { projectId } = useParams();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newEpic, setNewEpic] = useState({ name: "", description: "" });

    const { data: epics = [], isLoading } = useQuery<Epic[]>({
        queryKey: ["epics", projectId],
        queryFn: async () => {
            const res = await api.get(`/planning/projects/${projectId}/epics`);
            return res.data;
        },
        enabled: !!projectId
    });

    const createEpicMutation = useMutation({
        mutationFn: async (epic: typeof newEpic) => {
            await api.post("/planning/epics", { ...epic, projectId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["epics", projectId] });
            toast.success("Epic created successfully");
            setIsCreateModalOpen(false);
            setNewEpic({ name: "", description: "" });
        },
        onError: () => {
            toast.error("Failed to create epic");
        }
    });

    const handleCreateEpic = () => {
        if (!newEpic.name) return;
        createEpicMutation.mutate(newEpic);
    };

    const statusIcons = {
        PLANNED: <Clock className="h-4 w-4 text-zinc-500" />,
        IN_PROGRESS: <AlertCircle className="h-4 w-4 text-blue-400" />,
        DONE: <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    };

    return (
        <div className="h-full overflow-y-auto px-8 py-6 custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-white mb-1">Project Epics</h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Strategic Objective Tracking</p>
                </div>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-white text-black hover:bg-zinc-200 gap-2 rounded-xl h-11 px-6">
                            <Plus className="h-4 w-4" /> New Epic
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-[2rem]">
                        <DialogHeader>
                            <DialogTitle>Create New Epic</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Epic Name</label>
                                <Input
                                    placeholder="e.g. Authentication System"
                                    className="bg-zinc-900 border-zinc-800 rounded-xl"
                                    value={newEpic.name}
                                    onChange={(e) => setNewEpic({ ...newEpic, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Description</label>
                                <Textarea
                                    placeholder="What is this epic about?"
                                    className="bg-zinc-900 border-zinc-800 rounded-xl min-h-[100px]"
                                    value={newEpic.description}
                                    onChange={(e) => setNewEpic({ ...newEpic, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateEpic} disabled={createEpicMutation.isPending} className="bg-white text-black hover:bg-zinc-200 rounded-xl px-8">
                                {createEpicMutation.isPending ? "Creating..." : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {epics.map((epic) => (
                        <motion.div
                            key={epic._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl hover:border-zinc-700/50 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-zinc-800 rounded-xl">
                                    <Layers className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-zinc-950/50 border border-zinc-800/50 text-[10px] font-bold text-zinc-400">
                                    {statusIcons[epic.status]}
                                    {epic.status}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{epic.name}</h3>
                            <p className="text-zinc-500 text-xs mb-6 line-clamp-2 leading-relaxed">
                                {epic.description}
                            </p>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500">Progress</span>
                                    <span className="text-white font-bold">{epic.progress}%</span>
                                </div>
                                <Progress value={epic.progress} className="h-1.5 bg-zinc-800" indicatorClassName="bg-indigo-500" />
                                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-zinc-800/50">
                                    <span className="text-zinc-600 font-medium">{epic.totalTasks} Tasks</span>
                                    <span className="text-zinc-600 font-medium">{epic.completedTasks} Completed</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {!isLoading && epics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
                    <Layers className="h-12 w-12 text-zinc-700 mb-4" />
                    <p className="text-zinc-500 font-medium">No epics created yet.</p>
                </div>
            )}
        </div>
    );
};

export default EpicsPage;
